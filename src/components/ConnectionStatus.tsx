import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

// ========================================
// COMPONENTE DE STATUS DE CONEXÃO
// ========================================

export const ConnectionStatus = () => {
  const { isConnected, subscriberCount } = useRealtimeNotifications();

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
        {isConnected ? 'Conectado' : 'Desconectado'}
      </span>
      {isConnected && (
        <span className="text-gray-500">
          ({subscriberCount} usuário{subscriberCount !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  );
};
