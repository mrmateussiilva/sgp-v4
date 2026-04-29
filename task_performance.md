# Performance Analysis Report — SGP v4

## Overview

**SGP v4** é uma aplicação desktop construída com **Tauri 2 + React 18 + TypeScript**. O frontend (Vite/React) roda numa WebView e se comunica com uma API REST externa via HTTP e WebSocket. O backend Rust do Tauri atua apenas como host de janela e executor de comandos nativos (PDF, imagens, atualizações).

### Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, TailwindCSS, Zustand |
| Desktop Shell | Tauri 2 (Rust) |
| HTTP Client | Axios + adapter fetch customizado (`tauriAxiosAdapter`) |
| Real-time | WebSocket singleton (`OrdersWebSocketManager`) |
| State Management | Zustand (authStore, orderStore, modalStore, updaterStore) |
| Workers | 1 Web Worker (`orderFilter.worker.ts`) |
| PDF | `@react-pdf/renderer`, `jspdf`, `headless_chrome` (Rust) |
| Cache | In-memory manual com TTL (sem persistência) |

### Fluxos Críticos

1. **Boot** → `loadConfig` → `verifyApiConnection` → render app
2. **Lista de Pedidos** → REST paginado + WebSocket para sync em tempo real + polling de 7s
3. **Atualização de Status** → `PATCH` → `GET /json` → `POST save-json` → broadcast WS
4. **Notificações** → WS message → `NotificationManager` → toast + native notification
5. **Filtros** → Web Worker (serialização `postMessage`) → resultado filtrado

---

## Bottlenecks Identificados

1. **N+1 implícito em mutações** — cada `PATCH` gera 2 requests extras desnecessários
2. **Cascata de refresh sem debounce** — múltiplos eventos WS disparam múltiplos reloads em sequência
3. **Polling de 7s coexistindo com WebSocket** — requests redundantes mesmo com WS saudável
4. **Serialização completa no Web Worker sem debounce** — `OrderWithItems[]` inteiro clonado a cada keystroke
5. **Cache TTL de 2s** — inútil para eventos WS sequenciais do mesmo pedido
6. **`headless_chrome` no Rust** — dependência de ~50MB no binário para geração de PDF
7. **`requireSessionToken()` com side-effect em toda requisição** — sincroniza `hybridClient` desnecessariamente
8. **`DefaultHasher` não-determinístico no Rust** — cache de imagens nunca reutilizado entre sessões
9. **Logs de debug serializando objetos em produção** — `JSON.stringify` em objetos grandes sem guard
10. **Lista de pedidos sem virtualização** — todos os itens renderizados no DOM simultaneamente

---

## Análise Técnica

### 1. N+1 em Mutações de Pedido — Impacto: ALTO

Em `updateOrder`, `updateOrderStatus` e `updateOrderMetadata` (`src/api/endpoints/orders.ts`), o fluxo atual é:

```
PATCH /pedidos/:id          ← mutação principal
GET  /pedidos/:id/json      ← buscar dados frescos (request extra)
POST /pedidos/save-json/:id ← persistir backup (request extra)
```

Cada operação de atualização faz **3 requests** onde deveria fazer 1. Em operações de batch (ex: atualizar vários pedidos), o impacto é O(3n).

**Evidência no código** (`orders.ts` linhas 272–305):
```ts
const response = await apiClient.patch<ApiPedido>(`/pedidos/${request.id}`, payload);
// Request extra 1:
const jsonResponse = await apiClient.get(`/pedidos/${request.id}/json`);
// Request extra 2:
await apiClient.post(`/pedidos/save-json/${order.id}`, order);
```

### 2. Cascata de Refresh sem Debounce — Impacto: ALTO

`refreshOrders()` em `useRealtimeNotifications.ts` (linha 204) é chamado em **todo evento WS** que não seja `OrderDeleted`, sem nenhum debounce:

```ts
const refreshOrders = async () => {
  window.dispatchEvent(new CustomEvent('orders-refresh-requested', {
    detail: { timestamp: Date.now() }
  }));
};
```

5 eventos WS em sequência (ex: batch update) → 5 `CustomEvent` → `setRefreshTrigger(prev => prev + 1)` em todos os componentes ouvintes → potencial de 5 chamadas de API em sequência.

