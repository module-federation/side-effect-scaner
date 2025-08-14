/**
 * 创建 link 标签的函数
 * @param href - 链接地址
 * @param rel - 关系类型，默认为 'stylesheet'
 * @param type - MIME 类型，可选
 * @param media - 媒体查询，可选
 * @returns 创建的 link 元素
 */
export function createLinkTag(
	href: string,
	rel: string = 'stylesheet',
	type?: string,
	media?: string,
): HTMLLinkElement {
	const link = document.createElement('link');
	link.rel = rel;
	link.href = href;

	if (type) {
		link.type = type;
	}

	if (media) {
		link.media = media;
	}

	return link;
}

/**
 * 创建 script 标签的函数
 * @param src - 脚本地址，如果提供则创建外部脚本
 * @param content - 脚本内容，如果提供则创建内联脚本
 * @param type - 脚本类型，默认为 'text/javascript'
 * @param async - 是否异步加载
 * @param defer - 是否延迟执行
 * @returns 创建的 script 元素
 */
export function createScriptTag(
	src?: string,
	content?: string,
	type: string = 'text/javascript',
	async?: boolean,
	defer?: boolean,
): HTMLScriptElement {
	const script = document.createElement('script');
	script.type = type;

	if (src) {
		script.src = src;
	}

	if (content) {
		script.textContent = content;
	}

	if (async) {
		script.async = true;
	}

	if (defer) {
		script.defer = true;
	}

	return script;
}

/**
 * 创建样式标签的函数
 * @param content - CSS 内容
 * @returns 创建的 style 元素
 */
export function createStyleTag(content: string): HTMLStyleElement {
	const style = document.createElement('style');
	style.textContent = content;
	return style;
}

/**
 * 创建 meta 标签的函数
 * @param name - meta 名称
 * @param content - meta 内容
 * @param httpEquiv - HTTP 等效头
 * @returns 创建的 meta 元素
 */
export function createMetaTag(
	name?: string,
	content?: string,
	httpEquiv?: string,
): HTMLMetaElement {
	const meta = document.createElement('meta');

	if (name) {
		meta.name = name;
	}

	if (content) {
		meta.content = content;
	}

	if (httpEquiv) {
		meta.httpEquiv = httpEquiv;
	}

	return meta;
}

/**
 * 创建通用标签的辅助函数
 * @param tagName - 标签名称
 * @param attributes - 属性对象
 * @returns 创建的元素
 */
export function createElement<T extends keyof HTMLElementTagNameMap>(
	tagName: T,
	attributes?: Record<string, string>
): HTMLElementTagNameMap[T] {
	const element = document.createElement(tagName);
	
	if (attributes) {
		Object.entries(attributes).forEach(([key, value]) => {
			element.setAttribute(key, value);
		});
	}
	
	return element;
}

/**
 * 将元素添加到指定父元素的辅助函数
 * @param element - 要添加的元素
 * @param parent - 父元素，默认为 document.body
 * @param position - 插入位置，可选 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend'
 * @returns 添加的元素
 */
export function appendElement<T extends HTMLElement>(
	element: T,
	parent: HTMLElement = document.body,
	position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend' = 'beforeend'
): T {
	if (position === 'beforeend') {
		parent.appendChild(element);
	} else {
		parent.insertAdjacentElement(position, element);
	}
	return element;
}

/**
 * 创建并添加 link 标签到指定父元素
 * @param href - 链接地址
 * @param parent - 父元素，默认为 document.head
 * @param rel - 关系类型，默认为 'stylesheet'
 * @param type - MIME 类型，可选
 * @param media - 媒体查询，可选
 * @returns 创建的 link 元素
 */
export function appendLinkTag(
	href: string,
	parent: HTMLElement = document.head,
	rel: string = 'stylesheet',
	type?: string,
	media?: string
): HTMLLinkElement {
	const link = createLinkTag(href, rel, type, media);
	return appendElement(link, parent);
}

/**
 * 创建并添加 script 标签到指定父元素
 * @param src - 脚本地址，如果提供则创建外部脚本
 * @param parent - 父元素，默认为 document.body
 * @param content - 脚本内容，如果提供则创建内联脚本
 * @param type - 脚本类型，默认为 'text/javascript'
 * @param async - 是否异步加载
 * @param defer - 是否延迟执行
 * @returns 创建的 script 元素
 */
export function appendScriptTag(
	src?: string,
	parent: HTMLElement = document.body,
	content?: string,
	type: string = 'text/javascript',
	async?: boolean,
	defer?: boolean
): HTMLScriptElement {
	const script = createScriptTag(src, content, type, async, defer);
	return appendElement(script, parent);
}

/**
 * 创建并添加样式标签到指定父元素
 * @param content - CSS 内容
 * @param parent - 父元素，默认为 document.head
 * @returns 创建的 style 元素
 */
export function appendStyleTag(
	content: string,
	parent: HTMLElement = document.head
): HTMLStyleElement {
	const style = createStyleTag(content);
	return appendElement(style, parent);
}
