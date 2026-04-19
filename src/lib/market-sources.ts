/* ─── Market Sources & Category System ─── */

export type IndicatorCategory = "inflation" | "fixed_income" | "variable";

export interface IndicatorSource {
  officialName: string;
  organization: string;
  url: string;
}

export interface IndicatorCategoryInfo {
  category: IndicatorCategory;
  color: string;        // HSL for buttons
  colorClass: string;   // Tailwind bg class for badges
  emoji: string;
  label: string;
  description: string;
}

/* ─── Category definitions ─── */

export const CATEGORIES: Record<IndicatorCategory, IndicatorCategoryInfo> = {
  inflation: {
    category: "inflation",
    color: "hsl(25, 90%, 55%)",
    colorClass: "bg-orange-500",
    emoji: "🟠",
    label: "Inflação e Construção",
    description: "Índices que medem a variação de preços ao consumidor e no setor da construção civil.",
  },
  fixed_income: {
    category: "fixed_income",
    color: "hsl(150, 60%, 42%)",
    colorClass: "bg-green-600",
    emoji: "🟢",
    label: "Renda Fixa",
    description: "Taxas de referência para investimentos de renda fixa e custo de oportunidade.",
  },
  variable: {
    category: "variable",
    color: "hsl(210, 80%, 55%)",
    colorClass: "bg-blue-500",
    emoji: "🔵",
    label: "Moedas e Variáveis",
    description: "Ativos de renda variável, moedas estrangeiras e criptomoedas.",
  },
};

/* ─── Key → Category mapping ─── */

export const KEY_CATEGORY: Record<string, IndicatorCategory> = {
  rate_ipca: "inflation",
  rate_igpm: "inflation",
  index_incc: "inflation",
  index_cub: "inflation",
  rate_selic: "fixed_income",
  rate_cdi: "fixed_income",
  rate_poupanca: "fixed_income",
  currency_usd: "variable",
  currency_eur: "variable",
  crypto_btc: "variable",
};

export function getCategoryForKey(key: string): IndicatorCategory {
  if (KEY_CATEGORY[key]) return KEY_CATEGORY[key];
  if (key.startsWith("rate_ipca") || key.startsWith("rate_igpm") || key.startsWith("index_")) return "inflation";
  if (key.startsWith("rate_")) return "fixed_income";
  if (key.startsWith("currency_") || key.startsWith("crypto_")) return "variable";
  return "fixed_income";
}

export function getCategoryColor(key: string): string {
  return CATEGORIES[getCategoryForKey(key)].color;
}

/* ─── Official sources ─── */

export const OFFICIAL_SOURCES: Record<string, IndicatorSource> = {
  rate_ipca: {
    officialName: "Índice Nacional de Preços ao Consumidor Amplo",
    organization: "IBGE",
    url: "https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9256-indice-nacional-de-precos-ao-consumidor-amplo.html",
  },
  index_incc: {
    officialName: "Índice Nacional de Custo da Construção – DI",
    organization: "FGV IBRE",
    url: "https://portalibre.fgv.br/",
  },
  rate_selic: {
    officialName: "Taxa Selic Meta",
    organization: "Banco Central do Brasil",
    url: "https://www.bcb.gov.br/controleinflacao/taxaselic",
  },
  rate_cdi: {
    officialName: "Certificado de Depósito Interbancário",
    organization: "B3",
    url: "https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-de-segmentos-e-setoriais/di.htm",
  },
  currency_usd: {
    officialName: "Taxa de Câmbio — Dólar Americano (PTAX)",
    organization: "Banco Central do Brasil",
    url: "https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes",
  },
  currency_eur: {
    officialName: "Taxa de Câmbio — Euro (PTAX)",
    organization: "Banco Central do Brasil",
    url: "https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes",
  },
  rate_poupanca: {
    officialName: "Remuneração dos Depósitos de Poupança",
    organization: "Banco Central do Brasil",
    url: "https://www.bcb.gov.br/",
  },
  rate_igpm: {
    officialName: "Índice Geral de Preços – Mercado",
    organization: "FGV IBRE",
    url: "https://portalibre.fgv.br/",
  },
  index_cub: {
    officialName: "Custo Unitário Básico da Construção Civil",
    organization: "SINDUSCON / CBIC",
    url: "https://www.cub.org.br/",
  },
  crypto_btc: {
    officialName: "Bitcoin (BTC/BRL)",
    organization: "Mercado de Criptomoedas",
    url: "https://www.coingecko.com/pt/moedas/bitcoin",
  },
};

