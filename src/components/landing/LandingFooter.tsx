export function LandingFooter() {
  return (
    <footer className="bg-[hsl(222_47%_8%)] text-[hsl(215_20%_65%)]">
      <div className="container max-w-4xl mx-auto px-4 py-10 text-center space-y-4">
        <p className="text-[11px] leading-relaxed tracking-wide opacity-80">
          As simulações do VetorPro são baseadas em parâmetros técnicos para facilitar as negociações imobiliárias. Sempre consulte as condições oficiais da sua instituição financeira antes de pactuar negociações.
        </p>
        <div className="w-12 h-px bg-[hsl(215_20%_25%)] mx-auto" />
        <div className="flex items-center justify-center gap-4 text-[10px] opacity-60">
          <a href="/termos" className="hover:opacity-100 transition-opacity">Termos de Uso</a>
          <span>·</span>
          <a href="/privacidade" className="hover:opacity-100 transition-opacity">Privacidade</a>
        </div>
        <p className="text-[10px] opacity-50">
          © 2026 VetorPro – Desenvolvido por J-RSBR Ltda.
        </p>
      </div>
    </footer>
  );
}