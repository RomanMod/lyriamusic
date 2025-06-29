
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/lyriamusic/', // Установите имя вашего репозитория, если оно другое
  plugins: [
    // Плагин lit() был удален согласно вашему запросу.
    // Vite будет обрабатывать .ts файлы, включая Lit компоненты,
    // используя свои стандартные возможности для TypeScript и JavaScript.
  ],
  define: {
    // Эта опция заменяет 'process.env.API_KEY' в вашем исходном коде
    // значением переменной окружения VITE_GEMINI_API_KEY во время сборки.
    // Убедитесь, что переменная VITE_GEMINI_API_KEY установлена в вашей среде сборки
    // (например, в GitHub Actions Secrets, если вы используете GitHub Actions).
    'process.env.API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY),
    'process.env.GA_MEASUREMENT_ID': JSON.stringify(process.env.VITE_GA_MEASUREMENT_ID)
  },
  build: {
    outDir: 'dist', // Директория для сборки (по умолчанию)
    sourcemap: false, // Можно включить true для отладки продакшн сборки
  }
});