/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── INTERLUDE Brand Colours ──────────────────────────
        black: {
          pure: '#000000',
          midnight: '#0A0A0A',
          deep: '#111111',
        },
        navy: {
          deep: '#081B33',
          mid: '#0D2444',
          light: '#152E50',
        },
        blue: {
          royal: '#2563EB',
          electric: '#3B82F6',
          ice: '#60A5FA',
          pale: '#93C5FD',
        },
        surface: {
          1: '#0A0A0A',
          2: '#111827',
          3: '#1F2937',
          4: '#374151',
        },
        text: {
          primary: '#F9FAFB',
          secondary: '#9CA3AF',
          muted: '#6B7280',
          disabled: '#4B5563',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        // Neomorphic shadows
        neo: '8px 8px 16px #050505, -4px -4px 12px #1a1a2e',
        'neo-sm': '4px 4px 8px #050505, -2px -2px 6px #1a1a2e',
        'neo-inset': 'inset 4px 4px 8px #050505, inset -2px -2px 6px #1a1a2e',
        'blue-glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'blue-glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.6)',
        'card-hover': '0 8px 40px rgba(37, 99, 235, 0.25)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #000000 0%, #081B33 50%, #0a0a0a 100%)',
        'card-gradient': 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 100%)',
        'blue-gradient': 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
        'cinema-overlay': 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.95) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-blue': 'pulseBlue 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { '0%': { transform: 'translateY(-10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        scaleIn: { '0%': { transform: 'scale(0.95)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        pulseBlue: { '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }, '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        glow: { '0%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)' }, '100%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.7)' } },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
