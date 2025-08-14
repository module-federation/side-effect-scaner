/**
 * 前端工程副作用扫描工具配置文件
 */

module.exports = {
  // 要扫描的目录
  directory: '.',
  
  // 忽略的文件模式
  ignore: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '**/*.min.js',
    '**/*.min.css'
  ],
  
  // 要扫描的副作用类型
  scanTypes: {
    css: true,
    globalVars: true,
    eventListeners: true
  },
  
  // 输出设置
  output: {
    format: 'console', // 'console', 'json', 或 'html'
    path: 'side-effect-report.json' // 输出文件路径
  },
  
  // 规则配置
  rules: {
    // CSS规则
    css: {
      // 全局选择器阈值（特异性低于此值的选择器会被标记）
      globalSelectorsThreshold: 3,
      
      // 选择器复杂度阈值（超过此值的选择器会被标记）
      selectorComplexityThreshold: 4,
      
      // 是否检测未使用的CSS规则
      detectUnusedRules: true,
      
      // 忽略的选择器（不会被标记为未使用）
      ignoredSelectors: [
        /^@media/,
        /^@keyframes/,
        /^@font-face/,
        /^@import/,
        /^@supports/,
        /^:root/,
        /^\.js-/,
        /^\.no-js/
      ]
    },
    
    // 全局变量规则
    globalVars: {
      // 允许的全局变量（不会被标记）
      allowedGlobals: [
        // 常见的全局变量
        'window', 'document', 'console', 'navigator',
        // 第三方库全局变量
        'jQuery', '$', '_', 'moment', 'axios',
        // 自定义全局变量
        'APP_CONFIG', 'API_URL'
      ]
    },
    
    // 事件监听器规则
    eventListeners: {
      // 允许的全局事件（不会被标记）
      allowedGlobalEvents: [
        'load', 'DOMContentLoaded', 'resize', 'scroll'
      ],
      
      // 是否检测匿名函数事件处理器
      detectAnonymousHandlers: true
    }
  },
  
  // 详细输出
  verbose: false
};