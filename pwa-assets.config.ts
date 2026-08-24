import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * Gera os ícones a partir de um SVG só. Os nomes de arquivo seguem o manifest
 * da seção 9.1 do escopo, em vez do padrão da ferramenta.
 */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    assetName: (type, size) => {
      if (type === 'maskable') return 'icon-maskable.png';
      if (type === 'apple') return 'apple-touch-icon.png';
      return `icon-${size.width}.png`;
    },
  },
  images: ['public/icon-source.svg'],
});
