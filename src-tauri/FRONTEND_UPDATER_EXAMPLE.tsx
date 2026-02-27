import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { alert } from '../src/utils/alert';

const FALLBACK_MANIFEST_URL = 'https://sgp.finderbit.com.br/update';

function resolveManifestUrl() {
  const viteEnv = (import.meta as ImportMeta & { env?: { VITE_SGP_MANIFEST_URL?: string } })?.env?.VITE_SGP_MANIFEST_URL;
  if (viteEnv) {
    return viteEnv as string;
  }
  if (typeof window !== 'undefined') {
    const globalUrl = (window as Window & { __SGP_MANIFEST_URL__?: string }).__SGP_MANIFEST_URL__;
    if (globalUrl) {
      return globalUrl;
    }
    const metaTag = document.querySelector('meta[name="sgp-manifest-url"]') as HTMLMetaElement | null;
    if (metaTag?.content) {
      return metaTag.content;
    }
  }
  return FALLBACK_MANIFEST_URL;
}

const DEFAULT_MANIFEST_URL = resolveManifestUrl();

interface ManualUpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  url?: string;
  notes?: string;
  date?: string;
  signature?: string;
}

export function useManualUpdater(manifestUrl: string = DEFAULT_MANIFEST_URL) {
  const [updateInfo, setUpdateInfo] = useState<ManualUpdateInfo | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const loadCurrentVersion = async () => {
    try {
      const version = await invoke<string>('get_app_version');
      setCurrentVersion(version);
      setLatestVersion(version);
    } catch (error) {
      console.error('Erro ao obter versão atual:', error);
    }
  };

  useEffect(() => {
    loadCurrentVersion();
  }, []);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      const result = await invoke<ManualUpdateInfo>('check_update_manual', {
        manifestUrl
      });

      setLatestVersion(result.latest_version);

      if (result.available) {
        setUpdateInfo(result);
      } else {
        setUpdateInfo(null);
        await alert('Você já está usando a versão mais recente.', 'Atualizações');
      }
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
      await alert(`Erro ao verificar atualizações: ${error}`, 'Erro');
    } finally {
      setIsChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    if (!updateInfo?.url) {
      await alert('Nenhuma atualização disponível para baixar.', 'Atualizações');
      return;
    }

    try {
      setIsDownloading(true);
      const filePath = await invoke<string>('download_update_manual', {
        updateUrl: updateInfo.url
      });

      setIsDownloading(false);
      setIsInstalling(true);

      await invoke('install_update_manual', { filePath });
      await alert('Atualização instalada! O aplicativo será reiniciado automaticamente.', 'Atualizações');
    } catch (error) {
      console.error('Erro ao aplicar atualização manual:', error);
      await alert(`Erro ao aplicar atualização: ${error}`, 'Erro');
    } finally {
      setIsDownloading(false);
      setIsInstalling(false);
    }
  };

  return {
    updateAvailable: Boolean(updateInfo),
    updateInfo,
    currentVersion,
    latestVersion,
    isChecking,
    isDownloading,
    isInstalling,
    checkForUpdates,
    downloadAndInstall
  };
}

type ManualUpdaterState = ReturnType<typeof useManualUpdater>;

export function UpdateNotification({
  updateAvailable,
  updateInfo,
  downloadAndInstall,
  isDownloading,
  isInstalling
}: ManualUpdaterState) {

  if (!updateAvailable || !updateInfo) {
    return null;
  }

  const isBusy = isDownloading || isInstalling;

  return (
    <div className="fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2">🔄 Atualização Disponível!</h3>
          <p className="text-sm mb-2">
            Nova versão: <strong>{updateInfo.latest_version}</strong>
          </p>
          {updateInfo.notes && (
            <p className="text-sm mb-3 opacity-90">{updateInfo.notes}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={downloadAndInstall}
              disabled={isBusy}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-4 py-2 rounded text-sm font-medium"
            >
              {isDownloading && 'Baixando...'}
              {isInstalling && 'Instalando...'}
              {!isBusy && 'Baixar e Instalar'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm font-medium"
            >
              Mais Tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VersionInfo({
  currentVersion,
  latestVersion,
  checkForUpdates,
  isChecking
}: ManualUpdaterState) {

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <h3 className="font-bold mb-2">📋 Informações de Versão</h3>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Versão Atual:</span> {currentVersion || '...'}
        </div>
        <div>
          <span className="font-medium">Versão Mais Recente:</span> {latestVersion || '...'}
        </div>
        <div className="pt-2">
          <button
            onClick={checkForUpdates}
            disabled={isChecking}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium"
          >
            {isChecking ? 'Verificando...' : 'Verificar Atualizações'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UpdateManager(props: ManualUpdaterState) {
  const {
    updateAvailable,
    updateInfo,
    currentVersion,
    latestVersion,
    isChecking,
    isDownloading,
    isInstalling,
    checkForUpdates,
    downloadAndInstall
  } = props;

  const isBusy = isDownloading || isInstalling;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">🔄 Gerenciador de Atualizações</h2>

      <VersionInfo {...props} />

      {updateAvailable && updateInfo ? (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h3 className="font-bold text-yellow-800 mb-2">⚠️ Atualização Disponível</h3>
          <div className="space-y-2 text-sm text-yellow-700">
            <div>
              <strong>Versão Atual:</strong> {currentVersion}
            </div>
            <div>
              <strong>Nova Versão:</strong> {updateInfo.latest_version}
            </div>
            {updateInfo.notes && (
              <div>
                <strong>Notas:</strong> {updateInfo.notes}
              </div>
            )}
            {updateInfo.date && (
              <div>
                <strong>Data:</strong> {updateInfo.date}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={downloadAndInstall}
              disabled={isBusy}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded font-medium"
            >
              {isDownloading && 'Baixando...'}
              {isInstalling && 'Instalando...'}
              {!isBusy && 'Baixar e Instalar'}
            </button>
            <button
              onClick={checkForUpdates}
              disabled={isChecking}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded font-medium"
            >
              {isChecking ? 'Verificando...' : 'Verificar Novamente'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">✅ Aplicação Atualizada</h3>
          <p className="text-sm text-green-700">
            Você está usando a versão mais recente ({currentVersion || latestVersion || '...'}).
          </p>
          <button
            onClick={checkForUpdates}
            disabled={isChecking}
            className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium"
          >
            {isChecking ? 'Verificando...' : 'Verificar Atualizações'}
          </button>
        </div>
      )}
    </div>
  );
}

export function App() {
  const updater = useManualUpdater();

  return (
    <div className="min-h-screen bg-gray-50">
      <UpdateNotification {...updater} />

      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">SGP v4</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>{/* Conteúdo principal */}</div>
          <div>
            <UpdateManager {...updater} />
          </div>
        </div>
      </div>
    </div>
  );
}