### 3. Polling + WebSocket Simultâneos — Impacto: MÉDIO

`useAutoRefresh` (intervalo padrão de 7s) opera em paralelo com o WebSocket na tela de pedidos. Mesmo com o WS conectado e saudável, a aplicação faz polling a cada 7 segundos, gerando requisições redundantes. O hook pausa somente quando a aba fica oculta, mas **não pausa quando o WS está conectado**.

### 4. Serialização Completa no Web Worker — Impacto: ALTO

```ts
// useFilterWorker.ts (linha 30)
workerRef.current.postMessage({ orders, filters }); // sem debounce
```

O `postMessage` usa **Structured Clone Algorithm**, que serializa todo o grafo de objetos. Para 200 pedidos com itens aninhados, isso pode transferir **centenas de KB** a cada keystroke no campo de busca, bloqueando o thread principal durante a serialização.

**Complexidade**: O(n × k) por keystroke, onde n = número de pedidos e k = tamanho médio de cada pedido com itens.

### 5. Cache TTL de 2 Segundos — Impacto: MÉDIO

```ts
// orders.ts linha 31
const ORDER_BY_ID_CACHE_TTL_MS = 2_000;
```

Eventos WS disparam `handleOrderUpdated(orderId)` → `api.getOrderById(orderId)`. Com TTL de 2s, 3 eventos WS em sequência para o mesmo pedido num intervalo de 3s geram 3 GETs ao servidor. O cache é quase inócuo neste cenário.

### 6. `requireSessionToken()` com Side-Effect — Impacto: BAIXO

```ts
const requireSessionToken = (): string => {
  const token = useAuthStore.getState().sessionToken;
  if (!token) throw new Error('Sessão expirada.');
  setAuthToken(token); // ← chama hybridClient.syncAuthAndConfig() em TODA requisição
  return token;
};
```

`setAuthToken` é idempotente mas executa `hybridClient.syncAuthAndConfig(API_BASE_URL, authToken)` em **cada** requisição API, mesmo quando o token não mudou.

### 7. `DefaultHasher` Não-Determinístico no Rust — Impacto: BAIXO

```rust
// images.rs linha 219
let mut hasher = DefaultHasher::new();
image_url.hash(&mut hasher);
let url_hash = format!("{:016x}", hasher.finish());
```

`DefaultHasher` usa `SipHash` com seed aleatório desde Rust 1.0. A mesma URL gera hashes diferentes entre execuções do app. O cache de imagens (`cached_<hash>.<ext>`) **nunca é reutilizado** entre reinicializações, causando re-download desnecessário de todas as imagens cacheadas.

### 8. Logs Serializando Objetos em Produção — Impacto: BAIXO

```ts
// orders.ts linhas 142–146
logger.debug('[fetchOrdersPaginated] Response data sample:', response.data[0]);
logger.debug('[fetchOrdersPaginated] Mapped data sample:', allData[0]);
```

Mesmo que os logs não sejam exibidos em produção, as expressões **são avaliadas** antes de serem passadas como argumentos. `response.data[0]` e `allData[0]` acessam objetos de pedido completos desnecessariamente.

---

## Recomendações

### Quick Wins

**QW-1 — Debounce no envio ao Web Worker** _(~30min, impacto: ALTO)_

Adicionar debounce de 150ms antes de enviar dados ao worker, evitando serialização a cada keystroke:

```ts
// hooks/useFilterWorker.ts
import { useRef, useEffect, useState } from 'react';
import { OrderWithItems } from '../types';

export function useFilterWorker(orders: OrderWithItems[], filters: unknown) {
  const [filteredOrders, setFilteredOrders] = useState<OrderWithItems[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/orderFilter.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current.onmessage = (e) => {
      setFilteredOrders(e.data.filteredOrders);
      setIsFiltering(false);
    };
    return () => { workerRef.current?.terminate(); };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsFiltering(true);
      workerRef.current!.postMessage({ orders, filters });
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [orders, filters]);

  return { filteredOrders, isFiltering };
}
```

---

**QW-2 — Debounce no `refreshOrders`** _(~20min, impacto: ALTO)_

