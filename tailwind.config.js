/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#13222E',
        paper: '#EEF5F1',
        lime: '#C8F53C',
        mint: '#BDF4E0',
        pink: '#FCD9EF',
        sky: '#5AAFE3',
        line: '#DCE5E0',
        muted: '#5E6B72',
        success: '#3DDBB0',
      },
      fontFamily: {
        sans: ['Onest', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      borderRadius: { panel: '28px' },
      fontSize: {
        hero: ['34px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
        title: ['26px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
};
