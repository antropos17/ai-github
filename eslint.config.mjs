import js from "@eslint/js";
import globals from "globals";
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "runtime/**",
      ".cache/**",
      "prototype-backup-*/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["prototype/app/**/*.jsx"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: {
      local: {
        rules: {
          "jsx-variables": {
            create(context) {
              return {
                JSXOpeningElement() {
                  context.sourceCode.markVariableAsUsed("React");
                },
                JSXFragment() {
                  context.sourceCode.markVariableAsUsed("React");
                },
                JSXIdentifier(node) {
                  if (
                    !/^[A-Z]/.test(node.name) ||
                    node.parent.type === "JSXAttribute" ||
                    (node.parent.type === "JSXMemberExpression" &&
                      node.parent.property === node)
                  )
                    return;
                  if (!context.sourceCode.markVariableAsUsed(node.name, node))
                    context.report({
                      node,
                      message: "Undefined JSX component: " + node.name,
                    });
                },
              };
            },
          },
        },
      },
    },
    rules: { "local/jsx-variables": "error" },
  },
  {
    files: ["**/*.mjs", "**/*.js", "**/*.jsx"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
