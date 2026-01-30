import { 
  Calculator, 
  TableProperties, 
  BarChart3, 
  TrendingUp, 
  Palette, 
  ShieldCheck 
} from "lucide-react";

const benefits = [
  {
    icon: Calculator,
    title: "Simulador Financeiro Inteligente",
    description: "Sistemas SAC e PRICE com amortizações avançadas e reforços programados.",
  },
  {
    icon: TableProperties,
    title: "Tabela de Amortização Detalhada",
    description: "Visualize mês a mês a evolução do saldo, juros e parcelas do financiamento.",
  },
  {
    icon: BarChart3,
    title: "Calculadora HP12C Integrada",
    description: "Todas as funções financeiras da calculadora mais usada no mercado.",
  },
  {
    icon: TrendingUp,
    title: "Painel de Indexadores e Cotações",
    description: "CDI, IPCA, Selic, TR e dólar atualizados para suas simulações.",
  },
  {
    icon: Palette,
    title: "Personalização Corporativa",
    description: "Aplique sua marca com logo, cores e identidade visual profissional.",
  },
  {
    icon: ShieldCheck,
    title: "Ambiente Seguro e Profissional",
    description: "Dados protegidos e interface desenvolvida para uso empresarial.",
  },
];

export function LandingBenefits() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo o que você precisa em um só lugar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas profissionais desenvolvidas especialmente para o mercado imobiliário brasileiro.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="group p-6 rounded-xl bg-background border shadow-sm card-shadow-animated cursor-pointer"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 hover-grow group-hover:bg-primary/20 transition-colors">
                <benefit.icon className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
