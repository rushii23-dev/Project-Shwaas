import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  { ignores: ["dist", "coverage", "design_handoff", "node_modules", "public/sw.js"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      jsxA11y.flatConfigs.strict,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Numbers in template strings are intentional (AQI values, coordinates).
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // For text, `||` (fall back when empty) is the intended meaning, not `??`.
      "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { string: true } }],
      // `onClick={() => setOpen(false)}` is idiomatic React.
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      // Scrollable regions must be keyboard-focusable (WCAG 2.1.1, axe "scrollable-region-focusable").
      "jsx-a11y/no-noninteractive-tabindex": ["error", { roles: ["tabpanel", "region"] }],
      // Model and API output is untrusted: never inject it as HTML.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Render text nodes only — AI and API output is untrusted.",
        },
      ],
      "no-eval": "error",
      "no-implied-eval": "error",
      eqeqeq: ["error", "always"],
    },
  },
  {
    // Tests assert on known fixtures; non-null assertions there are the clearest form.
    files: ["**/*.test.{ts,tsx}", "src/test/**"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
);
