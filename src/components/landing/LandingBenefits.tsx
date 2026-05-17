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
    title: "Simula o financiamento",
    description: "Conheça seu cliente de verdade. Apresente a negociação certa na hora certa.",
  },
  {
    icon: TableProperties,
    title: "Compara os bancos",
    description: "Você sempre à frente. Uma simulação, até 10 bancos comparados em segundos.",
  },
  {
    icon: BarChart3,
    title: "Gera a proposta com IA",
    description: "IA treinada para ajudar você a indicar a melhor opção — com argumentos sólidos.",
  },
  {
    icon: Landmark,
    title: "Personaliza com sua marca",
    description: "Você no controle da sua identidade. Sua autoridade, do seu jeito.",
  },
  {
    icon: Sparkles,
    title: "Apresenta ao cliente",
    description: "Autoridade não se vende. Se conquista — com clareza e dados reais.",
  },
  {
    icon: FileText,
    title: "Acompanha o fechamento",
    description: "Você controla o fluxo. Cada negociação no lugar certo, até o sim.",
  },
];

export function LandingBenefits() {
  return (
    <section id="beneficios" className="pt-10 pb-16 md:pt-16 md:pb-24 bg-background scroll-mt-20">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Como o VetorPro trabalha para você
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Do primeiro cálculo ao fechamento — cada etapa com inteligência e sua marca.
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
