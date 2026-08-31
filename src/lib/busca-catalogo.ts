/*
  ============================================================================
  MOTOR DE BUSCA DO CATÁLOGO
  ============================================================================
  Busca por relevância, tolerante a erro de digitação, ordem das palavras,
  acento, plural e formatos de medida. Roda 100% no navegador sobre um índice
  gerado no build a partir da fonte real de dados (catálogo próprio + XBZ).

  Nada aqui conhece produto específico: não existe "se buscar garrafa faça X".
  As únicas listas fixas são linguísticas (stopwords, sinônimos, unidades) e
  valem para o catálogo inteiro, presente e futuro. Produto novo cadastrado no
  CMS entra na busca sozinho, porque o índice é regerado no build.

  Como funciona, em resumo:
    1. normaliza consulta e dados (acento, caixa, pontuação, medidas);
    2. quebra em tokens e expande cada um (plural/singular + sinônimos);
    3. casa cada token contra o VOCABULÁRIO do catálogo — exato, prefixo ou
       aproximado (distância de edição), nessa ordem de preferência;
    4. pontua por onde casou (nome > categoria > atributos > descrição) e por
       quantos termos da consulta o produto atendeu;
    5. ordena por cobertura e depois por pontuação.
  ============================================================================
*/

/** Um item do índice gerado no build. Campos curtos para o arquivo ficar leve. */
export interface ItemBusca {
  n: string; // nome
  c: string; // código
  u: string; // url
  g: string; // categoria (nome)
  a?: string; // atributos já normalizados (subcategoria, tags, specs, sinônimos do CMS)
  d?: string; // descrição já normalizada (limitada no build)
}

export interface Resultado {
  item: ItemBusca;
  score: number;
  termosAtendidos: number;
}

/* ---------------------------------------------------------------------------
   Normalização
--------------------------------------------------------------------------- */

/** Unidades reconhecidas para colar ao número ("500 ml" -> "500ml"). */
const UNIDADES = 'ml|l|cm|mm|m|g|kg|gb|tb|mah|w|v|pol|un|pcs';

/**
 * Deixa o texto comparável: sem acento, minúsculo, sem pontuação solta e com
 * medidas num formato único.
 *   "Garrafa Térmica 1,2 L" -> "garrafa termica 1.2l"
 *   "500 ML"                -> "500ml"
 *   "2,5cm"                 -> "2.5cm"
 * Assim "1,2l", "1.2 L" e "1,2 litros" convergem o suficiente para casar.
 */
export function normalizar(texto: string): string {
  let t = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  // vírgula decimal vira ponto: 1,2 -> 1.2 (só entre dígitos)
  t = t.replace(/(\d)\s*,\s*(\d)/g, '$1.$2');
  // separa letra colada em número para depois recolar de forma uniforme
  t = t.replace(/[^a-z0-9.]+/g, ' ');
  // ponto que não está entre dígitos é pontuação, não decimal
  t = t.replace(/\.(?!\d)/g, ' ').replace(/(?<!\d)\./g, ' ');
  // número + unidade viram um token só: "500 ml" -> "500ml"
  t = t.replace(new RegExp(`(\\d(?:\\.\\d+)?)\\s+(${UNIDADES})\\b`, 'g'), '$1$2');

  return t.replace(/\s+/g, ' ').trim();
}

/** Palavras que não ajudam a distinguir produto (e só inflam o índice). */
const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'com', 'para', 'em', 'no', 'na', 'nos', 'nas',
  'uma', 'um', 'e', 'o', 'a', 'os', 'as', 'que', 'ou', 'por', 'ao', 'aos', 'sua',
  'seu', 'sao', 'tem', 'mais', 'cada', 'entre', 'sobre', 'sem', 'tambem', 'ser',
  'pode', 'possui', 'acompanha', 'permite', 'ainda', 'onde', 'quando', 'esta',
  'este', 'isso', 'pelo', 'pela', 'nao', 'como', 'seus', 'suas',
]);

export function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/* ---------------------------------------------------------------------------
   Sinônimos — estrutura central e expansível (nunca regra por produto)
--------------------------------------------------------------------------- */

/**
 * Cada linha é um grupo de termos equivalentes para efeito de descoberta.
 * Usado só para AMPLIAR o alcance da busca (com pontuação menor), nunca para
 * trocar o que o usuário pediu.
 */
