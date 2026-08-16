/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#0F1115',
          panel: '#14161B',
          header: '#1A1D24',
          border: '#242832',
          borderHover: '#333947',
          text: '#E1E4EA',
          muted: '#8A92A3',
          dim: '#5A6273',
          accent: '#4A7FA7',
          accentHover: '#3B6B90',
          amber: '#D9A441',
          amberBg: '#261F10',
          red: '#D94A4A',
          redBg: '#2A1414',
          green: '#3EA86B',
          greenBg: '#112418',
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '1px',
        md: '3px',
        lg: '4px',
      },
      boxShadow: {
        none: 'none',
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
