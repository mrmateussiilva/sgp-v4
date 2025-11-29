## 1) Introdução

Esta documentação descreve a **camada cliente do SGP v4** (React + Tauri), cobrindo tudo o que é necessário para entender e manter a parte visual do sistema:

- Estrutura do projeto (`src/`, `src-tauri/`, `public/`).
- Mapa completo das telas (Dashboard, Fichas/Pedidos, Fechamento, Relatórios, Admin).
- Componentes principais (forms de ficha, listas, tabelas, modais, layout).
- Hooks customizados e estados globais.
- Comunicação com a API Python e uso de Tauri.
- Fluxos críticos do dia a dia (criar/editar pedido, fechamento, relatórios, imagens, notificações).

O foco é o **cliente**; não são detalhadas regras de negócio internas do backend, apenas o que impacta o frontend.

---

## 2) Estrutura geral do projeto

### 2.1. Frontend React (`src/`)

Principais arquivos e pastas:

- `main.tsx`  
  - Entrypoint React.
  - Habilita atalhos de devtools em produção (`enableDevtoolsShortcuts`).
  - Renderiza `<App />` em `#root`.

- `App.tsx`  
  Responsável por:
  - Carregar configuração da URL da API via `loadConfig` (`utils/config`).
  - Normalizar e testar a API com `normalizeApiUrl` e `verifyApiConnection` (`apiClient`).
  - Aplicar a base URL global (`setApiUrl` de `services/api`).
  - Controlar fallback para a tela de configuração (`ConfigApi`) se a API não estiver acessível.
  - Roteamento de alto nível com `HashRouter`:
    - `/login` → `Login`.
    - `/dashboard/*` → `Dashboard` (envolto em `PrivateRoute`).
    - `/` → redireciona para `/dashboard`.
  - Monitorar falhas de rede com `onApiFailure` para voltar à tela de configuração.
  - Inicializar:
    - `useNotifications()` (polling HTTP + eventos Tauri).
    - Listener Tauri `listen("novo_pedido")` para exibir toast “Novo pedido criado!”.

- `components/`  
  Componentes de domínio e de infraestrutura visual:

  - **Pedidos / Fichas**:
    - `OrderList.tsx` – lista/tabela principal de pedidos (equivalente à “lista de fichas”).
    - `CreateOrderComplete.tsx` – formulário avançado de criação/edição de pedido/ficha (equivalente a uma **FichaForm** completa).
    - `OrderForm.tsx` – formulário mais simples de pedido (útil como referência mínima).
    - `OrderDetails.tsx` – modal com resumo do pedido.
    - `OrderViewModal.tsx` – visualização detalhada da ficha, com imagem e impressão (faz o papel de **ImagemModal + ficha visual**).
    - `OrderQuickEditDialog.tsx` – edição rápida de metadados (cliente, entrega, pagamento).
    - `FichaDeServico.tsx` – componente de ficha de serviço “imprimível” por item.
    - Formulários específicos de item:
      - `FormPainelCompleto.tsx` (painel/tecido/generico).
      - `FormLonaProducao.tsx` (lona).
      - `FormTotemProducao.tsx` (totem).
      - `FormAdesivoProducao.tsx` (adesivo).
    - Auxiliares:
      - `ClienteAutocomplete.tsx`, `SelectDesigner.tsx`, `SelectVendedor.tsx`, `MedidasCalculator.tsx`.

  - **Layout / Navegação**:
    - `ThemeProvider.tsx`, `ThemeToggle.tsx` – tema claro/escuro/sistema.
    - `ProtectedRoute.tsx` – proteção de rotas com base em `authStore`.
    - `SmoothTableWrapper.tsx` – wrapper para animações suaves de tabela.
    - `AutoRefreshStatus.tsx` – indicador de auto-refresh / realtime.

  - **Notificações e diagnóstico**:
    - `NotificationDebugPanel.tsx`, `BroadcastStatusPanel.tsx`, `ConnectionStatus.tsx`, `TauriEventTest.tsx`, `EventTestPanel.tsx` – componentes auxiliares para depurar notificações e eventos Tauri/WebSocket.

  - **UI base (shadcn)**:
    - `components/ui/*` – `button`, `input`, `textarea`, `select`, `table`, `dialog`, `toast`, `tabs`, `popover`, `checkbox`, `tooltip`, etc.

- `pages/`  
  Views de alto nível (cada uma mapeia para uma rota):

  - Autenticação e configuração:
    - `Login.tsx` – tela de login (chama `api.login` e popula `authStore`).
    - `ConfigApi.tsx` – configuração da URL da API Python (salva em arquivo local via Tauri).
  - Shell principal:
    - `Dashboard.tsx` – layout com sidebar, header e rotas internas (`/dashboard/*`).
    - `DashboardOverview.tsx` – visão geral com estatísticas, pedidos recentes e ações rápidas.
  - Fluxos de negócio:
    - `Fechamentos.tsx` – relatórios de fechamento (analíticos/sintéticos).
    - `RelatoriosEnvios.tsx` – relatório de envios por data de entrega.
    - `Clientes.tsx` – gestão de clientes.
    - `PainelDesempenho.tsx` – painel de desempenho/analytics.
  - Administrativo:
    - `Admin.tsx` – hub de módulos administrativos.
    - `pages/admin/*` – gestão de Materiais, Designers, Vendedores, Formas de Envio, Formas de Pagamento, Usuários.
  - Tauri utilitários:
    - `DatabaseConnection.tsx` – configuração de conexão com banco via comandos Tauri.

