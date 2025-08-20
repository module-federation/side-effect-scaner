import { Helmet } from '@modern-js/runtime/head';
import './index.css';
import {
	appendElement,
	appendLinkTag,
	appendScriptTag,
	appendStyleTag,
	createElement,
} from '@module-federation/side-effect-pkg';
import React, { useEffect } from 'react';

// @ts-ignore
window.kkk = 3;

// 使用 append 方法直接添加元素到 DOM
appendLinkTag(
	'https://un-existed/link.css',
	document.head,
	'icon',
	'image/x-icon',
);

appendStyleTag(
	`body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }`,
	document.head,
);

// 添加一个实际的脚本标签
appendScriptTag(
	undefined,
	document.body,
	`console.log('Side effect script executed!');`,
	'text/javascript',
	false,
	false,
);

// 创建一个容器并添加到页面
const container = createElement('div', {
	className: 'dynamic-container',
	style:
		'padding: 20px; border: 2px solid #ccc; margin: 10px; border-radius: 8px;',
});
container.textContent = 'This is a dynamically created container!';
appendElement(container, document.body);

const Index = () => {
	useEffect(() => {
		// useEffect 中监听页面点击事件
		const detectClick = () => {
			console.log('click!');
		};
		document.addEventListener('click', detectClick);
	}, []);
	return (
		<div className="container-box">
			<Helmet>
				<link
					rel="icon"
					type="image/x-icon"
					href="https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/favicon.ico"
				/>
			</Helmet>
			<main>
				{React.createElement('x1121', {
					asdfas: 'casdfadfwq',
				})}
				<div className="title">
					Welcome to
					<img
						className="logo"
						src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zq-uylkvT/ljhwZthlaukjlkulzlp/modern-js-logo.svg"
						alt="Modern.js Logo"
					/>
					<p className="name">Modern.js</p>
				</div>
				<p className="description">
					Get started by editing{' '}
					<code className="code">src/routes/page.tsx</code>
				</p>
				<div className="grid">
					<a
						href="https://modernjs.dev/guides/get-started/introduction.html"
						target="_blank"
						rel="noopener noreferrer"
						className="card"
					>
						<h2>
							Guide
							<img
								className="arrow-right"
								src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zq-uylkvT/ljhwZthlaukjlkulzlp/arrow-right.svg"
								alt="Guide"
							/>
						</h2>
						<p>Follow the guides to use all features of Modern.js.</p>
					</a>
					<a
						href="https://modernjs.dev/tutorials/foundations/introduction.html"
						target="_blank"
						className="card"
						rel="noreferrer"
					>
						<h2>
							Tutorials
							<img
								className="arrow-right"
								src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zq-uylkvT/ljhwZthlaukjlkulzlp/arrow-right.svg"
								alt="Tutorials"
							/>
						</h2>
						<p>Learn to use Modern.js to create your first application.</p>
					</a>
					<a
						href="https://modernjs.dev/configure/app/usage.html"
						target="_blank"
						className="card"
						rel="noreferrer"
					>
						<h2>
							Config
							<img
								className="arrow-right"
								src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zq-uylkvT/ljhwZthlaukjlkulzlp/arrow-right.svg"
								alt="Config"
							/>
						</h2>
						<p>Find all configuration options provided by Modern.js.</p>
					</a>
					<a
						href="https://github.com/web-infra-dev/modern.js"
						target="_blank"
						rel="noopener noreferrer"
						className="card"
					>
						<h2>
							GitHub
							<img
								className="arrow-right"
								src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zq-uylkvT/ljhwZthlaukjlkulzlp/arrow-right.svg"
								alt="Github"
							/>
						</h2>
						<p>View the source code on GitHub; feel free to contribute.</p>
					</a>
				</div>
			</main>
		</div>
	);
};

export default Index;
