# Ápice Brindes — site

Site institucional e de geração de orçamentos da **Ápice Brindes** (Goiânia/GO).
Feito em **Astro 7 + Tailwind v4**, 100% estático, focado em SEO e conversão pelo WhatsApp.

- **Não é e-commerce**: cada página conduz a UMA ação — orçamento no WhatsApp.
- **Editável sem código**: todo texto/produto/telefone vem de arquivos de conteúdo.
- **SEO em camadas**: JSON-LD (LocalBusiness, Breadcrumb, Product, FAQPage, Service), sitemap, OG.

---

## Rodar localmente

```sh
npm install       # instala dependências (Node 22+)
npm run dev       # servidor de desenvolvimento em http://localhost:4321
npm run build     # gera o site estático em ./dist
npm run preview   # pré-visualiza a build de produção
npm run og        # regenera a imagem de compartilhamento (public/og-default.png)
```

Se o build falhar, ele aponta o arquivo de conteúdo com campo inválido — o site
nunca vai ao ar quebrado.

---

## Como editar o site (sem programar)

Tudo que é "conteúdo de negócio" está fora dos componentes:

| O que mudar | Onde | Observação |
| --- | --- | --- |
| Telefone, endereço, horário, redes | `src/data/site.json` | Um lugar só. Alimenta rodapé, contato e JSON-LD juntos. |
| CEP e Instagram (pendentes) | `src/data/site.json` | Estão como `PREENCHER`; o site já funciona sem eles. |
| Adicionar/editar categoria | `src/content/categorias/*.json` | A página `/brindes/<slug>/` é gerada automaticamente. |
| Adicionar/editar produto | `src/content/produtos/*.json` | `precoAPartir: null` → mostra "Sob consulta". |
| Textos das técnicas (SEO forte) | `src/content/tecnicas/*.md` | Corpo em Markdown. |
| Perguntas do FAQ | `src/content/faq/*.json` | Campo `paginas` decide onde cada uma aparece. |
| Publicar depoimento | `src/content/depoimentos/*.json` | Trocar o texto e pôr `publicar: true`. Placeholders ficam ocultos. |
| Cores e fontes da marca | `src/styles/global.css` (bloco `@theme`) | Fonte única dos tokens. |

Depois de editar: `commit` → o Cloudflare Pages publica sozinho.

### Colocar as fotos reais

O componente `Foto` usa um placeholder SVG neutro até a foto existir. Para publicar
a foto real, basta soltar o arquivo em `src/assets/img/<mesmo caminho do conteúdo>`:

- conteúdo diz `"produtos/caneca-ceramica.jpg"` → salve em `src/assets/img/produtos/caneca-ceramica.jpg`
- o Astro converte para WebP/AVIF automaticamente. Nenhum código muda.

Prioridade (maior alavanca de conversão): closes reais de **laser** e **silk**
(`tecnicas/laser-hero.jpg`, `tecnicas/silk-hero.jpg`).

---

## Deploy (Cloudflare Pages)

1. Suba este projeto (`apice-site/`) para um repositório Git.
2. No Cloudflare Pages: **Build command** `npm run build`, **Output directory** `dist`.
3. Aponte o domínio `apicebrindes.com` para o Pages.
4. **Antes do go-live:** preencha os redirects 301 das URLs antigas em
   `public/_redirects` (levante-as no Google Search Console).

`public/_headers` já traz cabeçalhos de segurança e cache imutável dos assets.

---

## Estrutura

```text
src/
  data/site.json         ← painel de controle do negócio (NAP, atendentes)
  content/               ← categorias, produtos, tecnicas, faq, depoimentos
  content.config.ts      ← schemas Zod (validam o conteúdo no build)
  components/            ← UI + conversão (CtaWhatsApp, cards, FAQ, etc.)
  components/seo/        ← SeoHead + JSON-LD (LocalBusiness, Product, Service)
  layouts/               ← BaseLayout + TecnicaPage
  pages/                 ← rotas (home, /brindes/[slug], técnicas, orçamento…)
  lib/                   ← whatsapp.ts (CTAs) + content.ts (consultas)
  styles/global.css      ← tokens da marca (@theme) + base
public/                  ← _redirects, _headers, robots.txt, og-default.png, favicon
scripts/                 ← gen-og.mjs, check-jsonld.mjs (utilitários)
```

## Pendências para o cliente (o site funciona sem, fica completo com)

- [ ] Logo oficial em SVG (colorido + negativo) exportado do Corel → `src/components/Logo.astro` ou `src/assets/brand/`.
- [ ] Conferir HEX/fontes contra o Guia de Estilo (págs. 4–5) em `src/styles/global.css`.
- [ ] Fotos reais (técnicas primeiro, depois produtos).
- [ ] CEP, handle do Instagram, coordenadas `geo` e URL do Google Business em `src/data/site.json`.
- [ ] 3–5 depoimentos reais autorizados.
- [ ] Redirects 301 das URLs antigas do WordPress em `public/_redirects`.
- [ ] Escolher e plugar analytics leve (Plausible ou Cloudflare Web Analytics) — o evento de clique de CTA já está pronto para ser capturado.
