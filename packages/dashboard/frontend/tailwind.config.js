/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {},
  },
  plugins: [
    // @ts-ignore
    require('@tailwindcss/forms'),
  ],
};
