/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0e14',
          panel: '#111823',
          border: '#1e2a38',
          trace: '#2fb344',
          text: '#c8d3e0',
          muted: '#5a6b80',
          accent: '#39ff14',
        },
        packet: {
          error: '#ff5555',
          success: '#50fa7b',
          info: '#8be9fd',
          warning: '#f1fa8c',
          debug: '#bd93f9',
          trace: '#ffb86c',
          fatal: '#ff79c9',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
