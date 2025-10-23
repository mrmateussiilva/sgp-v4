import React, { useState, useEffect } from 'react';

interface AutoRefreshStatusProps {
  isActive: boolean;
  isRefreshing?: boolean;
  lastRefresh?: Date;
  refreshCount?: number;
  onToggle: () => void;
  onForceRefresh: () => void;
}

export const AutoRefreshStatus: React.FC<AutoRefreshStatusProps> = ({
  isActive,
  isRefreshing = false,
  lastRefresh,
  refreshCount = 0,
  onToggle,
  onForceRefresh,
}) => {
  const [timeSinceLastRefresh, setTimeSinceLastRefresh] = useState<string>('');

  useEffect(() => {
    const updateTimeSince = () => {
      if (lastRefresh) {
        const now = new Date();
        const diffMs = now.getTime() - lastRefresh.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        
        if (diffSeconds < 60) {
          setTimeSinceLastRefresh(`${diffSeconds}s atrás`);
        } else {
          const diffMinutes = Math.floor(diffSeconds / 60);
          setTimeSinceLastRefresh(`${diffMinutes}m atrás`);
        }
      }
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 1000);
    
    return () => clearInterval(interval);
  }, [lastRefresh]);

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Indicador de status com animação suave */}
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
          isRefreshing 
            ? 'bg-blue-500 animate-pulse' 
            : isActive 
              ? 'bg-green-500' 
              : 'bg-gray-400'
        }`} />
        
        {isRefreshing && (
          <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Status text com transição suave */}
      <span className={`transition-colors duration-300 ${
        isRefreshing 
          ? 'text-blue-600' 
          : isActive 
            ? 'text-green-600' 
            : 'text-gray-500'
      }`}>
        {isRefreshing ? 'Atualizando...' : isActive ? 'Tempo real ativo' : 'Tempo real pausado'}
      </span>

      {/* Informações adicionais */}
      {lastRefresh && !isRefreshing && (
        <span className="text-gray-500 text-xs">
          ({timeSinceLastRefresh})
        </span>
      )}

      {refreshCount > 0 && (
        <span className="text-gray-400 text-xs">
          • {refreshCount} atualizações
        </span>
      )}

      {/* Botões com estados desabilitados durante refresh */}
      <button
        onClick={onToggle}
        disabled={isRefreshing}
        className={`px-2 py-1 text-xs rounded transition-all duration-200 ${
          isRefreshing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isActive ? 'Pausar' : 'Retomar'}
      </button>
      
      <button
        onClick={onForceRefresh}
        disabled={isRefreshing}
        className={`px-2 py-1 text-xs rounded transition-all duration-200 ${
          isRefreshing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {isRefreshing ? 'Atualizando...' : 'Sincronizar Agora'}
      </button>
    </div>
  );
};
