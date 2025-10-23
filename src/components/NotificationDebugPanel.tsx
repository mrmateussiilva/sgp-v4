import React, { useState, useEffect } from 'react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { invoke } from '@tauri-apps/api/tauri';

export const NotificationDebugPanel = () => {
  const { isConnected, subscriberCount, connect, disconnect } = useRealtimeNotifications();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const getDebugInfo = async () => {
    try {
      const count = await invoke<number>('get_notification_subscriber_count');
      setDebugInfo({
        subscriberCount: count,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erro ao obter debug info:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(getDebugInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-bold text-sm mb-2">🔧 Debug Notificações</h3>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Subscribers:</span>
          <span>{subscriberCount}</span>
        </div>
        
        {debugInfo && (
          <div className="flex justify-between">
            <span>Backend:</span>
            <span>{debugInfo.subscriberCount}</span>
          </div>
        )}
        
        <div className="flex gap-2 mt-3">
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
        </div>
      </div>
    </div>
  );
};
