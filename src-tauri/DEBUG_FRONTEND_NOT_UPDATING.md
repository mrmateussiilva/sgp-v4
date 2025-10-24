# 🔍 Debug: Frontend Não Atualiza - Guia Passo a Passo

## 🚨 Problema Identificado
O backend detecta mudanças nos pedidos, mas o frontend não atualiza automaticamente.

## 🔧 Passos para Debug

### **1. Verificar se o Backend Está Emitindo Eventos**

#### **No Terminal (Backend)**
```bash
# Execute a aplicação e observe os logs
cargo run
```

#### **Logs Esperados**
```
🚀 Sistema de polling de pedidos iniciado
🔍 Verificando mudanças de status dos pedidos...
📊 X pedidos carregados para verificação
✅ X mudanças de status detectadas e eventos emitidos
🚀 Tentando emitir evento order_status_changed para pedido X
📋 Dados do evento: OrderStatusNotification { ... }
✅ Evento order_status_changed emitido com SUCESSO para pedido X
📡 Evento enviado para todos os listeners conectados
```

### **2. Testar Emissão Manual de Eventos**

#### **No Frontend (React)**
```javascript
// Teste se o evento está sendo emitido
import { invoke } from '@tauri-apps/api/tauri';

// Chame esta função no console ou em um botão
async function testEvent() {
  try {
    const result = await invoke('test_order_polling');
    console.log('Resultado:', result);
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Execute no console do navegador
testEvent();
```

#### **Logs Esperados no Frontend**
```
🧪 [BACKEND] Testando sistema de polling de pedidos...
🚀 [BACKEND] Tentando emitir evento de teste...
📋 [BACKEND] Dados do teste: OrderStatusNotification { ... }
✅ [BACKEND] Teste executado com SUCESSO!
📡 [BACKEND] Evento enviado para todos os listeners
```

### **3. Verificar se o Frontend Está Escutando**

#### **Implementar Listener de Debug**
```tsx
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

export function DebugEventListener() {
  useEffect(() => {
    console.log('🔍 [DEBUG] Registrando listener de debug...');
    
    const unlistenPromise = listen('order_status_changed', (event) => {
      console.log('🎯 [DEBUG] EVENTO RECEBIDO!', event);
      console.log('🎯 [DEBUG] Payload:', event.payload);
      console.log('🎯 [DEBUG] Event name:', event.event);
    });
    
    return () => {
      unlistenPromise.then(unlistenFn => {
        console.log('🔍 [DEBUG] Listener de debug removido');
        unlistenFn();
      });
    };
  }, []);
  
  return (
    <div>
      <h3>Debug: Escutando eventos...</h3>
      <p>Abra o console para ver os eventos</p>
    </div>
  );
}
```

#### **Adicionar ao Seu Componente Principal**
```tsx
function App() {
  return (
    <div>
      <DebugEventListener />
      {/* Seus outros componentes */}
    </div>
  );
}
```

### **4. Verificar Console do Navegador**

#### **Logs Esperados no Console**
```
🔍 [DEBUG] Registrando listener de debug...
🎯 [DEBUG] EVENTO RECEBIDO! {event: "order_status_changed", payload: {...}}
🎯 [DEBUG] Payload: {order_id: 999, status: "TESTE", ...}
🎯 [DEBUG] Event name: order_status_changed
```

### **5. Implementar Listener Funcional**

#### **Hook Completo**
```tsx
import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';

interface OrderStatusNotification {
  order_id: number;
  status: string;
  pronto: boolean | null;
  financeiro: boolean | null;
  conferencia: boolean | null;
  sublimacao: boolean | null;
  costura: boolean | null;
  expedicao: boolean | null;
  details: string;
  timestamp: string;
}

export function useOrderPolling() {
  const reloadOrders = useCallback(async () => {
    try {
      console.log('🔄 [FRONTEND] Recarregando pedidos...');
      
      // AQUI: Chame suas funções de reload
      // await fetchPendingOrders();
      // await fetchReadyOrders();
      
      console.log('✅ [FRONTEND] Pedidos recarregados');
    } catch (error) {
      console.error('❌ [FRONTEND] Erro ao recarregar:', error);
    }
  }, []);

  useEffect(() => {
    console.log('🎧 [FRONTEND] Registrando listener...');
    
    const unlistenPromise = listen<OrderStatusNotification>(
      'order_status_changed',
      (event) => {
        console.log('📡 [FRONTEND] Evento recebido!', event.payload);
        reloadOrders();
      }
    );

    return () => {
      unlistenPromise.then(unlistenFn => {
        console.log('🔌 [FRONTEND] Listener removido');
        unlistenFn();
      });
    };
  }, [reloadOrders]);

  return { reloadOrders };
}
```

## 🚨 Problemas Comuns e Soluções

### **Problema 1: Evento não é emitido**
**Sintomas**: Backend não mostra logs de emissão
**Solução**: 
- Verificar se o polling está rodando
- Verificar se há mudanças reais no banco
- Usar `force_order_check()` para testar

### **Problema 2: Evento é emitido mas não chega no frontend**
**Sintomas**: Backend mostra sucesso, frontend não recebe
**Soluções**:
- Verificar se o listener está registrado
- Verificar se não há erros no console
- Usar o componente `DebugEventListener`

### **Problema 3: Evento chega mas não atualiza a UI**
**Sintomas**: Console mostra evento, mas UI não muda
**Soluções**:
- Verificar se `reloadOrders()` está sendo chamado
- Verificar se as funções de fetch estão funcionando
- Verificar se o estado está sendo atualizado

## 🧪 Teste Completo

### **1. Teste Backend**
```bash
cargo run
# Aguarde logs: "🚀 Sistema de polling de pedidos iniciado"
```

### **2. Teste Frontend**
```javascript
// No console do navegador
await invoke('test_order_polling');
// Deve mostrar: "✅ Teste de polling executado com sucesso"
```

### **3. Teste Listener**
```tsx
// Adicione ao seu componente
<DebugEventListener />
// Deve mostrar: "🔍 [DEBUG] Registrando listener de debug..."
```

### **4. Teste Completo**
```javascript
// No console do navegador
await invoke('test_order_polling');
// Deve mostrar no console:
// "🎯 [DEBUG] EVENTO RECEBIDO!"
// "📡 [FRONTEND] Evento recebido!"
```

## 📋 Checklist de Debug

- [ ] Backend está rodando e mostra logs de polling
- [ ] Backend detecta mudanças e emite eventos
- [ ] Frontend tem listener registrado
- [ ] Frontend recebe eventos no console
- [ ] Frontend chama função de reload
- [ ] Função de reload atualiza a UI

## 🎯 Próximos Passos

1. **Implemente o `DebugEventListener`** primeiro
2. **Teste com `test_order_polling()`**
3. **Verifique os logs** no console
4. **Implemente o hook `useOrderPolling()`**
5. **Conecte com suas funções de reload**

---

## 💡 Dica Importante

Se o evento não estiver chegando no frontend, o problema pode ser:
- Listener não registrado corretamente
- Erro no JavaScript que impede o listener
- Problema na comunicação Tauri

Use o `DebugEventListener` para identificar exatamente onde está o problema!
