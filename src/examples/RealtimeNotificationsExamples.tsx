// ========================================
// EXEMPLO DE USO DO SISTEMA DE NOTIFICAÇÕES EM TEMPO REAL
// ========================================

import React from 'react';
import { useRealtimeNotifications, useOrderRefresh } from '../hooks/useRealtimeNotifications';
import { ConnectionStatus } from '../components/ConnectionStatus';

// ========================================
// EXEMPLO 1: COMPONENTE SIMPLES COM NOTIFICAÇÕES
// ========================================

const SimpleOrderComponent = () => {
  // Ativar notificações em tempo real
  useRealtimeNotifications();
  
  // Escutar eventos de refresh
  const refreshTrigger = useOrderRefresh();
  
  React.useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Pedidos foram atualizados!');
      // Aqui você pode recarregar dados, atualizar estado, etc.
    }
  }, [refreshTrigger]);

  return (
    <div>
      <h2>Lista de Pedidos</h2>
      <ConnectionStatus />
      {/* Seu conteúdo aqui */}
    </div>
  );
};

// ========================================
// EXEMPLO 2: COMPONENTE COM CONTROLE MANUAL
// ========================================

const AdvancedOrderComponent = () => {
  const { isConnected, subscriberCount, connect, disconnect } = useRealtimeNotifications();
  const refreshTrigger = useOrderRefresh();

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  React.useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Atualizando dados...');
      // Lógica de atualização aqui
    }
  }, [refreshTrigger]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2>Pedidos Avançado</h2>
        <ConnectionStatus />
        <div className="flex gap-2">
          <button 
            onClick={handleConnect}
            disabled={isConnected}
            className="px-3 py-1 bg-green-600 text-white rounded disabled:bg-gray-400"
          >
            Conectar
          </button>
          <button 
            onClick={handleDisconnect}
            disabled={!isConnected}
            className="px-3 py-1 bg-red-600 text-white rounded disabled:bg-gray-400"
          >
            Desconectar
          </button>
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        Status: {isConnected ? 'Conectado' : 'Desconectado'} | 
        Usuários conectados: {subscriberCount}
      </div>
      
      {/* Seu conteúdo aqui */}
    </div>
  );
};

// ========================================
// EXEMPLO 3: INTEGRAÇÃO COM STORE ZUSTAND
// ========================================

import { useOrderStore } from '../store/orderStore';

const OrderListWithStore = () => {
  const { orders } = useOrderStore();
  
  // Ativar notificações
  useRealtimeNotifications();
  
  // Escutar eventos de refresh
  const refreshTrigger = useOrderRefresh();

  React.useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Recarregando pedidos do store...');
      // Aqui você pode implementar a lógica para recarregar os pedidos
      // Por exemplo, fazendo uma nova requisição à API
    }
  }, [refreshTrigger]);

  return (
    <div>
      <h2>Pedidos ({orders.length})</h2>
      <ConnectionStatus />
      
      {orders.map(order => (
        <div key={order.id} className="p-4 border rounded mb-2">
          <h3>Pedido #{order.numero || order.id}</h3>
          <p>Cliente: {order.cliente}</p>
          <p>Status: {order.status}</p>
        </div>
      ))}
    </div>
  );
};

// ========================================
// EXEMPLO 4: COMPONENTE DE DASHBOARD
// ========================================

const DashboardComponent = () => {
  const { isConnected, subscriberCount } = useRealtimeNotifications();
  const refreshTrigger = useOrderRefresh();
  
  const [stats, setStats] = React.useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });

  React.useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Atualizando estatísticas do dashboard...');
      // Recarregar estatísticas
      loadStats();
    }
  }, [refreshTrigger]);

  const loadStats = async () => {
    // Simular carregamento de estatísticas
    setStats({
      totalOrders: Math.floor(Math.random() * 100),
      pendingOrders: Math.floor(Math.random() * 50),
      completedOrders: Math.floor(Math.random() * 50),
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <ConnectionStatus />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total de Pedidos</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalOrders}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Pedidos Pendentes</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Pedidos Concluídos</h3>
          <p className="text-3xl font-bold text-green-600">{stats.completedOrders}</p>
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        Última atualização: {new Date().toLocaleTimeString()}
        {isConnected && (
          <span className="ml-4">
            🔴 Atualizações em tempo real ativas ({subscriberCount} usuários)
          </span>
        )}
      </div>
    </div>
  );
};

// ========================================
// EXEMPLO 5: COMPONENTE DE NOTIFICAÇÕES PERSONALIZADAS
// ========================================

const CustomNotificationComponent = () => {
  const { isConnected } = useRealtimeNotifications();
  const refreshTrigger = useOrderRefresh();
  
  const [notifications, setNotifications] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (refreshTrigger > 0) {
      const timestamp = new Date().toLocaleTimeString();
      setNotifications(prev => [
        `🔄 Dados atualizados às ${timestamp}`,
        ...prev.slice(0, 4) // Manter apenas as últimas 5 notificações
      ]);
    }
  }, [refreshTrigger]);

  return (
    <div className="fixed top-4 right-4 w-80 bg-white rounded-lg shadow-lg border p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Notificações</h3>
        <ConnectionStatus />
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma notificação recente</p>
        ) : (
          notifications.map((notification, index) => (
            <div key={index} className="text-sm p-2 bg-gray-50 rounded">
              {notification}
            </div>
          ))
        )}
      </div>
      
      {isConnected && (
        <div className="mt-2 text-xs text-green-600">
          ✅ Recebendo atualizações em tempo real
        </div>
      )}
    </div>
  );
};

export {
  SimpleOrderComponent,
  AdvancedOrderComponent,
  OrderListWithStore,
  DashboardComponent,
  CustomNotificationComponent,
};
