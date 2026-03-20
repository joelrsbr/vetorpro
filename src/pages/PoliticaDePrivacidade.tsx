import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function PoliticaDePrivacidade() {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      intro="O VetorPro fornece inteligência de dados para Simulação Estruturada de Cenários Imobiliários, visando oferecer clareza estratégica e projeções financeiras baseadas em indexadores de mercado."
    >
      <p className="font-medium text-foreground">Sua privacidade é prioridade.</p>

      <section className="space-y-5">
        <div>
          <h2 className="mb-1 text-sm font-semibold text-foreground md:text-base">Coleta de Dados</h2>
          <p>
            Coletamos apenas os dados técnicos necessários para as simulações (valores, prazos e taxas inseridos).
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold text-foreground md:text-base">Uso</h2>
          <p>
            Os dados das simulações são processados apenas para gerar os resultados na tela e não são compartilhados com terceiros ou vendidos para fins comerciais.
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold text-foreground md:text-base">Proteção</h2>
          <p>
            Utilizamos protocolos de segurança para garantir que sua navegação e dados de acesso permaneçam protegidos.
          </p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
