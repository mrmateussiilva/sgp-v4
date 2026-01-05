import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { DEFAULT_MANIFEST_URL } from '@/utils/manifestUrl';

type UpdateStatus = 'checking' | 'updated' | 'update_available' | 'error';

interface ManualUpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  url?: string;
  notes?: string;
  date?: string;
  signature?: string;
}

export default function UpdateStatus() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<UpdateStatus>('checking');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [updateInfo, setUpdateInfo] = useState<ManualUpdateInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const [installProgress, setInstallProgress] = useState<string>('');

  const checkForUpdates = async () => {
    setIsChecking(true);
    setStatus('checking');
    setErrorMessage('');

    try {
      // Obter versão atual do app
      const appVersion = await invoke<string>('get_app_version');
      setCurrentVersion(appVersion);

      const result = await invoke<ManualUpdateInfo>('check_update_manual', {
        // O comando Rust agora espera `manifestUrl` (camelCase), alinhado com a mensagem de erro
        manifestUrl: DEFAULT_MANIFEST_URL,
      });

      setLatestVersion(result.latest_version || result.current_version || appVersion);
      setUpdateNotes(result.notes || '');

      if (result.available) {
        setUpdateInfo(result);
        setStatus('update_available');
      } else {
        setUpdateInfo(null);
        setStatus('updated');
      }
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
      setUpdateInfo(null);
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

  // Verificar atualizações automaticamente ao abrir a tela
  useEffect(() => {
    checkForUpdates();
  }, []);

  const handleDownloadAndInstall = async () => {
    if (!updateInfo?.url) {
      toast({
        title: 'Nenhuma atualização disponível',
        description: 'Não encontramos um instalador para esta plataforma.',
        variant: 'destructive',
      });
      return;
    }

    // Validar URL antes de tentar baixar
    if (!updateInfo.url.startsWith('http://') && !updateInfo.url.startsWith('https://')) {
      toast({
        title: 'URL inválida',
        description: `A URL de atualização é inválida: ${updateInfo.url}`,
        variant: 'destructive',
      });
      return;
    }

    console.log('📥 Tentando baixar atualização de:', updateInfo.url);

    try {
      // Fase 1: Download
      setIsDownloading(true);
      setDownloadProgress('Conectando ao servidor...');
      
      toast({
        title: '📥 Iniciando download',
        description: `Baixando versão ${updateInfo.latest_version}...`,
        variant: 'info',
      });

      setDownloadProgress('Baixando arquivo de atualização...');
      const filePath = await invoke<string>('download_update_manual', {
        // O comando Rust espera `updateUrl` (camelCase, consistente com check_update_manual)
        updateUrl: updateInfo.url,
      });

      setDownloadProgress('Download concluído!');
      setIsDownloading(false);
      
      toast({
        title: '✅ Download concluído',
        description: 'Arquivo baixado com sucesso. Iniciando instalação...',
        variant: 'success',
      });

      // Pequeno delay para o usuário ver a mensagem
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fase 2: Instalação
      setIsInstalling(true);
      setInstallProgress('Preparando instalação...');
      
      toast({
        title: '🔧 Instalando atualização',
        description: 'Por favor, aguarde enquanto a atualização é instalada...',
        variant: 'info',
      });

      setInstallProgress('Executando instalador (modo per-user, sem admin)...');
      
      // Adicionar timeout no frontend também
      const installTimeout = setTimeout(() => {
        setIsInstalling(false);
        toast({
          title: '⏱️ Instalação demorando mais que o esperado',
          description: 'A instalação está demorando. Isso pode acontecer se o Windows estiver processando a instalação. Verifique se há alguma janela aberta. Os logs estão sendo salvos em arquivo.',
          variant: 'default',
          duration: 10000,
        });
      }, 65000); // 65 segundos (um pouco mais que o timeout do Rust)
      
      // O comando Rust espera `filePath` (camelCase, consistente com outros comandos)
      const message = await invoke<string>('install_update_manual', { filePath: filePath });
      
      clearTimeout(installTimeout);

      setInstallProgress('Instalação concluída!');
      
      toast({
        title: '✅ Atualização aplicada com sucesso!',
        description: message || 'A aplicação será reiniciada automaticamente em instantes...',
        variant: 'success',
        duration: 5000,
      });
    } catch (error) {
      console.error('Erro ao instalar atualização:', error);
      let errorMessage = 'Erro desconhecido ao instalar atualização';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Mensagens mais específicas baseadas no tipo de erro
      if (errorMessage.toLowerCase().includes('404') || errorMessage.toLowerCase().includes('not found')) {
        errorMessage = `❌ Arquivo não encontrado no servidor (404).\n\n` +
          `URL tentada: ${updateInfo?.url || 'N/A'}\n\n` +
          `Possíveis causas:\n` +
          `• O arquivo MSI não foi publicado no servidor neste caminho\n` +
          `• O servidor não está configurado para servir arquivos estáticos\n` +
          `• Verifique se o arquivo existe em: ${updateInfo?.url || 'N/A'}\n\n` +
          `💡 Acesse a URL acima no navegador para verificar se o arquivo está disponível.\n\n` +
          `📋 Para corrigir:\n` +
          `1. Publique o arquivo MSI no servidor no caminho correto\n` +
          `2. Configure o servidor para servir arquivos estáticos\n` +
          `3. Verifique as permissões do arquivo no servidor`;
      } else if (errorMessage.toLowerCase().includes('conectar') || errorMessage.toLowerCase().includes('conexão')) {
        errorMessage = '❌ Erro de conexão: Verifique sua internet e tente novamente.';
      } else if (errorMessage.toLowerCase().includes('http')) {
        errorMessage = `❌ Erro HTTP ao baixar: ${errorMessage}\n\n` +
          `URL: ${updateInfo?.url || 'N/A'}\n\n` +
          `Verifique se o arquivo está disponível no servidor.`;
      } else if (errorMessage.toLowerCase().includes('salvar') || errorMessage.toLowerCase().includes('disco')) {
        errorMessage = '❌ Erro ao salvar: Verifique se há espaço em disco suficiente.';
      } else if (errorMessage.toLowerCase().includes('key') || errorMessage.toLowerCase().includes('chave')) {
        errorMessage += '\n\n💡 Dica: O instalador pode estar exigindo uma chave de produto. Verifique se o MSI está configurado corretamente.';
      } else if (errorMessage.toLowerCase().includes('msiexec') || errorMessage.toLowerCase().includes('instalar')) {
        errorMessage = '❌ Erro ao instalar: Verifique se você tem permissões de administrador.';
      }
      
      toast({
        title: '❌ Erro ao processar atualização',
        description: errorMessage,
        variant: 'destructive',
        duration: 15000, // Aumentar duração para mensagens longas
      });
      
      setDownloadProgress('');
      setInstallProgress('');
    } finally {
      setIsDownloading(false);
      setIsInstalling(false);
    }
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

              {/* Feedback de progresso */}
              {(isDownloading || isInstalling) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  {isDownloading && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Download em andamento...</span>
                      </div>
                      {downloadProgress && (
                        <p className="text-xs text-blue-700 ml-6">{downloadProgress}</p>
                      )}
                    </div>
                  )}
                  {isInstalling && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Instalação em andamento...</span>
                      </div>
                      {installProgress && (
                        <p className="text-xs text-blue-700 ml-6">{installProgress}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleDownloadAndInstall}
                disabled={isInstalling || isDownloading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                size="lg"
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Instalando...
                  </>
                ) : isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Baixando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Baixar e Instalar
                  </>
                )}
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
                  <p>• URL da API: {DEFAULT_MANIFEST_URL}</p>
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