```ts
// hooks/useRealtimeNotifications.ts
// Antes (linha 199):
const refreshOrders = async () => {
  window.dispatchEvent(new CustomEvent('orders-refresh-requested', ...));
};

// Depois — criar ref com debounce:
const refreshOrdersDebounced = useRef(
  (() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('orders-refresh-requested', {
          detail: { timestamp: Date.now() }
        }));
        timer = null;
      }, 300);
    };
  })()
).current;
```

---

**QW-3 — Aumentar TTL do cache de pedido** _(~5min, impacto: MÉDIO)_

```ts
// api/endpoints/orders.ts linha 31
// Antes:
const ORDER_BY_ID_CACHE_TTL_MS = 2_000;
// Depois:
const ORDER_BY_ID_CACHE_TTL_MS = 10_000; // 10 segundos
```

---

**QW-4 — Suspender polling quando WS estiver conectado** _(~15min, impacto: MÉDIO)_

```ts
// hooks/useAutoRefresh.ts — adicionar opção wsConnected
export const useAutoRefresh = (
  callback: () => Promise<void>,
  intervalMs = 7000,
  wsConnected = false,
) => {
  // Pausar quando WS está ativo para evitar requests redundantes
  useEffect(() => {
    if (wsConnected) {
      pauseAutoRefresh();
    } else {
      resumeAutoRefresh();
    }
  }, [wsConnected]);
  // ... resto do hook
};
```

---

**QW-5 — Guard de token em `requireSessionToken`** _(~10min, impacto: BAIXO)_

```ts
// api/endpoints/orders.ts
let _lastSyncedToken: string | null = null;

const requireSessionToken = (): string => {
  const token = useAuthStore.getState().sessionToken;
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  // Só sincronizar quando o token mudar
  if (token !== _lastSyncedToken) {
    setAuthToken(token);
    _lastSyncedToken = token;
  }
  return token;
};
```

---

**QW-6 — Logger no-op em produção** _(~20min, impacto: BAIXO)_

```ts
// utils/logger.ts
const isDev = import.meta.env.DEV;

export const logger = {
  debug: isDev ? console.debug.bind(console) : () => {},
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
```

---

**QW-7 — Hash determinístico no Rust para cache de imagens** _(~15min, impacto: BAIXO)_

```toml
# src-tauri/Cargo.toml
rustc-hash = "1.1"
```

```rust
// src-tauri/src/commands/images.rs
use rustc_hash::FxHasher;
use std::hash::{Hash, Hasher};

// Substituir DefaultHasher por FxHasher (determinístico entre execuções)
let mut hasher = FxHasher::default();
image_url.hash(&mut hasher);
let url_hash = format!("{:016x}", hasher.finish());
```

---

### Melhorias Estruturais

**ME-1 — Eliminar N+1 via endpoint com retorno completo** _(4–8h, impacto: ALTO)_

Negociar com o backend que o `PATCH /pedidos/:id` retorne o objeto completo na resposta (padrão REST `return=representation`), eliminando o `GET /json` extra. Se o backend não puder ser alterado, ao menos eliminar o `POST /save-json` do fluxo principal (fazer de forma assíncrona sem bloquear a UI):

```ts
// Fluxo otimizado — sem GET extra se o backend retornar objeto completo
updateOrderStatus: async (request) => {
  requireSessionToken();
  const payload = buildStatusPayload(request);
  const response = await apiClient.patch<ApiPedido>(`/pedidos/${request.id}`, payload);
  const updatedOrder = mapPedidoFromApi(response.data); // usar retorno direto do PATCH

  clearOrderCache(request.id);

  // save-json de forma assíncrona (não bloqueia UI)
  apiClient.post(`/pedidos/save-json/${updatedOrder.id}`, updatedOrder).catch(
    err => logger.warn('save-json falhou silenciosamente:', err)
  );

  ordersSocket.broadcastOrderStatusUpdate(updatedOrder.id, updatedOrder);
  return updatedOrder;
},
```

---

**ME-2 — Request deduplication (in-flight cache)** _(3h, impacto: ALTO)_

Quando múltiplos eventos WS chegam para o mesmo `orderId` simultaneamente, a aplicação dispara múltiplos `getOrderById` paralelos. Implementar deduplicação de requests em-flight:

