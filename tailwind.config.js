/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Oxford Navy / Yale Blue (Trust, Legacy, Authority)
        primary: {
          50: '#f0f7ff',
          100: '#e0f0fe',
          200: '#b9e0fe',
          300: '#7cc4fd',
          400: '#36a5fa',
          500: '#0c8aec',
          600: '#006cc7', 
          700: '#0056a3', 
          800: '#054987', 
          900: '#0a3d6e', 
          950: '#07274a', 
        },
        // Champagne Gold (Premium, Achievement, Prestige)
        accent: {
          50: '#fffbea',
          100: '#fff3c4',
          200: '#ffe585',
          300: '#ffd13a',
          400: '#ffbc0b',
          500: '#f3a400', 
          600: '#d48000', 
          700: '#b05d04',
          800: '#8e480b',
          900: '#753a0f',
          950: '#441d04',
        },
        // Sophisticated Zinc palette (Neutral but premium)
        surface: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        }
      },
      fontFamily: {
        // Tight, modern grotesque sans-serifs
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Apple/Linear style soft multi-layered shadows
        'soft': '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        'glass': '0 8px 32px -4px rgba(0, 0, 0, 0.04), 0 4px 16px -2px rgba(0, 0, 0, 0.02)',
        'glass-hover': '0 12px 48px -6px rgba(0, 0, 0, 0.06), 0 8px 24px -4px rgba(0, 0, 0, 0.03)',
        'glow': '0 0 24px -4px rgba(37, 99, 235, 0.4)',
        'glow-accent': '0 0 24px -4px rgba(168, 85, 247, 0.4)',
      },
      backgroundImage: {
        'mesh-gradient': 'radial-gradient(at 40% 20%, hsla(228,100%,74%,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.1) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(340,100%,76%,0.15) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(22,100%,77%,0.1) 0px, transparent 50%), radial-gradient(at 80% 100%, hsla(242,100%,70%,0.15) 0px, transparent 50%), radial-gradient(at 0% 0%, hsla(343,100%,76%,0.1) 0px, transparent 50%)',
        'grid-pattern': 'linear-gradient(to right, #e4e4e7 1px, transparent 1px), linear-gradient(to bottom, #e4e4e7 1px, transparent 1px)',
        'grain': 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'pulse-soft': 'pulseSoft 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.9)' },
          '50%': { opacity: '1', transform: 'translateY(-5px) scale(1.05)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [
    typography,
  ],
}
