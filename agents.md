# AGENTS.md — SGP v4 (Sistema de Gerenciamento de Pedidos)

> Este arquivo é o ponto de entrada para agentes de IA (Copilot, Claude, Gemini, etc.) trabalharem neste repositório.
> Leia-o **completamente** antes de fazer qualquer alteração.

---

## 1. Visão Geral do Projeto

O **SGP** é um sistema fullstack de gestão de pedidos para uma empresa de produção gráfica/têxtil. É composto por dois repositórios no monorepo `sgp-group`:

| Repositório | Função | Porta padrão |
|---|---|---|
| `sgp-v4/` | Frontend React + App Desktop (Tauri v2) | `1420` (dev) |
| `api-sgp/` | Backend REST API (FastAPI + Python) | `8000` |

O frontend pode rodar de **duas formas**:
- **Desktop**: empacotado como `.msi` via Tauri v2 (principal)
- **Web/PWA**: servido como SPA com Service Worker

---

## 2. Stack Tecnológica

### Frontend (`sgp-v4`)

| Categoria | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Desktop | Tauri v2 (Rust) |
| Roteamento | React Router Dom v6 — **HashRouter** |
| Estado global | **Zustand** (com persist middleware) |
| Estilização | **Tailwind CSS v3** + Radix UI (headless) |
| Ícones | `lucide-react` |
| HTTP Client | Axios + adaptador Tauri customizado |
| WebSocket | Gerenciado por `src/lib/realtimeOrders.ts` |
| PDF | `@react-pdf/renderer`, `jsPDF`, `pdfmake` |
| Gráficos | Recharts |
| Testes | Vitest + Testing Library + MSW |
| PWA | `vite-plugin-pwa` + Workbox |
| Package Manager | **pnpm** |

### Backend (`api-sgp`)

| Categoria | Tecnologia |
|---|---|
| Framework | FastAPI 0.115 + Pydantic v2 |
| ORM | SQLModel (SQLAlchemy async) |
| Banco (local) | SQLite + aiosqlite |
| Banco (produção) | MySQL remoto |
| Migrations | Alembic |
| Auth | JWT via `python-jose` |
| Servidor | Uvicorn / Hypercorn |
| Serialização | ORJSON |
| Testes | pytest + pytest-asyncio |

---

## 3. Estrutura de Diretórios

```
sgp-v4/
├── src/
│   ├── api/               # Cliente HTTP e endpoints
│   │   ├── client.ts      # Axios singleton com interceptors, setApiUrl, setAuthToken
│   │   ├── endpoints/     # Funções por domínio: orders, customers, resources, etc.
│   │   └── types/         # Tipos de resposta da API
│   ├── components/        # Componentes reutilizáveis
│   │   ├── ui/            # Primitivos (Button, Input, Dialog, etc.) — baseados em Radix
│   │   ├── layouts/       # Layouts estruturais
│   │   ├── modals/        # Modais compartilhadas
│   │   ├── fechamentos/   # Componentes do módulo de fechamentos
│   │   └── dashboard/     # Componentes do dashboard
│   ├── contexts/          # Context API (AlertContext, ConfirmContext)
│   ├── hooks/             # Custom hooks React
│   ├── lib/               # Módulos internos (realtimeOrders.ts)
│   ├── pages/             # Páginas por rota
│   ├── services/          # Serviços (api.ts, tauriAxiosAdapter, hybridClient)
│   ├── store/             # Stores Zustand
│   ├── types/             # Tipos TypeScript globais (index.ts tem ~900 linhas)
│   ├── utils/             # Utilitários puros
│   └── workers/           # Web Workers (filtros pesados)
├── src-tauri/             # Código Rust do Tauri v2
│   ├── src/               # Lógica Rust
│   ├── migrations/        # Migrações SQLx (banco local Tauri)
│   └── tauri.conf.json    # Configuração do app desktop
├── tests/                 # Testes de utils (fora do src/)
├── public/                # Assets estáticos
├── vite.config.ts
├── vitest.config.ts
└── package.json
```

---

## 4. Alias de Import

O alias `@` aponta para `src/`. Use sempre:

```typescript
// ✅ Correto
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';

// ❌ Evitar
import { useAuthStore } from '../../../store/authStore';
```

---

## 5. Convenções de Código

### Componentes

