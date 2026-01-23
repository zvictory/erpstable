
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: "#0f172a", // Slate-900
                status: {
                    success: "#059669", // Emerald-600
                    warning: "#f59e0b", // Amber-500
                    danger: "#e11d48", // Rose-600
                    info: "#6366f1", // Indigo-500
                },
            },
            fontSize: {
                xs: "11px",
                sm: "13px",
                base: "15px",
                lg: "17px",
                xl: "20px",
                "2xl": "24px",
            },
            fontWeight: {
                medium: "600",
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
        },
    },
    plugins: [],
};
export default config;
