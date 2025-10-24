import React from 'react';
import { useGlobalBroadcast } from '../hooks/useGlobalBroadcast';

interface BroadcastStatusPanelProps {
  className?: string;
}

export const BroadcastStatusPanel: React.FC<BroadcastStatusPanelProps> = ({ className = '' }) => {
  const { status, getActiveClients } = useGlobalBroadcast();

  const handleRefreshClients = async () => {
    await getActiveClients();
  };

  const getStatusColor = () => {
    if (!status.isConnected) return 'text-red-500';
    if (status.lastHeartbeat) {
      const now = new Date();
      const diff = now.getTime() - status.lastHeartbeat.getTime();
      if (diff < 60000) return 'text-green-500'; // < 1 minuto
      if (diff < 300000) return 'text-yellow-500'; // < 5 minutos
      return 'text-red-500'; // > 5 minutos
    }
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (!status.isConnected) return 'Desconectado';
    if (status.lastHeartbeat) {
      const now = new Date();
      const diff = now.getTime() - status.lastHeartbeat.getTime();
      if (diff < 60000) return 'Conectado';
      if (diff < 300000) return 'Conectado (Heartbeat antigo)';
      return 'Desconectado (Timeout)';
    }
    return 'Conectado (Sem heartbeat)';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          🌐 Status do Broadcast Global
        </h3>
        <button
          onClick={handleRefreshClients}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
        >
          Atualizar
        </button>
      </div>

      <div className="space-y-3">
        {/* Status de Conexão */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          <span className={`text-sm font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* ID do Cliente */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Cliente ID:</span>
          <span className="text-sm text-gray-800 font-mono">
            {status.clientId || 'N/A'}
          </span>
        </div>

        {/* Último Heartbeat */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Último Heartbeat:</span>
          <span className="text-sm text-gray-800">
            {status.lastHeartbeat 
              ? status.lastHeartbeat.toLocaleTimeString()
              : 'N/A'
            }
          </span>
        </div>

        {/* Clientes Ativos */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Clientes Ativos:</span>
          <span className="text-sm text-gray-800 font-semibold">
            {status.activeClients.length}
          </span>
        </div>

        {/* Lista de Clientes */}
        {status.activeClients.length > 0 && (
          <div className="mt-3">
            <span className="text-sm font-medium text-gray-600 block mb-2">
              Lista de Clientes:
            </span>
            <div className="max-h-32 overflow-y-auto">
              {status.activeClients.map((clientId, index) => (
                <div
                  key={index}
                  className="text-xs text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded mb-1"
                >
                  {clientId}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicador Visual */}
        <div className="flex items-center justify-center pt-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor().replace('text-', 'bg-')}`}></div>
          <span className="ml-2 text-xs text-gray-500">
            {status.isConnected ? 'Sistema ativo' : 'Sistema inativo'}
          </span>
        </div>
      </div>
    </div>
  );
};