- **Componentes React**: PascalCase, arquivo `.tsx`
- **Hooks**: camelCase prefixado com `use`, arquivo `.ts`
- **Utilitários**: camelCase, arquivo `.ts`
- **Tipos/Interfaces**: em `src/types/index.ts` (principal) ou no mesmo arquivo se forem locais

### Estilo (Tailwind)

- Use classes Tailwind diretamente nos elementos JSX.
- Para variantes condicionais, use `clsx` + `tailwind-merge` via o helper `cn()` em `src/lib/utils.ts`.
- Tema claro/escuro gerenciado pelo `ThemeProvider` — use variáveis CSS (`bg-background`, `text-foreground`) em vez de cores fixas onde possível.

### Detecção de ambiente

Sempre use o utilitário `isTauri()` para código condicional entre desktop e web:

```typescript
import { isTauri } from '@/utils/isTauri';

if (isTauri()) {
  // Código exclusivo do app desktop Tauri
  const { invoke } = await import('@tauri-apps/api/core');
} else {
  // Código para PWA/browser
}
```

### Logging

Use sempre o `logger` centralizado em vez de `console.*` direto. Logs são suprimidos automaticamente em produção:

```typescript
import { logger } from '@/utils/logger';

logger.debug('Mensagem de debug', { dados });
logger.info('Operação concluída');
logger.warn('Atenção');
logger.error('Erro na operação', error);
```

### Lazy Loading de Páginas

Ao adicionar novas rotas, use `lazyWithRetry` em vez de `React.lazy` puro:

```typescript
import { lazyWithRetry } from '@/utils/lazyWithRetry';

const NovaPagina = lazyWithRetry(() => import('./pages/NovaPagina'));
```

> Isso resolve erros de `Failed to fetch dynamically imported module` após deploys.

---

## 6. Autenticação e Estado Global

### `authStore` (Zustand + persist)

Chave no localStorage: `auth-storage`

```typescript
import { useAuthStore } from '@/store/authStore';

// Leitura (via selector para evitar re-renders desnecessários)
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
const { userId, username, isAdmin, setor, sessionToken } = useAuthStore();

// Ações
const { login, logout } = useAuthStore();
```

**Campos do estado de autenticação:**
| Campo | Tipo | Descrição |
|---|---|---|
| `isAuthenticated` | `boolean` | Se o usuário está logado |
| `userId` | `number \| null` | ID do usuário |
| `username` | `string \| null` | Nome de usuário |
| `isAdmin` | `boolean` | Flag de administrador |
| `setor` | `string \| null` | Setor do usuário (ex: `'geral'`) |
| `sessionToken` | `string \| null` | JWT |
| `sessionExpiresAt` | `number \| null` | Timestamp de expiração |

> **Sessão**: expira automaticamente em 8 horas. A re-hidratação do Zustand verifica o TTL via `queueMicrotask`.

### Configurar token no cliente HTTP

```typescript
import { setAuthToken } from '@/api/client';
setAuthToken(sessionToken); // Automaticamente inclui no header Authorization
```

---

## 7. Cliente HTTP (API)

### Configuração

A URL base da API **não é hardcoded** — é configurada em runtime pelo usuário na tela `ConfigApi.tsx` e salva localmente.

```typescript
import { setApiUrl, getApiUrl, apiClient } from '@/api/client';

// Definir URL base (feito em App.tsx na inicialização)
setApiUrl('http://192.168.1.100:8000');

// Fazer requisições (baseURL já configurada)
const response = await apiClient.get('/pedidos');
```

### Interceptors automáticos

- **Request**: injeta `Authorization: Bearer <token>` e header `ngrok-skip-browser-warning`.
- **Response**: erros de rede (sem resposta HTTP) disparam `onApiFailure` listeners globais.
- **Erro 422**: logado em detalhe automaticamente.

### Header para requisições silenciosas

Para evitar que falhas em chamadas não-críticas acionem a tela de fallback de conexão:

```typescript
await apiClient.post('/logout', {}, {
  headers: { 'X-Silent-Request': 'true' }
});
```

### Adaptador Tauri

No ambiente Tauri, o Axios usa `tauriAxiosAdapter.ts` para enviar requisições via `@tauri-apps/plugin-http` (necessário por restrições de segurança do WebView). Isso é transparente — não altere a forma de fazer requisições.

---

## 8. WebSocket (Tempo Real)

O WebSocket é gerenciado por `src/lib/realtimeOrders.ts` — **NÃO crie conexões WebSocket avulsas**.

