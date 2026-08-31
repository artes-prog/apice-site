import type { APIRoute } from 'astro';
import { getCatalogoUnificado, codigoSlug } from '../lib/content';
import { normalizar, tokenizar } from '../lib/busca-catalogo';

/*
  Índice de busca do catálogo, gerado no BUILD como arquivo estático.

  Por que arquivo separado e não embutido na página: são mais de 4 mil produtos.
  Embutir tudo deixaria o índice do catálogo pesadíssimo para quem só quer
  navegar por categoria. Assim ele é baixado só quando a busca é usada.

  Vale para as DUAS fontes (catálogo próprio e XBZ) e para qualquer produto
  criado depois no CMS — a lista sai da fonte real de dados, então produto novo
  entra na busca sozinho, sem tocar em código.

  Campos:
    n nome | c código | u url | g categoria
    a atributos  (subcategoria, tags, cores, variações, specs, palavras-chave)
    d descrição  (limitada: as primeiras palavras que ainda agregam algo)

  `a` e `d` já saem NORMALIZADOS e sem repetição — o trabalho pesado acontece
  aqui, uma vez no build, e não no navegador de cada visitante.
*/

/** Quantas palavras da descrição entram no índice, no máximo, por produto. */
const LIMITE_TOKENS_DESCRICAO = 14;

export const GET: APIRoute = async () => {
  const categorias = await getCatalogoUnificado();

  const itens = categorias.flatMap((cat) =>
    cat.produtos.map((p) => {
      // Atributos: tudo que descreve o produto sem ser nome/categoria.
      /*
        Das especificações entra só o VALOR, nunca o rótulo. Rótulo como
        "Medidas aproximadas para gravação", "Altura" ou "Peso aproximado" se
        repete em quase todos os 4 mil produtos: incharia o índice e, pior,
        arruinaria a relevância (buscar "altura" devolveria o catálogo inteiro).
        O que a pessoa realmente procura é o valor — "500ml", "5.5cm".
      */
      const atributos = tokenizar(
        [
          p.subcategoria,
          p.tags.map((t) => t.nome).join(' '),
          p.cores.join(' '),
          p.variacoes.join(' '),
          p.especificacoes.map((e) => e.valor).join(' '),
          p.palavrasChave.join(' '),
        ].join(' ')
      );

      // Descrição: só o que ainda não apareceu em nome/categoria/atributos,
      // com teto — evita inflar o índice com prosa repetida.
      const jaVistos = new Set([...tokenizar(`${p.nome} ${cat.nome}`), ...atributos]);
      const descricao: string[] = [];
      for (const t of tokenizar(p.descricao)) {
        if (jaVistos.has(t)) continue;
        jaVistos.add(t);
        descricao.push(t);
        if (descricao.length >= LIMITE_TOKENS_DESCRICAO) break;
      }

      return {
        n: p.nome,
        c: p.codigo,
        u: `/brindes/catalogo/${cat.slug}/${codigoSlug(p.codigo)}/`,
        g: cat.nome,
        ...(atributos.length ? { a: [...new Set(atributos)].join(' ') } : {}),
        ...(descricao.length ? { d: descricao.join(' ') } : {}),
      };
    })
  );

  return new Response(JSON.stringify(itens), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

// `normalizar` é reexportado só para deixar claro que o índice usa exatamente a
// mesma normalização do motor de busca — se uma mudar, a outra acompanha.
void normalizar;
