import { getCollection, type CollectionEntry } from 'astro:content';

/*
  Helpers de leitura das collections — uma camada fina para as páginas não
  repetirem lógica de ordenação/filtragem.
*/

export type Categoria = CollectionEntry<'categorias'>;
export type Produto = CollectionEntry<'produtos'>;
export type Tecnica = CollectionEntry<'tecnicas'>;
export type Faq = CollectionEntry<'faq'>;
export type Depoimento = CollectionEntry<'depoimentos'>;
export type ItemPortfolio = CollectionEntry<'portfolio'>;
export type CategoriaXbz = CollectionEntry<'catalogoXbz'>;
export type Post = CollectionEntry<'blog'>;

/** Categorias na ordem definida pelo campo `ordem`. */
export async function getCategorias(): Promise<Categoria[]> {
  const cats = await getCollection('categorias');
  return cats.sort((a, b) => a.data.ordem - b.data.ordem);
}

/** Categorias marcadas para aparecer na home. */
export async function getCategoriasDestaque(): Promise<Categoria[]> {
  const cats = await getCategorias();
  return cats.filter((c) => c.data.destaqueHome);
}

/** Produtos de uma categoria (pelo slug), com os "Mais pedido" na frente. */
export async function getProdutosDaCategoria(slug: string): Promise<Produto[]> {
  const produtos = await getCollection('produtos');
  return produtos
    .filter((p) => p.data.categoria === slug)
    .sort((a, b) => Number(b.data.maisPedido) - Number(a.data.maisPedido));
}

/** FAQs que devem aparecer em uma página específica (campo `paginas`). */
export async function getFaqsDaPagina(pagina: string): Promise<Faq[]> {
  const faqs = await getCollection('faq');
  return faqs.filter((f) => f.data.paginas.includes(pagina));
}

/** FAQs por lista explícita de slugs, na ordem pedida (usado por categoria/técnica). */
export async function getFaqsPorSlugs(slugs: string[]): Promise<Faq[]> {
  if (!slugs?.length) return [];
  const faqs = await getCollection('faq');
  const mapa = new Map(faqs.map((f) => [f.data.slug, f]));
  return slugs.map((s) => mapa.get(s)).filter((f): f is Faq => Boolean(f));
}

/** Só depoimentos autorizados (publicar:true). Placeholders nunca vazam. */
export async function getDepoimentosPublicados(): Promise<Depoimento[]> {
  const deps = await getCollection('depoimentos');
  return deps.filter((d) => d.data.publicar).sort((a, b) => a.data.ordem - b.data.ordem);
}

/** Trabalhos de portfólio autorizados (publicar:true), na ordem definida. */
/** Posts publicados, do mais recente para o mais antigo. Rascunho nunca aparece. */
export async function getPostsPublicados(): Promise<Post[]> {
  const posts = await getCollection('blog');
  return posts
    .filter((p) => p.data.publicar)
    .sort((a, b) => b.data.publicadoEm.getTime() - a.data.publicadoEm.getTime());
}

/**
 * Data no formato que o leitor entende (ex.: "14 de agosto de 2026").
 *
 * timeZone UTC de propósito: no frontmatter a data vem sem hora ("2026-08-14"),
 * e o Astro a interpreta como meia-noite UTC. Formatando no fuso do Brasil
 * (-3h), isso voltaria para as 21h do dia anterior e o post apareceria com a
 * data errada — um dia a menos do que foi escrito no arquivo.
 */
