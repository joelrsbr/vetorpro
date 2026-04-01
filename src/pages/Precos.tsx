import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PricingSection } from "@/components/pricing/PricingSection";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim! Você pode cancelar sua assinatura Pro a qualquer momento. Você continuará tendo acesso aos recursos Pro até o final do período pago.",
  },
  {
    question: "Como funciona o período de teste?",
    answer: "Ao criar sua conta, você pode explorar o sistema e escolher o plano ideal. Aproveite 7 dias de garantia de reembolso em qualquer plano.",
  },
  {
    question: "As simulações do plano Basic são limitadas?",
    answer: "No plano Basic, você pode fazer até 50 simulações por mês e gerar 20 consultas com IA. Os contadores resetam todo mês.",
  },
  {
    question: "O que são amortizações avançadas?",
    answer: "São recursos exclusivos do plano Pro que permitem simular amortizações extras mensais e reforços programados (mensais, semestrais ou anuais) para mostrar ao cliente como economizar juros.",
  },
  {
    question: "Posso usar o VetorPro no celular?",
    answer: "Sim! O VetorPro é totalmente responsivo e funciona perfeitamente em smartphones e tablets.",
  },
];

const Precos = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="pt-8 pb-4 md:pt-10 md:pb-6 gradient-hero">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              Planos e Preços
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Escolha o plano que melhor se adapta às suas necessidades.
            </p>
          </div>
        </div>

        <PricingSection />

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container">
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                <HelpCircle className="h-4 w-4" />
                Perguntas Frequentes
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Dúvidas? Temos respostas!
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="shadow-card">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Precos;
