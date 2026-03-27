import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function PoliticaDePrivacidade() {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      intro=""
    >
      <p className="font-medium text-foreground">
        Sua privacidade é prioridade. Esta política é fundamentada na <strong>Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018)</strong>.
      </p>

      <section className="space-y-5">
        <div>
          <h2 className="mb-1 text-sm font-semibold text-foreground md:text-base">1. Coleta de Dados</h2>
          <p>
            Coletamos apenas os dados técnicos necessários para as simulações (valores, prazos e taxas inseridos) e dados cadastrais fornecidos voluntariamente pelo Assinante da Plataforma no momento do registro (nome, e-mail e telefone).
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold text-foreground md:text-base">2. Base Legal para o Tratamento</h2>
          <p>
            O tratamento de dados pessoais pelo VetorPro ocorre com fundamento no <strong>Art. 7º da LGPD</strong>, especificamente:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li><strong>Inciso I — Consentimento:</strong> o Assinante da Plataforma consente com o tratamento ao aceitar os Termos de Uso, implícitos no momento da criação e pagamento de sua conta;</li>
            <li><strong>Inciso V — Execução de Contrato:</strong> os dados são necessários para a prestação do serviço contratado (simulações, propostas e relatórios).</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold text-foreground md:text-base">3. Uso dos Dados</h2>
          <p>
            Os dados das simulações são processados apenas para gerar os resultados na tela e não são compartilhados com terceiros ou vendidos para fins comerciais. Em conformidade com a LGPD, os dados sensíveis de simulações são excluídos automaticamente após 30 dias.
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold text-foreground md:text-base">4. Direitos do Titular (Art. 18 da LGPD)</h2>
          <p>
            O Assinante da Plataforma, na qualidade de titular dos dados pessoais, tem direito a solicitar, a qualquer momento, mediante requisição ao controlador:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Confirmação da existência de tratamento de dados;</li>
            <li>Acesso aos seus dados pessoais;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
            <li>Eliminação dos dados pessoais tratados com consentimento;</li>
            <li>Revogação do consentimento a qualquer tempo.</li>
          </ul>
          <p className="mt-2">
            Para exercer seus direitos, entre em contato pelo e-mail{" "}
            <a href="mailto:contato@j-rsbr.com.br" className="text-primary underline underline-offset-2">
              contato@j-rsbr.com.br
            </a>.
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold text-foreground md:text-base">5. Proteção e Segurança</h2>
          <p>
            Utilizamos protocolos de segurança e criptografia para garantir que sua navegação e dados de acesso permaneçam protegidos, em conformidade com as melhores práticas do mercado e as exigências da LGPD.
          </p>
        </div>

        <div>
          <p className="text-xs text-right">
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
            >
              Leia a íntegra da LGPD aqui ↗
            </a>
          </p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
