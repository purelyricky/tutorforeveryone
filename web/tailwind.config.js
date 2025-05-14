/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4285F4',
          dark: '#3367d6',
          light: '#a6c8ff',
        },
        secondary: {
          DEFAULT: '#34A853',
          dark: '#2d9348',
          light: '#83c399',
        },
        accent: {
          DEFAULT: '#FBBC05',
          dark: '#e0a800',
          light: '#fce083',
        },
        danger: {
          DEFAULT: '#EA4335',
          dark: '#d33426',
          light: '#f08c84',
        },
        surface: {
          DEFAULT: '#F8F9FA',
          dark: '#eaecef',
          light: '#ffffff',
        },
        text: {
          DEFAULT: '#202124',
          light: '#5F6368',
          lighter: '#9AA0A6',
        },
      },
      fontFamily: {
        primary: ['Poppins', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
        secondary: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.04)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.06), 0 10px 10px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fadeIn': 'fadeIn 0.5s ease-out',
        'fadeInUp': 'fadeInUp 0.6s ease-out',
        'fadeInDown': 'fadeInDown 0.6s ease-out',
        'fadeInLeft': 'fadeInLeft 0.6s ease-out',
        'fadeInRight': 'fadeInRight 0.6s ease-out',
        'slideUp': 'slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slideDown': 'slideDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spin': 'spin 1s linear infinite',
        'drawBrain': 'drawBrain 2s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        'pulse': {
          '0%, 100%': { transform: 'scale(0.95)', opacity: '0.7' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        'fadeIn': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'fadeInUp': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'fadeInDown': {
          'from': { opacity: '0', transform: 'translateY(-20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'fadeInLeft': {
          'from': { opacity: '0', transform: 'translateX(-20px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        'fadeInRight': {
          'from': { opacity: '0', transform: 'translateX(20px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        'slideUp': {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'slideDown': {
          'from': { transform: 'translateY(-20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'drawBrain': {
          '0%': { 'stroke-dashoffset': '200', 'stroke-width': '1' },
          '100%': { 'stroke-dashoffset': '0', 'stroke-width': '3' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}