- `hooks/`  
  Hooks customizados usados pela camada visual:

  - `use-toast.ts` – hook do sistema de toasts (shadcn).
  - `useNotifications.ts` – polling HTTP de notificações, emite evento Tauri `novo_pedido`.
  - `useRealtimeNotifications.ts` – integração de WebSocket com `ordersSocket` (notificações em tempo real + toasts).
  - `useOrderEvents.ts` – camada de baixo nível para lidar com eventos de pedidos via WebSocket.
  - `useAutoRefresh.ts` – gerencia ciclos de auto-refresh suave.

- `services/`

  - `apiClient.ts`:
    - Encapsula um `AxiosInstance` (`apiClient`) com:
      - `setApiUrl`, `getApiUrl`, `normalizeApiUrl`, `verifyApiConnection`, `onApiFailure`.
      - Interceptores para inserir `Authorization: Bearer <token>`.
      - Integração com Tauri via `applyTauriAdapter` (usa `@tauri-apps/api/http` quando em Tauri).
  - `tauriAxiosAdapter.ts`:
    - Adapta a interface do axios para usar `@tauri-apps/api/http.fetch` (método, headers, timeout, body, responseType).
  - `api.ts`:
    - Fachada principal de comunicação com a API Python.
    - Converte tipos da API (`ApiPedido`, `ApiPedidoItem`) para tipos da aplicação (`OrderWithItems`, `OrderItem`, `OrderFicha`).
    - Expõe:
      - Autenticação: `login`, `logout`.
      - Pedidos: `getOrders`, `getOrderById`, `createOrder`, `updateOrder`, `updateOrderStatus`, `updateOrderMetadata`, `deleteOrder`, filtros, pendentes/prontos, etc.
      - Ficha: `getOrderFicha`.
      - Clientes, Vendedores, Designers, Materiais, Formas de Envio, Formas de Pagamento, Usuários (CRUD completo).
      - Relatório de fechamentos: `generateReport` (chama `generateFechamentoReport` em `utils/fechamentoReport.ts`).

- `store/` (Zustand)

  - `authStore.ts`:
    - `isAuthenticated`, `userId`, `username`, `isAdmin`, `sessionToken`, `sessionExpiresAt`.
    - Ações:
      - `login({ userId, username, sessionToken, isAdmin, expiresInSeconds? })`.
      - `logout()`.
    - Usa `persist` para guardar sessão em `localStorage` (`auth-storage`), com verificação de expiração na reidratação.
  - `orderStore.ts`:
    - `orders: OrderWithItems[]`, `selectedOrder: OrderWithItems | null`.
    - Ações: `setOrders`, `setSelectedOrder`, `addOrder`, `updateOrder`, `removeOrder`.

- `utils/`

  - `config.ts` – ler/salvar/remover configuração de API via FS do Tauri (`appDir`, `readTextFile`, `writeTextFile`).
  - `isTauri.ts` – detecção de ambiente Tauri vs browser puro.
  - `path.ts` – utilitários de imagem:
    - `normalizeImagePath`, `isValidImagePath`.
  - `exportUtils.ts` – exportação e impressão de relatórios de envios (`exportToCSV`, `exportToPDF`, `exportEnvioReportToPDF`, `printEnvioReport`).
  - `fechamentoReport.ts` – geração de dados de relatório de fechamentos (`ReportGroup`, `ReportResponse`).
  - `printOrder.ts`, `printOrderServiceForm.ts` – geração de HTML/CSS para impressão de pedidos e fichas de serviço.
  - `order-item-display.ts` – converte `OrderItem` em pares label/valor legíveis.
  - `date.ts`, `config.ts`, `devtools.ts`, etc. – helpers diversos.

- `examples/` e `data/`

  - `examples/RealtimeNotificationsExamples.tsx` – exemplos de uso de notificações em tempo real.
  - `data/mockAnalytics.ts` – dados fake para componentes analíticos.

### 2.2. Camada Tauri (`src-tauri/`)

Do ponto de vista do cliente React, os arquivos mais relevantes são:

- `src-tauri/src/main.rs`
  - Inicializa a app Tauri, registra plugins e comandos (`#[tauri::command]`).
- `src-tauri/src/notifications.rs`
  - Funções `notify_order_created`, `notify_order_updated`, `notify_order_deleted`, `notify_order_status_changed`.
  - Todas emitem eventos Tauri (`app_handle.emit_all(...)`) que podem ser ouvidos pelo frontend.
