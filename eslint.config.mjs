import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.wrangler/**', '**/test-results/**', '**/playwright-report/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/essential'],
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: ts.parser } } },
  { languageOptions: { globals: Object.fromEntries(['process', 'console', 'Buffer', 'URL', 'fetch', 'Response', 'Request', 'TextEncoder', 'TextDecoder', 'setTimeout', 'clearTimeout', 'document', 'window', 'navigator', 'localStorage', 'File', 'FormData', 'AbortController', 'crypto', '__dirname', 'matchMedia'].map(name => [name, 'readonly'])) } },
  { rules: { 'vue/multi-word-component-names': 'off' } },
  { files: ['packages/dashboard/src/auth/oidc.ts'], rules: { 'no-control-regex': 'off' } },
  // TypeScript provides name resolution; Workers and browser globals vary by package.
  { files: ['**/*.ts', '**/*.vue'], rules: { 'no-undef': 'off' } },
];
