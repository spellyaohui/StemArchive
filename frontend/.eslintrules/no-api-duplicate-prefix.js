/**
 * ESLint自定义规则：防止API路径重复前缀
 * 规则名称：no-api-duplicate-prefix
 * 作用：检测并防止代码中出现/api/api/这样的重复路径
 */

module.exports = {
  meta: {
    type: 'problem',        // 问题类型：可能导致的错误
    docs: {
      description: '防止API路径中出现重复的/api前缀',
      category: 'Possible Errors',
      recommended: true
    },
    fixable: 'code',        // 可自动修复
    schema: [],             // 无配置选项
    messages: {
      duplicateApiPrefix: 'API路径中包含重复的/api前缀，请移除多余的部分'
    }
  },

  create(context) {
    return {
      // 监听所有字符串字面量
      Literal(node) {
        // 只检查字符串类型的节点
        if (typeof node.value !== 'string') {
          return;
        }

        // 检查是否包含/api/api/模式
        if (node.value.includes('/api/api/') ||
            node.value.includes("'api/api/") ||
            node.value.includes('"api/api/') ||
            node.value.includes('`api/api/')) {

          context.report({
            node: node,
            messageId: 'duplicateApiPrefix',
            fix(fixer) {
              // 自动修复：将/api/api/替换为/api/
              const fixedValue = node.value.replace(/\/api\/api\//g, '/api/');
              return fixer.replaceText(node, `'${fixedValue}'`);
            }
          });
        }
      },

      // 监听模板字符串
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
};