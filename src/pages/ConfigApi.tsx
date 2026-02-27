import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Loader2, WifiOff, RefreshCw, HelpCircle } from 'lucide-react';
import { loadConfig, saveConfig } from '@/utils/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { normalizeApiUrl, verifyApiConnection } from '@/api/client';

export type FallbackReason = 'no_config' | 'connection_lost';

interface ConfigApiProps {
  onConfigured: (url: string) => void;
  /** Motivo da exibição da tela: sem URL configurada ou perda de conexão durante o uso */
  reason?: FallbackReason;
}

type StatusState =
  | { type: 'idle'; message: string }
  | { type: 'testing'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

const DEFAULT_API_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function ConfigApi({ onConfigured, reason = 'no_config' }: ConfigApiProps) {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [status, setStatus] = useState<StatusState>({ type: 'idle', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const isConnectionLost = reason === 'connection_lost';
  const title = isConnectionLost
    ? 'Servidor da API indisponível'
    : 'Configure a conexão com a API';
  const subtitle = isConnectionLost
    ? 'Não foi possível conectar ao servidor da API. Ele pode estar desligado ou inacessível. Verifique o endereço abaixo e tente novamente.'
    : 'Informe o endereço do servidor da API para conectar ao sistema.';

  useEffect(() => {
    const fetchSavedConfig = async () => {
      const existing = await loadConfig();
      if (existing?.api_url) {
        const normalized = normalizeApiUrl(existing.api_url);
        setApiUrl(normalized);
        setStatus({ type: 'idle', message: 'URL carregada do arquivo de configuração' });
      }
    };

    fetchSavedConfig();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiUrl(event.target.value);
    if (status.type !== 'idle') {
      setStatus({ type: 'idle', message: '' });
    }
  };

  const handleTest = async () => {
    const trimmed = apiUrl.trim();

    if (!trimmed) {
      setStatus({ type: 'error', message: '❌ Por favor, informe a URL da API.' });
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setStatus({
        type: 'error',
        message: '❌ URL inválida. Utilize o formato http://ip:porta',
      });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'testing', message: 'Testando conexão com a API...' });

    try {
      const endpoint = await verifyApiConnection(trimmed);
      const normalized = normalizeApiUrl(trimmed);
      setApiUrl(normalized);
      setStatus({
        type: 'success',
        message: `✅ Conexão estabelecida com sucesso (${endpoint}).`,
      });
    } catch (error) {
      const message = (() => {
        if (error instanceof AxiosError) {
          if (error.response) {
            return `❌ API respondeu com status ${error.response.status}.`;
          }
          if (error.code === AxiosError.ERR_NETWORK || error.code === 'ECONNREFUSED') {
            return `❌ Não foi possível conectar ao servidor em ${trimmed}. Verifique:\n- Se a API está rodando\n- Se o IP e porta estão corretos\n- Se o firewall permite conexões\n- Se está na mesma rede`;
          }
          if (error.code === 'ETIMEDOUT') {
            return `❌ Timeout ao conectar ao servidor em ${trimmed}. Verifique a conexão de rede.`;
          }
          // Usar mensagem do erro se disponível
          if (error.message && error.message.includes('Não foi possível conectar')) {
            return error.message;
          }
          return `❌ Falha na comunicação com a API: ${error.message || 'Erro desconhecido'}`;
        }
        if (error instanceof Error) {
          return error.message || '❌ Não foi possível verificar a conexão com a API.';
        }
        return '❌ Não foi possível verificar a conexão com a API.';
      })();

      setStatus({
        type: 'error',
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const trimmed = apiUrl.trim();
    if (status.type !== 'success') {
      setStatus({
        type: 'error',
        message: '❌ Teste a conexão antes de salvar.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const normalized = normalizeApiUrl(trimmed);
      await saveConfig(normalized);
      onConfigured(normalized);
    } catch (error) {
      setStatus({
        type: 'error',
        message: `❌ Erro ao salvar configuração: ${String(error)}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /** Tenta reconectar com a URL atual (útil quando o servidor volta a ficar online). */
  const handleRetry = async () => {
    const trimmed = apiUrl.trim();
    if (!trimmed) {
      setStatus({ type: 'error', message: '❌ Por favor, informe a URL da API.' });
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setStatus({
        type: 'error',
        message: '❌ URL inválida. Utilize o formato http://ip:porta',
      });
      return;
    }
    setIsLoading(true);
    setStatus({ type: 'testing', message: 'Tentando reconectar...' });
    try {
      await verifyApiConnection(trimmed);
      const normalized = normalizeApiUrl(trimmed);
      setApiUrl(normalized);
      setStatus({
        type: 'success',
        message: '✅ Conexão reestabelecida. Entrando no sistema...',
      });
      await saveConfig(normalized);
      onConfigured(normalized);
    } catch (error) {
      const message = (() => {
        if (error instanceof AxiosError) {
          if (error.response) {
            return `❌ API respondeu com status ${error.response.status}.`;
          }
          if (error.code === AxiosError.ERR_NETWORK || error.code === 'ECONNREFUSED') {
            return `❌ Não foi possível conectar ao servidor em ${trimmed}. Verifique:\n- Se a API está rodando\n- Se o IP e porta estão corretos\n- Se o firewall permite conexões\n- Se está na mesma rede`;
          }
          if (error.code === 'ETIMEDOUT') {
            return `❌ Timeout ao conectar ao servidor em ${trimmed}. Verifique a conexão de rede.`;
          }
          if (error.message && error.message.includes('Não foi possível conectar')) {
            return error.message;
          }
          return `❌ Falha na comunicação com a API: ${error.message || 'Erro desconhecido'}`;
        }
        if (error instanceof Error) {
          return error.message || '❌ Não foi possível verificar a conexão com a API.';
        }
        return '❌ Não foi possível verificar a conexão com a API.';
      })();
      setStatus({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  const hasUrl = apiUrl.trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-4 animate-in fade-in duration-500">
        <Card className="shadow-lg border-red-100 overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <WifiOff className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
              {title}
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              {subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {/* URL Input Section */}
            <div className="space-y-2">
              <label htmlFor="apiUrl" className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Endereço do Servidor
              </label>
              <Input
                id="apiUrl"
                type="text"
                placeholder="ex: http://192.168.1.10:8000"
                value={apiUrl}
                onChange={handleChange}
                disabled={isLoading}
                noUppercase
                className="h-11 border-slate-200 focus:ring-red-500 focus:border-red-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading && apiUrl.trim()) {
                    handleTest();
                  }
                }}
              />
            </div>

            {/* Status Feedback */}
            {status.message && (
              <div className={`p-3 rounded-lg border flex gap-3 transition-colors duration-200 ${status.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-100'
                : status.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-100'
                  : 'bg-blue-50 text-blue-800 border-blue-100'
                }`}>
                <div className="flex-shrink-0 mt-0.5">
                  {status.type === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : status.type === 'error' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
                <p className="text-sm font-medium leading-tight whitespace-pre-line">{status.message}</p>
              </div>
            )}

            {/* Actions Grid */}
            <div className="grid gap-2 pt-2">
              {hasUrl && (
                <Button
                  onClick={handleRetry}
                  disabled={isLoading}
                  variant="secondary"
                  className="w-full h-11"
                >
                  {isLoading && status.type === 'testing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reconectando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Tentar reconectar
                    </>
                  )}
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleTest}
                  disabled={isLoading || !apiUrl.trim()}
                  variant="outline"
                  className="h-11"
                >
                  {isLoading && status.type === 'testing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Testar Conexão'
                  )}
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={isLoading || status.type !== 'success'}
                  className="h-11 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading && status.type !== 'testing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </div>
            </div>

            {/* Troubleshooting Section */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex gap-3">
                <div className="mt-1 flex-shrink-0">
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">O que verificar:</p>
                  <ul className="space-y-1.5">
                    {[
                      'A API está em execução no servidor?',
                      'O endereço (IP e porta) está correto?',
                      'Está na mesma rede que o servidor?',
                      'O firewall pode estar bloqueando a porta?'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] text-slate-600 font-medium leading-none">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
