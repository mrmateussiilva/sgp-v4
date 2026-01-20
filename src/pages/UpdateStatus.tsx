import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-sm border-slate-200">
        <CardHeader className="space-y-1 border-b bg-slate-50/50">
          <div className="flex items-center gap-2">
            <RefreshCw className={cn("h-5 w-5 text-slate-500", isChecking && "animate-spin")} />
            <CardTitle className="text-lg font-bold text-slate-800">Atualizador do Sistema</CardTitle>
          </div>
          <CardDescription className="text-slate-500 text-xs">
            Gerenciamento de versões e atualizações
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Versão atual - Sempre visível se disponível */}
          {currentVersion && !isChecking && (
            <div className="flex justify-between items-center px-3 py-2 bg-slate-100 rounded border border-slate-200">
              <span className="text-xs font-medium text-slate-600">Versão instalada:</span>
              <span className="text-xs font-bold text-slate-900">v{currentVersion}</span>
            </div>
          )}

          {/* Estado: Verificando */}
          {isChecking && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-600">Verificando atualizações...</p>
              <p className="text-xs text-slate-400">Isso pode levar alguns segundos.</p>
            </div>
          )}

          {/* Estado: Atualizado */}
          {!isChecking && !updateAvailable && !error && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-sm text-emerald-800">
                  Sistema atualizado
                </h3>
                <p className="text-xs text-emerald-700">
                  Você já está utilizando a versão mais recente.
                </p>
              </div>
            </div>
          )}

          {/* Estado: Atualização disponível (Simplificado para este commit, será evoluído no próximo) */}
          {!isChecking && updateAvailable && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded">
                <RefreshCw className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-blue-800">
                    Nova versão disponível
                  </h3>
                  <p className="text-xs text-blue-700">
                    Uma nova versão (v{updateVersion}) está pronta para instalação.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleDownloadAndInstall}
                disabled={isInstalling}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white shadow-none"
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Instalando...
                  </>
                ) : (
                  "Atualizar agora"
                )}
              </Button>
            </div>
          )}

          {/* Erro */}
          {error && !isChecking && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-sm text-red-800">Erro na verificação</h3>
                <p className="text-xs text-red-700 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          {/* Botões de ação inferior */}
          {!isChecking && (
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <Button
                onClick={checkForUpdates}
                disabled={isChecking || isInstalling}
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
              >
                Verificar novamente
              </Button>

              <Button
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500"
                disabled={isInstalling}
              >
                Voltar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
