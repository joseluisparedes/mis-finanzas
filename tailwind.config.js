/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colores personalizados para dark mode
        'dark-bg': '#0f172a',      // slate-900
        'dark-surface': '#1e293b',  // slate-800
        'dark-card': '#334155',     // slate-700
        'dark-border': '#475569',   // slate-600
        'dark-text': '#f1f5f9',     // slate-100
        'dark-text-secondary': '#cbd5e1', // slate-300
        'dark-text-muted': '#94a3b8', // slate-400
      }
    },
  },
  plugins: [],
}