```typescript
import { ordersSocket } from '@/lib/realtimeOrders';

// Conectar (feito automaticamente pelo hook)
ordersSocket.connect(apiBaseUrl, jwtToken);

// Escutar eventos
const unsubscribe = ordersSocket.on('order_updated', (payload) => {
  // reagir à atualização
});

// Desconectar ao desmontar
return () => unsubscribe();
```

O hook `useRealtimeNotifications` (`src/hooks/useRealtimeNotifications.ts`) gerencia o ciclo de vida da conexão automaticamente baseado no `sessionToken`.

**Endpoint WebSocket da API:** `ws://<host>/ws/orders?token=<jwt>`

---

## 9. Tipos Principais

Definidos em `src/types/index.ts`:

| Tipo | Descrição |
|---|---|
| `OrderWithItems` | Pedido completo com itens de produção |
| `OrderItem` | Item de um pedido (com todos campos de produção) |
| `OrderStatus` | Enum: `Pendente`, `Em Processamento`, `Concluido`, `Cancelado` |

**Status de produção em `OrderWithItems`:**
- `financeiro`, `conferencia`, `sublimacao`, `costura`, `expedicao`, `pronto` — booleanos de pipeline
- `rascunho` — pedido incompleto, fora do fluxo

---

## 10. Testes

### Executar

```bash
pnpm test              # Modo watch
pnpm test --run        # Uma execução e encerra
```

### Configuração

- **Framework**: Vitest com `jsdom`
- **Setup**: `src/tests/setup.ts`
- **Alias**: `@` funciona nos testes (configurado em `vitest.config.ts`)
- **API Mock**: MSW (Mock Service Worker) — handlers em `src/tests/mocks/`
- **URL base nos testes**: `http://localhost:8000/api`

### Mocks já configurados no setup global

| Mock | Motivo |
|---|---|
| `@tauri-apps/api/core` (invoke) | Tauri não existe em jsdom |
| `WebSocket` | Evitar conexões reais |
| `Worker` (Web Workers) | Não disponível em jsdom |
| `localStorage` / `sessionStorage` | Isolamento entre testes |
| `PointerEvent` | Compatibilidade com Radix UI |

> **Regra**: Não adicione `console.log` nos testes. Use `vi.fn()` para mocks de módulos.

---

## 11. Build e Deploy

### Desenvolvimento

```bash
pnpm dev              # Inicia Vite (web, porta 1420)
pnpm tauri:dev        # Inicia Tauri + Vite (desktop)
```

### Build

```bash
pnpm build            # Build web (dist/)
pnpm tauri:build      # Build desktop (.msi para Windows)
```

### Chunks de build (Vite)

O `vite.config.ts` faz code splitting manual:

| Chunk | Conteúdo |
|---|---|
| `vendor-pdf` | jsPDF, jspdf-autotable |
| `vendor-canvas` | html2canvas |
| `vendor-csv` | papaparse |
| `vendor-charts` | recharts |
| `vendor` | Demais node_modules |

### PWA vs Tauri

A detecção é automática via variável `TAURI_PLATFORM`:
- Se `TAURI_PLATFORM` está definida → build com `base: './'`, sem Service Worker
- Se não → build com Service Worker e manifesto PWA

---

## 12. Módulos da API Backend

O backend (`api-sgp`) é modularizado em domínios. Prefixo base: sem prefixo por padrão (`API_V1_STR = ""`).

| Rota | Módulo | Descrição |
|---|---|---|
| `/auth/*` | `auth` | Login, tokens JWT |
| `/pedidos/*` | `pedidos` | CRUD de pedidos |
| `/clientes/*` | `clientes` | Cadastro de clientes |
| `/pagamentos/*` | `pagamentos` | Formas e registros de pagamento |
| `/envios/*` | `envios` | Expedição e envios |
| `/fichas/*` | `fichas` | Fichas de produção e templates |
| `/producoes/*` | `producoes` | Registros de produção por item |
| `/maquinas/*` | `maquinas` | Máquinas + logs de impressão |
| `/materiais/*` | `materiais` | Estoque de materiais |
| `/designers/*` | `designers` | Cadastro de designers |
| `/vendedores/*` | `vendedores` | Cadastro de vendedores |
| `/users/*` | `users` | Gestão de usuários do sistema |
| `/api/notificacoes/*` | `notificacoes` | Notificações push |
| `/relatorios_fechamentos/*` | `relatorios_fechamentos` | Relatórios de fechamento |
| `/relatorios_envios/*` | `relatorios_envios` | Relatórios de envio |
| `/reposicoes/*` | `reposicoes` | Controle de reposições |
| `/sync/*` | `sync` | Sincronização com VPS (Outbox Pattern) |
| `/safira/*` | `safira` | Módulo Safira com logs |
| `/automacao/*` | `automacao` | Automações de produção |
| `/ws/orders` | `pedidos.realtime` | WebSocket de pedidos |
| `/health` | `main` | Health check da API |

