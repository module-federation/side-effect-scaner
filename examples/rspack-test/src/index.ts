// import "./index.css";

// document.querySelector("#root")!.innerHTML = `
// <div class="content">
//   <h1>Vanilla Rspack</h1>
//   <p>Start building amazing things with Rspack.</p>
// </div>
// `;


/**
 * Webpack 插件测试示例
 * 包含一些副作用代码，用于测试副作用扫描插件
 */

import './index.css';

// 正常的全局变量声明，应该被检测为副作用
window.appConfig = {
  version: '1.0.0',
  apiUrl: 'https://api.example.com'
};

// 使用魔法注释禁用下一行的扫描
// side-effect-scanner-disable-next-line
window.disabledVar = 'This should NOT be detected';

// 事件监听器
window.addEventListener('load', function() {
  console.log('App loaded');
});

// 使用魔法注释禁用特定规则
// side-effect-scanner-disable-next-line global_event_listener
window.addEventListener('resize', function() {
  console.log('Window resized');
});

// 导出一个函数
export function init() {
  console.log('App initialized');
}