import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    '../../apps/web/src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0d0d2e',
          50: '#e8e8f5',
          100: '#d1d1eb',
          200: '#a3a3d7',
          300: '#7575c3',
          400: '#4747af',
          500: '#2E3192',
          600: '#1a1d6e',
          700: '#13154f',
          800: '#0d0d2e',
          900: '#070718',
          950: '#030310',
        },
        indigo: {
          DEFAULT: '#2E3192',
          50: '#eeeef9',
          100: '#ddddf3',
          200: '#bbbce7',
          300: '#999adb',
          400: '#6163c5',
          500: '#2E3192',
          600: '#252776',
          700: '#1c1d59',
          800: '#12133b',
          900: '#090a1e',
        },
        orange: {
          DEFAULT: '#F7941D',
          50: '#fef6ea',
          100: '#fdecd5',
          200: '#fbd9ab',
          300: '#f9c681',
          400: '#f8b057',
          500: '#F7941D',
          600: '#d97806',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
