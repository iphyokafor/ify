import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  safelist: [
    "bg-violet-200", "text-violet-800", "ring-violet-300/40",
    "bg-emerald-200", "text-emerald-800", "ring-emerald-300/40",
    "bg-amber-200", "text-amber-800", "ring-amber-300/40",
    "bg-rose-200", "text-rose-800", "ring-rose-300/40",
    "bg-sky-200", "text-sky-800", "ring-sky-300/40",
    "bg-orange-200", "text-orange-800", "ring-orange-300/40",
  ],
  theme: {},
  plugins: [],
};

export default config;