- `src-tauri/src/order_polling.rs`
  - Sistema de polling em background que:
    - Consulta o banco (`orders`).
    - Detecta mudanças de status/flags.
    - Emite eventos `order_status_changed` para o frontend.
- `src-tauri/src/commands/reports.rs`
  - Comando `generate_report` que gera relatórios diretamente a partir do banco Postgres.
  - Atualmente o cliente React está usando a implementação TypeScript (`utils/fechamentoReport.ts`), mas este comando permanece disponível caso se opte por chamar `invoke` no futuro.
- Diversos comandos auxiliares (`database.rs`, `logs.rs`, `auth.rs`, `clientes.rs`, etc.) usados por telas como `DatabaseConnection` ou fluxos administrativos.

### 2.3. `public/`

- Contém assets estáticos servidos pelo Vite (no projeto atual, apenas `vite.svg`).

---

## 3) Arquitetura da camada cliente

### 3.1. Fluxo de inicialização

1. `main.tsx` renderiza `<App />`.
2. `App.tsx`:
   - Carrega config da API via `loadConfig()`.
   - Se há `api_url`:
     - Normaliza (`normalizeApiUrl`) e testa (`verifyApiConnection`).
     - Se sucesso:
       - Chama `setApiUrl` (TS) → configura `apiClient.defaults.baseURL`.
       - Seta `apiUrl` e `showFallback = false`.
     - Se falha:
       - `apiUrl = null`, `showFallback = true` e renderiza `ConfigApi`.
   - Se não há config:
     - Exibe `ConfigApi` diretamente.
   - Registra `onApiFailure`:
     - Em erros de rede persistentes, limpa `apiUrl` e volta a `ConfigApi`.
   - Inicializa:
     - `useNotifications()` (polling de notificações).
     - Listener `listen("novo_pedido")` para mostrar toast.
   - Define rotas:
     - `/login` → `Login`.
     - `/dashboard/*` → `Dashboard` (via `PrivateRoute`).

### 3.2. Autenticação e proteção de rotas

- `authStore.ts`:
  - Guarda sessão e TTL; encerra sessões expiradas automaticamente na reidratação.
- `services/api.ts`:
  - `login`:
    - Chama `/auth/login`, configura token (`setAuthToken`) e popula `authStore`.
  - `logout`:
    - Chama `/auth/logout` (se houver sessão).
    - Sempre limpa token e `authStore`.
  - `requireSessionToken()`:
    - Utilizado antes de qualquer chamada à API que exige autenticação.
- `ProtectedRoute.tsx`:
  - Verifica `isAuthenticated` (e `isAdmin` quando `requireAdmin` é true).
  - Redireciona para `/login` se não autenticado.

### 3.3. Organização por domínio

- **Pedidos / Fichas**:
  - Estado em `orderStore`.
  - Fluxos principais:
    - Listagem / produção: `OrderList`.
    - Criação/edição avançada: `CreateOrderComplete`.
    - Edição simples: `OrderForm`.
    - Visualização / impressão: `OrderViewModal`, `FichaDeServico`, `printOrder`, `printOrderServiceForm`.

- **Fechamentos**:
  - `Fechamentos.tsx`:
    - Usa `api.generateReport` (TS).
    - `generateFechamentoReport` agrupa pedidos em `ReportGroup`s com totais de frete/serviço.
    - Permite exportar PDF via `jsPDF`.

- **Relatórios de Envios**:
  - `RelatoriosEnvios.tsx`:
    - Foco em logística: agrupa pedidos por forma de envio em um intervalo de entrega.
    - Expõe visualização textual e exportação/impressão via `printEnvioReport`.

- **Admin**:
  - `Admin.tsx` aponta para telas de gestão em `pages/admin/*`.
  - Cada tela usa funções específicas de `services/api.ts` para manter cadastros auxiliares.

- **Notificações / Realtime**:
  - Polling HTTP: `useNotifications`.
  - WebSocket:
    - `lib/realtimeOrders.ts` + `useOrderEvents` / `useOrderAutoSync` / `useRealtimeNotifications`.

---

## 4) Fluxo visual (mapa das telas)

### 4.1. Rotas de alto nível (`App.tsx`)

- `/login` → `Login`.
- `/dashboard/*` → `Dashboard` (shell da aplicação, protegido).
- `/` → redireciona para `/dashboard`.

### 4.2. Shell e rotas internas (`Dashboard.tsx`)

`Dashboard` concentra:

- **Sidebar (desktop + mobile)**:
  - Itens de menu:
    - Início (`/dashboard`) → `DashboardOverview`.
    - Pedidos (`/dashboard/orders`) → `OrderList`.
    - Novo Pedido (`/dashboard/orders/new`) → `CreateOrderComplete`.
    - Clientes (`/dashboard/clientes`) → `Clientes`.
    - Relatório de Envios (`/dashboard/relatorios-envios`) → `RelatoriosEnvios`.
    - Painel de Desempenho (`/dashboard/painel-desempenho`) → `PainelDesempenho` (somente admin).
    - Fechamentos (`/dashboard/fechamentos`) → `Fechamentos` (somente admin).
    - Admin (`/dashboard/admin`) → `Admin` (somente admin).

