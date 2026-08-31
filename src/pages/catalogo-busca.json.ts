import type { APIRoute } from 'astro';
import { getCatalogoUnificado, codigoSlug } from '../lib/content';

/*
  Índice de busca do catálogo, gerado no BUILD como um arquivo estático.

  Por que um arquivo separado e não os produtos embutidos na página:
  o catálogo tem mais de 4 mil produtos. Embutir tudo no HTML do índice
  deixaria a página pesadíssima para quem só quer navegar por categoria.
  Assim o arquivo é baixado só quando a pessoa realmente usa a busca, e a
  página continua leve.

  Vale para as DUAS fontes (catálogo próprio e XBZ) e para qualquer produto
  criado depois no CMS — a lista é montada a partir da fonte real de dados,
  então produto novo entra na busca sozinho, sem tocar em código.

  Campos curtos de propósito (n/c/u/k/g), para o arquivo ficar pequeno.
*/
export const GET: APIRoute = async () => {
  const categorias = await getCatalogoUnificado();

  const itens = categorias.flatMap((cat) =>
    cat.produtos.map((p) => ({
      n: p.nome,
      c: p.codigo,
      u: `/brindes/catalogo/${cat.slug}/${codigoSlug(p.codigo)}/`,
      g: cat.nome, // categoria, exibida no resultado
      // sinônimos + subcategoria: fazem "boton", "pino" e "oval" acharem a peça
      ...(p.palavrasChave.length || p.subcategoria
        ? { k: [...p.palavrasChave, p.subcategoria].filter(Boolean).join(' ') }
        : {}),
    }))
  );

  return new Response(JSON.stringify(itens), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
