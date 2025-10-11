import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import colors from 'tailwindcss/colors'
import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './api/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        brand: colors.emerald,
        ink: colors.slate,
        accent: colors.sky,
      },
      borderRadius: {
        DEFAULT: defaultTheme.borderRadius['2xl'],
      },
      boxShadow: {
        soft: '0 18px 32px -20px rgba(16, 185, 129, 0.45)',
        float: '0 22px 36px -18px rgba(56, 189, 248, 0.35)',
      },
      container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1200px',
          '2xl': '1440px',
        },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-scale': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out forwards',
        'fade-scale': 'fade-scale 0.5s ease-out both',
      },
    },
  },
  plugins: [forms, typography],
}

export default config
