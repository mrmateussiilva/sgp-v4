import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary para capturar erros de renderização do React
 * e exibir uma UI amigável ao invés de quebrar a aplicação
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Logar erro para análise
    logger.error('ErrorBoundary capturou um erro', error, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Aqui poderia enviar para serviço de monitoramento
    // Exemplo: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = (): void => {
    const errorMsg = this.state.error?.message?.toLowerCase() || '';
    const isChunkError =
      errorMsg.includes('failed to fetch dynamically imported module') ||
      errorMsg.includes('error loading dynamically imported module') ||
      errorMsg.includes('chunkloaderror') ||
      errorMsg.includes('loading chunk');

    if (isChunkError) {
      window.location.reload();
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMsg = this.state.error?.message?.toLowerCase() || '';
      const isChunkError =
        errorMsg.includes('failed to fetch dynamically imported module') ||
        errorMsg.includes('error loading dynamically imported module') ||
        errorMsg.includes('chunkloaderror') ||
        errorMsg.includes('loading chunk');

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>
                  {isChunkError ? 'Nova versão ou módulo indisponível' : 'Algo deu errado'}
                </CardTitle>
              </div>
              <CardDescription>
                {isChunkError
                  ? 'Uma nova versão ou alteração foi carregada. Por favor, recarregue a página para atualizar.'
                  : 'Ocorreu um erro inesperado. Por favor, tente novamente.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-slate-100 p-4 rounded-md">
                  <p className="font-mono text-sm text-slate-800 break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-slate-600">
                        Detalhes técnicos
                      </summary>
                      <pre className="mt-2 text-xs text-slate-700 overflow-auto max-h-64">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="default">
                  {isChunkError ? 'Recarregar Aplicativo' : 'Tentar novamente'}
                </Button>
                {!isChunkError && (
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                  >
                    Recarregar página
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

