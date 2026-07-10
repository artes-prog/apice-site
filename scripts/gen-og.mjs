// Gera a imagem de compartilhamento (Open Graph) 1200x630 em public/og-default.png
// Rodar quando quiser atualizar: `npm run og`
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../public/og-default.png', import.meta.url));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#003DA5"/>
      <stop offset="1" stop-color="#002B75"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="596" width="1200" height="34" fill="#E30613"/>

  <g transform="translate(96,116)">
    <path d="M40 0 L80 76 L0 76 Z" fill="#FFFFFF"/>
    <path d="M40 30 L60 70 L20 70 Z" fill="#E30613"/>
  </g>

  <text x="196" y="150" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="46" font-weight="800" fill="#FFFFFF" letter-spacing="1">ÁPICE</text>
  <text x="198" y="190" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="22" font-weight="600" fill="#FFFFFF" letter-spacing="10">BRINDES</text>

  <text x="96" y="332" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="70" font-weight="800" fill="#FFFFFF">Brindes personalizados</text>
  <text x="96" y="412" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="70" font-weight="800" fill="#FFFFFF">que marcam sua empresa</text>

  <text x="98" y="482" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="31" font-weight="600" fill="#DCE6FA">Silk screen e gravação a laser · Produção própria · Goiânia</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('OG image gerada em', out);