- **Header**:
  - Título “Sistema de Gerenciamento de Pedidos”.
  - Saudação com `username`.
  - `ThemeToggle`.
  - Menu mobile (abre sidebar).

- **Rotas internas (`Routes`)**:
  - `/dashboard` → `DashboardOverview`.
  - `/dashboard/orders` → `OrderList`.
  - `/dashboard/orders/new` → `CreateOrderComplete`.
  - `/dashboard/orders/edit/:id` → `OrderForm`.
  - `/dashboard/clientes` → `Clientes`.
  - `/dashboard/relatorios-envios` → `RelatoriosEnvios`.
  - `/dashboard/painel-desempenho` → `PainelDesempenho` (admin).
  - `/dashboard/fechamentos` → `Fechamentos` (admin).
  - `/dashboard/admin` + `/dashboard/admin/*` → módulos administrativos (admin).

### 4.3. Vistas principais (por tema)

- **Fichas / Pedidos**:
  - `OrderList`:
    - Vista de “Fichas” (lista de pedidos + status de produção).
  - `CreateOrderComplete` / `OrderForm`:
    - Vistas de “Cadastro/Edição de Ficha/Pedido”.

- **Fechamento**:
  - `Fechamentos`:
    - Vista de relatórios de fechamento financeiro/serviços (~ “FechamentoTable” nos testes).

- **Relatórios**:
  - `RelatoriosEnvios`:
    - Vista de reports de envios (por forma de entrega).

- **Configurações / Admin**:
  - `ConfigApi`, `DatabaseConnection`, `Admin`, `admin/*`.

---

## 5) Componentes principais

### 5.1. Ficha de pedido (CreateOrderComplete – “FichaForm”)

`CreateOrderComplete` é o equivalente concreto à “FichaForm”:

- **Responsabilidade**:
  - Criar e editar pedidos complexos com múltiplos itens e tipos de produção.
- **Seções principais**:
  - Dados do pedido:
    - Cliente, telefone, cidade/UF, datas, prioridade, observações.
  - Itens:
    - Várias abas, uma por item.
    - Para cada tipo (painel, lona, totem, adesivo, etc.), usa um formulário próprio (`Form*Producao`).
  - Fechamento:
    - Forma de envio, forma de pagamento, frete, totais.
- **Fluxo de dados**:
  - Internamente mantém estado local com todos os campos.
  - Ao salvar:
    - Constrói `CreateOrderRequest` ou `UpdateOrderRequest`.
    - Chama `api.createOrder` / `api.updateOrder`.
    - Atualiza `orderStore` via `addOrder` / `updateOrder`.

### 5.2. Lista / tabela de fichas (OrderList – “FichaList / FechamentoTable”)

`OrderList` é a lista de fichas/pedidos:

- **Carregamento**:
  - Usa combinações de:
    - `api.getPendingOrdersPaginated`, `api.getReadyOrdersPaginated` (pendentes/prontos).
    - `api.getOrdersWithFilters` (filtros avançados com datas).
    - `api.getOrders` (lista completa para casos gerais).
- **Filtros**:
  - Texto (cliente/ID/número).
  - Status de produção global (Pendentes, Prontos, Todos).
  - Datas (entrada/entrega).
  - Filtros avançados:
    - Setores de produção (financeiro, conferência, sublimação, costura, expedição, pronto).
    - Vendedor, Designer, Cidade.
- **Tabela**:
  - Colunas:
    - Seleção de linhas para impressão em lote.
    - ID/numero.
    - Cliente.
    - Data de entrega.
    - Prioridade.
    - Cidade/UF.
    - Flags de produção por setor.
    - Status consolidado (`Pronto` / `Em andamento`).
    - Ações (visualizar, detalhes, editar, excluir).
- **Integração com status de produção**:
  - `handleStatusClick` abre modais de confirmação.
  - `buildStatusUpdatePayload` monta `UpdateOrderStatusRequest` coerente.
  - `api.updateOrderStatus` persiste o novo estado.
  - Regras:
    - Todos os setores marcados → `pronto = true`, `status = Concluido`.
    - Desmarcar financeiro zera demais setores e `pronto`.

- **Integração com realtime e impressão**:
  - Usa `useOrderAutoSync` (WebSocket) para manter `orderStore` atualizado.
  - Seleção de múltiplos pedidos para impressão:
    - `generatePrintList` gera HTML com layout de “lista de produção”.
    - `printSelectedOrders` abre iframe e chama `print()`.

### 5.3. Visualização de ficha e modal de imagem (OrderViewModal – “ImagemModal”)

`OrderViewModal` centraliza:

- **Cabeçalho**:
  - Título com número/ID do pedido.
  - Botões:
    - “Imprimir” (`printOrder`).
    - “Ficha de Serviço” (`printOrderServiceForm`).
    - “Fechar”.

- **Dados principais**:
  - Cliente, telefone, cidade, status.
  - Datas de entrada/entrega.
  - Forma de envio e forma de pagamento (resolve nome via `api.getFormasPagamentoAtivas`).
  - Totais:
    - Soma dos subtotais de itens.
    - Frete.
    - Total consolidado.

