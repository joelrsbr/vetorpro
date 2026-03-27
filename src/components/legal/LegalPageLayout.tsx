import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import vetorproLogo from "@/assets/vetorpro-logo.png";
import { Button } from "@/components/ui/button";

interface LegalPageLayoutProps {
  title: string;
  intro: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, intro, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95 supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={vetorproLogo} alt="VetorPro" className="h-10 w-auto object-contain" />
            <span className="text-sm font-semibold text-foreground">VetorPro</span>
          </Link>

          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl px-4 py-12 md:py-16">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-10">
          <p className="mb-3 text-sm font-medium text-primary">{intro}</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl text-center">
            {title}
          </h1>
          <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground md:text-base">
            {children}
          </div>
        </article>
      </main>

      <footer className="border-t border-border bg-muted/20">
        <div className="container flex flex-col items-center justify-between gap-3 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 VetorPro — Desenvolvido por J-RSBR Ltda.</span>
          <div className="flex items-center gap-4">
            <Link to="/termos-de-uso" className="transition-colors hover:text-primary">
              Termos de Uso
            </Link>
            <Link to="/politica-de-privacidade" className="transition-colors hover:text-primary">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
