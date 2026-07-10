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
  return deps.filter((d) => d.data.publicar);
}

/** Nome amigável da técnica, para textos e mensagens. */
export function nomeTecnica(t: 'laser' | 'silk' | 'ambas'): string {
  if (t === 'laser') return 'gravação a laser';
  if (t === 'silk') return 'silk screen';
  return 'silk screen e gravação a laser';
}
