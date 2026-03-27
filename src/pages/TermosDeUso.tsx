import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function TermosDeUso() {
  return (
    <LegalPageLayout
      title="Termos de Uso"
      intro=""
    >
      <section className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="font-semibold text-foreground text-center">
          Ao contratar e acessar os serviços do VetorPro, o assinante da plataforma declara estar ciente e em total concordância com os termos e condições abaixo estabelecidos.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">1. Natureza do Serviço</h2>
        <p>
          O VetorPro é uma plataforma de simulação financeira que atua como <strong>ferramenta de apoio à decisão e suporte estratégico</strong> para profissionais do mercado imobiliário. O assinante da plataforma declara estar ciente de que:
        </p>
        <ul className="list-disc space-y-3 pl-5">
          <li>Os resultados apresentados são projeções estimadas e não garantias de valores reais;</li>
          <li>As taxas de juros e condições de financiamento variam conforme a instituição bancária e o perfil de crédito do cliente;</li>
          <li>O VetorPro não é uma instituição financeira e não realiza intermediação de crédito ou garantia de aprovação bancária.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">2. Transparência e Informação</h2>
        <p>
          Em conformidade com o <strong>Art. 6º, inciso III, do Código de Defesa do Consumidor (Lei nº 8.078/90)</strong>, o VetorPro se compromete a fornecer informações claras, precisas e ostensivas sobre os parâmetros utilizados nas simulações, garantindo ao usuário a compreensão adequada dos resultados apresentados.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">3. Responsabilidade e Marco Civil da Internet</h2>
        <p>
          O VetorPro atua em conformidade com as diretrizes de responsabilidade estabelecidas pelo <strong>Marco Civil da Internet (Lei nº 12.965/2014)</strong>, assegurando a neutralidade no tratamento dos dados inseridos pelo usuário e a transparência no funcionamento da plataforma. Os resultados gerados têm caráter exclusivamente informativo e de apoio estratégico, não substituindo a análise técnica de profissionais habilitados ou as condições oficiais das instituições financeiras.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">4. Legislação Aplicável</h2>
        <p>
          Estes Termos de Uso são regidos pela legislação brasileira. Para questões relacionadas ao consumo, aplica-se o Código de Defesa do Consumidor. Para questões digitais, aplica-se o Marco Civil da Internet e a Lei Geral de Proteção de Dados (LGPD).
        </p>
        <p className="text-xs text-right">
          <a
            href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
          >
            Consulte o Código de Defesa do Consumidor aqui ↗
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
}