const GRUPOS_SINONIMOS: string[][] = [
  ['garrafa', 'squeeze', 'bottle'],
  ['copo', 'tumbler'],
  ['caneca', 'mug'],
  ['termica', 'termico', 'termo'],
  ['inox', 'aco', 'inoxidavel'],
  ['botton', 'boton', 'botom', 'button', 'broche', 'pin', 'botao'],
  ['pin', 'pino', 'alfinete'],
  ['pendrive', 'pen', 'usb'],
  ['celular', 'smartphone', 'telefone'],
  ['suporte', 'porta'],
  ['ecobag', 'sacola', 'bolsa'],
  ['caderno', 'caderneta', 'bloco'],
  ['caneta', 'esferografica'],
  ['chaveiro', 'chave'],
  ['ecologico', 'ecologica', 'eco', 'sustentavel'],
  ['personalizado', 'personalizada', 'customizado'],
];

const SINONIMOS = new Map<string, string[]>();
for (const grupo of GRUPOS_SINONIMOS) {
  for (const termo of grupo) {
    const atuais = SINONIMOS.get(termo) ?? [];
    SINONIMOS.set(termo, [...new Set([...atuais, ...grupo.filter((x) => x !== termo)])]);
  }
}

/** Plural/singular simples: "garrafas" <-> "garrafa". */
function variacoesNumero(token: string): string[] {
  const out = [token];
  if (token.length > 3 && token.endsWith('s')) out.push(token.slice(0, -1));
  else if (token.length > 2) out.push(token + 's');
  return out;
}

/** Todas as formas que um termo digitado pode assumir na comparação. */
function expandir(token: string): { exatos: Set<string>; sinonimos: Set<string> } {
  const exatos = new Set(variacoesNumero(token));
  const sinonimos = new Set<string>();
  for (const t of [...exatos]) {
    for (const s of SINONIMOS.get(t) ?? []) {
      for (const v of variacoesNumero(s)) sinonimos.add(v);
    }
  }
  for (const e of exatos) sinonimos.delete(e);
  return { exatos, sinonimos };
}

/* ---------------------------------------------------------------------------
   Distância de edição (erro de digitação), com corte por limite
--------------------------------------------------------------------------- */

/** Levenshtein com early-exit: devolve > limite quando passa do aceitável. */
function distancia(a: string, b: string, limite: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limite) return limite + 1;

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let menorDaLinha = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo);
      atual.push(v);
      if (v < menorDaLinha) menorDaLinha = v;
    }
    if (menorDaLinha > limite) return limite + 1; // linha inteira já estourou
    anterior = atual;
  }
  return anterior[b.length];
}

/** Tolerância proporcional: palavra curta erra pouco, palavra longa erra mais. */
function limiteErro(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 5) return 1;
  return 2;
}

/* ---------------------------------------------------------------------------
   Índice
--------------------------------------------------------------------------- */

const CAMPO = { nome: 0, categoria: 1, atributo: 2, descricao: 3 } as const;
/** Peso de cada campo no ranking (nome vale muito mais que descrição). */
const PESO_CAMPO = [10, 5, 4, 1.5];
/** Peso da qualidade do casamento do termo. */
const PESO_EXATO = 1;
const PESO_PREFIXO = 0.7;
const PESO_SINONIMO = 0.45;
const PESO_FUZZY = 0.35;

interface ItemIndexado {
  item: ItemBusca;
  nomeNorm: string;
  /** token -> menor índice de campo em que aparece (o campo de maior peso) */
  campos: Map<string, number>;
}

export interface Indice {
  itens: ItemIndexado[];
  /** token do catálogo -> índices dos produtos que o contêm */
  postings: Map<string, number[]>;
  vocabulario: string[];
}

function registrar(campos: Map<string, number>, tokens: string[], campo: number) {
  for (const t of tokens) {
    const atual = campos.get(t);
    if (atual === undefined || campo < atual) campos.set(t, campo);
  }
}

export function criarIndice(itens: ItemBusca[]): Indice {
  const indexados: ItemIndexado[] = [];
  const postings = new Map<string, number[]>();

  itens.forEach((item, i) => {
    const campos = new Map<string, number>();
    registrar(campos, tokenizar(item.n), CAMPO.nome);
    registrar(campos, tokenizar(item.c), CAMPO.nome); // código pesa como nome
    registrar(campos, tokenizar(item.g), CAMPO.categoria);
    if (item.a) registrar(campos, item.a.split(' ').filter(Boolean), CAMPO.atributo);
    if (item.d) registrar(campos, item.d.split(' ').filter(Boolean), CAMPO.descricao);

    indexados.push({ item, nomeNorm: normalizar(item.n), campos });

    for (const token of campos.keys()) {
      const lista = postings.get(token);
      if (lista) lista.push(i);
      else postings.set(token, [i]);
    }
  });

  return { itens: indexados, postings, vocabulario: [...postings.keys()] };
}

/* ---------------------------------------------------------------------------
   Busca
--------------------------------------------------------------------------- */