- **Itens**:
  - Cada item é exibido em um card colapsável.
  - Mostra:
    - Resumo (tipo, descrição, dimensões, quantidade, equipe, material).
    - “Especificações Técnicas” derivadas de campos como:
      - Acabamentos (tipo_acabamento, overloque, elástico).
      - Ilhós (quantidade, espaçamento, valor).
      - Cordinhas (quantidade, espaçamento, valor).
      - Emendas (tipo, quantidade).
      - Campos específicos de lona/totem/adesivo (ex.: terceirizado, acabamento_lona, tipo_adesivo).
    - Observações importantes.

- **Imagens**:
  - Usa `normalizeImagePath` / `isValidImagePath` para determinar se deve exibir `<img>` ou placeholder.
  - Modal interno de imagem em destaque:
    - `selectedImage` + `selectedImageCaption`.
    - Se falhar (`onError`), mostra painel com “Imagem não encontrada” e orientação.

### 5.4. Layout (Header, Sidebar) e componentes de suporte

- `Dashboard`:
  - Sidebar colapsável com ícones e labels.
  - Seções de menu separadas para itens admin.
  - Exibe usuário atual e botão de logout (`api.logout` + `authStore.logout`).

- `ThemeProvider` / `ThemeToggle`:
  - Controlam tema global, persistido em `localStorage` com chave `vite-ui-theme`.

- `SmoothTableWrapper`, `AutoRefreshStatus`:
  - Melhoram UX em tabelas e indicam o estado da sincronização/realtime.

---

## 6) Hooks e estados globais

### 6.1. Hooks principais

- **`useNotifications`**
  - Polling de notificações:
    - Endpoint `/api/notificacoes/ultimos`.
    - Se encontra `ultimo_id` maior:
      - Atualiza estado local.
      - Emite `emit("novo_pedido", { id, timestamp })`.

- **`useRealtimeNotifications`**
  - Integração WebSocket:
    - Assina `ordersSocket`.
    - Converte mensagens em `OrderNotification`.
    - Ignora eventos do próprio usuário (`user_id`).
    - Exibe toasts para criação, atualização, exclusão e mudança de status.
    - Remove pedidos excluídos do `orderStore`.
    - Dispara `window.dispatchEvent(new CustomEvent('orders-refresh-requested', ...))` para provocar refresh em componentes interessados.

- **`useOrderEvents` / `useOrderAutoSync`**
  - `useOrderEvents`:
    - Responde a `order_created`, `order_updated`, `order_deleted`, `order_status_updated`.
  - `useOrderAutoSync`:
    - Para cada evento:
      - Busca o pedido atualizado (`api.getOrderById`) e ajusta `orderStore`.

- **`useAutoRefresh`**
  - Gerencia refresh automático:
    - Garante não haver refresh concorrentes.
    - Mantém `isRefreshing` e `refreshCount`.
    - Expõe `pauseAutoRefresh`, `resumeAutoRefresh`, `forceRefresh`.

### 6.2. Estados globais (Zustand)

Já descritos em 2.1/3.2, mas resumidamente:

- `authStore`:
  - Autenticação, roles e TTL.
- `orderStore`:
  - Lista de pedidos e pedido selecionado.

---

## 7) Comunicação com API

### 7.1. Como o cliente se conecta à API Python

1. Usuário abre o app.
2. `App.tsx` chama `loadConfig()`:
   - Se não houver config, mostra `ConfigApi`.
3. Em `ConfigApi`, usuário:
   - Digita URL da API (ex.: `http://192.168.0.10:8000`).
   - Clica em “Testar Conexão”:
     - `verifyApiConnection` testa `/health` e `/pedidos`.
   - Em caso de sucesso:
     - `normalizeApiUrl` normaliza a URL.
     - `saveConfig` escreve o arquivo de configuração via Tauri FS.
     - Chama `onConfigured(url)` para avisar `App.tsx`.
4. `App.tsx` recebe URL válida:
   - Chama `setApiUrl(url)` (TS).
   - Ativa rotas (`HashRouter`) com `Dashboard`/`Login`.

### 7.2. Organização das chamadas HTTP

- Camada bruta:
  - `apiClient` (axios) com:
    - `defaults.baseURL` configurada por `setApiUrl`.
    - Interceptores:
      - Request: injeta `Authorization` se houver token.
      - Response: notifica listeners de `onApiFailure` quando não há `response`.
  - `tauriAxiosAdapter`:
    - Em Tauri, substitui o adapter default por um baseado em `@tauri-apps/api/http.fetch`.

- Camada de domínio (`services/api.ts`):
  - Pedidos (`getOrders`, `createOrder`, `updateOrder`, `updateOrderStatus`, etc.).
  - Cadastros (clientes, designers, vendedores, materiais, formas de envio/pagamento, usuários).
  - Relatórios (`generateReport`, `getOrdersByDeliveryDateRange`).

