import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Captura erros em qualquer lugar da árvore para evitar tela branca por inatividade
 * (ex.: token Supabase expira em background, query lança, React desmonta tudo).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] capturou erro:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleContinue = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 shadow-sm text-center space-y-4">
            <h2 className="text-xl font-bold text-foreground">
              Ops, algo travou momentaneamente
            </h2>
            <p className="text-sm text-muted-foreground">
              Sua sessão e dados estão preservados. Tente continuar — se persistir, recarregue a página.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleContinue}
                className="px-4 py-2 rounded-md border border-border text-sm hover:bg-muted"
              >
                Continuar
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
              >
                Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
