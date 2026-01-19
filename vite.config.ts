import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
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
});