```ts
// api/endpoints/orders.ts
const inflight = new Map<number, Promise<OrderWithItems>>();

getOrderById: async (orderId: number): Promise<OrderWithItems> => {
  requireSessionToken();

  // 1. Cache hit
  const cached = ordersByIdCache.get(orderId);
  if (cached && isCacheFresh(cached, ORDER_BY_ID_CACHE_TTL_MS)) {
    return cached.data;
  }

  // 2. Request já em andamento? Retornar a mesma promise
  if (inflight.has(orderId)) {
    return inflight.get(orderId)!;
  }

  // 3. Novo request
  const promise = apiClient
    .get(`/pedidos/${orderId}/json`)
    .then(res => {
      const order = mapPedidoFromApi(res.data);
      setCacheWithLimit(orderId, order);
      return order;
    })
    .catch(async () => {
      const res = await apiClient.get<ApiPedido>(`/pedidos/${orderId}`);
      const order = mapPedidoFromApi(res.data);
      setCacheWithLimit(orderId, order);
      return order;
    })
    .finally(() => {
      inflight.delete(orderId);
    });

  inflight.set(orderId, promise);
  return promise;
},
```

---

**ME-3 — Virtualização da lista de pedidos** _(4–6h, impacto: ALTO)_

A lista de pedidos renderiza todos os itens no DOM simultaneamente. Para 200+ pedidos, isso gera re-renders caros e alto uso de memória DOM.

```bash
npm install @tanstack/react-virtual
```

```tsx
// components/OrderList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtualizer({
  count: filteredOrders.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,   // altura estimada de cada linha em px
  overscan: 5,              // renderizar 5 itens extras fora da viewport
});

return (
  <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
    <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
      {rowVirtualizer.getVirtualItems().map(virtualItem => (
        <div
          key={filteredOrders[virtualItem.index].id}
          style={{
            position: 'absolute',
            top: virtualItem.start,
            width: '100%',
          }}
        >
          <OrderRow order={filteredOrders[virtualItem.index]} />
        </div>
      ))}
    </div>
  </div>
);
```

---

**ME-4 — Substituir `headless_chrome` por geração de PDF nativa** _(8–16h, impacto: MÉDIO)_

`headless_chrome` adiciona ~50MB ao binário e inicia um processo Chrome completo para cada PDF gerado. Alternativas mais leves:

- **`printpdf`** — geração de PDF puro Rust, zero dependências externas
- Usar a **WebView do próprio Tauri** com `window.print()` e CSS `@media print` — zero dependência adicional
- **`@react-pdf/renderer`** já está no projeto — pode ser usado diretamente no frontend para todos os casos

```toml
# Cargo.toml — remover headless_chrome, adicionar printpdf se necessário
# headless_chrome = "1.0"  ← remover
printpdf = "0.7"
```

---

**ME-5 — Cache persistente para recursos estáticos** _(3–4h, impacto: MÉDIO)_

O cache atual de materiais, designers e vendedores é in-memory e perdido a cada navegação. Persistir no `localStorage` com TTL:

```ts
// Utilitário genérico de cache persistente
function createPersistentCache<T>(key: string, ttlMs: number) {
  return {
    get(): T | null {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp > ttlMs) return null;
        return data as T;
      } catch { return null; }
    },
    set(data: T): void {
      try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
      } catch { /* quota exceeded — ignorar silenciosamente */ }
    },
    clear(): void { localStorage.removeItem(key); },
  };
}

// Uso em resources.ts
const materiaisCache = createPersistentCache<MaterialApi[]>('sgp:materiais:v1', 5 * 60_000);

const fetchMateriaisRaw = async (): Promise<MaterialApi[]> => {
  requireSessionToken();
  const cached = materiaisCache.get();
  if (cached) return cached;
  const response = await apiClient.get<MaterialApi[]>(MATERIAIS_LIST_ENDPOINT);
  const data = response.data ?? [];
  materiaisCache.set(data);
  return data;
};
```

---

**ME-6 — Payload reduzido para o Web Worker** _(3h, impacto: MÉDIO)_

Em vez de serializar `OrderWithItems[]` completo (com todos os itens aninhados), enviar apenas os campos necessários para filtragem, reduzindo o tamanho da mensagem em ~60–70%:

