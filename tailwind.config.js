/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './popup.html',
    './onboarding.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'app-blue': 'rgba(157,214,252,1)',
        'app-purple': 'rgb(202, 160, 250)',
      },
    },
  },
  plugins: [],
};
