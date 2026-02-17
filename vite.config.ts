import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync } from 'fs';

function getAppVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';

  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['changelog.md', 'vite.svg'],
      manifest: {
        name: 'SGP - Sistema de Gerenciamento de Pedidos',
        short_name: 'SGP',
        description: 'Sistema de Gerenciamento de Pedidos',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        icons: [
          {
            src: `${base}pwa-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${base}pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['**/pwa-192x192.png', '**/pwa-512x512.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  base,
  define: {
    // Injetar versão do package.json para build web (quando VITE_APP_VERSION não está no .env)
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION || getAppVersion()),
  },
  clearScreen: false,
  server: {
    host: true, // 🔹 Permite acesso de qualquer IP (0.0.0.0)
    port: 1420,
    strictPort: true,
    allowedHosts: ['*'], // 🔹 Aceita requisições de qualquer IP dentro da rede
    cors: true, // 🔹 Libera CORS no ambiente de dev
  },
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separar bibliotecas pesadas em chunks próprios
          if (id.includes('node_modules')) {
            // Bibliotecas de PDF e exportação
            if (id.includes('jspdf') || id.includes('jspdf-autotable')) {
              return 'vendor-pdf';
            }
            // html2canvas
            if (id.includes('html2canvas')) {
              return 'vendor-canvas';
            }
            // papaparse
            if (id.includes('papaparse')) {
              return 'vendor-csv';
            }
            // recharts (gráficos)
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            // Radix UI (componentes UI)
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            // Tauri APIs
            if (id.includes('@tauri-apps')) {
              return 'vendor-tauri';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Axios
            if (id.includes('axios')) {
              return 'vendor-http';
            }
            // Outras dependências grandes
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Todas as outras node_modules
            return 'vendor';
          }
        },
      },
    },
  },
};
});
