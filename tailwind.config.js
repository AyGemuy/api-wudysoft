module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", "[data-theme]"],
  theme: {
    extend: {
      colors: {
        void: "#07090e",
        titanium: "#0f172a",
        cyberCyan: "#38bdf8",
        neonIndigo: "#6366f1"
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"]
      },
      backdropBlur: {
        glass: "26px"
      }
    }
  },
  plugins: []
};