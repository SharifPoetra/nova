import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

import noHardCodedUi from './apps/bot/eslint-local-rules/no-hardcoded-ui.js';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: {
      prettier: prettierPlugin,
      local: {
        rules: {
          'no-hardcoded-ui': noHardCodedUi
        },
      },
    },
    rules: {
      // Menggabungkan rule prettier agar tidak bentrok dengan linter
      ...prettierConfig.rules,
      'prettier/prettier': 'error',

      // Penulisan rule TS yang benar di ESLint v10:
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      
      'no-console': 'off',
      
      'local/no-hardcoded-ui': 'warn',
    },
  },
  {
    // Folder yang diabaikan
    ignores: ['**/dist/**', '**/node_modules/**', '**/*test.ts'],
  },
);
