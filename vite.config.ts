/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registro embutido no index.html. O módulo virtual do plugin puxaria
      // workbox-window, que não está na tabela da seção 4 e não é preciso:
      // com autoUpdate o próprio service worker assume sozinho.
      injectRegister: 'inline',
      // O manifest da seção 9.1, ao pé da letra.
      manifest: {
        name: 'CashFlow',
        short_name: 'CashFlow',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#EDECE8',
        theme_color: '#EDECE8',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Offline-first de verdade: tudo entra no precache, inclusive as
        // fontes, porque não existe servidor para buscar nada depois.
        globPatterns: ['**/*.{html,js,css,woff2,png,svg,ico}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
