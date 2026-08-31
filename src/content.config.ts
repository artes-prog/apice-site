import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod'; // Zod v4 — cópia interna do Astro 7

/*
  ============================================================================
  SCHEMAS DE CONTEÚDO — a "regra de ouro da editabilidade"
  ============================================================================
  Cada campo abaixo casa 1:1 com os arquivos em src/content/. Se um arquivo de
  conteúdo for preenchido com o tipo errado (ou faltar campo obrigatório), o
  BUILD FALHA e aponta o arquivo — o site nunca vai ao ar quebrado.
  ============================================================================
*/

// 'sublimacao' existe só para o rótulo do produto — hoje é usado por um único
// item (caneca de porcelana). Não vira categoria/página própria de técnica
// (o site continua com duas técnicas centrais: laser e silk).
// As três últimas são técnicas específicas que aparecem só como rótulo em
// trabalhos reais do Portfólio (nunca viram categoria/página).
const tecnicaEnum = z.enum([
  'laser', 'silk', 'ambas', 'sublimacao', 'silk-sublimacao',
  'impressao-digital-resinada', 'vinil-transparente', 'silk-fiber-laser',
]);

const categorias = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/categorias' }),
  schema: z.object({
    nome: z.string(),
    slug: z.string(),
    ordem: z.number(),
    tituloSeo: z.string(),
    descricaoSeo: z.string(),
    h1: z.string(),
    intro: z.string(),
    tecnicas: z.array(tecnicaEnum),
    imagemCapa: z.string(),
    destaqueHome: z.boolean(),
    faqSlugs: z.array(z.string()).optional().default([]),
  }),
});

const produtos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/produtos' }),
  schema: z.object({
    nome: z.string(),
    slug: z.string(),
    categoria: z.string(), // slug da categoria (ver src/content/categorias)
    descricaoCurta: z.string(),
    imagens: z.array(z.string()).min(1),
    // null => o site exibe "Sob consulta". Nunca inventar preço.
    precoAPartir: z.number().nullable().default(null),
    // Sempre "consultar": o site NUNCA exibe número de quantidade mínima.
    qtdMinima: z.string().default('consultar'),
    maisPedido: z.boolean().default(false),
    tecnica: tecnicaEnum,
  }),
});

const tecnicas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tecnicas' }),
  schema: z.object({
    nome: z.string(),
    slug: z.string(),
    tituloSeo: z.string(),
    descricaoSeo: z.string(),
    h1: z.string(),
    imagemCapa: z.string(),
    faqSlugs: z.array(z.string()).optional().default([]),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/faq' }),
  schema: z.object({
    slug: z.string(),
    pergunta: z.string(),
    resposta: z.string(),
    // Onde exibir esta pergunta: home | categorias | tecnicas | orcamento | contato
    paginas: z.array(z.string()),
  }),
});

const depoimentos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/depoimentos' }),
  schema: z.object({
    slug: z.string(),
    texto: z.string(),
    autor: z.string(),
    // Opcional: as avaliações do Google são de pessoas físicas, sem empresa.
    empresa: z.string().optional().default(''),
    // De onde veio o depoimento. 'google' exibe o selo de avaliação verificada.
    fonte: z.enum(['google', 'direto']).default('direto'),
    estrelas: z.number().min(1).max(5).default(5),
    // Ordem de exibição (menor primeiro). Empate cai na ordem do arquivo.
    ordem: z.number().default(0),
    // A seção só renderiza itens com publicar:true. Placeholders ficam ocultos.
    publicar: z.boolean().default(false),
  }),
});

/*
  Blog — conteúdo para atrair empresas (RH, marketing, compras) que ainda estão
  pesquisando, antes de procurarem "brindes personalizados Goiânia".
  Markdown: o corpo do texto é editável no painel CMS como texto rico.
  Só entra no ar com publicar:true — rascunho nunca vaza.
*/
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    titulo: z.string(),
    slug: z.string(),
    resumo: z.string(),
    publicadoEm: z.date(),
    atualizadoEm: z.date().optional(),
    imagemCapa: z.string(),
    tituloSeo: z.string(),
    descricaoSeo: z.string(),
    // Categorias do site ligadas ao post (links internos = SEO + conversão).
    categoriasRelacionadas: z.array(z.string()).optional().default([]),
    faqSlugs: z.array(z.string()).optional().default([]),
    publicar: z.boolean().default(false),
  }),
});

const portfolio = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/portfolio' }),
  schema: z.object({
    slug: z.string(),
    cliente: z.string(),
    produto: z.string(),
    tecnica: tecnicaEnum,
    foto: z.string(),
    ordem: z.number().default(0),
    publicar: z.boolean().default(true),
  }),
});

