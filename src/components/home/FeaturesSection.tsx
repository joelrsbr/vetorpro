import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Sparkles, FileText, TrendingDown, Clock, Shield } from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Simulações SAC e PRICE",
    description: "Compare os dois sistemas de amortização mais usados no Brasil e encontre a melhor opção para seu cliente.",
  },
  {
    icon: TrendingDown,
    title: "Amortizações Inteligentes",
    description: "Simule amortizações extras e reforços programados para mostrar a economia real de juros.",
  },
  {
    icon: Sparkles,
    title: "Propostas com IA",
    description: "Gere propostas profissionais e persuasivas com inteligência artificial em segundos.",
  },
  {
    icon: FileText,
    title: "Exportação em PDF",
    description: "Envie propostas elegantes diretamente para seus clientes em formato PDF.",
  },
  {
    icon: Clock,
    title: "Histórico Completo",
    description: "Acesse todas as suas simulações e propostas anteriores a qualquer momento.",
  },
  {
    icon: Shield,
    title: "Dados Seguros",
    description: "Suas informações e de seus clientes são protegidas com criptografia de ponta.",
  },
];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-16 md:py-24 bg-background scroll-mt-20">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas poderosas para acelerar suas vendas e impressionar seus clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card 
              key={feature.title} 
              className="shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
