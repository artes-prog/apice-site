import { site, type Atendente } from '../data/site';

/*
  Toda a lógica de conversão para WhatsApp em um só lugar.
  - Distribuição determinística de leads entre as atendentes (sem JS de sorteio).
  - Montagem da URL wa.me com mensagem contextual codificada.
*/

/** Hash estável de string (djb2) — mesmo slug sempre cai na mesma atendente. */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

/**
 * Escolhe a atendente de forma determinística a partir de uma "semente"
 * (normalmente o slug da página). Divide a carga sem estado e sem aleatoriedade,
 * mantendo consistência: a mesma página sempre aponta para a mesma pessoa.
 */
export function atendentePorSemente(semente: string): Atendente {
  const lista = site.atendentes;
  return lista[hash(semente) % lista.length];
}

/** Alternância par/ímpar pelo dia do mês — usada na página de orçamento. */
export function atendenteDoDia(): Atendente {
  const dia = new Date().getDate();
  return site.atendentes[dia % site.atendentes.length];
}

/** Monta a URL wa.me com a mensagem já codificada. */
export function linkWhatsApp(numero: string, mensagem: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/** Mensagens contextuais padronizadas (§3.1 do brief). */
export const mensagens = {
  home: 'Olá! Vim pelo site da Ápice e quero um orçamento de brindes personalizados.',
  categoria: (cat: string) =>
    `Olá! Vim pelo site e quero orçamento de ${cat} personalizada(s).`,
  tecnica: (tec: string) =>
    `Olá! Vim pelo site e quero orçamento de brindes com ${tec}.`,
  produto: (prod: string) =>
    `Olá! Vi o produto ${prod} no site e quero um orçamento.`,
  generico: 'Olá! Vim pelo site da Ápice e quero falar sobre brindes personalizados.',
};
