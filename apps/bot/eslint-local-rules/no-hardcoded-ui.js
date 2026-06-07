export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded UI strings, enforce t()',
    },
    messages: {
      hardcoded: 'Hardcoded UI in {{where}}: "{{text}}" — use t()',
    },
    schema: [],
  },
  create(context) {
    const UI_METHODS = ['setTitle', 'setDescription', 'setFooter', 'setLabel', 'setPlaceholder'];
    const UI_PROPS = ['content', 'title'];

    const sourceCode = context.sourceCode; // <-- ESLint 10

    function checkString(node, str, where) {
      if (!str || str.length < 4) return;
      if (str.includes('{{') || /^\p{Emoji}+$/u.test(str)) return;

      const text = sourceCode.getText(node);
      if (text.includes('t(')) return; // already using i18n

      if (/[A-Za-z]{3,}\s+[A-Za-z]/.test(str)) {
        context.report({
          node,
          messageId: 'hardcoded',
          data: { where, text: str },
        });
      }
    }

    return {
      CallExpression(node) {
        const method = node.callee?.property?.name;
        if (!UI_METHODS.includes(method)) return;
        const arg = node.arguments[0];
        if (arg?.type === 'Literal' && typeof arg.value === 'string') {
          checkString(arg, arg.value, method);
        }
        if (arg?.type === 'ObjectExpression') {
          arg.properties.forEach((p) => {
            if (p.value?.type === 'Literal' && typeof p.value.value === 'string') {
              checkString(p.value, p.value.value, p.key.name);
            }
          });
        }
      },
      Property(node) {
        if (!UI_PROPS.includes(node.key.name)) return;
        if (node.value?.type === 'Literal' && typeof node.value.value === 'string') {
          checkString(node.value, node.value.value, `property:${node.key.name}`);
        }
      },
    };
  },
};
