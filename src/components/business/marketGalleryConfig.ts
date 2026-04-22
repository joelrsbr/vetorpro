import {
  BarChart3,
  Bitcoin,
  DollarSign,
  Euro,
  Landmark,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type MarketGalleryValueType = "percent" | "currency" | "crypto" | "cub";

export interface MarketGalleryIndicatorDefinition {
  id: string;
  historyKey: string;
  name: string;
  description: string;
  icon: LucideIcon;
  valueType: MarketGalleryValueType;
  periodLabel?: string;
}

export function getMarketGalleryIndicators(uf: string): MarketGalleryIndicatorDefinition[] {
  const normalizedUf = uf.toUpperCase();

  return [
    {
      id: "ipca",
      historyKey: "rate_ipca",
      name: "IPCA",
      description: "Índice de Preços ao Consumidor Amplo.",
      icon: BarChart3,
      valueType: "percent",
      periodLabel: "a.a.",
    },
    {
      id: "igpm",
      historyKey: "rate_igpm",
      name: "IGP-M",
      description: "Índice Geral de Preços — Mercado.",
      icon: BarChart3,
      valueType: "percent",
      periodLabel: "a.a.",
    },
    {
      id: "incc",
      historyKey: "incc",
      name: "INCC",
      description: "BCB Série 192 — referência para correção de contratos na planta.",
      icon: Landmark,
      valueType: "percent",
      periodLabel: "a.m.",
    },
    {
      id: "tr",
      historyKey: "rate_tr",
      name: "TR",
      description: "Taxa Referencial usada em contratos imobiliários.",
      icon: Landmark,
      valueType: "percent",
      periodLabel: "a.m.",
    },
    {
      id: "poupanca",
      historyKey: "rate_poupanca",
      name: "Poupança",
      description: "Rendimento oficial da caderneta de poupança.",
      icon: PiggyBank,
      valueType: "percent",
      periodLabel: "a.m.",
    },
    {
      id: "cdi",
      historyKey: "rate_cdi",
      name: "CDI",
      description: "Certificado de Depósito Interbancário.",
      icon: TrendingDown,
      valueType: "percent",
      periodLabel: "a.a.",
    },
    {
      id: "usd",
      historyKey: "currency_usd",
      name: "USD/BRL",
      description: "Cotação do dólar frente ao real.",
      icon: DollarSign,
      valueType: "currency",
    },
    {
      id: "eur",
      historyKey: "currency_eur",
      name: "EUR/BRL",
      description: "Cotação do euro frente ao real.",
      icon: Euro,
      valueType: "currency",
    },
    {
      id: "selic",
      historyKey: "rate_selic",
      name: "Selic",
      description: "Taxa básica de juros definida pelo Banco Central.",
      icon: TrendingUp,
      valueType: "percent",
      periodLabel: "a.a.",
    },
    {
      id: "bitcoin",
      historyKey: "crypto_btc",
      name: "Bitcoin",
      description: "Preço mais recente do BTC em reais.",
      icon: Bitcoin,
      valueType: "crypto",
    },
    {
      id: "cub",
      historyKey: `cub_${normalizedUf.toLowerCase()}`,
      name: `CUB-${normalizedUf}`,
      description: `Custo Unitário Básico da Construção em ${normalizedUf}, em R$/m².`,
      icon: Landmark,
      valueType: "cub",
    },
  ];
}