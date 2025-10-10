/**
 * ESLint配置文件
 * 专为健康管理系统前端设计的代码质量检查规则
 */

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true  // 支持Node.js环境变量
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // 基础代码风格规则
    'indent': ['error', 2],                    // 使用2空格缩进
    'linebreak-style': ['error', 'unix'],      // 使用Unix换行符
    'quotes': ['error', 'single'],             // 使用单引号
    'semi': ['error', 'always'],               // 语句末尾使用分号

    // API路径重复检查规则
    'no-api-duplicate-prefix': 'error',        // 防止/api/api/重复路径

    // 代码质量规则
    'no-unused-vars': 'warn',                  // 未使用变量警告
    'no-console': 'warn',                      // console使用警告
    'prefer-const': 'error',                   // 优先使用const
    'no-var': 'error',                         // 禁止使用var
    'eqeqeq': ['error', 'always'],             // 使用===而不是==
    'curly': ['error', 'all'],                 // 所有控制语句必须使用大括号
    'no-trailing-spaces': 'error',             // 禁止行尾空格
    'comma-dangle': ['error', 'never'],        // 禁止尾随逗号
    'object-curly-spacing': ['error', 'always'],// 对象字面量空格

    // 错误预防规则
    'no-undef': 'error',                       // 禁止使用未定义变量
    'no-unreachable': 'error',                 // 禁止无法到达的代码
    'no-duplicate-case': 'error',              // 禁止重复case标签
    'no-empty': ['error', { allowEmptyCatch: true }], // 禁止空块
    'no-fallthrough': 'error',                 // 禁止case穿透
    'no-global-assign': 'error',               // 禁止修改全局变量
    'no-multiple-empty-lines': ['error', { max: 1 }], // 限制连续空行
    'no-array-constructor': 'error',           // 禁止使用Array构造函数
    'no-new-object': 'error',                  // 禁止使用Object构造函数
    'object-shorthand': 'error',               // 使用对象方法简写
    'prefer-arrow-callback': 'error',          // 优先使用箭头函数
    'prefer-template': 'error',                // 优先使用模板字符串
    'template-curly-spacing': ['error', 'never'] // 模板字符串花括号内无空格
  },

  // 针对特定文件类型的规则覆盖
  overrides: [
    {
      files: ['*.js'],
      rules: {
        'no-api-duplicate-prefix': 'error'
      }
    },
    {
      files: ['*.html'],
      rules: {
        // HTML文件中的JavaScript规则
        'no-console': 'off'  // HTML中允许使用console调试
      }
    }
  ]
};