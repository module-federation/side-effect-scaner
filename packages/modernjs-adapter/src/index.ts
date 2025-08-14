import { createRunOptions } from '@modern-js/app-tools/cli/run';
import { createCli } from '@modern-js/plugin-v2/cli';
import {
	INTERNAL_APP_TOOLS_PLUGINS,
	INTERNAL_APP_TOOLS_RUNTIME_PLUGINS,
} from '@modern-js/utils';
import type { Adapter } from '@module-federation/side-effect-scanner';

interface AdapterOptions {
	configPath?: string;
}

type RsbuildConfig = ReturnType<Adapter> extends Promise<infer U> ? U : never;

const MODERN_CONFIG_FILE = 'modern.config';

const ModernJSAdapter: Adapter<AdapterOptions> = async () => {
	process.env.MODERN_ARGV = ['', '', 'build', 'api-only'].join(' ');
	const env =
		process.env.NODE_ENV === 'development' ? 'development' : 'production';
	process.env.NODE_ENV = env;

	const runOptions = await createRunOptions({
		internalPlugins: {
			cli: INTERNAL_APP_TOOLS_PLUGINS,
			autoLoad: INTERNAL_APP_TOOLS_RUNTIME_PLUGINS,
		},
		version: '',
		configFile: MODERN_CONFIG_FILE,
	});
	const cli = createCli();
	// @ts-ignore
	const { appContext } = await cli.init(runOptions);

	const inspectedConfig = await appContext.builder?.inspectConfig({
		mode: env,
		verbose: false,
	});
	if (!inspectedConfig) {
		throw new Error('Can not get rsbuild config!');
	}

	return inspectedConfig.origin.rsbuildConfig as RsbuildConfig;
};

export default ModernJSAdapter;