/* ─── Arguments Map content ─── */

export interface ArgumentSection {
  category: IndicatorCategory;
  title: string;
  explanation: string;
  salesPhrase: string;
  protectionPhrase: string;
  indicators: string[];
}

export const ARGUMENT_SECTIONS: ArgumentSection[] = [
  {
    category: "inflation",
    title: "Inflação e Construção",
    explanation:
      "O INCC mede o custo da construção civil e impacta diretamente o valor de imóveis na planta. O IPCA reflete a inflação geral que corrói o poder de compra. Quando esses índices sobem, o imóvel se valoriza como proteção patrimonial.",
    salesPhrase:
      "Com o INCC acumulando alta, quem compra agora trava o preço atual. Cada mês de espera significa pagar mais caro pelo mesmo imóvel.",
    protectionPhrase:
      "Em momentos de inflação acima da meta, o imóvel físico é historicamente o ativo que melhor protege o poder de compra das famílias brasileiras.",
    indicators: ["rate_ipca", "index_incc", "index_cub", "rate_igpm"],
  },
  {
    category: "fixed_income",
    title: "Renda Fixa e Custo de Oportunidade",
    explanation:
      "A Selic e o CDI são referências para o custo do dinheiro no Brasil. Quando estão altos, o financiamento fica mais caro — mas também significa que o imóvel compete com investimentos conservadores como referência de rentabilidade.",
    salesPhrase:
      "Com a Selic nesse patamar, financiar agora com taxa pré-fixada pode ser uma jogada inteligente. Se os juros caírem, você já travou uma condição melhor que o mercado futuro.",
    protectionPhrase:
      "Com juros elevados, travar uma taxa de financiamento agora protege contra cenários de incerteza econômica prolongada.",
    indicators: ["rate_selic", "rate_cdi", "rate_poupanca"],
  },
  {
    category: "variable",
    title: "Moedas e Ativos Variáveis",
    explanation:
      "O Dólar e o Euro influenciam o custo de materiais importados e a confiança do investidor estrangeiro. O Bitcoin serve como termômetro de apetite ao risco. Volatilidade cambial reforça o argumento do imóvel como ativo de proteção.",
    salesPhrase:
      "Enquanto moedas e cripto oscilam, o imóvel permanece como ativo tangível de valorização consistente no longo prazo.",
    protectionPhrase:
      "Com o câmbio instável e volatilidade alta nos mercados, o imóvel oferece a estabilidade que ativos financeiros não conseguem garantir.",
    indicators: ["currency_usd", "currency_eur", "crypto_btc"],
  },
];

export const CROSS_ARGUMENT =
  "Com INCC subindo (🟠) e Selic alta (🟢), o imóvel na planta protege contra a inflação enquanto o custo do dinheiro ainda está elevado — travar agora é estratégia.";

export const CROSS_ARGUMENT_PROTECTION =
  "Em um cenário de inflação persistente e juros elevados, o imóvel funciona como dupla proteção: preserva o patrimônio contra a perda de poder de compra e ancora o custo do financiamento em condições conhecidas.";

/* ─── Scenario detection thresholds ─── */

export const SCENARIO_THRESHOLDS = {
  ipca_ceiling: 4.5,        // CMN tolerance band
  incc_deviation_pp: 0.3,   // Above 12m average
  usd_std_deviations: 2,    // Statistical anomaly
};

export const SCENARIO_METHODOLOGY = [
  { label: "IPCA > 4,5%", description: "Teto da banda de tolerância do CMN para 2025/2026", source: "BCB — bcb.gov.br/controleinflacao/metainflacao" },
  { label: "INCC acima da média histórica + 0,3 p.p.", description: "Desvio significativo acima da tendência dos últimos 12 meses", source: "FGV IBRE — portalibre.fgv.br" },
  { label: "Dólar > 2 desvios padrão (30 dias)", description: "Anomalia estatística na série histórica de câmbio", source: "BCB SGS Série 1 — bcb.gov.br" },
];

export const SOURCES_DISCLAIMER =
  "Os dados exibidos são obtidos de fontes oficiais do governo brasileiro e entidades reguladoras. O VetorPro não produz ou manipula os índices — apenas os organiza para facilitar a consultoria.";
