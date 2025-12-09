import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { fetch } from '@tauri-apps/plugin-http';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpdateResponse {
  version: string;
  notes?: string;
}

type UpdateStatus = 'checking' | 'updated' | 'update_available' | 'error';

export default function UpdateStatus() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<UpdateStatus>('checking');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = async () => {
    setIsChecking(true);
    setStatus('checking');
    setErrorMessage('');

    try {
      // Obter versão atual do app
      const appVersion = await invoke<string>('get_app_version');
      setCurrentVersion(appVersion);

      try {
        const response = await fetch('https://sgp.finderbit.com.br/update', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          connectTimeout: 10000, // 10 segundos de timeout
        });

        if (!response.ok) {
          throw new Error(
            `Erro ao consultar API: ${response.status} ${response.statusText}. Verifique se o servidor está acessível.`
          );
        }

        const data: UpdateResponse = await response.json();

        // Validar resposta
        if (!data || !data.version) {
          throw new Error('Resposta da API inválida: versão não encontrada');
        }

        setLatestVersion(data.version);
        setUpdateNotes(data.notes || '');

        // Comparar versões
        if (compareVersions(appVersion, data.version) < 0) {
          setStatus('update_available');
        } else {
          setStatus('updated');
        }
      } catch (fetchError) {
        if (fetchError instanceof Error) {
          if (fetchError.message.includes('timeout') || fetchError.message.includes('Timeout')) {
            throw new Error('Timeout: A requisição demorou muito para responder. Verifique sua conexão com a internet.');
          }
          if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('Load failed') || fetchError.message.includes('network')) {
            throw new Error(
              'Não foi possível conectar ao servidor de atualizações. Verifique:\n' +
              '• Sua conexão com a internet\n' +
              '• Se o servidor https://sgp.finderbit.com.br está acessível\n' +
              '• Se há bloqueios de firewall ou proxy'
            );
          }
          throw fetchError;
        }
        throw new Error('Erro desconhecido ao fazer requisição');
      }
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
      setStatus('error');
      
      let errorMsg = 'Erro desconhecido ao verificar atualizações';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsChecking(false);
    }
  };

  // Função para comparar versões (formato semver: X.Y.Z)
  const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  };

  // Verificar atualizações automaticamente ao abrir a tela
  useEffect(() => {
    checkForUpdates();
  }, []);

  const handleUpdate = () => {
    // TODO: Implementar lógica de atualização
    // Por enquanto, apenas mostra uma mensagem
    alert('Funcionalidade de atualização será implementada em breve.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="space-y-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-8 w-8" />
            <CardTitle className="text-2xl">Verificação de Atualização</CardTitle>
          </div>
          <CardDescription className="text-blue-100">
            Verificando se você está usando a versão mais recente do SGP
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Status de verificação */}
          {status === 'checking' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-lg font-medium text-gray-700">Verificando atualizações...</p>
            </div>
          )}

          {/* Status: Atualizado */}
          {status === 'updated' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-green-800 mb-1">
                    ✅ Você está atualizado!
                  </h3>
                  <p className="text-sm text-green-700">
                    Você está usando a versão mais recente do SGP.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Versão Instalada:</span>
                  <span className="text-sm font-bold text-gray-900">{currentVersion}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Versão Disponível:</span>
                  <span className="text-sm font-bold text-gray-900">{latestVersion}</span>
                </div>
              </div>
            </div>
          )}

          {/* Status: Atualização disponível */}
          {status === 'update_available' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-yellow-800 mb-1">
                    ⚠️ Nova versão disponível!
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Uma nova versão do SGP está disponível para download.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Versão Instalada:</span>
                  <span className="text-sm font-bold text-gray-900">{currentVersion}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Nova Versão:</span>
                  <span className="text-sm font-bold text-blue-600">{latestVersion}</span>
                </div>
              </div>

              {updateNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-blue-800 mb-2">Notas da Atualização:</h4>
                  <p className="text-sm text-blue-700 whitespace-pre-wrap">{updateNotes}</p>
                </div>
              )}

              <Button
                onClick={handleUpdate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Atualizar Agora
              </Button>
            </div>
          )}

          {/* Status: Erro */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-red-800 mb-2">❌ Erro ao verificar</h3>
                  <p className="text-sm text-red-700 whitespace-pre-line">{errorMessage}</p>
                </div>
              </div>

              {currentVersion && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Versão Instalada:</span>
                    <span className="text-sm font-bold text-gray-900">{currentVersion}</span>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-blue-800 mb-2">Informações de Debug:</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• URL da API: https://sgp.finderbit.com.br/update</p>
                  <p>• Verifique se o servidor está acessível no navegador</p>
                  <p>• Verifique sua conexão com a internet</p>
                  <p>• Verifique o console do navegador (F12) para mais detalhes</p>
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={checkForUpdates}
              disabled={isChecking}
              variant="outline"
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verificar Novamente
                </>
              )}
            </Button>

            <Button onClick={() => navigate('/dashboard')} variant="ghost">
              Voltar ao Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

