import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
  },
);
