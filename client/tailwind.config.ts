/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './services/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'tg-bg': 'var(--app-bg)',
        'tg-secondary': 'var(--app-secondary-bg)',
        'tg-text': 'var(--app-text)',
        'tg-hint': 'var(--app-hint)',
        'tg-link': 'var(--app-link)',
        'tg-accent': 'var(--app-accent)',
        'tg-destructive': 'var(--app-destructive)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'system-ui',
          'sans-serif',
        ].join(','),
      },
    },
  },
  plugins: [],
};
