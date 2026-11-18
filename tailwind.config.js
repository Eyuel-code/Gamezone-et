/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#040611',
          900: '#0c1024',
          850: '#101633',
          800: '#161e42',
          700: '#1e2857',
          600: '#29356e',
          500: '#3c498f',
        },
        primary: {
          50: '#e8faff',
          100: '#c3efff',
          200: '#8be2ff',
          300: '#45d0ff',
          400: '#11bdf7',
          500: '#00a0e0',
          600: '#0080c2',
          700: '#00669e',
          800: '#04537e',
          900: '#0a4566',
        },
        accent: {
          50: '#fff3f0',
          100: '#ffe3da',
          200: '#ffc5b0',
          300: '#ff9e7d',
          400: '#ff6a44',
          500: '#ff4516',
          600: '#f02c00',
          700: '#c72400',
          800: '#9e2004',
          900: '#7f1e08',
        },
        gold: {
          50: '#fffbe8',
          100: '#fff3c2',
          200: '#ffe889',
          300: '#ffd84a',
          400: '#ffc91f',
          500: '#f5b200',
          600: '#c98d00',
          700: '#9c6c00',
          800: '#7a5400',
          900: '#5e4200',
        },
        success: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        error: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(17, 189, 247, 0.55)',
        'glow-accent': '0 0 40px -8px rgba(255, 69, 22, 0.55)',
        'glow-gold': '0 0 40px -8px rgba(245, 178, 0, 0.55)',
        card: '0 10px 40px -12px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        'radial-fade':
          'radial-gradient(ellipse at top, rgba(17,189,247,0.18), transparent 60%)',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-22px) rotate(3deg)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'gradient-pan': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(40px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'count-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'bg-drift': {
          '0%': { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(-40px,-30px,0)' },
        },
        'page-enter': {
          from: { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        float: 'float 6s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'float-slow': 'float-slow 9s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        shimmer: 'shimmer 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        'gradient-pan': 'gradient-pan 9s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'fade-up': 'fade-up 0.72s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.48s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-in-right': 'slide-in-right 0.52s cubic-bezier(0.16, 1, 0.3, 1) both',
        marquee: 'marquee 28s linear infinite',
        'count-pop': 'count-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'bg-drift': 'bg-drift 30s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate',
        'page-enter': 'page-enter 0.52s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
