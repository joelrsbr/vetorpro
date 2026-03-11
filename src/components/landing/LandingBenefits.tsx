import { 
  Calculator, 
  TableProperties, 
  BarChart3, 
  TrendingUp, 
  FileText, 
  ShieldCheck 
} from "lucide-react";

const benefits = [
  {
    icon: Calculator,
    title: "Simulação SAC & PRICE",
    description: "Cálculos precisos com amortizações avançadas e reforços programados.",
  },
  {
    icon: TableProperties,
    title: "Tabela de Amortização",
    description: "Evolução mensal detalhada de saldo devedor, juros e parcelas.",
  },
  {
    icon: BarChart3,
    title: "Calculadora HP12C",
    description: "Funções financeiras completas integradas à plataforma.",
  },
  {
    icon: TrendingUp,
    title: "Indexadores em Tempo Real",
    description: "CDI, IPCA, Selic, TR e câmbio atualizados automaticamente.",
  },
  {
    icon: FileText,
    title: "Relatórios Executivos",
    description: "Propostas em PDF com identidade visual e branding corporativo.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança Institucional",
    description: "Dados protegidos com infraestrutura de nível empresarial.",
  },
];

export function LandingBenefits() {
  return (
    <section id="beneficios" className="py-16 md:py-24 bg-background scroll-mt-20">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Recursos Técnicos
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Ferramentas de precisão para o mercado imobiliário profissional.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="group p-5 rounded-lg bg-card border hover:border-primary/30 transition-colors"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="h-10 w-10 rounded-md bg-primary/8 flex items-center justify-center mb-3">
                <benefit.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {benefit.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
