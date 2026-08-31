/*
  Filtros do catálogo — extraídos SÓ das tags reais da XBZ (curadas por eles). Não usamos mais
  palavras do nome do produto como filtro: era a origem de todo o ruído ("Metros", "Funções"...)
  e exigia heurística frágil por categoria. Tags da XBZ vêm prontas no sync semanal, então a
  barra de filtro se mantém limpa e atualizada sozinha. Módulo único reaproveitado pela página
  (data-filtros) e pelo script de auditoria (garante que nenhum filtro fique "morto").
*/

export const FILTRO_SEP = '|';
const MIN_OCORRENCIAS = 2;
const RATIO_MAXIMA = 0.8; // filtro que bate em >80% dos produtos não ajuda a discriminar nada
const LIMIAR_DOMINANCIA = 0.85; // filtro cujos produtos já estão ~todos cobertos por outro é redundante
const MAX_FILTROS = 6; // barra enxuta: no máximo 6 tipos, os mais frequentes

export type Tag = { nome: string; href: string };
export type ProdutoXbz = { nome: string; imagem: string; codigo?: string; tags?: Tag[] };

const CONECTORES_LABEL = new Set(['e', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'para', 'com', 'a', 'o']);

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Normaliza plural simples (kits→kit, canetas→caneta) só para comparar candidatos, nunca para exibir. */
function stem(palavra: string): string {
  const p = semAcento(palavra);
  if (p.length > 3 && p.endsWith('s')) return p.slice(0, -1);
  return p;
}

/** Espaço E hífen contam como separador de palavra só para comparar candidatos (nunca para exibir). */
function stemsDoTexto(texto: string): Set<string> {
  return new Set(texto.split(/[\s-]+/).filter(Boolean).map(stem));
}

function subconjuntoDe(sub: Set<string>, todo: Set<string>): boolean {
  return sub.size > 0 && [...sub].every((s) => todo.has(s));
}

/** Tags decorativas de campanha (ex.: "***DIA DOS PAIS***") não são atributo de produto. */
function ehTagRuido(nome: string): boolean {
  return /\*/.test(nome);
}

/*
  Normaliza uma tag da XBZ para uso como filtro: minúsculas, sem parênteses de explicação
  (ex.: "Power Banks (Armazenam e Transferem Carga)" -> "power banks") e sem espaços sobrando.
  Os parentéticos são descrição técnica, poluem o rótulo do chip e nunca ajudam a filtrar.
*/
function normalizarTag(nome: string): string {
  return nome
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/*
  Filtros vêm SÓ das tags reais da XBZ (curadas por eles, hierárquicas e confiáveis) — nunca
  de palavras soltas do nome do produto, que geravam ruído sem sentido ("Metros", "Funções",
  "Emborrachada"...). Categoria sem tags úteis fica sem barra de filtro (a busca continua).
*/
function palavrasChave(p: ProdutoXbz, nomeCategoria: string): string[] {
  if (!p.tags || p.tags.length === 0) return [];
  const stemsCategoria = stemsDoTexto(nomeCategoria.toLowerCase());
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const t of p.tags) {
    if (ehTagRuido(t.nome)) continue; // tags decorativas de campanha (***DIA DOS PAIS*** etc.)
    const nome = normalizarTag(t.nome);
    if (!nome || vistos.has(nome)) continue;
    // tag igual (mesmo no plural/singular) ao nome da própria categoria não discrimina nada
    const stemsTag = stemsDoTexto(nome);
    if (stemsTag.size === stemsCategoria.size && subconjuntoDe(stemsTag, stemsCategoria)) continue;
    vistos.add(nome);
    out.push(nome);
  }
  return out;
}

export type PlanoFiltros = {
  /** Chips a mostrar na barra de filtro, na ordem de exibição. */
  filtros: string[];
  /**
   * Para cada produto (mesmo índice de `produtos`), as chaves já canonicalizadas: um filtro
   * absorvido por outro (ex.: "conjunto caneta e lapiseira" → "caneta e lapiseira") é substituído
   * pelo vencedor, para que clicar no chip sobrevivente encontre TODOS os produtos que ele
   * representa — sem isso o chip mostrado engana o comprador, contando menos produtos do que diz.
   */
  chavesPorProduto: string[][];
};

/**
 * Monta o plano de filtros de uma categoria a partir das tags reais da XBZ, descartando as que
 * não ajudam o comprador e fundindo as redundantes — devolve tanto os chips quanto o mapeamento
 * já canonicalizado usado para testar cada produto contra cada chip. Regras de descarte/fusão:
 * - tag rara (<2 produtos), que bate em >80% da categoria, ou que só repete o nome da própria
 *   categoria (ex.: "Squeeze" dentro de "Squeezes e Garrafas") não discrimina nada;
 * - variações no singular/plural ("kit"/"kits") viram um só filtro;
 * - tags de 2+ palavras que na prática selecionam quase os mesmos produtos (ex.: "Caneta e
 *   Lapiseira"/"Conjunto Caneta e Lapiseira") mantêm só a mais abrangente;
 * - no máximo `max` chips, os de mais produtos primeiro.
 */
