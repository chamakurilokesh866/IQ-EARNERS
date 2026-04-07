module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFeatureSettings: {
        numeric: '"tnum"',
      },
      colors: {
        navy: {
          900: "#0c1b2a",
          800: "#0f2538",
          700: "#132f47",
          600: "#173957",
          500: "#1e4a6a",
          300: "#7b8da3"
        },
        primary: "#7c3aed",
        "primary-focus": "#5b21b6",
        accent: "#14b8a6",
        mint: "#5eead4",
        success: "#22c55e",
        purple: { 500: "#a855f7" },
        cyan: { 500: "#06b6d4" }
      },
      boxShadow: {
        card: "0 10px 20px rgba(0,0,0,0.2)"
      }
    }
  },
  plugins: []
}
