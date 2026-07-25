import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Covil — MMORPG idle',
        short_name: 'Covil',
        description:
          'Monte seu grupo, defina a doutrina e deixe-os caçar. O covil não espera você estar olhando.',
        lang: 'pt-BR',
        theme_color: '#12100f',
        background_color: '#12100f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['games'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // O shell abre offline mostrando o último estado conhecido.
        navigateFallback: 'index.html',
      },
    }),
  ],
  // O core é um pacote do workspace em TypeScript compilado — não pré-empacotar.
  optimizeDeps: { exclude: ['@covil/core'] },
  server: { host: true, port: 5173 },
});
