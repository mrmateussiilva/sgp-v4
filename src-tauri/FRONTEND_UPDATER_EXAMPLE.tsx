import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Interface para informações de atualização
interface UpdateInfo {
  current_version: string;
  latest_version: string;
  body: string;
  date: string;
}

// Hook para gerenciar atualizações
export function useUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Verificar atualizações manualmente
  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      console.log('🔍 Verificando atualizações...');
      const update = await invoke('check_for_updates');
      console.log('✅ Atualização encontrada:', update);
      
      if (update) {
        setUpdateAvailable(true);
        setUpdateInfo(update as UpdateInfo);
        setLatestVersion((update as any).latest_version);
      }
    } catch (error) {
      console.log('ℹ️ Nenhuma atualização disponível:', error);
      setUpdateAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Instalar atualização
  const installUpdate = async () => {
    setIsInstalling(true);
    try {
      console.log('📥 Instalando atualização...');
      const result = await invoke('install_update');
      console.log('✅ Atualização instalada:', result);
      
      // A aplicação será reiniciada automaticamente
    } catch (error) {
      console.error('❌ Erro ao instalar atualização:', error);
      alert('Erro ao instalar atualização: ' + error);
    } finally {
      setIsInstalling(false);
    }
  };

  // Obter versão atual
  const getCurrentVersion = async () => {
    try {
      const version = await invoke('get_app_version');
      setCurrentVersion(version as string);
    } catch (error) {
      console.error('Erro ao obter versão atual:', error);
    }
  };

  // Obter versão mais recente
  const getLatestVersion = async () => {
    try {
      const version = await invoke('get_latest_version');
      setLatestVersion(version as string);
    } catch (error) {
      console.error('Erro ao obter versão mais recente:', error);
    }
  };

  useEffect(() => {
    // Obter versão atual na inicialização
    getCurrentVersion();

    // Escutar eventos de atualização disponível
    const unlisten = listen('update_available', (event) => {
      console.log('📢 Atualização disponível:', event.payload);
      const update = event.payload as UpdateInfo;
      setUpdateAvailable(true);
      setUpdateInfo(update);
      setLatestVersion(update.latest_version);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return {
    updateAvailable,
    updateInfo,
    currentVersion,
    latestVersion,
    isChecking,
    isInstalling,
    checkForUpdates,
    installUpdate,
    getCurrentVersion,
    getLatestVersion
  };
}

// Componente de notificação de atualização
export function UpdateNotification() {
  const { updateAvailable, updateInfo, installUpdate, isInstalling } = useUpdater();

  if (!updateAvailable || !updateInfo) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2">🔄 Atualização Disponível!</h3>
          <p className="text-sm mb-2">
            Nova versão: <strong>{updateInfo.latest_version}</strong>
          </p>
          {updateInfo.body && (
            <p className="text-sm mb-3 opacity-90">{updateInfo.body}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={installUpdate}
              disabled={isInstalling}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-4 py-2 rounded text-sm font-medium"
            >
              {isInstalling ? 'Instalando...' : 'Instalar Agora'}
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

// Componente de informações de versão
export function VersionInfo() {
  const { currentVersion, latestVersion, checkForUpdates, isChecking } = useUpdater();

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <h3 className="font-bold mb-2">📋 Informações de Versão</h3>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Versão Atual:</span> {currentVersion}
        </div>
        <div>
          <span className="font-medium">Versão Mais Recente:</span> {latestVersion}
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

// Componente principal de atualizações
export function UpdateManager() {
  const { 
    updateAvailable, 
    updateInfo, 
    currentVersion, 
    latestVersion, 
    isChecking, 
    isInstalling,
    checkForUpdates, 
    installUpdate 
  } = useUpdater();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">🔄 Gerenciador de Atualizações</h2>
      
      <VersionInfo />
      
      {updateAvailable && updateInfo && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h3 className="font-bold text-yellow-800 mb-2">⚠️ Atualização Disponível</h3>
          <div className="space-y-2 text-sm text-yellow-700">
            <div>
              <strong>Versão Atual:</strong> {currentVersion}
            </div>
            <div>
              <strong>Nova Versão:</strong> {updateInfo.latest_version}
            </div>
            {updateInfo.body && (
              <div>
                <strong>Descrição:</strong> {updateInfo.body}
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
              onClick={installUpdate}
              disabled={isInstalling}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded font-medium"
            >
              {isInstalling ? 'Instalando...' : 'Instalar Atualização'}
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
      )}
      
      {!updateAvailable && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">✅ Aplicação Atualizada</h3>
          <p className="text-sm text-green-700">
            Você está usando a versão mais recente ({currentVersion}).
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

// Exemplo de uso em um componente principal
export function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notificação de atualização no topo */}
      <UpdateNotification />
      
      {/* Conteúdo principal da aplicação */}
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">SGP v4</h1>
        
        {/* Seu conteúdo principal aqui */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            {/* Conteúdo da aplicação */}
          </div>
          
          <div>
            {/* Gerenciador de atualizações */}
            <UpdateManager />
          </div>
        </div>
      </div>
    </div>
  );
}
