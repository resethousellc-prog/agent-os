/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Agent OS design system
        canvas:  '#0A0A0F',
        card:    '#12121A',
        border:  '#1E1E2E',
        // Tier colors
        't3':    '#F59E0B',  // amber — franchise
        't2':    '#3B82F6',  // blue  — veteran
        't1':    '#22C55E',  // green — rookie
        // Status colors
        'status-active':   '#22C55E',
        'status-training': '#F59E0B',
        'status-ready':    '#06B6D4',
        'status-suspended':'#EF4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