```ts
// types/worker.ts — tipo leve apenas para filtros
export interface OrderFilterPayload {
  id: number;
  numero: string;
  cliente: string;
  cidade_cliente: string;
  data_entrega: string | null;
  status: string;
  prioridade: string;
  financeiro: boolean;
  conferencia: boolean;
  sublimacao: boolean;
  costura: boolean;
  expedicao: boolean;
  pronto: boolean;
  forma_envio: string | null;
  items: Array<{
    vendedor: string | null;
    designer: string | null;
    tipo_producao: string | null;
  }>;
}

// hooks/useFilterWorker.ts
function toFilterPayload(orders: OrderWithItems[]): OrderFilterPayload[] {
  return orders.map(o => ({
    id: o.id,
    numero: o.numero ?? '',
    cliente: o.cliente || o.customer_name || '',
    cidade_cliente: o.cidade_cliente ?? '',
    data_entrega: o.data_entrega ?? null,
    status: o.status,
    prioridade: o.prioridade ?? 'NORMAL',
    financeiro: !!o.financeiro,
    conferencia: !!o.conferencia,
    sublimacao: !!o.sublimacao,
    costura: !!o.costura,
    expedicao: !!o.expedicao,
    pronto: !!o.pronto,
    forma_envio: o.forma_envio ?? null,
    items: (o.items ?? []).map(i => ({
      vendedor: i.vendedor ?? null,
      designer: i.designer ?? null,
      tipo_producao: i.tipo_producao ?? null,
    })),
  }));
}
```

---

**ME-7 — Migrar para TanStack Query** _(16–24h, impacto: ALTO — longo prazo)_

O gerenciamento manual de cache, loading states e refetch está distribuído em múltiplos hooks. TanStack Query oferece deduplicação automática, invalidação inteligente e background refetch:

```bash
npm install @tanstack/react-query
```

```tsx
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, gcTime: 60_000 },
  },
});

// Em qualquer componente:
const { data: order } = useQuery({
  queryKey: ['order', orderId],
  queryFn: () => api.getOrderById(orderId),
});

// Invalidar após mutação:
queryClient.invalidateQueries({ queryKey: ['order', orderId] });
```

---

## Conclusão

### Resumo por Prioridade

| Prioridade | Problema | Solução | Esforço |
|---|---|---|---|
| 🔴 ALTO | N+1 em mutações (3x requests) | Endpoint com retorno completo (ME-1) | 4–8h |
| 🔴 ALTO | Refresh WS sem debounce | Debounce 300ms (QW-2) | 20min |
| 🔴 ALTO | Worker serializa sem debounce | Debounce 150ms (QW-1) | 30min |
| 🟡 MÉDIO | Polling coexiste com WS | Pausar quando WS conectado (QW-4) | 15min |
| 🟡 MÉDIO | Cache TTL 2s ineficaz | Aumentar para 10s (QW-3) | 5min |
| 🟡 MÉDIO | Lista sem virtualização | `@tanstack/react-virtual` (ME-3) | 4–6h |
| 🟡 MÉDIO | Cache in-memory perde dados | Cache `localStorage` (ME-5) | 3–4h |
| 🟢 BAIXO | Logger serializa em produção | Logger no-op (QW-6) | 20min |
| 🟢 BAIXO | Hash de imagem não-determinístico | `FxHasher` (QW-7) | 15min |
| 🟢 BAIXO | Token sync em toda request | Guard de token (QW-5) | 10min |

### Próximos Passos Recomendados

**Sprint 1 — Quick Wins (< 2h total):**
- QW-2: Debounce no `refreshOrders`
- QW-3: TTL do cache `2s → 10s`
- QW-6: Logger no-op em produção
- QW-5: Guard de token
- QW-7: Hash determinístico no Rust

**Sprint 2 — Impacto Médio (1 semana):**
- QW-1: Debounce no Web Worker
- QW-4: Pausar polling quando WS conectado
- ME-2: In-flight deduplication para `getOrderById`
- ME-6: Payload reduzido para o Worker

**Sprint 3 — Estrutural (2–4 semanas):**
- ME-1: Eliminar N+1 nas mutações
- ME-3: Virtualização da lista de pedidos
- ME-5: Cache persistente para recursos estáticos

**Longo Prazo:**
- ME-4: Substituir `headless_chrome`
- ME-7: Migrar para TanStack Query

> **Nota:** Os quick wins QW-2, QW-3, QW-5 e QW-6 podem ser aplicados em menos de 1 hora no total e já eliminam a maioria dos requests redundantes e do overhead de CPU em produção.
