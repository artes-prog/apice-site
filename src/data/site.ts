import raw from './site.json';

/*
  Acesso tipado e "à prova de PREENCHER" aos dados-mestre do negócio.
  Campos ainda não preenchidos (cep, instagram) chegam como sentinela
  "PREENCHER..." nos dados — aqui viram null, e o site renderiza sem eles.
  Editar telefone/endereço/horário = editar src/data/site.json (um lugar só).
*/

export interface Atendente {
  nome: string;
  whatsapp: string; // formato internacional só dígitos, ex.: 5562999194794
}

function limpo(valor: string | undefined | null): string | null {
  if (!valor) return null;
  if (valor.toUpperCase().startsWith('PREENCHER')) return null;
  return valor;
}

export const site = {
  nome: raw.nome,
  slogan: raw.slogan,
  anosDeMercado: raw.anosDeMercado,
  grupo: raw.grupo,
  endereco: {
    rua: raw.endereco.rua,
    bairro: raw.endereco.bairro,
    cidade: raw.endereco.cidade,
    uf: raw.endereco.uf,
    cep: limpo(raw.endereco.cep),
  },
  telefoneFixo: raw.telefoneFixo,
  atendentes: raw.atendentes as Atendente[],
  horario: raw.horario,
  instagram: limpo(raw.instagram),
  facebook: limpo(raw.facebook),
  googleBusiness: limpo((raw as any).googleBusiness),
  // Coordenadas do endereço (preencher para reforçar o SEO local no JSON-LD).
  geo: (raw as any).geo as { lat: number | null; lng: number | null },
  areaAtendimento: raw.areaAtendimento,
};

/** Endereço em uma linha, para NAP e JSON-LD. CEP omitido se ausente. */
export function enderecoLinha(): string {
  const e = site.endereco;
  const partes = [`${e.rua}`, `${e.bairro}`, `${e.cidade} - ${e.uf}`];
  if (e.cep) partes.push(`CEP ${e.cep}`);
  return partes.join(', ');
}

/** Perfis sociais existentes (para JSON-LD sameAs e footer). */
export function perfisSociais(): string[] {
  return [site.instagram, site.facebook, site.googleBusiness].filter(
    (x): x is string => Boolean(x)
  );
}

/** Só as redes com ícone no footer (Instagram/Facebook), quando existentes. */
export function redesFooter(): { nome: string; url: string }[] {
  const r: { nome: string; url: string }[] = [];
  if (site.instagram) r.push({ nome: 'Instagram', url: site.instagram });
  if (site.facebook) r.push({ nome: 'Facebook', url: site.facebook });
  return r;
}
