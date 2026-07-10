// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Domínio final de produção. Ao trocar de domínio, altere APENAS esta linha:
// ela alimenta canonical, OG, sitemap e JSON-LD do site inteiro.
const SITE = 'https://apicebrindes.com';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // páginas utilitárias fora do índice de busca
      filter: (page) => !page.includes('/politica-de-privacidade/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
