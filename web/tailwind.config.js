/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Colores del logo del estudio (spec 007, RF-3). El logo va en degradado hacia la derecha,
      // de `oscuro` a `azul`: bg-gradient-to-r from-estudio-oscuro to-estudio-azul.
      colors: {
        estudio: {
          oscuro: '#2C3256',
          azul: '#415789',
          blanco: '#FCFFFF',
        },
      },
    },
  },
  plugins: [],
};
