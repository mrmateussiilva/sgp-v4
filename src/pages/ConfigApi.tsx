import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, Server } from 'lucide-react';
import { deleteConfig, loadConfig, saveConfig } from '@/utils/config';
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

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await deleteConfig();
      setApiUrl(DEFAULT_API_URL);
      setStatus({
        type: 'idle',
        message: 'Configuração removida. Informe um novo endereço.',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `❌ Erro ao remover configuração: ${String(error)}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="space-y-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <Server className="h-8 w-8" />
            <CardTitle className="text-2xl">Configuração da API</CardTitle>
          </div>
          <CardDescription className="text-blue-100">
            Informe o endereço da API Python (FastAPI) utilizada pelo sistema.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Atenção:</strong> O backend Rust do Tauri não acessa a rede. Todas as
              requisições partem do frontend React via HTTP para a API Python.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="apiUrl" className="text-base font-medium">
                URL da API
              </Label>
              <Input
                id="apiUrl"
                type="text"
                placeholder="http://192.168.0.10:8000"
                value={apiUrl}
                onChange={handleChange}
                className="mt-2"
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 mt-1">
                Exemplo: http://192.168.0.10:8000 ou http://seu-servidor:8000
              </p>
            </div>
          </div>

          {status.message && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                status.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : status.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : status.type === 'error' ? (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
              )}
              <p className="text-sm">{status.message}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Salvar e Conectar
            </Button>

            <Button onClick={handleReset} disabled={isLoading} variant="ghost">
              Resetar
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2 text-gray-700">Como iniciar a API:</h4>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap">
                {`cd /home/mateus/Projetcs/api-sgp
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
