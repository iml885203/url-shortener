import forms from '@tailwindcss/forms';
import foundation from './src/ui/foundation/tailwind.js';
/** @type {import('tailwindcss').Config} */
export default {
  presets: [foundation],
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {},
  },
  plugins: [forms],
};
