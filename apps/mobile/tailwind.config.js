/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6", // blue-500
        danger: "#ef4444",  // red-500
        success: "#10b981", // green-500
        muted: "#6b7280",   // gray-500
        accent: "#2563eb",  // blue-600
      },
    },
  },
  plugins: [],
}

