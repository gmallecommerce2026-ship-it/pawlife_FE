// tailwind.config.js
const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // QUAN TRỌNG: Thêm 'nativewind/preset' để nó hoạt động với RN
  presets: [require("nativewind/preset")], 
  
  content: [
    // Sửa lại đường dẫn để bao gồm thư mục app của bạn
    './app/**/*.{js,jsx,ts,tsx}', 
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E78720',
        'primary-light': 'rgba(231, 135, 32, 0.3)',
        'primary-dark': '#D6791B',
      },
      fontFamily: {
        sans: ['Urbanist', 'sans-serif'],
        urbanist: ['Urbanist', 'sans-serif'],
        'urbanist-medium': ['UrbanistMedium', 'sans-serif'], // Thêm dòng này
        'urbanist-semibold': ['UrbanistSemiBold', 'sans-serif'], // Thêm dòng này
        'urbanist-bold': ['UrbanistBold', 'sans-serif'],
        // ...các font khác giữ nguyên
      },
      spacing: {
        '4.5': '1.125rem',
        'mt-4.5': '1.125rem', 
      },
    },
  },
  plugins: [],
};