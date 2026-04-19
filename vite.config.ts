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
  const isTauri = !!process.env.TAURI_PLATFORM || !!process.env.TAURI_ENV_PLATFORM || !!process.env.TAURI_ENV_FAMILY;
  const base = isTauri ? './' : env.VITE_BASE_PATH || '/';

  return {
    plugins: [
      react(),
      ...(!isTauri ? [VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        includeAssets: ['changelog.md'],
        manifest: {
          name: 'SGP - Sistema de Gerenciamento de Pedidos',
          short_name: 'SGP',
          description: 'Sistema completo de Gerenciamento de Pedidos com controle de produção e relatórios.',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
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
              purpose: 'any',
            },
            {
              src: `${base}pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,svg}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      })] : []),
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
              // Todas as outras node_modules
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
