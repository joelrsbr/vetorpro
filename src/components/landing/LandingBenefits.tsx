import { 
  Calculator, 
  TableProperties, 
  BarChart3, 
  Landmark, 
  Sparkles, 
  FileText 
} from "lucide-react";

const benefits = [
  {
    icon: Calculator,
    title: "Simulação SAC & PRICE",
    description: "Simule cenários reais com indexadores oficiais e mostre ao cliente o impacto de cada escolha ao longo do tempo.",
  },
  {
    icon: TableProperties,
    title: "Tabela de Amortização",
    description: "Apresente mês a mês a evolução do saldo devedor. Transparência que gera confiança e elimina surpresas.",
  },
  {
    icon: BarChart3,
    title: "Calculadora HP12C",
    description: "A ferramenta do mercado financeiro na palma da mão. Cálculos precisos, respostas rápidas.",
  },
  {
    icon: Landmark,
    title: "Sondagem Multibancos",
    description: "Compare taxas, CET, MIP e DFI dos principais bancos. Antecipe custos reais e proteja sua reputação pós-contrato.",
  },
  {
    icon: Sparkles,
    title: "Propostas com IA",
    description: "Gere propostas personalizadas com tom profissional, argumentos estratégicos e identidade visual da sua marca.",
  },
  {
    icon: FileText,
    title: "Relatórios com sua Marca",
    description: "PDFs profissionais com seu logo, CRECI e contato. Sua consultoria no papel, do jeito certo.",
  },
];

export function LandingBenefits() {
  return (
    <section id="beneficios" className="pt-10 pb-16 md:pt-16 md:pb-24 bg-background scroll-mt-20">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que um corretor de alto padrão precisa
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Do cálculo técnico à apresentação profissional — com IA, ética e curadoria de mercado.
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