### 7.3. Polling de notificações

- Implementado em `useNotifications`:
  - Lê `getApiUrl`; se vazio, não inicia.
  - Em intervalo fixo, chama `/api/notificacoes/ultimos`.
  - Emite evento Tauri `novo_pedido` em caso de novos IDs.

---

## 8) Notificações

### 8.1. Polling HTTP (tipo long-polling)

- `useNotifications`:
  - `POLLING_INTERVAL = 5000 ms`.
  - `apiClient.get("/api/notificacoes/ultimos")`.
  - Ao detectar novos dados:
    - `emit("novo_pedido", payload)` via `@tauri-apps/api/event`.

- `App.tsx`:
  - `listen("novo_pedido", handler)`:
    - Exibe toast “Novo pedido criado!”.

### 8.2. WebSocket (realtime avançado)

- `OrdersWebSocketManager`:
  - Conecta a `/ws/orders` (com token na query e na mensagem `authenticate`).
  - Mantém status de conexão para componentes visuais (`ConnectionStatus`, `NotificationDebugPanel`).

- Hooks:
  - `useOrderEvents` / `useOrderAutoSync`:
    - Ajustam `orderStore` em tempo real.
  - `useRealtimeNotifications`:
    - Exibe toasts amigáveis.

---

## 9) Exportação e funcionalidades Tauri

### 9.1. Relatórios de fechamento (`Fechamentos`)

- Geração:
  - `Fechamentos` monta `ReportRequestPayload` e chama `api.generateReport`.
  - `generateFechamentoReport`:
    - Filtra pedidos por status/data.
    - Quebra em linhas normalizadas.
    - Agrupa conforme o tipo de relatório (designer×cliente, cliente×designer, etc.).

- Exportação para PDF:
  - `exportToPdf`:
    - Usa `jsPDF` + `autoTable` para desenhar cabeçalhos, tabelas e totais.
  - Em Tauri:
    - Usa `@tauri-apps/api/dialog.save` para escolher o arquivo.
    - `@tauri-apps/api/fs.writeBinaryFile` para salvar.
    - `@tauri-apps/api/shell.open` para abrir.
  - Em navegador:
    - Usa `doc.save(filename)` para download.

> O cliente React **não chama** hoje `invoke('export_report')`; toda exportação é feita no frontend.

### 9.2. Relatórios de envios (`RelatoriosEnvios`)

- Geração:
  - `api.getOrdersByDeliveryDateRange(dataInicio, dataFim?)`.
  - Agrupa os pedidos por forma de envio.
  - Ordena clientes e adiciona informações de cidade/UF, tipos de produção e observações.

- Exportação:
  - `printEnvioReport`:
    - Monta HTML imprimível.
    - Abre nova janela/iframe e chama `print()`.

### 9.3. Demais funcionalidades Tauri relevantes

- `ConfigApi` + `utils/config`:
  - Usam Tauri FS para gravar/leitura da configuração da API.
- `DatabaseConnection`:
  - Usa comandos Tauri (`invoke`) para testar/conferir configuração de banco.

---

## 10) Imagens e arquivos

### 10.1. Contrato de imagem

Campos relevantes em `OrderItem`:

- `imagem?: string | null` – caminho local, URL HTTP/HTTPS ou base64.
- `legenda_imagem?: string | null` – legenda da imagem.

Esses campos são:

- Preenchidos nos forms de item (`Form*Producao`).
- Exibidos em `OrderViewModal` (preview e modal de destaque).
- Impressos em fichas (`printOrderServiceForm`, `FichaDeServico`), quando necessário.

### 10.2. Normalização de path Linux → Windows

`utils/path.ts`:

- `normalizeImagePath(path)`:
  - Mantém base64 e URLs HTTP/HTTPS intactos.
  - Em caminhos de arquivo:
    - Substitui `\` por `/`.
    - Faz `trim()` para remover espaços nas pontas.
- `isValidImagePath(path)`:
  - Retorna `true` para:
    - Strings não vazias.
    - `data:image/...`.
    - URLs HTTP/HTTPS.

Na prática:

- Permite armazenar paths criados em Windows (com `\`) e exibi-los corretamente quando a aplicação roda em Linux.

### 10.3. Modal de imagem e placeholder

Em `OrderViewModal`:

- Preview:
  - Se `isValidImagePath(imagem)`:
    - `<img src={normalizeImagePath(imagem)} ... />`.
    - `onError`:
      - Esconde a imagem.
      - Mostra bloco com texto “Imagem não disponível”.

- Modal de destaque:
  - Controlado por `selectedImage`/`selectedImageCaption` e `imageError`.
  - Se `imageError` é `true`:
    - Exibe mensagem “Imagem não encontrada — O arquivo pode ter sido movido ou excluído”.

Isso implementa exatamente:

- Normalização de path Linux → Windows.
- Fallback visual quando o arquivo não existe.

---

## 11) Fluxos de uso do sistema

### 11.1. Criar novo pedido

1. Usuário:
   - Clica em “Novo Pedido” no Dashboard, ou
   - Seleciona “Novo Pedido” na sidebar (`/dashboard/orders/new`).
2. `CreateOrderComplete` é aberto:
   - Usuário preenche dados do cliente, datas, prioridade.
   - Adiciona um ou mais itens com os forms específicos.
   - Define forma de envio, forma de pagamento e frete.
3. Ao salvar:
   - Form é validado (campos obrigatórios, datas, valores, itens).
   - É enviada `CreateOrderRequest` via `api.createOrder`.
   - `orderStore.addOrder` é chamado e o usuário é levado para `/dashboard/orders`.

### 11.2. Editar pedido concluído (reabrir)

1. Pedido concluído aparece na `OrderList` como `Pronto`.
2. Usuário abre o fluxo de edição (via ação de editar).
3. Form carrega dados existentes (`api.getOrderById`).
4. Para reabrir:
   - Usuário desmarca setores (tipicamente desmarcando `financeiro`).
   - `buildStatusUpdatePayload` monta `UpdateOrderStatusRequest`.
   - `api.updateOrderStatus` persiste alteração e recalcula `pronto`/`status`.

### 11.3. Filtrar pedidos no fechamento (produção)

1. Usuário acessa `/dashboard/orders`.
2. Usa:
   - Campo de busca (cliente/ID/número).
   - Select de status (Pendentes, Prontos, Todos).
   - Inputs de data (inicial/final).
3. Abre filtros avançados:
   - Marca quais setores devem estar verdadeiros (financeiro, conferência, etc.).
   - Filtra por vendedor, designer, cidade.
4. `OrderList`:
   - Se filtros usam datas / pendentes / prontos:
     - Usa paginação do backend.
   - Senão:
     - Filtra e pagina os dados em memória.

### 11.4. Visualizar imagem

1. Em `/dashboard/orders`, usuário clica em “Visualizar Pedido”.
2. `OrderViewModal` é aberto:
   - Lista itens do pedido.
3. No item com imagem:
   - Preview aparece no card.
   - Ao clicar em “Abrir imagem em destaque”, abre-se o modal secundário com imagem ampliada.
   - Em erro, há mensagem de placeholder indicando que a imagem não foi encontrada.

### 11.5. Exportar relatório (Fechamentos)

1. Acessar `/dashboard/fechamentos`.
2. Selecionar:
   - Tipo de relatório (analítico/sintético).
   - Intervalo de datas.
   - Status.
3. Clicar em “Gerar Relatório”:
   - Chama `api.generateReport`.
   - Renderiza grupos/subgrupos e linhas com subtotais.
4. Clicar em “Exportar PDF”:
   - `exportToPdf` gera PDF via `jsPDF`.
   - Em Tauri, salva/abre o arquivo; no navegador, baixa automaticamente.

### 11.6. Exportar relatório de envios

1. Acessar `/dashboard/relatorios-envios`.
2. Preencher data inicial (obrigatória) e opcionalmente data final.
3. Clicar em “Gerar Relatório”:
   - `api.getOrdersByDeliveryDateRange` retorna pedidos.
   - São agrupados por `forma_envio` e exibidos.
4. Clicar em “Exportar PDF”:
   - `printEnvioReport` gera HTML e chama `print()`.

### 11.7. Receber notificação de novo pedido

1. Backend atualiza `/api/notificacoes/ultimos`.
2. `useNotifications` detecta novo ID.
3. Emite `emit("novo_pedido", payload)` via Tauri.
4. `App.tsx`:
   - `listen("novo_pedido")` → mostra toast.
5. Opcionalmente, WebSocket (`ordersSocket`) também pode notificar criação/atualização de pedidos, mantendo `orderStore` sincronizado.

---

## 12) Boas práticas internas

### 12.1. Convenções de componentes

- UI genérica → `components/ui/*`.
- Componentes de domínio (fichas, listas, formulários) → `components/*`.
- Views/rotas → `pages/*`.
- Para novas funcionalidades:
  - Centralizar lógica de acesso à API em `services/api.ts`.
  - Reaproveitar tipos de `types/` e helpers de `utils/`.

### 12.2. Estados locais vs globais

- Usar stores apenas para:
  - Sessão (`authStore`).
  - Lista de pedidos e seleção (`orderStore`).
- Manter filtros, formulários, estado de modais em `useState`/`useReducer` locais.

### 12.3. Forms

- Sempre validar:
  - Campos obrigatórios.
  - Datas coerentes (início ≤ fim).
  - Valores monetários não negativos.
- Reutilizar parseadores e normalizadores existentes em `api.ts`/`utils` para evitar divergência de regras.
- Separar requests:
  - de itens (`UpdateOrderRequest`),
  - de metadados (`UpdateOrderMetadataRequest`),
  - de status (`UpdateOrderStatusRequest`).

### 12.4. Tabelas

- Usar `SmoothTableWrapper` quando quiser indicar atualização visual.
- Evitar recomputar listas inteiras sem `useMemo`.
- Sempre que possível:
  - Fixar colunas de seleção/ações como `sticky` para melhor UX.

### 12.5. Modais

- Centralizar fluxos:
  - Detalhes → `OrderDetails`.
  - Visualização/impressão → `OrderViewModal`.
  - Edição rápida → `OrderQuickEditDialog`.
- Evitar duplicação de modais com a mesma finalidade.

### 12.6. Toasts / notificações

- Usar `useToast` para:
  - Confirmar sucesso (criar/editar/excluir).
  - Exibir erros com mensagem amigável e logar detalhes no console.
- Em realtime:
  - Não exibir notificações para ações do próprio usuário (já tratado em `useRealtimeNotifications`).

---

## 13) Como rodar / como buildar

### 13.1. Rodar o cliente em desenvolvimento

Pré‑requisitos:

- Node.js + gerenciador de pacotes.
- Backend Python (FastAPI) rodando e acessível (ex.: `http://192.168.0.10:8000`).

Passos:

1. Instalar dependências na raiz:
   - `pnpm install` ou `npm install`.
2. Rodar o frontend (Vite):
   - `npm run dev`.
3. (Opcional) Rodar Tauri em modo dev:
   - `npm run tauri dev`.
4. Na primeira execução:
   - Tela `ConfigApi` aparecerá:
     - Informe a URL da API.
     - Clique em “Testar Conexão”.
     - Se OK, clique em “Salvar e Conectar”.
   - Depois, faça login em `/login`.

### 13.2. Build

- Build frontend:
  - `npm run build` → gera `dist/`.
- Build Tauri:
  - `npm run tauri build`:
    - Roda `npm run build` antes.
    - Usa `dist/` como conteúdo da janela Tauri.

### 13.3. Configurar API em produção

- Via UI (`ConfigApi`):
  - Informar URL, testar, salvar.
  - Config fica persistida em arquivo via Tauri FS.
- Para resetar:
  - Botão “Resetar” em `ConfigApi` (`deleteConfig`).

### 13.4. Teste rápido de fluxo

1. Subir API Python.
2. Configurar URL da API via `ConfigApi`.
3. Criar usuário/admin na API (documentação do backend).
4. Fazer login.
5. Criar pedido em `/dashboard/orders/new`.
6. Acompanhar pedido em `/dashboard/orders`, marcando setores até ficar `Pronto`.
7. Gerar relatório em `/dashboard/fechamentos` e exportar PDF.
8. Gerar relatório de envios em `/dashboard/relatorios-envios` e imprimir.

---

## 14) Apêndice técnico (essencial)

### 14.1. Principais tipos (resumo)

- `OrderWithItems` (`types/index.ts`):
  - Dados de pedido:
    - `id`, `numero`, `cliente`/`customer_name`, contatos, cidade/UF.
    - `data_entrada`, `data_entrega`, `created_at`, `updated_at`.
    - `status`, `prioridade`, `forma_envio`, `forma_pagamento_id`.
    - `valor_frete`, `total_value`/`valor_total`.
  - Produção:
    - `financeiro`, `conferencia`, `sublimacao`, `costura`, `expedicao`, `pronto`.
    - `sublimacao_maquina`, `sublimacao_data_impressao`.
  - Itens: `items: OrderItem[]`.

- `OrderItem`:
  - `id`, `order_id`, `item_name`, `quantity`, `unit_price`, `subtotal`.
  - Campos de ficha:
    - `tipo_producao`, `descricao`, `largura`, `altura`, `metro_quadrado`, `tecido`, `tipo_adesivo`.
    - Acabamentos, ilhós, cordinhas, emendas, flags booleanas.
    - Quantidades e valores específicos de lona/totem/adesivo.
    - `imagem`, `legenda_imagem`, `observacao`.

- `OrderFicha`:
  - Strip simplificado de `OrderWithItems` para ficha de serviço.

- `ReportGroup` / `ReportResponse`:
  - `ReportGroup`:
    - `key`, `label`.
    - `rows?` (ficha, descrição, valor_frete, valor_servico).
    - `subgroups?` (outros `ReportGroup`s).
    - `subtotal` (valores agregados).
  - `ReportResponse`:
    - `title`, `period_label`, `status_label`, `page`, `generated_at`, `report_type`.
    - `groups`, `total`.

### 14.2. Dependências importantes

- Frontend:
  - React, React Router, Zustand.
  - Lucide-react (ícones).
  - shadcn/ui (componentes de UI).
- Relatórios/Exportação:
  - `jspdf`, `jspdf-autotable`.
  - `papaparse`.
- Tauri:
  - `@tauri-apps/api/http`, `fs`, `dialog`, `shell`, `path`, `event`, `tauri`.

### 14.3. Observações finais

- Toda comunicação com a API Python deve passar por `services/api.ts` + `apiClient`.
- O backend Rust (Tauri) atua como integrador local:
  - Eventos, FS, comandos utilitários.
- Para manter a camada visual saudável:
  - Reutilizar tipos e helpers existentes ao invés de duplicar lógica.
  - Centralizar integrações Tauri em utilitários específicos, evitando espalhar `invoke` pela UI.