> ⚠️ O router `relatorios` está **comentado** em `main.py:169`. Não descomentar sem verificar se o módulo está funcional.

---

## 13. Regras Críticas para Agentes

### O que SEMPRE fazer

1. **Use o alias `@`** para todos os imports internos.
2. **Use `isTauri()`** antes de qualquer chamada a APIs do Tauri.
3. **Use `logger.*`** em vez de `console.*`.
4. **Use `lazyWithRetry`** ao adicionar novas rotas em `App.tsx`.
5. **Preserve comentários e docstrings** existentes ao editar arquivos.
6. **Rode os testes** após alterações: `pnpm test --run`.
7. **Use `useAuthStore` via selector** (`state => state.campo`) para evitar re-renders.

### O que NUNCA fazer

1. ❌ Hardcodar a URL da API (ex: `http://localhost:8000`) — use `getApiUrl()`.
2. ❌ Criar instâncias novas de Axios — use o `apiClient` singleton de `@/api/client`.
3. ❌ Criar conexões WebSocket avulsas — use `ordersSocket` de `@/lib/realtimeOrders`.
4. ❌ Usar `React.lazy()` diretamente — use `lazyWithRetry()`.
5. ❌ Adicionar `console.log` em código de produção — use `logger.debug`.
6. ❌ Commitar arquivos `.backup` ou temporários em `src/`.
7. ❌ Editar `dist/` — é gerado pelo build, nunca edite manualmente.
8. ❌ Alterar `src-tauri/tauri.conf.json` sem entender o impacto na assinatura do updater.

---

## 14. Variáveis de Ambiente

### Frontend (`.env` ou `.env.local` na raiz de `sgp-v4`)

| Variável | Uso |
|---|---|
| `VITE_APP_VERSION` | Versão injetada no build web (fallback: lê `package.json`) |
| `VITE_BASE_PATH` | Base path do build web (padrão: `/`) |

### Tauri (definidas pelo processo de build)

| Variável | Quando existe |
|---|---|
| `TAURI_PLATFORM` | Durante `tauri dev` / `tauri build` |
| `TAURI_DEBUG` | Em modo debug — habilita sourcemaps |

### Backend (`api-sgp/.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | Ex: `sqlite:///./shared/db/banco.db` |
| `SECRET_KEY` | ✅ em produção | Chave JWT — **não use o valor padrão** |
| `ENVIRONMENT` | — | `development` ou `production` |
| `MEDIA_ROOT` | — | Diretório de mídias (padrão: `shared/media`) |
| `API_ROOT` | — | Raiz da API para diretórios compartilhados |
| `VPS_SYNC_API_KEY` | — | Chave para sincronização com VPS |

---

## 15. Pontos de Débito Técnico

| Severidade | Item |
|---|---|
| 🔴 Alto | `CreateOrderComplete.tsx` (158KB) e `OrderList.tsx` (146KB) precisam ser decompostos em componentes menores |
| 🔴 Alto | `Fechamentos.tsx` (68KB) — mesma situação |
| 🟡 Médio | `Fechamentos.tsx.backup` presente em `src/pages/` — deve ser removido |
| 🟡 Médio | Versões desalinhadas: frontend v1.4.8 vs backend v1.4.3 |
| 🟡 Médio | Router `relatorios` comentado no backend sem documentação clara do motivo |
| 🟢 Baixo | CSP permissiva no `tauri.conf.json` — pode ser endurecida em produção |

---

## 16. Comandos Úteis

```bash
# Frontend
pnpm dev                    # Dev server web (porta 1420)
pnpm tauri:dev              # Dev desktop Tauri
pnpm build                  # Build web
pnpm tauri:build            # Build .msi desktop
pnpm test                   # Testes (modo watch)
pnpm test --run             # Testes (CI / uma execução)
pnpm lint                   # ESLint
pnpm format                 # Prettier

# Backend
cd ../api-sgp
python main.py              # Iniciar API (porta 8000)
alembic upgrade head        # Aplicar migrations
pytest                      # Rodar testes
```
