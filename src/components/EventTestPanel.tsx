import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';

export const EventTestPanel = () => {
  const [events, setEvents] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  const addEvent = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEvents(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const testEventEmission = async (eventType: string) => {
    try {
      const result = await invoke<string>('test_event_emission', { 
        eventType, 
        orderId: 123 
      });
      addEvent(`TESTE ENVIADO: ${result}`);
    } catch (error) {
      addEvent(`ERRO: ${error}`);
    }
  };

  useEffect(() => {
    if (!isListening) return;

    console.log('🧪 Iniciando teste de eventos...');
    addEvent('Iniciando listeners de teste');

    const unlistenPromises: Promise<() => void>[] = [];

    // Testar todos os eventos de pedidos
    const eventNames = ['order_created', 'order_updated', 'order_deleted', 'order_status_updated'];
    
    eventNames.forEach(eventName => {
      const unlisten = listen<number>(eventName, (event) => {
        console.log(`🎉 EVENTO RECEBIDO: ${eventName}`, event.payload);
        addEvent(`${eventName}: ${event.payload}`);
      });
      unlistenPromises.push(unlisten);
    });

    // Cleanup
    return () => {
      Promise.all(unlistenPromises).then((unlistenFunctions) => {
        unlistenFunctions.forEach(unlisten => unlisten());
        console.log('🧪 Listeners de teste removidos');
      });
    };
  }, [isListening]);

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setEvents([]);
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-bold text-sm mb-2">🧪 Teste de Eventos</h3>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className={isListening ? 'text-green-600' : 'text-gray-500'}>
            {isListening ? 'Ouvindo eventos' : 'Parado'}
          </span>
        </div>
        
        <button
          onClick={toggleListening}
          className={`px-3 py-1 text-xs rounded ${
            isListening 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isListening ? 'Parar' : 'Iniciar'}
        </button>

        <div className="mt-3">
          <h4 className="font-semibold text-xs mb-1">Testar Emissão:</h4>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => testEventEmission('order_created')}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              Created
            </button>
            <button
              onClick={() => testEventEmission('order_updated')}
              className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
            >
              Updated
            </button>
            <button
              onClick={() => testEventEmission('order_deleted')}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
            >
              Deleted
            </button>
            <button
              onClick={() => testEventEmission('order_status_updated')}
              className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
            >
              Status
            </button>
          </div>
        </div>

        <div className="mt-3">
          <h4 className="font-semibold text-xs mb-1">Eventos Recebidos:</h4>
          <div className="bg-gray-100 p-2 rounded text-xs max-h-32 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-gray-500">Nenhum evento recebido</div>
            ) : (
              events.map((event, index) => (
                <div key={index} className="text-gray-600">{event}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