// Catálogo completo do fornecedor XBZ, espelhado com autorização deles.
// Cada arquivo = uma categoria XBZ, com a lista bruta de produtos daquela
// categoria. Fotos são hotlinked direto do servidor da XBZ (sem cópia local),
// sem preço e sem técnica de personalização (o cliente pergunta direto).
const catalogoXbzItem = z.object({
  codigo: z.string(),
  nome: z.string(),
  imagem: z.string(), // caminho relativo no servidor da XBZ, ex.: /img/produtos/1/foo.jpg
  // Campos abaixo só existem depois do scrape detalhado (página individual do
  // produto). Ficam opcionais para a listagem funcionar mesmo antes disso.
  fotos: z.array(z.string()).optional(), // todas as fotos do produto (relativas)
  descricao: z.string().optional(),
  // Genérico de propósito: cada tipo de produto tem specs diferentes (altura/
  // largura/medidas de gravação para canetas, capacidade para garrafas,
  // voltagem para eletrônicos...). Cada item é o rótulo exato da XBZ + valor.
  especificacoes: z.array(z.object({ label: z.string(), valor: z.string() })).optional(),
  tags: z.array(z.object({ nome: z.string(), href: z.string() })).optional(),
});

const catalogoXbz = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/catalogo-xbz' }),
  schema: z.object({
    nome: z.string(),
    slug: z.string(),
    produtos: z.array(catalogoXbzItem),
  }),
});

/*
  ============================================================================
  CATÁLOGO PRÓPRIO — categorias e produtos da própria Ápice
  ============================================================================
  Por que uma collection separada da catalogo-xbz, e não os mesmos arquivos:

  1. IMAGEM. O catálogo XBZ é espelhado e as fotos são hotlinked do servidor
     deles (urlImagemXbz). Aqui as fotos são ARQUIVOS NOSSOS, enviados pelo
     CMS para src/assets/img — sem URL externa, sem hotlink.
  2. SYNC. scratch/sync-catalog.js reescreve os 48 arquivos da XBZ toda semana.
     Produto nosso ali seria sobrescrito/perdido.
  3. CMS. A pasta da XBZ fica de fora do painel justamente por ser automática;
     esta aqui é 100% editável.

  A ESTRUTURA é a mesma (mesmas rotas, mesmos cards, mesma página de produto):
  as páginas leem as duas fontes por uma camada única em lib/content.ts.
  Um arquivo por produto — igual à collection `produtos` que o CMS já usa.
  ============================================================================
*/
const catalogoProprioCategorias = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/catalogo-proprio-categorias' }),
  schema: z.object({
    nome: z.string(),
    slug: z.string(),
    descricao: z.string().optional().default(''),
    /*
      Texto que aparece na página de cada produto desta categoria, logo acima
      dos botões de orçamento, explicando COMO personalizamos. Cada categoria
      tem a sua técnica: botons e pins não são personalizados do mesmo jeito que
      canecas. Vazio esconde o parágrafo.
    */
    notaPersonalizacao: z.string().optional().default(''),
    // Ordem das subcategorias nos filtros. Subcategoria usada por um produto
    // e ausente daqui ainda aparece (o filtro é derivado dos produtos).
    subcategorias: z.array(z.string()).optional().default([]),
    ordem: z.number().default(0),
    publicar: z.boolean().default(true),
  }),
});

const catalogoProprioProdutos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/catalogo-proprio-produtos' }),
  schema: z.object({
    codigo: z.string(),
    nome: z.string(),
    categoria: z.string(), // slug em catalogo-proprio-categorias
    subcategoria: z.string().optional().default(''),
    descricao: z.string().optional().default(''),
    // Fotos LOCAIS (caminho relativo a src/assets/img). Vazio => o site usa o
    // mesmo placeholder dos demais produtos sem foto (Foto.astro).
    fotos: z.array(z.string()).optional().default([]),
    // Genérico como no XBZ: cada produto tem specs diferentes.
    especificacoes: z.array(z.object({ label: z.string(), valor: z.string() })).optional().default([]),
    cores: z.array(z.string()).optional().default([]),
    // Variações do MESMO produto (ex.: tamanhos do botton americano) — não
    // viram produtos separados.
    variacoes: z.array(z.string()).optional().default([]),
    // Sinônimos para a busca (boton/botton/pin/pino/alfinete...). Editável no CMS.
    palavrasChave: z.array(z.string()).optional().default([]),
    ordem: z.number().default(0),
    publicar: z.boolean().default(true),
  }),
});

export const collections = {
  categorias, produtos, tecnicas, faq, depoimentos, portfolio, blog,
  catalogoXbz, catalogoProprioCategorias, catalogoProprioProdutos,
};