/** Para um termo digitado, quais tokens do catálogo casam e com que qualidade. */
function casarTermo(indice: Indice, termo: string): Map<string, number> {
  const casados = new Map<string, number>(); // token do catálogo -> qualidade
  const { exatos, sinonimos } = expandir(termo);

  const guardar = (tok: string, q: number) => {
    const atual = casados.get(tok);
    if (atual === undefined || q > atual) casados.set(tok, q);
  };

  // 1) exato (inclui plural/singular)
  for (const e of exatos) if (indice.postings.has(e)) guardar(e, PESO_EXATO);
  // 2) sinônimo
  for (const s of sinonimos) if (indice.postings.has(s)) guardar(s, PESO_SINONIMO);

  // 3) prefixo: cobre busca parcial ("gar", "termi"). Só a partir de 3 letras,
  //    para não virar genérico demais.
  if (termo.length >= 3) {
    for (const tok of indice.vocabulario) {
      if (tok.length > termo.length && tok.startsWith(termo)) guardar(tok, PESO_PREFIXO);
    }
  }

  // 4) aproximado (erro de digitação) — só se o termo ainda não achou nada bom,
  //    para não poluir resultado quando já existe casamento forte.
  const jaTemForte = [...casados.values()].some((q) => q >= PESO_PREFIXO);
  if (!jaTemForte && termo.length >= 4) {
    const lim = limiteErro(termo);
    for (const tok of indice.vocabulario) {
      if (Math.abs(tok.length - termo.length) > lim) continue;
      if (distancia(termo, tok, lim) <= lim) guardar(tok, PESO_FUZZY);
    }
  }

  return casados;
}

export function buscar(indice: Indice, consulta: string, limite = 60): Resultado[] {
  const termos = tokenizar(consulta);
  if (termos.length === 0) return [];

  const consultaNorm = normalizar(consulta);

  // pontuação acumulada e nº de termos atendidos por produto
  const pontos = new Float64Array(indice.itens.length);
  const cobertura = new Uint8Array(indice.itens.length);

  for (const termo of termos) {
    const casados = casarTermo(indice, termo);
    if (casados.size === 0) continue;

    // melhor contribuição deste termo para cada produto
    const melhorDoTermo = new Map<number, number>();
    for (const [token, qualidade] of casados) {
      const lista = indice.postings.get(token);
      if (!lista) continue;
      for (const idx of lista) {
        const campo = indice.itens[idx].campos.get(token) ?? CAMPO.descricao;
        const valor = qualidade * PESO_CAMPO[campo];
        const atual = melhorDoTermo.get(idx);
        if (atual === undefined || valor > atual) melhorDoTermo.set(idx, valor);
      }
    }
    for (const [idx, valor] of melhorDoTermo) {
      pontos[idx] += valor;
      cobertura[idx] += 1;
    }
  }

  // Bônus de correspondência forte no nome inteiro
  const resultados: Resultado[] = [];
  for (let i = 0; i < indice.itens.length; i++) {
    if (cobertura[i] === 0) continue;
    let score = pontos[i];
    const nome = indice.itens[i].nomeNorm;
    if (nome === consultaNorm) score += 1000;
    else if (nome.startsWith(consultaNorm)) score += 200;
    else if (nome.includes(consultaNorm)) score += 80;
    resultados.push({ item: indice.itens[i].item, score, termosAtendidos: cobertura[i] });
  }

  if (resultados.length === 0) return [];

  /*
    Antes de dizer "nada encontrado", vale mostrar o que chegou mais perto:
    ficamos com os produtos que atenderam o MAIOR número de termos. Assim
    "garrafa termica inox 1.2l" prioriza quem bate em tudo, mas se ninguém
    bater em tudo, mostra quem bateu em três — em vez de lista vazia.

    Só que "chegar perto" precisa de um piso: numa busca de 3 palavras, casar
    uma só (geralmente uma palavra genérica que aparece em várias descrições)
    não é resultado, é ruído. Por isso exigimos ao menos METADE dos termos —
    é o que faz "xyz produto inexistente" devolver vazio de verdade, em vez de
    listar qualquer coisa que contenha "produto".
  */
  const minimoExigido = Math.max(1, Math.ceil(termos.length / 2));
  const maxCobertura = resultados.reduce((m, r) => Math.max(m, r.termosAtendidos), 0);
  if (maxCobertura < minimoExigido) return [];
  const filtrados = resultados.filter((r) => r.termosAtendidos === maxCobertura);

  filtrados.sort(
    (a, b) => b.score - a.score || a.item.n.localeCompare(b.item.n, 'pt-BR')
  );
  return filtrados.slice(0, limite);
}
