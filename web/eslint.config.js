import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    rules: {
      // Los textos se muestran siempre como texto, nunca como HTML (plan 003, textos seguros).
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'No se usa dangerouslySetInnerHTML: los textos se muestran siempre como texto.',
        },
      ],
    },
  },
);
