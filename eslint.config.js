import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', '**/*.config.ts', '**/*.config.js'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      // The core must stay free of DOM and React APIs.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/core must not depend on React.' },
            { name: 'react-dom', message: 'src/core must not depend on react-dom.' },
            { name: 'react/jsx-runtime', message: 'src/core must not depend on React.' },
          ],
          patterns: [
            {
              group: ['@ui/*', '../ui/*', '../../ui/*', '../../../ui/*'],
              message: 'src/core must not depend on src/ui. The dependency points ui -> core only.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      // No DOM access from core. `clientToSvg` and friends live in src/ui.
      'no-restricted-globals': [
        'error',
        { name: 'document', message: 'src/core must not touch the DOM.' },
        { name: 'window', message: 'src/core must not touch the DOM.' },
        { name: 'localStorage', message: 'src/core must not touch browser storage.' },
        { name: 'sessionStorage', message: 'src/core must not touch browser storage.' },
        { name: 'navigator', message: 'src/core must not touch browser APIs.' },
        { name: 'requestAnimationFrame', message: 'src/core must not schedule browser work.' },
      ],
    },
  },
);
