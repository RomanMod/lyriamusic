
import { defineConfig } from 'vite';
import fs from 'node:fs';

function resolveApiKey(): string {
  // Check .dev.env.json files first
  const envPaths = ['/app/.dev.env.json', './.dev.env.json'];
  for (const p of envPaths) {
    try {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (data.GEMINI_API_KEY && data.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' && data.GEMINI_API_KEY.startsWith('AIzaSy')) {
          return data.GEMINI_API_KEY;
        }
      }
    } catch {}
  }
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ];
  for (const c of candidates) {
    if (c && c !== 'MY_GEMINI_API_KEY' && c.startsWith('AIzaSy')) {
      return c;
    }
  }
  for (const c of candidates) {
    if (c && c !== 'MY_GEMINI_API_KEY' && c.trim() !== '') {
      return c;
    }
  }
  return '';
}

const apiKey = resolveApiKey();
const gaId = process.env.VITE_GA_MEASUREMENT_ID || process.env.GA_MEASUREMENT_ID || '';

export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  plugins: [
    {
      name: 'env-transform',
      transform(code, id) {
        if (id.includes('node_modules')) return null;
        let modified = code;
        if (code.includes('API_KEY')) {
          modified = modified.replace(/process\.env(\??\.)API_KEY/g, JSON.stringify(apiKey));
        }
        if (code.includes('GA_MEASUREMENT_ID')) {
          modified = modified.replace(/process\.env(\??\.)GA_MEASUREMENT_ID/g, JSON.stringify(gaId));
        }
        return modified !== code ? modified : null;
      },
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `    <script>
      window.process = window.process || { env: {} };
      window.process.env = window.process.env || {};
      window.process.env.API_KEY = ${JSON.stringify(apiKey)};
      window.process.env.GA_MEASUREMENT_ID = ${JSON.stringify(gaId)};
    </script>
  </head>`
        );
      }
    }
  ],
  define: {
    'process.env.API_KEY': JSON.stringify(apiKey),
    'process.env.GA_MEASUREMENT_ID': JSON.stringify(gaId),
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey),
    'import.meta.env.GEMINI_API_KEY': JSON.stringify(apiKey),
    'import.meta.env.VITE_GA_MEASUREMENT_ID': JSON.stringify(gaId)
  },
  build: {
    outDir: 'dist', // Директория для сборки (по умолчанию)
    sourcemap: false, // Можно включить true для отладки продакшн сборки
  }
});