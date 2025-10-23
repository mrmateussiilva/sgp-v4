import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

export const TauriEventTest = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const testTauriEvent = async () => {
    try {
      addLog('Testando evento Tauri...');
      
      // Criar um evento de teste
      const testEventName = 'test-event';
      const testData = { message: 'Hello from Tauri!', timestamp: Date.now() };
      
      // Simular envio de evento (isso seria feito pelo backend)
      addLog(`Evento criado: ${testEventName}`);
      addLog(`Dados: ${JSON.stringify(testData)}`);
      
      // Em um cenário real, o backend enviaria este evento
      addLog('Nota: Este é apenas um teste de estrutura. O backend precisa enviar o evento.');
      
    } catch (error) {
      addLog(`Erro: ${error}`);
    }
  };

  const testInvoke = async () => {
    try {
      addLog('Testando invoke...');
      const count = await invoke<number>('get_notification_subscriber_count');
      addLog(`Subscribers count: ${count}`);
    } catch (error) {
      addLog(`Erro no invoke: ${error}`);
    }
  };

  const startListening = async () => {
    try {
      addLog('Iniciando listener...');
      
      const unsubscribe = await listen('test-event', (event) => {
        addLog(`Evento recebido: ${JSON.stringify(event.payload)}`);
      });
      
      setIsListening(true);
      addLog('Listener ativo');
      
      // Cleanup após 10 segundos
      setTimeout(() => {
        unsubscribe();
        setIsListening(false);
        addLog('Listener desativado');
      }, 10000);
      
    } catch (error) {
      addLog(`Erro no listener: ${error}`);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-bold text-sm mb-2">🧪 Teste de Eventos Tauri</h3>
      
      <div className="space-y-2 text-xs">
        <div className="flex gap-1">
          <button
            onClick={testTauriEvent}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
          >
            Teste Evento
          </button>
          <button
            onClick={testInvoke}
            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
          >
            Teste Invoke
          </button>
          <button
            onClick={startListening}
            disabled={isListening}
            className="px-2 py-1 bg-purple-500 text-white rounded text-xs disabled:bg-gray-300"
          >
            {isListening ? 'Ouvindo...' : 'Ouvir'}
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