export function criarPlanoDeFiltros(produtos: ProdutoXbz[], nomeCategoria: string, max = MAX_FILTROS): PlanoFiltros {
  const chavesPorProduto = produtos.map((p) => palavrasChave(p, nomeCategoria));

  const freq = new Map<string, number>();
  for (const chaves of chavesPorProduto) {
    for (const w of chaves) freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  const stemsCategoria = stemsDoTexto(nomeCategoria.toLowerCase());
  const total = produtos.length;
  const candidatos = Array.from(freq.entries())
    .filter(([, count]) => count >= MIN_OCORRENCIAS && count / total <= RATIO_MAXIMA)
    .map(([texto, count]) => {
      // "palavras" (só espaço) define a "categoria" do candidato (multi-palavra é protegido);
      // "stems" (espaço + hífen) é só para comparação, então "porta-retrato" enxerga que já
      // existem os chips soltos "porta" e "retrato" e não vira um quarto chip redundante.
      const palavras = texto.split(/\s+/).filter(Boolean);
      const stems = stemsDoTexto(texto);
      return { texto, count, palavras, stems };
    })
    // um candidato que só repete palavras do nome da própria categoria (ex.: "porta" e "retrato"
    // dentro de "Porta-retratos") não discrimina nada — todo produto da página já é isso.
    .filter((c) => !subconjuntoDe(c.stems, stemsCategoria))
    .sort((a, b) => b.palavras.length - a.palavras.length || b.count - a.count);

  // canonMap: texto original -> lista de filtros vencedores que o representam. Todo candidato
  // absorvido entra aqui para que os produtos dele continuem batendo com o chip sobrevivente.
  const canonMap = new Map<string, string[]>();
  // null = duas (ou mais) tags específicas diferentes usam esse stem — não dá pra saber qual
  // delas representa de verdade um produto que só tem a palavra genérica, então não funde.
  const donoDoStem = new Map<string, string | null>();

  // Passo 1: candidato de 1 "palavra" (pode ter hífen, ex. "porta-retrato") cujos stems já estão
  // cobertos pelos filtros já aceitos (individualmente ou em conjunto) é absorvido por eles — mas
  // só quando o dono é inequívoco e já cobre uma fração razoável do candidato genérico. Sem essas
  // travas: (a) uma tag rara e precisa (ex.: "Kits Executivos", 3 produtos) "engoliria" uma
  // palavra genérica bem maior ("kit", 29 produtos) e passaria a mentir sobre o que representa;
  // (b) uma palavra ambígua entre dois filtros específicos (ex.: "espelho" -> "Espelho de Bolso"
  // OU "Espelho de Mesa") escolheria um dono arbitrário e inflaria o errado. Nesses casos o certo
  // é descartar a palavra genérica, não inflar/adivinhar um rótulo específico.
  const LIMIAR_ABSORCAO = 0.34;
  const contagemDoDono = new Map<string, number>();
  const passo1: typeof candidatos = [];
  const poolDeStems = new Set<string>();
  for (const cand of candidatos) {
    if (cand.palavras.length === 1) {
      const stemsArr = [...cand.stems];
      const jaCoberto = stemsArr.every((s) => poolDeStems.has(s));
      if (jaCoberto) {
        const donosBrutos = stemsArr.map((s) => donoDoStem.get(s));
        if (!donosBrutos.some((d) => !d)) {
          const donos = Array.from(new Set(donosBrutos as string[]));
          const cobertura = Math.max(...donos.map((d) => contagemDoDono.get(d) ?? 0)) / cand.count;
          if (cobertura >= LIMIAR_ABSORCAO) canonMap.set(cand.texto, donos);
        }
        continue;
      }
    }
    passo1.push(cand);
    contagemDoDono.set(cand.texto, cand.count);
    for (const s of cand.stems) {
      poolDeStems.add(s);
      if (!donoDoStem.has(s)) donoDoStem.set(s, cand.texto);
      else if (donoDoStem.get(s) !== cand.texto) donoDoStem.set(s, null);
    }
  }

  // Passo 2: entre filtros de 2+ palavras, funde os que cobrem quase os mesmos produtos.
  const comConjunto = passo1.map((c) => {
    const produtosIdx = new Set<number>();
    chavesPorProduto.forEach((chaves, i) => {
      if (chaves.includes(c.texto)) produtosIdx.add(i);
    });
    return { ...c, produtosIdx };
  });
  const multiPalavra = comConjunto
    .filter((c) => c.palavras.length > 1)
    .sort((a, b) => b.produtosIdx.size - a.produtosIdx.size || a.palavras.length - b.palavras.length);
  const umaPalavra = comConjunto.filter((c) => c.palavras.length === 1);

  const aceitosMulti: typeof multiPalavra = [];
  for (const cand of multiPalavra) {
    const dominador = aceitosMulti.find((ac) => {
      let intersecao = 0;
      for (const i of cand.produtosIdx) if (ac.produtosIdx.has(i)) intersecao++;
      return intersecao / cand.produtosIdx.size >= LIMIAR_DOMINANCIA;
    });
    if (dominador) {
      canonMap.set(cand.texto, [dominador.texto]);
      continue;
    }
    aceitosMulti.push(cand);
  }

  const filtros = [...umaPalavra, ...aceitosMulti]
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((c) => c.texto);

  // Mantém só o que corresponde a um chip realmente visível: qualquer outra palavra nunca é
  // clicável, então guardá-la em data-filtros só inflaria o HTML à toa.
  const filtrosVisiveis = new Set(filtros);
  const chavesFinais = chavesPorProduto.map((chaves) => {
    const expandidas = chaves.flatMap((w) => canonMap.get(w) ?? [w]);
    return Array.from(new Set(expandidas.filter((w) => filtrosVisiveis.has(w))));
  });

  return { filtros, chavesPorProduto: chavesFinais };
}

/** "kits executivos" -> "Kits Executivos"; conectores minúsculos: "caneta e lapiseira" -> "Caneta e Lapiseira". */
export function formatarLabelFiltro(f: string): string {
  return f
    .split(' ')
    .map((w, i) => (i > 0 && CONECTORES_LABEL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/*
  Cor nem sempre aparece no nome do produto (ex.: listagem só diz "Caneta Metal"), mas quase
  sempre aparece no nome do arquivo da foto (ex.: "Caneta-Metal-AZUL-CLARO-...jpg"). Por isso
  escaneamos nome + imagem. Cores compostas vêm antes das genéricas para casar com prioridade.
*/
const CORES = [
  'azul claro', 'azul escuro', 'azul marinho', 'verde claro', 'verde escuro', 'verde limão',
  'preto', 'branco', 'azul', 'vermelho', 'verde', 'amarelo', 'cinza', 'prata', 'dourado',
  'rosa', 'roxo', 'laranja', 'marrom', 'bege', 'grafite', 'chumbo', 'nude', 'vinho',
  'turquesa', 'lilás', 'creme', 'natural', 'transparente', 'multicolor',
];

/*
  Colapsa a cor detectada para a cor-BASE (ex.: "azul claro"/"azul escuro"/"azul marinho" -> "azul").
  Sem isso, o filtro tinha um bug de percepção: cada produto guardava sua cor exata ("azul claro"),
  e escolher "Azul" no seletor descartava silenciosamente todos os "azul claro/escuro" — parecia
  travado. Colapsando para a base, escolher "Azul" pega todos os tons de azul.
*/
const BASE_POR_TOM: Record<string, string> = {
  'grafite': 'cinza', 'chumbo': 'cinza',
  'nude': 'bege', 'creme': 'bege',
};
function corBase(cor: string): string {
  const primeira = cor.split(' ')[0]; // "azul claro" -> "azul", "verde limão" -> "verde"
  return BASE_POR_TOM[primeira] ?? primeira;
}

function extrairCor(p: ProdutoXbz): string | null {
  const tagsTexto = (p.tags ?? []).map((t) => t.nome).join(' ');
  const texto = semAcento(`${tagsTexto} ${p.nome} ${p.imagem.replace(/[-_/.]/g, ' ')}`).toLowerCase();
  for (const cor of CORES) {
    if (texto.includes(semAcento(cor))) return corBase(cor);
  }
  return null;
}

/* Amostras (hex) para os quadradinhos de cor no filtro. Cor sem hex aqui não vira swatch. */
export const HEX_CORES: Record<string, string> = {
  preto: '#1a1a1a', branco: '#f7f7f7', cinza: '#8a8f98', prata: '#c7ccd1', dourado: '#c9a44a',
  azul: '#2563eb', verde: '#16a34a', vermelho: '#dc2626', amarelo: '#eab308', laranja: '#f97316',
  rosa: '#ec4899', roxo: '#7c3aed', marrom: '#7b4a2b', bege: '#d8c3a5', vinho: '#7b1e3a',
  prateado: '#c7ccd1', // catálogo próprio usa "prateado"; o XBZ usa "prata"
  turquesa: '#14b8a6', lilás: '#c084fc', natural: '#e0cfa8', transparente: '#e8edf2', multicolor: '#9ca3af',
};

export function extrairCoresDisponiveis(produtos: ProdutoXbz[]): { cor: string; produtos: ProdutoXbz[] }[] {
  const porCor = new Map<string, ProdutoXbz[]>();
  for (const p of produtos) {
    const cor = extrairCor(p);
    if (!cor) continue;
    if (!porCor.has(cor)) porCor.set(cor, []);
    porCor.get(cor)!.push(p);
  }
  return Array.from(porCor.entries())
    .filter(([, prods]) => prods.length >= 2) // cor com 1 produto só não vira filtro (barra enxuta)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([cor, prods]) => ({ cor, produtos: prods }));
}

export { extrairCor };
