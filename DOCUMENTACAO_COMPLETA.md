# 📚 Documentação Completa do Sistema SGP v4

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Fluxos Principais](#fluxos-principais)
6. [Módulos e Funcionalidades](#módulos-e-funcionalidades)
7. [Banco de Dados](#banco-de-dados)
8. [Autenticação e Segurança](#autenticação-e-segurança)
9. [API e Comunicação](#api-e-comunicação)
10. [Interface do Usuário](#interface-do-usuário)
11. [Sistema de Pedidos](#sistema-de-pedidos)
12. [Sistema de Fichas](#sistema-de-fichas)
13. [Sistema de Produção](#sistema-de-produção)
14. [Relatórios e Analytics](#relatórios-e-analytics)
15. [Configuração e Deploy](#configuração-e-deploy)
16. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### O que é o SGP v4?

O **Sistema de Gerenciamento de Pedidos (SGP) v4** é uma aplicação desktop desenvolvida para gerenciar o ciclo completo de pedidos de produção, desde a criação até a entrega. O sistema é especialmente focado em produção de materiais gráficos como painéis, totens, lonas, adesivos, almofadas e bolsinhas.

### Características Principais

- ✅ **Aplicação Desktop** (Tauri + React)
- ✅ **Interface Moderna** (React + TypeScript + Tailwind CSS)
- ✅ **Sincronização em Tempo Real** (WebSocket)
- ✅ **Gerenciamento Completo de Pedidos**
- ✅ **Sistema de Produção com Etapas**
- ✅ **Fichas de Serviço Impressas**
- ✅ **Relatórios e Analytics**
- ✅ **Gestão de Clientes, Vendedores e Designers**
- ✅ **Autenticação e Controle de Acesso**

### Público-Alvo

- **Usuários Administradores:** Gestão completa do sistema
- **Usuários Operacionais:** Criação e acompanhamento de pedidos
- **Equipe de Produção:** Atualização de status de produção
- **Vendedores:** Criação de pedidos e acompanhamento

---

## 🏗️ Arquitetura do Sistema

### Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    APLICAÇÃO DESKTOP                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Frontend (React + TypeScript)            │   │
│  │  - Interface do Usuário                          │   │
│  │  - Componentes React                             │   │
│  │  - Estado Global (Zustand)                       │   │
│  │  - Hooks Customizados                            │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↕                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Backend Rust (Tauri)                      │   │
│  │  - Gerenciamento de Janelas                       │   │
│  │  - DevTools                                       │   │
│  │  - Sistema de Arquivos                            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              API Backend (Servidor Externo)              │
│  - REST API (HTTP/HTTPS)                                │
│  - WebSocket (ws/wss)                                   │
│  - Autenticação (Bearer Token)                          │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              Banco de Dados (PostgreSQL)                 │
│  - Pedidos e Itens                                      │
│  - Clientes                                             │
│  - Usuários e Autenticação                              │
│  - Configurações                                        │
└─────────────────────────────────────────────────────────┘
```

### Camadas da Aplicação

#### 1. **Camada de Apresentação (UI)**
- **Componentes React:** Interface do usuário
- **Páginas:** Telas principais do sistema
- **Componentes UI:** Biblioteca shadcn/ui
- **Estilização:** Tailwind CSS

#### 2. **Camada de Estado (State Management)**
- **Zustand Stores:**
  - `authStore`: Autenticação e sessão
  - `orderStore`: Pedidos em memória
- **Estado Local:** useState, useReducer

#### 3. **Camada de Serviços (Services)**
- **api.ts:** Serviço principal de API
- **apiClient.ts:** Cliente HTTP configurado
- **analyticsService.ts:** Serviço de analytics
- **realtimeOrders.ts:** Gerenciador WebSocket

#### 4. **Camada de Dados (Data Layer)**
- **Types:** Definições TypeScript
- **Stores:** Gerenciamento de estado
- **Hooks:** Lógica reutilizável

#### 5. **Camada de Utilitários (Utils)**
- **date.ts:** Manipulação de datas
- **config.ts:** Configurações
- **printOrder.ts:** Impressão de pedidos
- **exportUtils.ts:** Exportação de dados

---

## 🛠️ Tecnologias Utilizadas

### Frontend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **React** | 18.2.0 | Framework UI |
| **TypeScript** | 5.3.3 | Linguagem |
| **Vite** | 5.1.0 | Build tool |
| **Tailwind CSS** | 3.4.1 | Estilização |
| **Zustand** | 4.5.0 | State management |
| **React Router** | 6.22.0 | Roteamento |
| **Axios** | 1.6.8 | Cliente HTTP |
| **shadcn/ui** | - | Componentes UI |
| **Lucide React** | 0.323.0 | Ícones |

### Backend (Tauri)

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Rust** | 2021 | Linguagem |
| **Tauri** | 1.5.4 | Framework desktop |
| **SQLx** | - | Database driver |
| **Serde** | 1.0 | Serialização |

### Banco de Dados

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **PostgreSQL** | 15+ | Banco de dados |
| **Docker** | - | Containerização |

### Ferramentas de Desenvolvimento

| Tecnologia | Uso |
|------------|-----|
| **Vitest** | Testes |
| **ESLint** | Linting |
| **Prettier** | Formatação |
| **Docker Compose** | Ambiente de desenvolvimento |

---

## 📁 Estrutura do Projeto

```
sgp_v4/
├── src/                          # Código fonte principal
│   ├── App.tsx                   # Componente raiz
│   ├── main.tsx                 # Entry point React
│   │
│   ├── components/               # Componentes React
│   │   ├── ui/                   # Componentes UI base (shadcn)
│   │   ├── analytics/            # Componentes de analytics
│   │   ├── OrderList.tsx         # Lista de pedidos
│   │   ├── OrderForm.tsx         # Formulário de pedido
│   │   ├── OrderViewModal.tsx    # Modal de visualização
│   │   ├── FichaDeServico.tsx    # Componente de ficha
│   │   └── ...
│   │
│   ├── pages/                    # Páginas principais
│   │   ├── Login.tsx             # Tela de login
│   │   ├── Dashboard.tsx         # Dashboard principal
│   │   ├── DashboardOverview.tsx # Visão geral
│   │   ├── Clientes.tsx          # Gestão de clientes
│   │   ├── Admin.tsx             # Painel administrativo
│   │   └── admin/                # Páginas admin
│   │
│   ├── services/                 # Serviços e APIs
│   │   ├── api.ts                # API principal
│   │   ├── apiClient.ts          # Cliente HTTP
│   │   ├── analyticsService.ts   # Analytics
│   │   └── tauriAxiosAdapter.ts  # Adapter Tauri
│   │
│   ├── store/                    # Estado global
│   │   ├── authStore.ts          # Estado de autenticação
│   │   └── orderStore.ts         # Estado de pedidos
│   │
│   ├── hooks/                    # Hooks customizados
│   │   ├── useOrderEvents.ts     # Eventos de pedidos
│   │   ├── useRealtimeNotifications.ts # Notificações
│   │   └── ...
│   │
│   ├── lib/                      # Bibliotecas
│   │   ├── realtimeOrders.ts     # WebSocket manager
│   │   └── utils.ts              # Utilitários gerais
│   │
│   ├── types/                    # Definições TypeScript
│   │   └── index.ts              # Tipos principais
│   │
│   └── utils/                    # Utilitários
│       ├── date.ts               # Manipulação de datas
│       ├── config.ts             # Configurações
│       ├── printOrder.ts         # Impressão
│       └── ...
│
├── src-tauri/                    # Backend Rust (Tauri)
│   ├── src/
│   │   ├── main.rs               # Entry point
│   │   ├── commands/             # Comandos Tauri
│   │   └── models.rs             # Modelos de dados
│   └── Cargo.toml                # Dependências Rust
│
├── database/                     # Scripts SQL
│   ├── init.sql                  # Inicialização
│   ├── migrate_full_system.sql   # Migração completa
│   └── ...
│
├── documentation/                # Documentação
│   └── ...
│
├── public/                       # Arquivos estáticos
├── dist/                         # Build de produção
├── package.json                  # Dependências Node
├── vite.config.ts                # Configuração Vite
├── tailwind.config.js            # Configuração Tailwind
└── docker-compose.yml            # Docker Compose
```

---

## 🔄 Fluxos Principais

### 1. Fluxo de Inicialização

```
1. Aplicação inicia
   ↓
2. Verifica configuração da API (config.json)
   ↓
3. Se não configurada:
   → Mostra tela de configuração
   → Usuário configura URL da API
   ↓
4. Se configurada:
   → Verifica conexão com API
   → Se falhar: mostra tela de configuração
   → Se sucesso: continua
   ↓
5. Verifica autenticação (localStorage)
   ↓
6. Se autenticado:
   → Carrega dados do usuário
   → Redireciona para Dashboard
   ↓
7. Se não autenticado:
   → Redireciona para Login
```

### 2. Fluxo de Autenticação

```
1. Usuário acessa Login
   ↓
2. Preenche username e senha
   ↓
3. Submete formulário
   ↓
4. API valida credenciais
   ↓
5. Se válido:
   → API retorna session_token
   → Salva token no authStore
   → Salva em localStorage (persist)
   → Redireciona para Dashboard
   ↓
6. Se inválido:
   → Mostra erro
   → Permite nova tentativa
```

### 3. Fluxo de Criação de Pedido

```
1. Usuário clica "Novo Pedido"
   ↓
2. Abre formulário completo (CreateOrderComplete)
   ↓
3. Preenche dados do cliente
   ↓
4. Adiciona itens de produção
   ↓
5. Para cada item:
   → Seleciona tipo de produção
   → Preenche formulário específico
   → Adiciona imagens (opcional)
   ↓
6. Define datas e prioridade
   ↓
7. Submete pedido
   ↓
8. API cria pedido no banco
   ↓
9. Sistema atualiza lista de pedidos
   ↓
10. WebSocket notifica outros clientes
```

### 4. Fluxo de Atualização de Status de Produção

```
1. Usuário visualiza lista de pedidos
   ↓
2. Clica em checkbox de status (ex: Financeiro)
   ↓
3. Sistema verifica dependências:
   → Financeiro deve estar marcado antes de outros
   ↓
4. Se Sublimação:
   → Abre modal para máquina e data
   → Usuário preenche informações
   ↓
5. Confirma alteração
   ↓
6. API atualiza status no banco
   ↓
7. Sistema verifica se todos completos:
   → Se sim: marca como "Pronto"
   → Se não: mantém "Em Andamento"
   ↓
8. Atualiza lista local
   ↓
9. WebSocket notifica outros clientes
```

### 5. Fluxo de Sincronização em Tempo Real

```
1. Aplicação conecta ao WebSocket
   ↓
2. Envia token de autenticação
   ↓
3. Servidor valida e aceita conexão
   ↓
4. Quando pedido é modificado:
   → Servidor envia evento WebSocket
   ↓
5. Cliente recebe evento
   ↓
6. Identifica tipo de evento:
   → order_created
   → order_updated
   → order_deleted
   → order_status_updated
   ↓
7. Atualiza store local
   ↓
8. Atualiza UI automaticamente
   ↓
9. Notifica usuário (opcional)
```

---

## 📦 Módulos e Funcionalidades

### 1. Módulo de Autenticação

#### Funcionalidades
- Login de usuários
- Gerenciamento de sessão
- Controle de acesso (Admin/Usuário)
- Expiração automática de sessão
- Logout

#### Componentes
- `Login.tsx`: Tela de login
- `ProtectedRoute.tsx`: Rota protegida
- `authStore.ts`: Estado de autenticação

#### Fluxo
```
Login → Validação → Token → Armazenamento → Acesso
```

### 2. Módulo de Pedidos

#### Funcionalidades
- **Criação:** Formulário completo com múltiplos itens
- **Edição:** Edição rápida e completa
- **Visualização:** Modal detalhado
- **Listagem:** Tabela com filtros avançados
- **Exclusão:** Com confirmação
- **Impressão:** Geração de PDF/HTML

#### Componentes Principais
- `OrderList.tsx`: Lista de pedidos
- `CreateOrderComplete.tsx`: Criação completa
- `OrderForm.tsx`: Formulário básico
- `OrderViewModal.tsx`: Visualização
- `OrderQuickEditDialog.tsx`: Edição rápida

#### Tipos de Produção Suportados
1. **Painel Completo**
2. **Totem**
3. **Lona**
4. **Adesivo**
5. **Almofada**
6. **Bolsinha**

### 3. Módulo de Status de Produção

#### Etapas de Produção
1. **Financeiro** (obrigatório primeiro)
2. **Conferência**
3. **Sublimação** (com máquina e data)
4. **Costura**
5. **Expedição**

#### Regras de Negócio
- Financeiro deve ser marcado primeiro
- Se Financeiro for desmarcado, todos os outros são resetados
- Quando todos estão marcados, pedido fica "Pronto"
- Sublimação requer máquina e data de impressão

#### Visualização
- Checkboxes na tabela de pedidos
- Indicadores visuais de progresso
- Status calculado automaticamente

### 4. Módulo de Clientes

#### Funcionalidades
- Listagem de clientes
- Criação de cliente
- Edição de cliente
- Busca e filtros
- Importação em lote (CSV)
- Autocomplete em formulários

#### Componentes
- `Clientes.tsx`: Página principal
- `ClienteAutocomplete.tsx`: Autocomplete

### 5. Módulo de Fichas de Serviço

#### Funcionalidades
- Geração de ficha por item
- Impressão de fichas
- Visualização antes de imprimir
- Formato padronizado

#### Componentes
- `FichaDeServico.tsx`: Componente principal
- `FichaDeServicoButton.tsx`: Botão de acesso
- `printOrderServiceForm.ts`: Utilitário de impressão

#### Estrutura da Ficha
- Cabeçalho: Título, datas, cliente
- Corpo: Informações do item, dimensões, valores
- Rodapé: Observações, assinatura

### 6. Módulo Administrativo

#### Funcionalidades
- **Gestão de Usuários:** CRUD completo
- **Gestão de Vendedores:** CRUD com comissão
- **Gestão de Designers:** CRUD
- **Gestão de Materiais:** Por tipo de produção
- **Gestão de Formas de Envio:** CRUD
- **Gestão de Formas de Pagamento:** CRUD

#### Páginas Admin
- `Admin.tsx`: Menu administrativo
- `GestaoUsuarios.tsx`: Usuários
- `GestaoVendedores.tsx`: Vendedores
- `GestaoDesigners.tsx`: Designers
- `GestaoMateriais.tsx`: Materiais
- `GestaoFormasEnvio.tsx`: Formas de envio
- `GestaoFormasPagamento.tsx`: Formas de pagamento

### 7. Módulo de Relatórios

#### Funcionalidades
- **Relatório de Envios:** Pedidos por forma de envio
- **Fechamentos:** Relatórios financeiros
- **Painel de Desempenho:** Analytics e métricas
- **Exportação:** CSV, PDF

#### Páginas
- `RelatoriosEnvios.tsx`: Relatório de envios
- `Fechamentos.tsx`: Fechamentos financeiros
- `PainelDesempenho.tsx`: Analytics

### 8. Módulo de Analytics

#### Métricas Disponíveis
- Total de pedidos
- Pedidos pendentes
- Pedidos concluídos
- Pedidos atrasados
- Tempo médio de produção
- Taxa de eficiência
- Eficiência por etapa

#### Componentes
- `DashboardOverview.tsx`: Visão geral
- `SummaryCard.tsx`: Cards de resumo
- `TrendChartCard.tsx`: Gráficos de tendência
- `LeaderboardCard.tsx`: Rankings

---

## 🗄️ Banco de Dados

### Estrutura Principal

#### Tabela: `users`
Armazena usuários do sistema.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: `orders`
Armazena pedidos.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(20) UNIQUE NOT NULL,
    cliente VARCHAR(255) NOT NULL,
    telefone_cliente VARCHAR(50),
    cidade_cliente VARCHAR(100),
    estado_cliente VARCHAR(2),
    data_entrada DATE,
    data_entrega DATE,
    total_value DECIMAL(10, 2) NOT NULL,
    valor_frete DECIMAL(10, 2) DEFAULT 0,
    status order_status DEFAULT 'Pendente',
    prioridade VARCHAR(20) DEFAULT 'NORMAL',
    forma_envio VARCHAR(100),
    forma_pagamento_id INTEGER,
    observacao TEXT,
    
    -- Status de produção
    financeiro BOOLEAN DEFAULT FALSE,
    conferencia BOOLEAN DEFAULT FALSE,
    sublimacao BOOLEAN DEFAULT FALSE,
    costura BOOLEAN DEFAULT FALSE,
    expedicao BOOLEAN DEFAULT FALSE,
    pronto BOOLEAN DEFAULT FALSE,
    
    -- Sublimação específica
    sublimacao_maquina VARCHAR(255),
    sublimacao_data_impressao DATE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: `order_items`
Armazena itens dos pedidos.

```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    
    -- Campos de produção
    tipo_producao VARCHAR(50) NOT NULL,
    descricao TEXT,
    largura VARCHAR(20),
    altura VARCHAR(20),
    metro_quadrado VARCHAR(20),
    vendedor VARCHAR(100),
    designer VARCHAR(100),
    tecido VARCHAR(100),
    
    -- Acabamentos
    overloque BOOLEAN DEFAULT FALSE,
    elastico BOOLEAN DEFAULT FALSE,
    tipo_acabamento VARCHAR(100),
    
    -- Ilhós
    quantidade_ilhos VARCHAR(20),
    espaco_ilhos VARCHAR(20),
    valor_ilhos DECIMAL(10, 2),
    
    -- Cordinha
    quantidade_cordinha VARCHAR(20),
    espaco_cordinha VARCHAR(20),
    valor_cordinha DECIMAL(10, 2),
    
    -- Emenda
    emenda VARCHAR(20),
    emenda_qtd VARCHAR(20),
    
    -- Campos específicos por tipo
    -- (muitos outros campos...)
    
    observacao TEXT,
    imagem TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabelas de Configuração

- **`clientes`:** Clientes cadastrados
- **`vendedores`:** Vendedores com comissão
- **`designers`:** Designers
- **`materiais`:** Materiais por tipo de produção
- **`tecidos`:** Tecidos disponíveis
- **`envios`:** Formas de envio
- **`pagamentos`:** Formas de pagamento

#### Tabela: `order_audit_log`
Histórico de alterações.

```sql
CREATE TABLE order_audit_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    changed_by INTEGER,
    changed_by_name VARCHAR(255),
    changes JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Relacionamentos

```
orders (1) ──→ (N) order_items
orders (N) ──→ (1) clientes (opcional)
orders (N) ──→ (1) envios (opcional)
orders (N) ──→ (1) pagamentos (opcional)
orders (1) ──→ (N) order_audit_log
```

### Índices

- `idx_orders_status`: Status do pedido
- `idx_orders_data_entrada`: Data de entrada
- `idx_orders_data_entrega`: Data de entrega
- `idx_orders_cliente`: Nome do cliente
- `idx_order_items_order_id`: Relacionamento
- `idx_order_items_tipo_producao`: Tipo de produção

---

## 🔐 Autenticação e Segurança

### Sistema de Autenticação

#### Fluxo de Autenticação

1. **Login:**
   - Usuário envia `username` e `password`
   - Backend valida com bcrypt
   - Gera `session_token`
   - Retorna token + informações do usuário

2. **Armazenamento:**
   - Token salvo no `authStore` (Zustand)
   - Persistido em `localStorage`
   - TTL padrão: 8 horas

3. **Uso do Token:**
   - Incluído em todas as requisições HTTP
   - Header: `Authorization: Bearer <token>`
   - WebSocket: Enviado como query param ou mensagem

4. **Validação:**
   - Backend valida token em cada requisição
   - Se inválido: retorna 401
   - Frontend redireciona para login

### Controle de Acesso

#### Níveis de Acesso

1. **Usuário Comum:**
   - Criar/editar pedidos
   - Visualizar pedidos
   - Gerenciar clientes
   - Ver relatórios básicos

2. **Administrador:**
   - Todas as permissões de usuário
   - Gestão de usuários
   - Gestão de configurações
   - Acesso a fechamentos
   - Painel de desempenho

#### Implementação

- `isAdmin` flag no `authStore`
- `ProtectedRoute` verifica permissões
- Componentes condicionais baseados em `isAdmin`

### Segurança

- ✅ Senhas hasheadas (bcrypt)
- ✅ Tokens de sessão
- ✅ Validação de entrada
- ✅ Sanitização de dados
- ✅ CORS configurado
- ✅ Timeout de sessão

---

## 🌐 API e Comunicação

### Estrutura da API

#### Base URL
Configurável via `config.json` ou interface de configuração.

#### Autenticação
Todas as requisições (exceto login) requerem:
```
Authorization: Bearer <session_token>
```

### Endpoints Principais

#### Autenticação
- `POST /login` - Login de usuário
- `POST /logout` - Logout (opcional)

#### Pedidos
- `GET /pedidos` - Listar pedidos
- `GET /pedidos/:id` - Obter pedido específico
- `POST /pedidos` - Criar pedido
- `PATCH /pedidos/:id` - Atualizar pedido
- `DELETE /pedidos/:id` - Excluir pedido
- `GET /pedidos/pendentes` - Pedidos pendentes (paginado)
- `GET /pedidos/prontos` - Pedidos prontos (paginado)
- `PATCH /pedidos/:id/status` - Atualizar status de produção
- `GET /pedidos/:id/ficha` - Obter ficha de serviço

#### Clientes
- `GET /clientes` - Listar clientes
- `GET /clientes/:id` - Obter cliente
- `POST /clientes` - Criar cliente
- `PATCH /clientes/:id` - Atualizar cliente
- `DELETE /clientes/:id` - Excluir cliente
- `POST /clientes/import` - Importar em lote

#### Configurações
- `GET /vendedores/ativos` - Vendedores ativos
- `GET /designers/ativos` - Designers ativos
- `GET /materiais/ativos` - Materiais ativos
- `GET /envios/ativos` - Formas de envio ativas
- `GET /pagamentos/ativos` - Formas de pagamento ativas

### WebSocket

#### Conexão
```
ws://<api_url>/ws/orders?token=<session_token>
```

#### Eventos Enviados
- `authenticate`: Autenticação inicial
- `ping`: Keep-alive (a cada 30s)

#### Eventos Recebidos
- `order_created`: Novo pedido criado
- `order_updated`: Pedido atualizado
- `order_deleted`: Pedido excluído
- `order_status_updated`: Status de produção atualizado

#### Formato de Mensagem
```json
{
  "type": "order_updated",
  "order_id": 123,
  "order": { ... }
}
```

### Cliente HTTP

#### Configuração
- **Base URL:** Configurável
- **Timeout:** 20 segundos
- **Adapter:** Tauri (para desktop) ou Axios padrão
- **Interceptors:** Adiciona token automaticamente

#### Tratamento de Erros
- Erros de rede: Notificação ao usuário
- Erros 401: Logout automático
- Erros 403: Acesso negado
- Outros: Mensagem de erro específica

---

## 🎨 Interface do Usuário

### Layout Principal

#### Estrutura
```
┌─────────────────────────────────────────┐
│              HEADER                     │
│  [Menu] [Título] [Usuário]              │
├──────────┬──────────────────────────────┤
│          │                              │
│ SIDEBAR  │        MAIN CONTENT          │
│          │                              │
│ - Início │  [Conteúdo da página]       │
│ - Pedidos│                              │
│ - Clientes│                             │
│ - Admin  │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

#### Sidebar
- **Desktop:** Fixa à esquerda, expansível/recolhível
- **Mobile:** Overlay com animação
- **Itens:** Baseados em permissões do usuário
- **Indicadores:** Badge de notificação (futuro)

#### Header
- Título da página atual
- Informações do usuário
- Menu mobile (hamburger)

### Componentes UI

#### Biblioteca: shadcn/ui
Componentes baseados em Radix UI e Tailwind CSS.

**Componentes Disponíveis:**
- Button, Input, Select, Checkbox
- Dialog, Popover, Tooltip
- Table, Card, Badge
- Toast, Separator, Tabs

#### Tema
- **Cores:** Sistema de design tokens
- **Modo:** Claro (escuro configurado mas não implementado)
- **Responsivo:** Mobile-first

### Páginas Principais

#### 1. Login
- Formulário simples
- Validação de campos
- Feedback de erros
- Design moderno

#### 2. Dashboard
- Visão geral do sistema
- Cards de estatísticas
- Pedidos urgentes
- Pedidos recentes
- Ações rápidas

#### 3. Lista de Pedidos
- Tabela completa
- Filtros avançados
- Ordenação
- Paginação
- Ações em lote
- Colunas fixas (sticky)

#### 4. Criação de Pedido
- Formulário multi-etapas
- Formulários específicos por tipo
- Upload de imagens
- Validação em tempo real
- Preview de dados

#### 5. Clientes
- Lista de clientes
- Formulário de criação/edição
- Busca e filtros
- Importação CSV

#### 6. Admin
- Menu de gestão
- CRUD de entidades
- Configurações do sistema

---

## 📋 Sistema de Pedidos

### Ciclo de Vida do Pedido

```
CRIADO → PENDENTE → EM PROCESSAMENTO → CONCLUÍDO
           ↓
        CANCELADO
```

### Status do Pedido

#### Status Principais
1. **Pendente:** Pedido criado, aguardando início
2. **Em Processamento:** Em produção
3. **Concluído:** Todos os setores completos
4. **Cancelado:** Pedido cancelado

#### Status de Produção (Checkboxes)
1. **Financeiro:** Aprovação financeira
2. **Conferência:** Conferência de materiais
3. **Sublimação:** Impressão (com máquina e data)
4. **Costura:** Costura/confecção
5. **Expedição:** Preparação para envio

### Regras de Negócio

#### Dependências de Status
- **Financeiro** é obrigatório primeiro
- Outros status só podem ser marcados se Financeiro estiver marcado
- Se Financeiro for desmarcado, todos os outros são resetados
- Quando todos estão marcados → `pronto = true`

#### Prioridade
- **NORMAL:** Prioridade padrão
- **ALTA:** Prioridade alta (destaque visual)

#### Datas
- **Data de Entrada:** Quando pedido foi criado
- **Data de Entrega:** Data prevista de entrega
- **Data de Impressão:** Data da sublimação (quando aplicável)

### Estrutura de Dados

#### OrderWithItems
```typescript
interface OrderWithItems {
  id: number;
  numero?: string;
  cliente: string;
  telefone_cliente?: string;
  cidade_cliente?: string;
  estado_cliente?: string;
  data_entrada?: string;
  data_entrega?: string;
  total_value: number;
  valor_frete?: number;
  status: OrderStatus;
  prioridade?: 'NORMAL' | 'ALTA';
  forma_envio?: string;
  forma_pagamento_id?: number;
  observacao?: string;
  
  // Status de produção
  financeiro?: boolean;
  conferencia?: boolean;
  sublimacao?: boolean;
  costura?: boolean;
  expedicao?: boolean;
  pronto?: boolean;
  
  // Sublimação específica
  sublimacao_maquina?: string;
  sublimacao_data_impressao?: string;
  
  items: OrderItem[];
}
```

#### OrderItem
```typescript
interface OrderItem {
  id: number;
  order_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  
  // Campos de produção
  tipo_producao?: string;
  descricao?: string;
  largura?: string;
  altura?: string;
  metro_quadrado?: string;
  vendedor?: string;
  designer?: string;
  tecido?: string;
  
  // ... muitos outros campos específicos
}
```

### Operações

#### Criar Pedido
1. Preencher dados do cliente
2. Adicionar itens (múltiplos)
3. Para cada item: preencher formulário específico
4. Definir datas e prioridade
5. Submeter

#### Editar Pedido
- **Edição Rápida:** Modal com campos principais
- **Edição Completa:** Formulário completo
- Validação antes de salvar

#### Atualizar Status
- Clique no checkbox
- Confirmação (modal)
- Para Sublimação: modal com máquina e data
- Atualização via API
- Sincronização automática

#### Excluir Pedido
- Confirmação obrigatória
- Exclusão em cascata (itens também)
- Log de auditoria

---

## 📄 Sistema de Fichas

### O que são Fichas?

Fichas de Serviço são documentos impressos que acompanham cada item de produção, contendo todas as informações necessárias para a execução do trabalho.

### Estrutura da Ficha

#### Cabeçalho
- Título: "EMISSÃO FICHA DE SERVIÇO"
- Datas: Entrada e Entrega
- Cliente: Nome, telefone, localização

#### Corpo
- Número da OS
- Descrição do item
- Tamanho/Dimensões
- Arte/Designer/Vendedor
- Informações de impressão (RIP/Máquina/Data)
- Tecido/Ilhós/Emendas/Acabamentos
- Revisão/Expedição
- Forma de Envio/Pagamento
- Valores (Painel, Outros, SubTotal, Frete, Total)

#### Rodapé
- Observações
- Assinatura

### Geração de Fichas

#### Processo
1. Usuário clica "Ficha de Serviço" no pedido
2. Sistema busca dados do pedido via API
3. Gera uma ficha por item do pedido
4. Renderiza em formato de impressão
5. Usuário pode imprimir

#### Formato
- **Tela:** HTML/CSS responsivo
- **Impressão:** Otimizado para A4
- **Estilo:** Monospace (Courier New)
- **Layout:** Duas fichas por página (impressão)

### Componentes Relacionados

- `FichaDeServico.tsx`: Componente principal
- `FichaDeServicoButton.tsx`: Botão de acesso
- `printOrderServiceForm.ts`: Utilitário de impressão

### Melhorias Planejadas

Ver documento: `PLANO_REDEFINICAO_FICHAS.md`

---

## 🏭 Sistema de Produção

### Etapas de Produção

#### 1. Financeiro
- **O que é:** Aprovação financeira do pedido
- **Quando:** Primeiro passo obrigatório
- **Quem:** Setor financeiro
- **Ação:** Marcar checkbox "Fin."

#### 2. Conferência
- **O que é:** Conferência de materiais e especificações
- **Quando:** Após Financeiro
- **Quem:** Setor de conferência
- **Ação:** Marcar checkbox "Conf."

#### 3. Sublimação
- **O que é:** Impressão do material
- **Quando:** Após Conferência
- **Quem:** Setor de impressão
- **Ação:** Marcar checkbox "Subl." + informar máquina e data
- **Dados Extras:** Máquina utilizada, data de impressão

#### 4. Costura
- **O que é:** Costura/confecção do produto
- **Quando:** Após Sublimação
- **Quem:** Setor de costura
- **Ação:** Marcar checkbox "Cost."

#### 5. Expedição
- **O que é:** Preparação para envio
- **Quando:** Após Costura
- **Quem:** Setor de expedição
- **Ação:** Marcar checkbox "Exp."

### Fluxo Visual

```
[Financeiro] → [Conferência] → [Sublimação] → [Costura] → [Expedição]
     ✅              ✅              ✅            ✅           ✅
                                                              ↓
                                                          [PRONTO]
```

### Regras de Negócio

1. **Ordem Obrigatória:**
   - Etapas devem ser marcadas na ordem
   - Não é possível pular etapas

2. **Financeiro como Base:**
   - Se Financeiro desmarcado → todos resetados
   - Financeiro é pré-requisito para todos

3. **Sublimação Especial:**
   - Requer máquina e data
   - Modal de confirmação com campos extras

4. **Status Final:**
   - Quando todos marcados → `pronto = true`
   - Status muda para "Concluído"

### Visualização na Interface

#### Tabela de Pedidos
- Colunas de checkbox para cada etapa
- Checkboxes desabilitados se Financeiro não marcado
- Indicadores visuais de progresso
- Badge de status final

#### Dashboard
- Cards com estatísticas por etapa
- Gráficos de eficiência
- Pedidos urgentes destacados

---

## 📊 Relatórios e Analytics

### Dashboard Overview

#### Métricas Principais
1. **Total de Pedidos:** Contagem geral
2. **Pendentes:** Em produção
3. **Concluídos:** Prontos
4. **Atrasados:** Fora do prazo
5. **Tempo Médio de Produção:** Em dias
6. **Atraso Médio:** Em dias
7. **Taxa de Eficiência:** % entregas no prazo

#### Visualizações
- Cards de estatísticas
- Gráficos de tendência
- Lista de pedidos urgentes
- Lista de pedidos recentes
- Eficiência por etapa

### Relatório de Envios

#### Funcionalidades
- Agrupamento por forma de envio
- Filtros por data
- Exportação
- Estatísticas por envio

### Fechamentos

#### Funcionalidades
- Relatórios financeiros
- Períodos configuráveis
- Agrupamentos diversos
- Exportação

### Painel de Desempenho

#### Métricas
- Performance por vendedor
- Performance por designer
- Performance por tipo de produção
- Tendências temporais
- Rankings

---

## ⚙️ Configuração e Deploy

### Configuração Inicial

#### 1. Configuração da API
- Arquivo: `config.json` (gerado automaticamente)
- Localização: Diretório de configuração do app
- Conteúdo:
```json
{
  "api_url": "http://192.168.15.3:8000"
}
```

#### 2. Banco de Dados
- PostgreSQL 15+
- Scripts em `database/`
- Docker Compose disponível

#### 3. Variáveis de Ambiente
- Nenhuma obrigatória
- Configuração via interface

### Desenvolvimento

#### Pré-requisitos
- Node.js 18+
- pnpm (ou npm)
- Rust (para Tauri)
- PostgreSQL (ou Docker)

#### Instalação
```bash
# Instalar dependências
pnpm install

# Iniciar banco (Docker)
docker-compose up -d

# Desenvolvimento
pnpm tauri:dev
```

#### Scripts Disponíveis
- `pnpm dev`: Desenvolvimento web
- `pnpm tauri:dev`: Desenvolvimento desktop
- `pnpm build`: Build web
- `pnpm tauri:build`: Build desktop
- `pnpm test`: Testes

### Produção

#### Build
```bash
pnpm tauri:build
```

#### Distribuição
- Windows: `.msi` ou `.exe`
- Linux: `.deb`, `.AppImage`, etc.
- macOS: `.dmg` ou `.app`

### Docker

#### Serviços
- **PostgreSQL:** Banco de dados
- **PgAdmin:** Interface web (opcional)

#### Comandos
```bash
docker-compose up -d          # Iniciar
docker-compose down           # Parar
docker-compose logs -f        # Logs
docker-compose down -v        # Reset completo
```

---

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão com API
**Sintoma:** "Verificando conexão com a API..."

**Soluções:**
- Verificar se API está rodando
- Verificar URL configurada
- Verificar firewall/rede
- Reconfigurar API na interface

#### 2. Erro de Autenticação
**Sintoma:** "Sessão expirada" ou "Não autorizado"

**Soluções:**
- Fazer logout e login novamente
- Verificar se token está válido
- Limpar localStorage
- Verificar permissões do usuário

#### 3. WebSocket não Conecta
**Sintoma:** Erros de WebSocket no console

**Soluções:**
- Verificar se servidor suporta WebSocket
- Verificar URL do WebSocket
- Verificar token de autenticação
- Sistema funciona sem WebSocket (apenas sem tempo real)

#### 4. Pedidos não Carregam
**Sintoma:** Lista vazia ou erro ao carregar

**Soluções:**
- Verificar conexão com API
- Verificar permissões
- Verificar filtros aplicados
- Recarregar página

#### 5. Fichas não Geram
**Sintoma:** Erro ao gerar ficha

**Soluções:**
- Verificar se pedido tem dados completos
- Verificar conexão com API
- Verificar permissões
- Tentar novamente

### Logs e Debug

#### Console do Navegador
- F12 para abrir DevTools
- Aba Console mostra logs
- Erros aparecem em vermelho

#### Logs do Tauri
- Logs no terminal onde app foi iniciado
- Nível configurável (DEBUG/INFO)

#### Logs da API
- Verificar logs do servidor backend
- Geralmente em arquivo ou stdout

### Suporte

#### Informações Úteis para Debug
- Versão do sistema
- Sistema operacional
- URL da API configurada
- Erros do console
- Logs do Tauri

---

## 📖 Guias de Uso

### Para Usuários

#### Como Criar um Pedido
1. Acesse "Novo Pedido" no menu
2. Preencha dados do cliente
3. Adicione itens clicando em "Adicionar Item"
4. Para cada item:
   - Selecione tipo de produção
   - Preencha formulário específico
   - Adicione imagem (opcional)
5. Defina data de entrega e prioridade
6. Clique em "Salvar Pedido"

#### Como Atualizar Status de Produção
1. Acesse "Pedidos" no menu
2. Encontre o pedido na lista
3. Clique no checkbox da etapa correspondente
4. Se for Sublimação, preencha máquina e data
5. Confirme a alteração

#### Como Gerar Ficha de Serviço
1. Acesse "Pedidos"
2. Encontre o pedido desejado
3. Clique em "Ficha de Serviço"
4. Visualize a ficha
5. Clique em "Imprimir Ficha"

### Para Administradores

#### Como Gerenciar Usuários
1. Acesse "Admin" → "Usuários"
2. Clique em "Novo Usuário"
3. Preencha dados
4. Defina se é administrador
5. Salve

#### Como Configurar Formas de Envio
1. Acesse "Admin" → "Formas de Envio"
2. Clique em "Nova Forma de Envio"
3. Preencha nome e valor
4. Salve

---

## 🔄 Integrações

### WebSocket (Tempo Real)

#### Funcionalidades
- Atualizações automáticas de pedidos
- Sincronização multi-usuário
- Notificações de mudanças

#### Configuração
- Automática após login
- Reconexão automática
- Fallback gracioso se não disponível

### API Externa

#### Requisitos
- REST API compatível
- WebSocket opcional
- Autenticação Bearer Token

---

## 📈 Performance

### Otimizações Implementadas

1. **Paginação:** Listas grandes são paginadas
2. **Cache:** Dados em memória quando possível
3. **Lazy Loading:** Componentes carregados sob demanda
4. **Debounce:** Em buscas e filtros
5. **Memoização:** Componentes pesados memoizados

### Limites

- **Paginação:** 10, 20, 50, 100 itens por página
- **Timeout:** 20 segundos para requisições
- **WebSocket:** Reconexão após 3 falhas

---

## 🚀 Roadmap e Melhorias Futuras

### Planejado

1. **Sistema de Fichas Melhorado** (ver plano)
2. **Tema Escuro/Claro**
3. **Notificações Push**
4. **Exportação Avançada**
5. **Dashboard Customizável**
6. **Atalhos de Teclado**
7. **Modo Offline**

---

## 📝 Changelog

### Versão 4.0 (Atual)
- Sistema completo de pedidos
- Múltiplos tipos de produção
- Sistema de status de produção
- Fichas de serviço
- Relatórios e analytics
- Gestão administrativa completa
- WebSocket para tempo real
- Interface moderna e responsiva

---

## 📞 Suporte e Contribuição

### Documentação Adicional
- `MELHORIAS_INTERFACE.md`: Melhorias sugeridas
- `PLANO_REDEFINICAO_FICHAS.md`: Plano de fichas
- `WEBSOCKET_ERRORS_EXPLAINED.md`: Explicação de erros WebSocket

### Estrutura de Código
- Código organizado em módulos
- TypeScript para type safety
- Componentes reutilizáveis
- Hooks customizados

---

**Última atualização:** $(date)
**Versão do sistema:** 4.0.0
**Status:** ✅ Documentação Completa

