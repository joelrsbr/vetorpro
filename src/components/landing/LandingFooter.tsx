export function LandingFooter() {
  return (
    <footer className="bg-[hsl(222_47%_8%)] text-[hsl(215_20%_65%)]">
      {/* Disclaimer técnico */}
      <div className="container max-w-4xl mx-auto px-4 py-10 text-center space-y-4">
        <p className="text-[11px] leading-relaxed tracking-wide opacity-80">
          O VetorPro é uma plataforma profissional exclusiva. Não há versão gratuita. Planos corporativos acima de 5 usuários sob consulta. As simulações são baseadas em parâmetros técnicos para facilitar as negociações imobiliárias. Sempre consulte as condições oficiais da sua instituição financeira.
        </p>
        <div className="w-12 h-px bg-[hsl(215_20%_25%)] mx-auto" />
        <p className="text-[10px] opacity-50">
          © 2026 VetorPro – Desenvolvido por Joel Farias da Silveira.
        </p>
      </div>
    </footer>
  );
}
