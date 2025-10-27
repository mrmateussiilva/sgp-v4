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
    },
  },
  build: {
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
