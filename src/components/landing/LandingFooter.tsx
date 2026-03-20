import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="bg-[hsl(var(--foreground))] text-[hsl(var(--muted-foreground))]">
      <div className="container mx-auto max-w-4xl space-y-4 px-4 py-10 text-center">
        <p className="text-[11px] leading-relaxed tracking-wide opacity-80">
          O VetorPro é uma plataforma profissional exclusiva. Não há versão gratuita. Planos corporativos acima de 5 usuários sob consulta. As simulações são baseadas em parâmetros técnicos para facilitar as negociações imobiliárias. Sempre consulte as condições oficiais da sua instituição financeira.
        </p>
        <div className="mx-auto h-px w-12 bg-border/40" />
        <div className="flex items-center justify-center gap-4 text-[10px] opacity-70">
          <Link to="/termos-de-uso" className="transition-opacity hover:opacity-100">
            Termos de Uso
          </Link>
          <span>·</span>
          <Link to="/politica-de-privacidade" className="transition-opacity hover:opacity-100">
            Privacidade
          </Link>
        </div>
        <p className="text-[10px] opacity-50">© 2026 VetorPro – Desenvolvido por J-RSBR Ltda.</p>
      </div>
    </footer>
  );
}
