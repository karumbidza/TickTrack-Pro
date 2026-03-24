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
      },
      colors: {
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
