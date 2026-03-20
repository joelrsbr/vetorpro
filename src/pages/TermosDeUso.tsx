import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TermosDeUso() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-3xl py-12 px-4">
        <Button variant="ghost" size="sm" asChild className="mb-8 text-muted-foreground hover:text-foreground">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>

        <h1 className="text-2xl font-bold text-foreground mb-4">Termos de Uso</h1>
        <p className="text-base font-medium text-foreground mb-8">VetorPro: Simulação Estruturada de Cenários Imobiliários</p>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6 leading-relaxed">
          <p>O VetorPro é uma plataforma de simulação financeira. O usuário declara estar ciente de que:</p>

          <ul className="list-disc pl-6 space-y-4">
            <li>
              Os resultados apresentados são projeções estimadas e não garantias de valores reais;
            </li>
            <li>
              As taxas de juros e condições de financiamento variam conforme a instituição bancária e o perfil de crédito do cliente;
            </li>
            <li>
              O VetorPro não é uma instituição financeira e não realiza intermediação de crédito ou garantia de aprovação bancária.
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
