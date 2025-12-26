/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}", // 루트 폴더의 모든 파일을 감시
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
