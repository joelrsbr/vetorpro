import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function TermosDeUso() {
  return (
    <LegalPageLayout
      title="Termos de Uso"
      intro="O VetorPro fornece inteligência de dados para Simulação Estruturada de Cenários Imobiliários, visando oferecer clareza estratégica e projeções financeiras baseadas em indexadores de mercado."
    >
      <p>
        O VetorPro é uma plataforma de simulação financeira. O usuário declara estar ciente de que:
      </p>

      <ul className="list-disc space-y-3 pl-5">
        <li>Os resultados apresentados são projeções estimadas e não garantias de valores reais;</li>
        <li>
          As taxas de juros e condições de financiamento variam conforme a instituição bancária e o perfil de crédito do cliente;
        </li>
        <li>
          O VetorPro não é uma instituição financeira e não realiza intermediação de crédito ou garantia de aprovação bancária.
        </li>
      </ul>
    </LegalPageLayout>
  );
}
