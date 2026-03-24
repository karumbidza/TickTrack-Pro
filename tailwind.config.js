/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        'xs': '475px',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        headline: ['var(--font-headline)', 'Manrope', 'sans-serif'],
      },
      colors: {
        /* Material Design 3 tokens — Super Admin section */
        'sa-primary': '#544fc0',
        'sa-primary-dim': '#4742b3',
        'sa-primary-container': '#e2dfff',
        'sa-primary-fixed-dim': '#d3d0ff',
        'sa-on-primary': '#faf6ff',
        'sa-on-primary-fixed-variant': '#514cbd',
        'sa-secondary': '#605e62',
        'sa-secondary-container': '#e5e1e6',
        'sa-on-secondary': '#fcf8fc',
        'sa-on-secondary-fixed-variant': '#5c5b5f',
        'sa-tertiary': '#575e78',
        'sa-tertiary-container': '#d2d9f8',
        'sa-error': '#9e3f4e',
        'sa-error-dim': '#4f0116',
        'sa-error-container': '#ff8b9a',
        'sa-on-error': '#fff7f7',
        'sa-on-error-container': '#782232',
        'sa-surface': '#f7f9fb',
        'sa-surface-bright': '#f7f9fb',
        'sa-surface-container-lowest': '#ffffff',
        'sa-surface-container-low': '#f0f4f7',
        'sa-surface-container': '#e8eff3',
        'sa-surface-container-high': '#e1e9ee',
        'sa-surface-container-highest': '#d9e4ea',
        'sa-on-surface': '#2a3439',
        'sa-on-surface-variant': '#566166',
        'sa-outline': '#717c82',
        'sa-outline-variant': '#a9b4b9',

        /* Design system tokens — direct CSS var references (hex, no hsl wrapper) */
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        "border-strong": "var(--border-strong)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "tag-bg": "var(--tag-bg)",
        "tag-text": "var(--tag-text)",
        "ds-green": "var(--green)",
        "green-bg": "var(--green-bg)",
        "ds-amber": "var(--amber)",
        "amber-bg": "var(--amber-bg)",
        "ds-blue": "var(--blue)",
        "blue-bg": "var(--blue-bg)",
        "ds-red": "var(--red)",
        "red-bg": "var(--red-bg)",

        /* Shadcn-compatible aliases used by generated UI components */
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--accent)",
        background: "var(--bg)",
        foreground: "var(--text-primary)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "var(--bg)",
        },
        secondary: {
          DEFAULT: "var(--surface2)",
          foreground: "var(--text-primary)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--surface2)",
          foreground: "var(--text-secondary)",
        },
        accent: {
          DEFAULT: "var(--surface2)",
          foreground: "var(--text-primary)",
        },
        popover: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-primary)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-primary)",
        },
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
        xl: "16px",
      },
      fontSize: {
        "mono-label": ["11px", { letterSpacing: "0.08em" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
