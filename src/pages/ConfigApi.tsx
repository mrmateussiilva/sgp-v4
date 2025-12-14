import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Loader2, WifiOff, AlertTriangle } from 'lucide-react';
import { loadConfig, saveConfig } from '@/utils/config';
import { normalizeApiUrl, verifyApiConnection } from '@/services/apiClient';

interface ConfigApiProps {
  onConfigured: (url: string) => void;
}

type StatusState =
  | { type: 'idle'; message: string }
  | { type: 'testing'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

const DEFAULT_API_URL = 'http://192.168.0.10:8000';

export default function ConfigApi({ onConfigured }: ConfigApiProps) {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [status, setStatus] = useState<StatusState>({ type: 'idle', message: '' });
  const [isLoading, setIsLoading] = useState(false);

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
          if (error.code === AxiosError.ERR_NETWORK) {
            return '❌ Não foi possível conectar à API. Verifique se ela está em execução.';
          }
          return '❌ Falha na comunicação com a API.';
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


  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50/50 p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Alerta Principal */}
        <div className="bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <WifiOff className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-900 mb-1">
                Erro de Conexão com a API
              </h2>
              <p className="text-sm text-red-700 mb-4">
                Não foi possível conectar ao servidor da API. Verifique a configuração abaixo.
              </p>

              {/* Campo de URL */}
              <div className="space-y-2 mb-4">
                <label htmlFor="apiUrl" className="text-sm font-medium text-slate-700 block">
                  Endereço da API
                </label>
                <Input
                  id="apiUrl"
                  type="text"
                  placeholder="http://192.168.0.10:8000"
                  value={apiUrl}
                  onChange={handleChange}
                  disabled={isLoading}
                  noUppercase
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading && apiUrl.trim()) {
                      handleTest();
                    }
                  }}
                />
              </div>

              {/* Status Message */}
              {status.message && (
                <div className={`flex items-start gap-2 p-3 rounded-md mb-4 ${
                  status.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : status.type === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : status.type === 'testing'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-slate-50 text-slate-800 border border-slate-200'
                }`}>
                  {status.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  ) : status.type === 'error' ? (
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  ) : status.type === 'testing' ? (
                    <Loader2 className="h-5 w-5 flex-shrink-0 mt-0.5 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm flex-1">{status.message}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-2">
                <Button
                  onClick={handleTest}
                  disabled={isLoading || !apiUrl.trim()}
                  variant="outline"
                  className="flex-1"
                >
                  {isLoading && status.type === 'testing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    'Testar Conexão'
                  )}
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={isLoading || status.type !== 'success'}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isLoading && status.type !== 'testing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Conectar'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Dica Rápida */}
        {status.type === 'error' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Dica:</strong> Verifique se a API está em execução e se o endereço está correto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
