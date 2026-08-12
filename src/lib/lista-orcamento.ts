/*
  Lista de orçamento — o "carrinho" que NÃO vende: só junta produtos para o
  cliente pedir tudo de uma vez no WhatsApp.

  Por que localStorage: o site é estático (sem backend/login). A lista é do
  navegador da pessoa e sobrevive à navegação entre páginas e a fechar a aba.

  Este módulo roda SÓ no navegador (é importado por <script> de página).
*/

export const CHAVE = 'apice:orcamento:v1';
export const EVENTO = 'apice:orcamento-mudou';
const LIMITE = 30; // trava de sanidade: ninguém pede orçamento de 100 itens de uma vez

export interface ItemOrcamento {
  codigo: string;
  nome: string;
  url: string;
}

function ehItem(x: unknown): x is ItemOrcamento {
  const o = x as ItemOrcamento;
  return Boolean(o && typeof o.codigo === 'string' && typeof o.nome === 'string' && typeof o.url === 'string');
}

/** Lê a lista. Nunca lança: dado corrompido vira lista vazia. */
export function ler(): ItemOrcamento[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados.filter(ehItem).slice(0, LIMITE) : [];
  } catch {
    return [];
  }
}

function gravar(itens: ItemOrcamento[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens.slice(0, LIMITE)));
  } catch {
    /* modo anônimo ou storage cheio: a lista simplesmente não persiste */
  }
  // Avisa o contador flutuante e a página de orçamento, sem recarregar nada.
  document.dispatchEvent(new CustomEvent(EVENTO, { detail: { total: itens.length } }));
}

export function contar(): number {
  return ler().length;
}

export function temItem(codigo: string): boolean {
  return ler().some((i) => i.codigo === codigo);
}

/** Adiciona se não existir; devolve true se a lista passou a conter o item. */
export function alternar(item: ItemOrcamento): boolean {
  const itens = ler();
  const idx = itens.findIndex((i) => i.codigo === item.codigo);
  if (idx >= 0) {
    itens.splice(idx, 1);
    gravar(itens);
    return false;
  }
  if (itens.length >= LIMITE) return false;
  itens.push(item);
  gravar(itens);
  return true;
}

export function remover(codigo: string): void {
  gravar(ler().filter((i) => i.codigo !== codigo));
}

export function limpar(): void {
  gravar([]);
}

/** Trecho de texto com os itens, para entrar na mensagem do WhatsApp. */
export function linhasDaMensagem(): string[] {
  const itens = ler();
  if (itens.length === 0) return [];
  const linhas = ['', `Produtos que separei (${itens.length}):`];
  itens.forEach((i, n) => linhas.push(`${n + 1}. ${i.nome} — código ${i.codigo}`));
  return linhas;
}
