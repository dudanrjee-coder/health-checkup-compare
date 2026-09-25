import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 히어로 배경음악 버튼의 사운드바. 높이 대신 scaleY를 움직여야
      // 레이아웃을 다시 계산하지 않고 부드럽게 돈다.
      keyframes: {
        eq: {
          "0%, 100%": { transform: "scaleY(0.25)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        eq: "eq 0.9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
