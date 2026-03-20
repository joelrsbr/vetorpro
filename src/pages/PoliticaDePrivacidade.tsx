import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function PoliticaDePrivacidade() {
  const { user } = useAuth();
  const backTo = user ? "/dashboard" : "/";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-3xl py-12 px-4">
        <Button variant="ghost" size="sm" asChild className="mb-8 text-muted-foreground hover:text-foreground">
          <Link to={backTo}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>

        <h1 className="text-2xl font-bold text-foreground mb-4">Política de Privacidade</h1>
        <p className="text-base font-medium text-foreground mb-8">VetorPro: Simulação Estruturada de Cenários Imobiliários</p>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6 leading-relaxed">
          <p className="text-base font-medium text-foreground">Sua privacidade é prioridade.</p>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Coleta de Dados</h3>
              <p>Coletamos apenas os dados técnicos necessários para as simulações (valores, prazos e taxas inseridos).</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Uso</h3>
              <p>Os dados das simulações são processados apenas para gerar os resultados na tela e não são compartilhados com terceiros ou vendidos para fins comerciais.</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Proteção</h3>
              <p>Utilizamos protocolos de segurança para garantir que sua navegação e dados de acesso permaneçam protegidos.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
