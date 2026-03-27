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
    description: "Cálculos estruturados nos modelos oficiais, com suporte a reforços programados.",
  },
  {
    icon: TableProperties,
    title: "Tabela de Amortização",
    description: "Acompanhamento mensal de saldo devedor, juros e parcelas de forma organizada.",
  },
  {
    icon: BarChart3,
    title: "Calculadora HP12C",
    description: "Funções financeiras integradas para facilitar o dia a dia do profissional.",
  },
  {
    icon: TrendingUp,
    title: "Dados Estruturados",
    description: "Conexão direta com fontes oficiais para atualização de Selic, IPCA e TR, garantindo a fidelidade técnica das simulações.",
  },
  {
    icon: FileText,
    title: "Relatórios Profissionais",
    description: "Documentos em PDF com identidade visual para apresentação ao cliente.",
  },
  {
    icon: ShieldCheck,
    title: "Ambiente Seguro",
    description: "Dados protegidos com infraestrutura confiável e de nível profissional.",
  },
];

export function LandingBenefits() {
  return (
    <section id="beneficios" className="pt-10 pb-16 md:pt-16 md:pb-24 bg-background scroll-mt-20">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Sobre a Plataforma
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            O VetorPro nasceu para transformar a complexidade do mercado imobiliário em clareza estratégica. Somos uma plataforma dedicada à Simulação Estruturada de Cenários, permitindo que você visualize o impacto real de indexadores, cotações globais e reforços financeiros ao longo do tempo.
          </p>
          <p className="mt-4 text-xs tracking-wide text-muted-foreground/80 uppercase">
            Aprimoramento Contínuo: Uma infraestrutura em evolução diária para manter você à frente do mercado.
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
