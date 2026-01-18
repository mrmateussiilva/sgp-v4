import { useState, useEffect } from 'react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { apiClient, getApiUrl } from '@/api/client';

export const NotificationDebugPanel = () => {
  const { isConnected, subscriberCount, connect, disconnect } = useRealtimeNotifications();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const getDebugInfo = async () => {
    try {
      const baseUrl = getApiUrl();
      if (!baseUrl) {
        addLog('API base URL não configurada');
        return;
      }

      const target = new URL('/health', baseUrl).toString();
      const response = await fetch(target, { method: 'GET' });
      const result = await response.json().catch(() => ({}));
      setDebugInfo({
        health: result?.status ?? 'unknown',
        version: result?.version ?? 'n/a',
        timestamp: new Date().toISOString(),
      });
      addLog(`Health check: ${response.status}`);
    } catch (error) {
      console.error('Erro ao obter debug info:', error);
      addLog(`Erro: ${error}`);
    }
  };

  const testNotification = async () => {
    try {
      addLog('Testando notificação...');
      // Simular uma notificação de teste
      window.dispatchEvent(new CustomEvent('orders-refresh-requested', {
        detail: { timestamp: Date.now(), test: true }
      }));
      addLog('Evento de teste disparado');
    } catch (error) {
      addLog(`Erro no teste: ${error}`);
    }
  };

  const testBackendBroadcast = async () => {
    try {
      addLog('Testando broadcast do backend...');
      const baseUrl = getApiUrl();
      if (!baseUrl) {
        addLog('API não configurada');
        return;
      }

      const response = await fetch(new URL('/health', baseUrl).toString(), { method: 'GET' });
      addLog(`Resposta do backend: ${response.status}`);
    } catch (error) {
      addLog(`Erro no teste de broadcast: ${error}`);
    }
  };

  useEffect(() => {
    const interval = setInterval(getDebugInfo, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm max-h-96 overflow-y-auto">
      <h3 className="font-bold text-sm mb-2">🔧 Debug Notificações</h3>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        {debugInfo && (
          <div className="flex justify-between">
            <span>Versão:</span>
            <span>{debugInfo.version}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span>Clientes (local):</span>
          <span>{subscriberCount}</span>
        </div>

        <div className="flex gap-1 mt-3">
          <button
            onClick={connect}
            disabled={isConnected}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs disabled:bg-gray-300"
          >
            Conectar
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="px-2 py-1 bg-red-500 text-white rounded text-xs disabled:bg-gray-300"
          >
            Desconectar
          </button>
          <button
            onClick={getDebugInfo}
            className="px-2 py-1 bg-gray-500 text-white rounded text-xs"
          >
            Refresh
          </button>
          <button
            onClick={testNotification}
            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
          >
            Teste
          </button>
          <button
            onClick={testBackendBroadcast}
            className="px-2 py-1 bg-purple-500 text-white rounded text-xs"
          >
            Broadcast
          </button>
        </div>

        <div className="mt-3">
          <h4 className="font-semibold text-xs mb-1">Logs:</h4>
          <div className="bg-gray-100 p-2 rounded text-xs max-h-32 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-gray-600">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
