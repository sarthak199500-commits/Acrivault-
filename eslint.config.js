import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Our bespoke form controls render native controls under the hood.
      'jsx-a11y/label-has-associated-control': [
        'error',
        { controlComponents: ['Checkbox', 'Switch', 'Select'], assert: 'either', depth: 3 },
      ],
      // `role` is one of our own prop names — a user's permission role, not an ARIA
      // role — and this rule validates any JSX attribute called `role` against the
      // ARIA vocabulary. It stayed quiet only because every call site passed a
      // variable, which the rule cannot evaluate; a literal like role="analyst"
      // fails. Limiting it to DOM elements keeps the check where ARIA applies.
      'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
    },
  },
);
