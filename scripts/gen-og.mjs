// Gera a imagem de compartilhamento (Open Graph) 1200x630 em public/og-default.png
// Usa a logo oficial (SVG do CorelDRAW) composta sobre o fundo da marca.
// Rodar quando quiser atualizar: `npm run og`
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../public/og-default.png', import.meta.url));
const logoBrancaPath = fileURLToPath(new URL('../src/assets/brand/logo-branca.svg', import.meta.url));

const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1541A8"/>
      <stop offset="1" stop-color="#0F2E73"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="596" width="1200" height="34" fill="#F30D0E"/>

  <text x="96" y="332" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="70" font-weight="800" fill="#FFFFFF">Brindes personalizados</text>
  <text x="96" y="412" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="70" font-weight="800" fill="#FFFFFF">que marcam sua empresa</text>

  <text x="98" y="482" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="31" font-weight="600" fill="#DCE6FA">Silk screen e gravação a laser · Produção própria · Goiânia</text>
</svg>`;

// Logo oficial (versão negativa/branca) rasterizada e composta por cima.
// Remove os atributos width/height em mm do SVG do Corel antes de rasterizar:
// combinados com viewBox em milhares de unidades, eles confundem o cálculo de
// DPI do libvips e estouram o limite de pixels. Sem eles, o resize usa só o
// viewBox (proporção correta) e a largura alvo em px.
const LOGO_WIDTH = 460;
const svgSemUnidadesFisicas = readFileSync(logoBrancaPath, 'utf8').replace(
  /<svg([^>]*?)\swidth="[^"]*"\s+height="[^"]*"/,
  '<svg$1'
);
const logoBuffer = await sharp(Buffer.from(svgSemUnidadesFisicas))
  .resize({ width: LOGO_WIDTH })
  .png()
  .toBuffer();
const logoMeta = await sharp(logoBuffer).metadata();

await sharp(Buffer.from(bg))
  .composite([{ input: logoBuffer, left: 92, top: 96 }])
  .png()
  .toFile(out);

console.log('OG image gerada em', out, `(logo ${LOGO_WIDTH}x${logoMeta.height})`);
