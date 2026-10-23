/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Colores del logo del estudio (spec 007, RF-3). El logo va en degradado hacia la derecha,
      // de `oscuro` a `azul`: bg-gradient-to-r from-estudio-oscuro to-estudio-azul.
      // Títulos del sitio público (spec 007, RF-3): la tipografía propia y, mientras carga, Georgia.
      fontFamily: {
        titulos: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      colors: {
        estudio: {
          oscuro: '#2C3256',
          azul: '#415789',
          blanco: '#FCFFFF',
        },
      },
      // Íconos de las tarjetas de los servicios al pasar el puntero (spec 007, RF-12 y RF-45):
      // una sola vez y en menos de 0,6 s.
      keyframes: {
        'icono-balanceo': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '35%': { transform: 'rotate(-8deg)' },
          '70%': { transform: 'rotate(5deg)' },
        },
        'icono-salto': {
          '0%, 100%': { transform: 'translateY(0)' },
          '45%': { transform: 'translateY(-3px)' },
        },
      },
      animation: {
        'icono-balanceo': 'icono-balanceo 0.55s ease-in-out',
        'icono-salto': 'icono-salto 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
};
