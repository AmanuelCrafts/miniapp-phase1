import js from '@eslint/js';
import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next,
  {
    rules: {
      // The Telegram SDK is injected into `window` by a third party script and
      // is not typed as non-null.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // `consistent-type-imports` needs type information, which requires the
    // slower type-aware parser. It is enforced by TypeScript itself via
    // `verbatimModuleSyntax`, so it is intentionally not enabled here.
    ignores: ['eslint.config.mjs'],
  },
);
