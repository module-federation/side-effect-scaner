import { bundleRequire } from '@modern-js/node-bundle-require';
import type {
	RsbuildConfig,
	RsbuildPlugin,
	RsbuildPlugins,
} from '@rsbuild/core';
import { createRsbuild, mergeRsbuildConfig } from '@rsbuild/core';
import { pluginLess } from '@rsbuild/plugin-less';
import { pluginSass } from '@rsbuild/plugin-sass';
import chalk from 'chalk';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { CSS_MODULE_LOCAL_IDENT_NAME } from './constant';
import i18next from './i18n';
import { type AssetMap, shakePlugin } from './rsbuild-plugins/shake-plugin';
import { scan } from './scanner';
import type { Adapter, ScanOptions } from './types/config';
import { getEntryDir } from './utils/file';

declare const __VERSION__: string;

export async function runCli() {
	program
		.version(__VERSION__)
		.description(i18next.t('cli_description'))
		.option('-c, --config <path>', i18next.t('cli_config'), '.serc.ts')
		.option('-e, --entry <file>', i18next.t('cli_entry'), 'index.ts')
		.option('-d, --dir <dir>', i18next.t('cli_dir'))
		.option('--max-depth <number>', i18next.t('cli_max_depth'), 'Infinity')
		.option('--alias <aliases>', i18next.t('cli_alias'), '{}')
		.option('--unknown-dir <dir>', i18next.t('cli_unknown_dir'), 'dist')
		.option('--compile <boolean>', i18next.t('cli_compile'), true)
		.option(
			'-o, --output <path>',
			i18next.t('cli_output'),
			'side-effect-report.md',
		)
		.option('-f, --format <format>', i18next.t('cli_format'), 'md')
		.option('-i, --ignore <patterns>', i18next.t('cli_ignore'))
		.option('-v, --verbose', i18next.t('cli_verbose'), false)
		.option('--adapter <path>', i18next.t('cli_adapter'), '')
		.option(
			'--ignored-global-vars <vars>',
			i18next.t('cli_ignored_global_vars'),
			'webpackChunk_*',
		)
		.option(
			'--exclude-global-selector-after-class',
			i18next.t('cli_exclude_global_selector_after_class'),
			true,
		)
		.option(
			'--un-removed-event-listener',
			i18next.t('cli_unremoved_event_listener'),
			true,
		)
		.option(
			'--anonymous-event-handler',
			i18next.t('cli_anonymous_event_handler'),
			true,
		)
		.option(
			'--dynamic-element-append',
			i18next.t('cli_dynamic_element_append'),
			false,
		)
		.option(
			'--dynamic-element-remove',
			i18next.t('cli_dynamic_element_remove'),
			false,
		)
		.option(
			'--dynamic-element-insert',
			i18next.t('cli_dynamic_element_insert'),
			false,
		)
		.option(
			'--untracked-dynamic-element',
			i18next.t('cli_untracked_dynamic_element'),
			false,
		)
		.option(
			'--global-var-declaration',
			i18next.t('cli_global_var_declaration'),
			true,
		)
		.option('--built-in-override', i18next.t('cli_built_in_override'), true)
		.option(
			'--critical-global-style',
			i18next.t('cli_critical_global_style'),
			true,
		)
		.option('--global-selector', i18next.t('cli_global_selector'), true)
		.option('--complex-selector', i18next.t('cli_complex_selector'), false)
		.option(
			'--important-declaration',
			i18next.t('cli_important_declaration'),
			false,
		)
		.option('--duplicate-rule', i18next.t('cli_duplicate_rule'), true)
		.option(
			'--global-style-side-effect',
			i18next.t('cli_global_style_side_effect'),
			false,
		)
		.parse(process.argv);

	const options = program.opts();

	let config: ScanOptions & { default?: ScanOptions } = {};
	const configPath = path.resolve(process.cwd(), options.config);

	try {
		if (fs.existsSync(configPath)) {
			config = await bundleRequire(configPath);
			config = config.default || config;
			if (options.verbose) {
				console.log(
					chalk.blue(`${i18next.t('cli_config_loaded')}: ${configPath}`),
				);
			}
		}
	} catch (error) {
		if (error instanceof Error) {
			console.error(
				chalk.red(`${i18next.t('cli_config_load_failed')}: ${error.message}`),
			);
		}
		process.exit(1);
	}

	const scanOptions: Required<ScanOptions> = {
		config: '',
		entry: options.entry,
		// biome-ignore lint/complexity/noUselessTernary: <no use --no-compile>
		compile: options.compile === 'false' ? false : true,
		dir: options.dir,
		output: options.output,
		format: options.format,
		ignore: options.ignore ? options.ignore.split(',') : [],
		verbose: options.verbose,
		maxDepth:
			options.maxDepth !== 'Infinity'
				? Number.parseInt(options.maxDepth, 10)
				: Number.POSITIVE_INFINITY,
		alias: options.alias ? JSON.parse(options.alias) : {},
		excludeGlobalSelectorAfterClass: Boolean(
			options.excludeGlobalSelectorAfterClass,
		),
		unRemovedEventListener: Boolean(options.unRemovedEventListener),
		anonymousEventHandler: Boolean(options.anonymousEventHandler),
		dynamicElementAppend: Boolean(options.dynamicElementAppend),
		dynamicElementInsert: Boolean(options.dynamicElementInsert),
		dynamicElementRemove: Boolean(options.dynamicElementRemove),
		untrackedDynamicElement: Boolean(options.untrackedDynamicElement),
		globalVarDeclaration: Boolean(options.globalVarDeclaration),
		builtInOverride: Boolean(options.builtInOverride),
		criticalGlobalStyle: Boolean(options.criticalGlobalStyle),
		globalSelector: Boolean(options.globalSelector),
		complexSelector: Boolean(options.complexSelector),
		importantDeclaration: Boolean(options.importantDeclaration),
		duplicateRule: Boolean(options.duplicateRule),
		globalStyleSideEffect: Boolean(options.globalStyleSideEffect),
		adapter: '',
		unknownDir: options.unknownDir,
		ignoredGlobalVars: options.ignoredGlobalVars.split(','),
		...config,
	};

	console.log(chalk.blue(i18next.t('cli_start_scanning')));
	console.time(i18next.t('cli_scan_complete'));

	if (scanOptions.dir) {
		await scan(scanOptions);
	} else {
		const scanAndReport = async (assetMap: AssetMap) => {
			await scan(scanOptions, assetMap);
		};

		const entryExt = path.extname(scanOptions.entry);
		switch (entryExt) {
			case '.html':
			case '.htm':
			case '.css': {
				await scan(scanOptions);
				break;
			}

			case '.scss':
			case '.less': {
				console.log(i18next.t('cli_unsupported_file', { ext: entryExt }));
				break;
			}

			case '.js':
			case '.jsx':
			case '.ts':
			case '.tsx': {
				if (!scanOptions.compile) {
					await scan(scanOptions);
					break;
				}
				let rsbuildConfig: RsbuildConfig = {
					output: {
						sourceMap: true,
						cssModules: {
							localIdentName: `${CSS_MODULE_LOCAL_IDENT_NAME}-[local]-[hash:base64:6]`,
						},
						legalComments: 'none',
					},
					tools: {
						rspack(config) {
							config.target = 'node';
							config.output.devtoolModuleFilenameTemplate = '[resource-path]';
							config.entry = {
								index: getEntryDir(scanOptions),
							};
						},
						lightningcssLoader: false,
					},
					plugins: [shakePlugin(scanAndReport)],
				};
				if (scanOptions.adapter) {
					const [adapterPath, adapterOptions] =
						typeof scanOptions.adapter === 'string'
							? [scanOptions.adapter]
							: scanOptions.adapter;
					const requireAdapter = require(adapterPath);
					const adapter: Adapter = requireAdapter.default || requireAdapter;
					const projectRsbuildConfig = await adapter(
						scanOptions,
						adapterOptions,
					);
					rsbuildConfig = mergeRsbuildConfig(
						projectRsbuildConfig,
						rsbuildConfig,
					);
				}
				const addPlugin = (plugin: RsbuildPlugin, plugins?: RsbuildPlugins) => {
					if (!plugins) {
						return;
					}
					if (plugins.find((p) => p && 'name' in p && p.name === plugin.name)) {
						return;
					}
					plugins.push(plugin);
				};
				addPlugin(pluginSass(), rsbuildConfig.plugins);
				addPlugin(pluginLess(), rsbuildConfig.plugins);
				const rsbuild = await createRsbuild({
					rsbuildConfig,
				});

				await rsbuild.build();
				break;
			}
			default: {
				console.log(i18next.t('cli_unsupported_file', { ext: entryExt }));
				break;
			}
		}
	}

	console.timeEnd(i18next.t('cli_scan_complete'));
}
