import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tribbu: {
          teal: {
            DEFAULT: 'rgb(var(--tribbu-teal) / <alpha-value>)',
            light: 'rgb(var(--tribbu-teal-light) / <alpha-value>)',
            dark: 'rgb(var(--tribbu-teal-dark) / <alpha-value>)',
          },
          green: {
            DEFAULT: 'rgb(var(--tribbu-green) / <alpha-value>)',
            light: 'rgb(var(--tribbu-green-light) / <alpha-value>)',
            dark: 'rgb(var(--tribbu-green-dark) / <alpha-value>)',
          },
          purple: {
            DEFAULT: 'rgb(var(--tribbu-purple) / <alpha-value>)',
            light: 'rgb(var(--tribbu-purple-light) / <alpha-value>)',
            dark: 'rgb(var(--tribbu-purple-dark) / <alpha-value>)',
          },
          charcoal: {
            DEFAULT: '#2E343B',
            deep: '#21262C',
            surface: '#363D46',
            border: '#454E59',
          },
          ivory: {
            DEFAULT: '#EFEFEF',
            surface: '#FFFFFF',
            muted: '#F6F7F9',
            border: '#E2E6EC',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
        glow: '0 0 20px -4px rgba(59, 165, 93, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;

