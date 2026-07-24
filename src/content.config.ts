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
    empresa: z.string(),
    // A seção só renderiza itens com publicar:true. Placeholders ficam ocultos.
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

export const collections = { categorias, produtos, tecnicas, faq, depoimentos, portfolio, catalogoXbz };
