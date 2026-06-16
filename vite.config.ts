import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// O app é publicado no GitHub Pages em /financeos/.
// Em desenvolvimento (dev) servimos da raiz para facilitar.
// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/financeos/' : '/';
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'Crédito Control — Controle de Empréstimos',
          short_name: 'Crédito',
          description:
            'Controle de empréstimos, parcelas, recebimentos, lucro e cobrança.',
          lang: 'pt-BR',
          theme_color: '#059669',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          icons: [
            {
              src: 'icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: `${base}index.html`,
        },
      }),
    ],
  };
});
