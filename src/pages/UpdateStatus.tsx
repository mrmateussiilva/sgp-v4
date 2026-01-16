import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export default function UpdateStatus() {
  const navigate = useNavigate();
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string>('');

  // Carregar versão atual
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const version = await invoke<string>('get_app_version');
        setCurrentVersion(version);
      } catch (err) {
        console.error('Erro ao obter versão:', err);
      }
    };
    loadVersion();
  }, []);

  // Verificar atualizações ao abrir a página
  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    setIsChecking(true);
    setError('');
    setUpdateAvailable(false);

    try {
      console.info('[UpdateStatus] Verificando atualizações...');
      
      const update = await check({
        target: undefined,
      });

      if (!update) {
        setUpdateAvailable(false);
        toast({
          title: '✅ Você está atualizado!',
          description: 'Você está usando a versão mais recente do SGP.',
          variant: 'default',
        });
      } else {
        setUpdateAvailable(true);
        setUpdateVersion(update.version);
        setUpdateNotes(update.body || 'Sem notas de atualização disponíveis.');
        
        toast({
          title: '🔄 Nova versão disponível!',
          description: `Versão ${update.version} está disponível.`,
          variant: 'info',
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[UpdateStatus] Erro:', err);
      setError(errorMsg);
      toast({
        title: '❌ Erro ao verificar atualizações',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadAndInstall = async () => {
    if (!updateAvailable) return;

    setIsInstalling(true);
    setError('');

    try {
      console.info('[UpdateStatus] Verificando atualização novamente...');
      
      const update = await check({
        target: undefined,
      });

      if (!update) {
        toast({
          title: 'Atualização não encontrada',
          description: 'A atualização não está mais disponível.',
          variant: 'destructive',
        });
        setIsInstalling(false);
        return;
      }

      console.info('[UpdateStatus] Baixando e instalando atualização...');
      
      // Salvar versão atual antes de atualizar
      if (currentVersion) {
        localStorage.setItem('previous_version', currentVersion);
        localStorage.setItem('show_changelog_after_update', 'true');
      }
      
      // downloadAndInstall() baixa, instala e prepara o reinício
      await update.downloadAndInstall();

      console.info('[UpdateStatus] Atualização instalada. Reiniciando...');
      
      toast({
        title: '✅ Atualização instalada!',
        description: 'A aplicação será reiniciada em instantes...',
        variant: 'success',
        duration: 3000,
      });

      // Pequeno delay para o usuário ver a mensagem
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reiniciar aplicação
      await relaunch();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido ao instalar';
      console.error('[UpdateStatus] Erro ao instalar:', err);
      setError(errorMsg);
      setIsInstalling(false);
      
      toast({
        title: '❌ Erro ao instalar atualização',
        description: errorMsg,
        variant: 'destructive',
      });
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
            Sistema de atualização oficial do Tauri
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Versão atual */}
          {currentVersion && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Versão Instalada:</span>
                <span className="text-sm font-bold text-gray-900">{currentVersion}</span>
              </div>
            </div>
          )}

          {/* Verificando */}
          {isChecking && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-lg font-medium text-gray-700">Verificando atualizações...</p>
            </div>
          )}

          {/* Atualizado */}
          {!isChecking && !updateAvailable && !error && (
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
          )}

          {/* Atualização disponível */}
          {!isChecking && updateAvailable && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-yellow-800 mb-1">
                    ⚠️ Nova versão disponível!
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Versão {updateVersion} está disponível para download.
                  </p>
                </div>
              </div>

              {updateNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-blue-800 mb-2">Notas da Atualização:</h4>
                  <p className="text-sm text-blue-700 whitespace-pre-wrap">{updateNotes}</p>
                </div>
              )}

              <Button
                onClick={handleDownloadAndInstall}
                disabled={isInstalling}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                size="lg"
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Instalando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Baixar e Instalar Atualização
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-lg text-red-800 mb-2">❌ Erro</h3>
                <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
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
