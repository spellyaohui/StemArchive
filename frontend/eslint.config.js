/**
 * ESLint v9配置文件 (简化版)
 * 专为健康管理系统前端设计的代码质量检查规则
 */

const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        Notification: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // 系统全局变量
        auth: 'writable',
        API: 'readonly',
        NotificationHelper: 'readonly',
        DataTable: 'readonly',
        BaseComponent: 'readonly',
        Utils: 'readonly',
        Chart: 'readonly',
        Pagination: 'readonly',
        showNotification: 'readonly',
        hideModal: 'readonly',
        validateForm: 'readonly',
        showFormErrors: 'readonly',
        showLoading: 'readonly',
        event: 'readonly',
        reportData: 'writable',
        prompt: 'readonly',
        AbortController: 'readonly',
        app: 'writable'
      }
    },

    rules: {
      // 基础代码风格规则
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],

      // 代码质量规则
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 1 }],

      // 错误预防规则
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-duplicate-case': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-fallthrough': 'error'
    },

    // 自定义规则：检查API路径重复
    plugins: {
      custom: {
        rules: {
          'no-api-duplicate-prefix': {
            meta: {
              type: 'problem',
              docs: {
                description: '防止API路径中出现重复的/api前缀',
                category: 'Possible Errors',
                recommended: true
              },
              fixable: 'code',
              schema: [],
              messages: {
                duplicateApiPrefix: 'API路径中包含重复的/api前缀，请移除多余的部分'
              }
            },

            create(context) {
              return {
                Literal(node) {
                  if (typeof node.value !== 'string') {
                    return;
                  }

                  if (node.value.includes('/api/api/')) {
                    context.report({
                      node: node,
                      messageId: 'duplicateApiPrefix',
                      fix(fixer) {
                        const fixedValue = node.value.replace(/\/api\/api\//g, '/api/');
                        return fixer.replaceText(node, `'${fixedValue}'`);
                      }
                    });
                  }
                },

                TemplateElement(node) {
                  if (typeof node.value.raw !== 'string') {
                    return;
                  }

                  if (node.value.raw.includes('/api/api/')) {
                    context.report({
                      node: node,
                      messageId: 'duplicateApiPrefix'
                    });
                  }
                }
              };
            }
          }
        }
      }
    }
  },

  // 应用自定义规则
  {
    rules: {
      'custom/no-api-duplicate-prefix': 'error'
    }
  }
];