export function dataPorExtenso(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export async function getPortfolioPublicado(): Promise<ItemPortfolio[]> {
  const itens = await getCollection('portfolio');
  return itens.filter((i) => i.data.publicar).sort((a, b) => a.data.ordem - b.data.ordem);
}

/** Categorias do catálogo completo XBZ, em ordem alfabética. */
export async function getCatalogoXbz(): Promise<CategoriaXbz[]> {
  const cats = await getCollection('catalogoXbz');
  return cats.sort((a, b) => a.data.nome.localeCompare(b.data.nome, 'pt-BR'));
}

/*
  ============================================================================
  CATÁLOGO UNIFICADO — XBZ (espelhado) + próprio (nosso, editável no CMS)
  ============================================================================
  As páginas do catálogo NÃO devem saber de qual fonte veio o produto: as rotas,
  os cards, os filtros e a busca são os mesmos. A única diferença real é a
  imagem — a da XBZ é hotlink no servidor deles, a nossa é arquivo local — e
  por isso cada produto carrega o campo `fonte`, usado só na hora de renderizar.
  ============================================================================
*/
export type FonteCatalogo = 'xbz' | 'propria';

export interface ProdutoCatalogo {
  fonte: FonteCatalogo;
  codigo: string;
  nome: string;
  subcategoria: string;
  /** XBZ: caminho no servidor deles. Própria: caminho em src/assets/img (ou vazio). */
  imagem: string;
  fotos: string[];
  descricao: string;
  especificacoes: { label: string; valor: string }[];
  tags: { nome: string; href: string }[];
  cores: string[];
  variacoes: string[];
  palavrasChave: string[];
}

export interface CategoriaCatalogo {
  fonte: FonteCatalogo;
  nome: string;
  slug: string;
  descricao: string;
  /**
   * Como personalizamos os produtos desta categoria, exibido na página do
   * produto. Vazio = o site usa a nota padrão (caso das categorias XBZ).
   */
  notaPersonalizacao: string;
  /** Ordem preferida das subcategorias nos filtros (só no catálogo próprio). */
  subcategorias: string[];
  produtos: ProdutoCatalogo[];
}

function normalizarProdutoXbz(p: CategoriaXbz['data']['produtos'][number]): ProdutoCatalogo {
  return {
    fonte: 'xbz',
    codigo: p.codigo,
    nome: p.nome,
    subcategoria: '',
    imagem: p.imagem,
    fotos: p.fotos ?? [],
    descricao: p.descricao ?? '',
    especificacoes: p.especificacoes ?? [],
    tags: p.tags ?? [],
    cores: [],
    variacoes: [],
    palavrasChave: [],
  };
}

/**
 * Todas as categorias do catálogo (própria + XBZ), em ordem alfabética.
 * As nossas vêm primeiro dentro do mesmo nome só por desempate.
 */
export async function getCatalogoUnificado(): Promise<CategoriaCatalogo[]> {
  const [xbz, cats, prods] = await Promise.all([
    getCollection('catalogoXbz'),
    getCollection('catalogoProprioCategorias'),
    getCollection('catalogoProprioProdutos'),
  ]);

  const proprias: CategoriaCatalogo[] = cats
    .filter((c) => c.data.publicar)
    .sort((a, b) => a.data.ordem - b.data.ordem)
    .map((c) => ({
      fonte: 'propria' as const,
      nome: c.data.nome,
      slug: c.data.slug,
      descricao: c.data.descricao,
      notaPersonalizacao: c.data.notaPersonalizacao,
      subcategorias: c.data.subcategorias,
      produtos: prods
        .filter((p) => p.data.publicar && p.data.categoria === c.data.slug)
        .sort((a, b) => a.data.ordem - b.data.ordem || a.data.nome.localeCompare(b.data.nome, 'pt-BR'))
        .map((p) => ({
          fonte: 'propria' as const,
          codigo: p.data.codigo,
          nome: p.data.nome,
          subcategoria: p.data.subcategoria,
          imagem: p.data.fotos[0] ?? '',
          fotos: p.data.fotos,
          descricao: p.data.descricao,
          especificacoes: p.data.especificacoes,
          tags: [],
          cores: p.data.cores,
          variacoes: p.data.variacoes,
          palavrasChave: p.data.palavrasChave,
        })),
    }));

  const doXbz: CategoriaCatalogo[] = xbz.map((c) => ({
    fonte: 'xbz' as const,
    nome: c.data.nome,
    slug: c.data.slug,
    descricao: '',
    // Categoria XBZ não é editável no CMS: cai na nota padrão do site.
    notaPersonalizacao: '',
    subcategorias: [],
    produtos: c.data.produtos.map(normalizarProdutoXbz),
  }));

  return [...proprias, ...doXbz].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Uma categoria do catálogo (qualquer fonte) pelo slug. */
export async function getCategoriaCatalogo(slug: string): Promise<CategoriaCatalogo | undefined> {
  return (await getCatalogoUnificado()).find((c) => c.slug === slug);
}

/** Uma categoria do catálogo XBZ pelo slug. */
export async function getCategoriaXbz(slug: string): Promise<CategoriaXbz | undefined> {
  const cats = await getCollection('catalogoXbz');
  return cats.find((c) => c.data.slug === slug);
}

/** URL pública (hotlink) de uma imagem do catálogo XBZ. */
export function urlImagemXbz(caminho: string): string {
  return `https://www.xbzbrindes.com.br${caminho}`;
}

/**
 * Códigos da XBZ podem ter caracteres inválidos em URL/pasta (@, *, espaço).
 * Usado tanto para gerar a rota quanto para montar o link — precisa ser a
 * MESMA função nos dois lugares, senão o link não bate com a página gerada.
 */
export function codigoSlug(codigo: string): string {
  return codigo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Nome amigável da técnica, para textos e mensagens. */
export function nomeTecnica(
  t: 'laser' | 'silk' | 'ambas' | 'sublimacao' | 'silk-sublimacao' | 'impressao-digital-resinada' | 'vinil-transparente' | 'silk-fiber-laser'
): string {
  if (t === 'laser') return 'gravação com Fiber Laser';
  if (t === 'silk') return 'Silk Screen';
  if (t === 'sublimacao') return 'sublimação';
  if (t === 'silk-sublimacao') return 'Silk Screen e sublimação';
  if (t === 'impressao-digital-resinada') return 'Impressão Digital Resinada';
  if (t === 'vinil-transparente') return 'Vinil Transparente';
  if (t === 'silk-fiber-laser') return 'Silk Screen + Fiber Laser';
  return 'Silk Screen e gravação com Fiber Laser';
}
