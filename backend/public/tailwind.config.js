/** @type {import('tailwindcss').Config} */
module.exports = {
  // 扫描所有 HTML 和 JS 文件，提取使用的 CSS 类
  content: [
    "./*.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
