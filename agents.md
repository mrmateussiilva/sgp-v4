# 🤖 Documentação para Agentes de IA - SGP v4

> **Contexto completo do Sistema de Gerenciamento de Pedidos v4 para assistentes de IA**

---

## 📌 Visão Geral do Projeto

### O que é o SGP v4?

O **SGP v4 (Sistema de Gerenciamento de Pedidos v4)** é uma aplicação desktop multiplataforma desenvolvida para gerenciar o ciclo completo de pedidos de produção. O sistema foi projetado para uma empresa de sublimação e costura, controlando desde a entrada do pedido até a expedição final.

**Versão Atual:** 1.2.2

### Características Principais

- ✅ **Aplicação Desktop Nativa**: Construída com Tauri v2 (alternativa moderna ao Electron)
- ✅ **Interface Moderna**: React 18 + TypeScript + Shadcn UI + Tailwind CSS
- ✅ **Arquitetura Distribuída**: Frontend desktop + Backend API Python separado
- ✅ **Banco de Dados Robusto**: PostgreSQL com schema completo
- ✅ **Tempo Real**: WebSocket para notificações e sincronização
- ✅ **Multiplataforma**: Windows, Linux e macOS
- ✅ **Cross-compilation**: Desenvolvido no Linux, build para Windows 10

---

## 🏗️ Arquitetura do Sistema

### Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Tauri)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript                              │   │
│  │  - Componentes UI (Shadcn)                          │   │
│  │  - Gerenciamento de Estado (Zustand)                │   │
│  │  - Roteamento (React Router)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                      │                                       │
│                      ▼                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Tauri Runtime (Rust)                               │   │
│  │  - Janela Desktop                                   │   │
│  │  - Sistema de Arquivos                              │   │
│  │  - Eventos e Notificações                           │   │
│  │  - Plugins (dialog, fs, http, shell, updater)       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ HTTP/REST + WebSocket
                         │ (Bearer Token Auth)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Python FastAPI)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FastAPI                                            │   │
│  │  - Endpoints REST                                   │   │
│  │  - Autenticação JWT                                 │   │
│  │  - WebSocket para tempo real                        │   │
│  │  - Validação de dados (Pydantic)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                      │                                       │
│                      ▼                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                │   │
│  │  - Tabelas de negócio                               │   │
│  │  - Índices e constraints                            │   │
│  │  - Migrações e schema                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Pontos Críticos da Arquitetura

1. **Comunicação Exclusivamente HTTP**: Não há comunicação direta Rust ↔ Python. Todo o fluxo é React → HTTP → FastAPI
2. **Tauri como Empacotador**: O Tauri serve apenas para gerar o executável desktop, não processa lógica de negócio
3. **API Externa**: A API Python roda em **outro computador** na rede local
4. **Adaptador Customizado**: Usa `tauriAxiosAdapter` para substituir o adapter padrão do Axios

---

## 📁 Estrutura de Diretórios

```
sgp-v4/
├── src/                          # Código-fonte do frontend
│   ├── api/                      # Nova camada de API (refatorada)
│   │   ├── client.ts             # Cliente HTTP configurado
│   │   ├── endpoints/            # Endpoints organizados por domínio
│   │   │   ├── auth.ts           # Autenticação
│   │   │   ├── orders.ts         # Pedidos
│   │   │   ├── customers.ts      # Clientes
│   │   │   ├── resources.ts      # Recursos (materiais, designers, etc.)
│   │   │   ├── maquinas.ts       # Máquinas de sublimação
│   │   │   └── printLogs.ts      # Logs de impressão
│   │   ├── mappers/              # Mapeadores de dados
│   │   ├── types/                # Tipos TypeScript da API
│   │   └── utils.ts              # Utilitários da API
│   │
│   ├── components/               # Componentes React
│   │   ├── ui/                   # Componentes Shadcn UI base
│   │   ├── OrderList.tsx         # Lista de pedidos
│   │   ├── OrderForm.tsx         # Formulário de pedido
│   │   ├── OrderViewModal.tsx    # Modal de visualização
│   │   ├── CreateOrderComplete.tsx # Formulário completo
│   │   ├── FichaDeServico.tsx    # Componente de ficha
│   │   └── ...                   # ~118 componentes
│   │
│   ├── pages/                    # Páginas/Views principais
│   │   ├── Login.tsx             # Tela de login
│   │   ├── Dashboard.tsx         # Dashboard principal
│   │   ├── DashboardOverview.tsx # Visão geral
│   │   ├── Clientes.tsx          # Gestão de clientes
│   │   ├── Fechamentos.tsx       # Relatórios de fechamento
│   │   ├── RelatoriosEnvios.tsx  # Relatórios de envio
│   │   ├── PainelDesempenho.tsx  # Analytics
│   │   ├── Admin.tsx             # Hub administrativo
│   │   ├── ConfigApi.tsx         # Configuração de API
│   │   ├── UpdateStatus.tsx      # Atualização de status
│   │   └── admin/                # Módulos administrativos
│   │       ├── GestaoUsuarios.tsx
│   │       ├── GestaoMateriais.tsx
│   │       ├── GestaoDesigners.tsx
│   │       ├── GestaoVendedores.tsx
│   │       ├── GestaoFormasEnvio.tsx
│   │       ├── GestaoFormasPagamento.tsx
│   │       ├── GestaoTemplateFicha.tsx
│   │       └── GestaoTemplateRelatorios.tsx
│   │
│   ├── services/                 # Serviços (camada antiga, sendo migrada)
│   │   ├── api.ts                # Cliente HTTP legado
│   │   ├── analyticsService.ts   # Serviço de analytics
│   │   ├── dashboardService.ts   # Serviço de dashboard
│   │   ├── orderEvents.ts        # Eventos de pedidos
│   │   ├── pdfService.ts         # Geração de PDFs
│   │   └── tauriAxiosAdapter.ts  # Adaptador Tauri para Axios
│   │
│   ├── store/                    # Estado global (Zustand)
│   │   ├── authStore.ts          # Estado de autenticação
│   │   ├── orderStore.ts         # Estado de pedidos
│   │   └── updaterStore.ts       # Estado de atualizações
│   │
│   ├── hooks/                    # Hooks customizados
│   │   ├── useNotifications.ts   # Notificações HTTP (polling)
│   │   ├── useRealtimeNotifications.ts # Notificações WebSocket
│   │   ├── useOrderEvents.ts     # Eventos de pedidos
│   │   ├── useAutoRefresh.ts     # Auto-refresh
│   │   ├── useAutoUpdateCheck.ts # Verificação de atualizações
│   │   └── use-toast.ts          # Sistema de toasts
│   │
│   ├── utils/                    # Funções utilitárias (~35 arquivos)
│   │   ├── config.ts             # Configuração (Tauri FS)
│   │   ├── path.ts               # Normalização de caminhos
│   │   ├── exportUtils.ts        # Exportação CSV/PDF
│   │   ├── fechamentoReport.ts   # Relatórios de fechamento
│   │   ├── printOrder.ts         # Impressão de pedidos
│   │   ├── printOrderServiceForm.ts # Impressão de fichas
│   │   ├── date.ts               # Formatação de datas
│   │   ├── logger.ts             # Sistema de logs
│   │   └── isTauri.ts            # Detecção de ambiente
│   │
│   ├── types/                    # Definições TypeScript
│   │   └── index.ts              # Tipos principais
│   │
│   ├── contexts/                 # Contextos React
│   │   ├── AlertContext.tsx      # Contexto de alertas
│   │   └── DataContext.tsx       # Contexto de dados globais
│   │
│   ├── lib/                      # Bibliotecas e helpers
│   │   ├── utils.ts              # Utilitários gerais
│   │   └── realtimeOrders.ts     # WebSocket de pedidos
│   │
│   ├── tests/                    # Testes automatizados
│   │   ├── utils/                # Testes de utilitários
│   │   └── views/                # Testes de views
│   │
│   ├── App.tsx                   # Componente raiz
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Estilos globais
│
├── src-tauri/                    # Código Rust do Tauri
│   ├── src/
│   │   ├── main.rs               # Entry point Rust
│   │   ├── commands/             # Comandos Tauri
│   │   │   ├── devtools.rs       # DevTools
│   │   │   ├── update.rs         # Sistema de atualizações
│   │   │   └── manual_updater.rs # Atualizador manual
│   │   └── config.rs             # Configuração
│   ├── Cargo.toml                # Dependências Rust
│   └── tauri.conf.json           # Configuração Tauri
│
├── database/                     # Scripts SQL
│   ├── init.sql                  # Inicialização básica
│   ├── migrate_full_system.sql   # Migração completa
│   ├── migrate_timestamps.sql    # Migração de timestamps
│   ├── admin_tables.sql          # Tabelas administrativas
│   └── fix_passwords.sql         # Correção de senhas
│
├── documentation/                # Documentação do projeto (~37 arquivos)
│   ├── README.md                 # Documentação principal
│   ├── START_HERE.md             # Guia de início
│   └── SCHEMA_COMPLETO.md        # Schema do banco
│
├── package.json                  # Configuração npm
├── tsconfig.json                 # Configuração TypeScript
├── vite.config.ts                # Configuração Vite
├── tailwind.config.js            # Configuração Tailwind
└── docker-compose.yml            # PostgreSQL local
```

---

## 🗄️ Banco de Dados

### Schema Principal

#### **Tabela: `orders` (Pedidos)**

Tabela central do sistema que armazena todos os pedidos.

```sql
CREATE TABLE orders (
  -- Identificação
  id SERIAL PRIMARY KEY,
  numero VARCHAR(50) UNIQUE NOT NULL,
  
  -- Datas
  data_entrada DATE NOT NULL,
  data_entrega DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Cliente
  cliente VARCHAR(255) NOT NULL,
  telefone_cliente VARCHAR(50),
  cidade_cliente VARCHAR(100),
  estado_cliente VARCHAR(2),
  
  -- Valores
  valor_total DECIMAL(10, 2),
  valor_frete DECIMAL(10, 2),
  valor_itens DECIMAL(10, 2),
  
  -- Relacionamentos
  forma_envio VARCHAR(100),
  forma_envio_id INTEGER REFERENCES envios(id),
  forma_pagamento_id INTEGER REFERENCES pagamentos(id),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pendente',
  prioridade VARCHAR(20) DEFAULT 'NORMAL',
  
  -- Status de Produção (Checkboxes)
  financeiro BOOLEAN DEFAULT FALSE,
  conferencia BOOLEAN DEFAULT FALSE,
  sublimacao BOOLEAN DEFAULT FALSE,
  costura BOOLEAN DEFAULT FALSE,
  expedicao BOOLEAN DEFAULT FALSE,
  pronto BOOLEAN DEFAULT FALSE,
  
  -- Sublimação
  sublimacao_maquina VARCHAR(100),
  sublimacao_data_impressao DATE,
  
  -- Observações
  observacao TEXT
);
```

**Status Possíveis:**
- `pendente`: Pedido criado, aguardando processamento
- `em_producao`: Pedido em produção
- `pronto`: Produção finalizada
- `entregue`: Entregue ao cliente
- `cancelado`: Pedido cancelado

**Prioridades:**
- `NORMAL`: Prioridade normal
- `ALTA`: Prioridade alta

**Regras de Negócio:**
- Quando todos os checkboxes de produção são marcados, `pronto = true` e `status = 'pronto'`
- Ao desmarcar `financeiro`, todos os outros setores são desmarcados automaticamente
- O campo `numero` é único e gerado automaticamente

#### **Tabela: `order_items` (Itens do Pedido)**

Cada pedido pode ter múltiplos itens, cada um com tipo de produção específico.

```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Básico
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2),
  subtotal DECIMAL(10, 2),
  
  -- Tipo de Produção
  tipo_producao VARCHAR(50), -- 'painel', 'totem', 'lona', 'almofada', 'bolsinha', 'adesivo'
  descricao TEXT,
  
  -- Dimensões
  largura VARCHAR(20),
  altura VARCHAR(20),
  metro_quadrado VARCHAR(20),
  
  -- Pessoas
  vendedor VARCHAR(100),
  designer VARCHAR(100),
  tecido VARCHAR(100),
  
  -- Acabamentos
  overloque BOOLEAN,
  elastico BOOLEAN,
  tipo_acabamento VARCHAR(50),
  
  -- Ilhós
  quantidade_ilhos VARCHAR(20),
  espaco_ilhos VARCHAR(20),
  valor_ilhos VARCHAR(20),
  
  -- Cordinha
  quantidade_cordinha VARCHAR(20),
  espaco_cordinha VARCHAR(20),
  valor_cordinha VARCHAR(20),
  
  -- Emenda
  emenda VARCHAR(50),
  emenda_qtd VARCHAR(20),
  
  -- Campos específicos por tipo
  quantidade_paineis VARCHAR(20),
  valor_painel VARCHAR(20),
  valores_adicionais VARCHAR(100),
  valor_unitario VARCHAR(20),
  terceirizado BOOLEAN,
  
  -- Lona
  acabamento_lona VARCHAR(100),
  valor_lona VARCHAR(20),
  quantidade_lona VARCHAR(20),
  outros_valores_lona VARCHAR(100),
  
  -- Adesivo
  tipo_adesivo VARCHAR(50),
  valor_adesivo VARCHAR(20),
  quantidade_adesivo VARCHAR(20),
  outros_valores_adesivo VARCHAR(100),
  
  -- Bolsinha/Almofada
  ziper BOOLEAN,
  cordinha_extra BOOLEAN,
  alcinha BOOLEAN,
  toalha_pronta BOOLEAN,
  
  -- Totem
  acabamento_totem VARCHAR(100),
  acabamento_totem_outro VARCHAR(100),
  valor_totem VARCHAR(20),
  quantidade_totem VARCHAR(20),
  outros_valores_totem VARCHAR(100),
  
  -- Imagens
  imagem TEXT, -- base64 ou caminho
  legenda_imagem VARCHAR(255),
  
  -- Observações
  observacao TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Tipos de Produção:**
- `painel`: Painéis de sublimação
- `totem`: Totens
- `lona`: Lonas
- `almofada`: Almofadas
- `bolsinha`: Bolsinhas
- `adesivo`: Adesivos

#### **Outras Tabelas Importantes**

```sql
-- Clientes
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cep VARCHAR(10),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  telefone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usuários
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Designers
CREATE TABLE designers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendedores
CREATE TABLE vendedores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materiais/Tecidos
CREATE TABLE materiais (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tipo_producao VARCHAR(50) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Formas de Envio
CREATE TABLE envios (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  value DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Formas de Pagamento
CREATE TABLE pagamentos (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  value DECIMAL(10, 2), -- desconto/acréscimo
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API e Comunicação

### Configuração da API

A URL da API é configurada dinamicamente através da interface `ConfigApi.tsx`:

1. Usuário informa URL (ex: `http://192.168.0.10:8000`)
2. Sistema testa conexão com endpoint `/health`
3. Se bem-sucedido, salva configuração via Tauri FS
4. Configuração é carregada automaticamente na inicialização

**Arquivo de Configuração:** Salvo localmente via `@tauri-apps/plugin-fs`

### Cliente HTTP (`src/api/client.ts`)

```typescript
// Configuração do cliente
const apiClient: AxiosInstance = axios.create({
  timeout: 30000,
});

// Aplicar adaptador Tauri
applyTauriAdapter(apiClient);

// Interceptor de autenticação
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});
```

**Características:**
- Timeout de 30 segundos para conexões de rede
- Adaptador customizado para Tauri (`@tauri-apps/api/http`)
- Injeção automática de Bearer Token
- Tratamento de erros 422 com logs detalhados
- Sistema de listeners para falhas de API

### Endpoints Principais

#### **Autenticação**
```
POST   /auth/login          # Login do usuário
POST   /auth/logout         # Logout
GET    /auth/me             # Informações do usuário atual
```

#### **Pedidos**
```
GET    /api/pedidos                    # Listar pedidos (com filtros)
GET    /api/pedidos/pendentes          # Pedidos pendentes (paginado)
GET    /api/pedidos/prontos            # Pedidos prontos (paginado)
GET    /api/pedidos/:id                # Buscar pedido por ID
POST   /api/pedidos                    # Criar pedido
PUT    /api/pedidos/:id                # Atualizar pedido completo
PATCH  /api/pedidos/:id/metadata       # Atualizar metadados
PATCH  /api/pedidos/:id/status         # Atualizar status
DELETE /api/pedidos/:id                # Excluir pedido
GET    /api/pedidos/:id/ficha          # Obter ficha do pedido
GET    /api/pedidos/summary            # Resumo/estatísticas
```

#### **Clientes**
```
GET    /api/clientes           # Listar clientes
GET    /api/clientes/:id       # Buscar cliente por ID
POST   /api/clientes           # Criar cliente
PUT    /api/clientes/:id       # Atualizar cliente
DELETE /api/clientes/:id       # Excluir cliente
POST   /api/clientes/import    # Importar clientes em lote (CSV)
```

#### **Recursos (Catálogos)**
```
GET    /api/vendedores/ativos          # Listar vendedores ativos
GET    /api/designers/ativos           # Listar designers ativos
GET    /api/materiais/ativos           # Listar materiais ativos
GET    /api/formas-envio/ativas        # Listar formas de envio ativas
GET    /api/formas-pagamento/ativas    # Listar formas de pagamento ativas
```

#### **Administrativo**
```
GET    /api/vendedores         # Listar todos os vendedores
POST   /api/vendedores         # Criar vendedor
PUT    /api/vendedores/:id     # Atualizar vendedor
DELETE /api/vendedores/:id     # Excluir vendedor

# Mesmo padrão para: designers, materiais, formas-envio, formas-pagamento, users
```

#### **Relatórios**
```
POST   /api/relatorios/fechamento          # Gerar relatório de fechamento
GET    /api/pedidos/por-data-entrega       # Pedidos por data de entrega
```

#### **Notificações e Tempo Real**
```
GET       /api/notificacoes/ultimos    # Últimas notificações (polling)
WebSocket /ws/orders                   # Conexão WebSocket para tempo real
```

### WebSocket (Tempo Real)

**Endpoint:** `ws://<api_url>/ws/orders`

**Autenticação:**
1. Token na query string: `?token=<jwt_token>`
2. Mensagem `authenticate` após conexão

**Eventos:**
- `order_created`: Novo pedido criado
- `order_updated`: Pedido atualizado
- `order_deleted`: Pedido excluído
- `order_status_updated`: Status do pedido alterado

**Implementação:** `src/lib/realtimeOrders.ts` e `src/hooks/useRealtimeNotifications.ts`

---

## 🎯 Funcionalidades Principais

### 1. Autenticação e Segurança

- **Login/Logout**: Sistema de autenticação com sessões JWT
- **Controle de Acesso**: Rotas protegidas baseadas em autenticação
- **Permissões**: Diferenciação entre usuários normais e administradores
- **Bearer Token**: Autenticação via token JWT nas requisições HTTP
- **Persistência de Sessão**: Sessão salva em localStorage com expiração (8 horas padrão)
- **Expiração Automática**: Logout automático quando sessão expira

**Store:** `src/store/authStore.ts` (Zustand com persist middleware)

### 2. Gestão de Pedidos

#### Criar Pedido
- Formulário completo com múltiplos itens (`CreateOrderComplete.tsx`)
- Diferentes tipos de produção (painel, totem, lona, adesivo, almofada, bolsinha)
- Campos específicos por tipo de produção
- Upload de imagens para itens (base64)
- Cálculo automático de valores
- Validação de campos obrigatórios
- Autocomplete de clientes

#### Listar Pedidos
- Tabela paginada com todos os pedidos (`OrderList.tsx`)
- Filtros por:
  - Status (pendente, em_producao, pronto, entregue, cancelado)
  - Cliente (nome)
  - Data (entrada/entrega)
  - Setores de produção (financeiro, conferência, sublimação, costura, expedição)
  - Prioridade
- Busca por texto (cliente, ID, número)
- Visualização de status de produção (checkboxes)
- Ordenação por diferentes colunas
- Seleção múltipla para impressão em lote

#### Editar Pedido
- Edição completa de dados do pedido
- Edição rápida de metadados (cliente, datas, valores)
- Reabertura de pedidos concluídos
- Atualização de status de produção
- Modificação de itens

#### Visualizar Pedido
- Modal com informações completas (`OrderViewModal.tsx`)
- Visualização de imagens dos itens
- Detalhes técnicos de cada item
- Valores e totais
- Histórico de alterações

### 3. Status de Produção

Sistema de checkboxes por setor:

- **Financeiro**: Aprovação financeira
- **Conferência**: Conferência de materiais/quantidades
- **Sublimação**: Processo de sublimação
- **Costura**: Processo de costura
- **Expedição**: Preparação para envio

**Regras Automáticas:**
- Quando todos os setores são marcados → `pronto = true` e `status = 'pronto'`
- Ao desmarcar `financeiro` → todos os outros setores são desmarcados
- Status principal é calculado automaticamente baseado nos checkboxes

### 4. Relatórios e Fechamentos

#### Relatório de Fechamentos (`Fechamentos.tsx`)

**Tipos de Relatórios Sintéticos:**
- Por Vendedor
- Por Designer
- Por Cliente
- Por Data de Entrega/Entrada
- Por Forma de Envio
- Por Tipo de Produção

**Tipos de Relatórios Analíticos:**
- Designer × Cliente
- Vendedor × Cliente
- Outras combinações

**Funcionalidades:**
- Agrupamento de valores (Frete + Serviços)
- Filtros por período, status, vendedor, designer, cliente
- Cálculo de totais e subtotais
- Exportação em PDF
- Impressão direta

**Implementação:** `src/utils/fechamentoReport.ts`

#### Relatório de Envios (`RelatoriosEnvios.tsx`)

- Agrupamento por forma de envio
- Filtro por data de entrega
- Lista de clientes e endereços
- Tipos de produção por pedido
- Observações importantes
- Exportação em PDF e impressão

### 5. Painel de Desempenho (`PainelDesempenho.tsx`)

- Estatísticas gerais (total de pedidos, valores, etc.)
- Gráficos de visualização de dados (Recharts)
- Filtros por período
- Métricas de produção
- Tempo médio de produção
- Produtividade por setor

### 6. Módulos Administrativos

Acesso restrito a administradores (`isAdmin = true`):

- **Gestão de Usuários** (`admin/GestaoUsuarios.tsx`)
- **Gestão de Materiais** (`admin/GestaoMateriais.tsx`)
- **Gestão de Designers** (`admin/GestaoDesigners.tsx`)
- **Gestão de Vendedores** (`admin/GestaoVendedores.tsx`)
- **Gestão de Formas de Envio** (`admin/GestaoFormasEnvio.tsx`)
- **Gestão de Formas de Pagamento** (`admin/GestaoFormasPagamento.tsx`)
- **Gestão de Templates de Ficha** (`admin/GestaoTemplateFicha.tsx`)
- **Gestão de Templates de Relatórios** (`admin/GestaoTemplateRelatorios.tsx`)

### 7. Impressão e Exportação

- **Ficha de Serviço**: Impressão individual por item (`printOrderServiceForm.ts`)
- **Lista de Produção**: Impressão em lote de múltiplos pedidos
- **Pedido Completo**: Impressão de todo o pedido (`printOrder.ts`)
- **Layout Otimizado**: HTML/CSS otimizado para impressão
- **Exportação CSV**: Exportação de pedidos e relatórios (`exportUtils.ts`)
- **Geração de PDF**: jsPDF, PDFMake, React-PDF

### 8. Notificações em Tempo Real

- **Polling HTTP**: Verificação periódica de novas notificações (`useNotifications.ts`)
- **WebSocket**: Conexão em tempo real para atualizações instantâneas (`useRealtimeNotifications.ts`)
- **Toasts**: Notificações visuais de novas ações (Shadcn UI Toast)
- **Sincronização Automática**: Atualização automática da lista de pedidos
- **Eventos de Pedidos**: Sistema de eventos customizado (`orderEvents.ts`)

### 9. Sistema de Atualização

- **Verificação Automática**: Verifica atualizações ao iniciar (`useAutoUpdateCheck.ts`)
- **Download e Instalação**: Automático via Tauri Updater
- **Controle de Versão**: Baseado em `package.json` e `tauri.conf.json`
- **Tela de Status**: `UpdateStatus.tsx` mostra progresso
- **Changelog**: Exibição de novidades da versão

---

## 🛠️ Stack Tecnológica Completa

### Frontend

#### Core
- **React 18.2.0**: Biblioteca JavaScript para construção de interfaces
- **TypeScript 5.3.3**: Superset do JavaScript com tipagem estática
- **Vite 5.1.0**: Build tool e dev server extremamente rápido

#### UI e Estilização
- **Shadcn UI**: Componentes UI modernos e acessíveis baseados em Radix UI
- **Tailwind CSS 3.4.1**: Framework CSS utility-first
- **Radix UI**: Componentes primitivos acessíveis
  - `@radix-ui/react-checkbox`
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-label`
  - `@radix-ui/react-popover`
  - `@radix-ui/react-select`
  - `@radix-ui/react-separator`
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-toast`
  - `@radix-ui/react-tooltip`
- **Lucide React 0.323.0**: Biblioteca de ícones
- **class-variance-authority**: Gerenciamento de variantes de componentes
- **clsx**: Utilitário para classes condicionais
- **tailwind-merge**: Merge inteligente de classes Tailwind

#### Estado e Roteamento
- **Zustand 4.5.0**: Biblioteca leve de gerenciamento de estado
- **React Router DOM 6.22.0**: Roteamento para aplicações React

#### Desktop e Integração
- **Tauri 2.9.1**: Framework para criar aplicações desktop
- **@tauri-apps/plugin-http**: Plugin para requisições HTTP
- **@tauri-apps/plugin-fs**: Plugin para sistema de arquivos
- **@tauri-apps/plugin-dialog**: Plugin para diálogos nativos
- **@tauri-apps/plugin-shell**: Plugin para executar comandos shell
- **@tauri-apps/plugin-updater**: Plugin para atualizações automáticas
- **@tauri-apps/plugin-clipboard-manager**: Plugin para clipboard
- **@tauri-apps/plugin-process**: Plugin para processos

#### Utilidades
- **Axios 1.6.8**: Cliente HTTP para fazer requisições
- **jsPDF 2.5.1**: Geração de PDFs no cliente
- **jspdf-autotable 3.8.2**: Plugin para tabelas em PDF
- **@react-pdf/renderer 4.3.2**: Geração de PDFs com React
- **pdfmake 0.3.1**: Geração de PDFs
- **papaparse 5.4.1**: Parse de arquivos CSV
- **recharts 2.8.0**: Biblioteca de gráficos para React
- **html2canvas 1.4.1**: Captura de screenshots
- **react-input-mask 2.0.4**: Máscaras de input
- **react-markdown 10.1.0**: Renderização de markdown
- **cmdk 1.1.1**: Command palette

#### Testes
- **Vitest 1.2.2**: Framework de testes
- **@testing-library/react 14.2.1**: Testing library para React
- **@testing-library/jest-dom 6.4.2**: Matchers customizados
- **@testing-library/user-event 14.6.1**: Simulação de eventos de usuário
- **jsdom 27.0.0**: Implementação DOM para testes
- **msw 2.0.0**: Mock Service Worker

### Backend (API Python)

- **Python**: Linguagem de programação
- **FastAPI**: Framework web moderno e rápido
- **SQLAlchemy**: ORM para banco de dados
- **Pydantic**: Validação de dados
- **PostgreSQL**: Banco de dados relacional
- **WebSocket**: Para notificações em tempo real
- **JWT**: Autenticação via tokens

### Ferramentas de Desenvolvimento

- **ESLint 8.56.0**: Linter para JavaScript/TypeScript
- **Prettier 3.2.5**: Formatador de código
- **Docker**: Containerização do banco de dados
- **Docker Compose**: Orquestração de containers
- **pnpm 10.28.0**: Gerenciador de pacotes

---

## 🔄 Fluxo de Dados

### Fluxo Completo de uma Requisição

```
1. Usuário interage com componente React
   ↓
2. Componente chama função de src/api/endpoints/*.ts
   ↓
3. Endpoint usa apiClient (src/api/client.ts)
   ↓
4. apiClient (Axios) aplica interceptores:
   - Adiciona Bearer Token
   - Aplica adaptador Tauri
   ↓
5. Tauri HTTP Plugin envia requisição HTTP
   ↓
6. FastAPI recebe requisição
   ↓
7. FastAPI valida token JWT
   ↓
8. FastAPI processa lógica de negócio
   ↓
9. SQLAlchemy consulta/atualiza PostgreSQL
   ↓
10. PostgreSQL retorna dados
    ↓
11. FastAPI retorna resposta JSON
    ↓
12. apiClient recebe resposta
    ↓
13. Endpoint retorna dados tipados
    ↓
14. Componente React atualiza estado
    ↓
15. Zustand Store atualiza estado global (se necessário)
    ↓
16. React re-renderiza UI
```

### Fluxo de Autenticação

```
1. Usuário preenche formulário de login (Login.tsx)
   ↓
2. Chama authEndpoints.login(username, password)
   ↓
3. POST /auth/login com credenciais
   ↓
4. FastAPI valida credenciais
   ↓
5. FastAPI gera JWT token
   ↓
6. FastAPI retorna { userId, username, sessionToken, isAdmin }
   ↓
7. authStore.login() salva dados no Zustand
   ↓
8. Zustand persist middleware salva em localStorage
   ↓
9. setAuthToken() configura token no apiClient
   ↓
10. Navegação para /dashboard
```

### Fluxo de Criação de Pedido

```
1. Usuário preenche CreateOrderComplete.tsx
   ↓
2. Adiciona múltiplos itens com tipos de produção
   ↓
3. Faz upload de imagens (convertidas para base64)
   ↓
4. Clica em "Criar Pedido"
   ↓
5. Validação de campos obrigatórios
   ↓
6. Chama ordersEndpoints.createOrder(orderData)
   ↓
7. POST /api/pedidos com dados completos
   ↓
8. FastAPI valida dados com Pydantic
   ↓
9. SQLAlchemy cria registro em orders
   ↓
10. SQLAlchemy cria registros em order_items
    ↓
11. PostgreSQL retorna pedido criado
    ↓
12. FastAPI emite evento WebSocket (order_created)
    ↓
13. Frontend recebe resposta
    ↓
14. orderStore atualiza lista de pedidos
    ↓
15. Toast de sucesso exibido
    ↓
16. Navegação para lista de pedidos
    ↓
17. Outros clientes conectados recebem notificação WebSocket
```

---

## 🧪 Testes

### Estrutura de Testes

```
src/tests/
├── utils/                    # Testes de utilitários
│   └── fechamentoReport.test.ts
└── views/                    # Testes de views
    └── FechamentoView.test.tsx
```

### Framework de Testes

- **Vitest**: Framework de testes (compatível com Jest)
- **Testing Library**: Testes de componentes React
- **MSW**: Mock de requisições HTTP

### Executar Testes

```bash
# Executar todos os testes
npm test

# Executar teste específico
npm test src/tests/utils/fechamentoReport.test.ts

# Modo watch
npm test -- --watch
```

---

## 📝 Convenções de Código

### TypeScript

- **Tipos explícitos**: Sempre definir tipos para funções e variáveis
- **Interfaces vs Types**: Preferir `interface` para objetos, `type` para unions/intersections
- **Naming**: PascalCase para componentes/interfaces, camelCase para funções/variáveis

### React

- **Componentes Funcionais**: Sempre usar function components com hooks
- **Props**: Definir interface para props de componentes
- **Hooks**: Seguir regras dos hooks (não chamar condicionalmente)
- **Lazy Loading**: Usar `React.lazy()` para rotas

### Estilização

- **Tailwind CSS**: Preferir classes utilitárias
- **Componentes Shadcn**: Usar componentes base e customizar
- **Responsividade**: Mobile-first approach

### API

- **Endpoints**: Organizar por domínio em `src/api/endpoints/`
- **Tipos**: Definir tipos de request/response em `src/api/types/`
- **Tratamento de Erros**: Sempre usar try/catch e exibir toasts

---

## 🚀 Comandos Úteis

### Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Executar em modo desenvolvimento
pnpm run tauri:dev

# Executar apenas frontend (sem Tauri)
pnpm run dev

# Executar testes
pnpm test

# Lint
pnpm run lint

# Formatação
pnpm run format
```

### Build

```bash
# Build de produção
pnpm run tauri:build

# Build apenas do frontend
pnpm run build

# Preview do build
pnpm run preview
```

### Docker (PostgreSQL Local)

```bash
# Iniciar PostgreSQL
pnpm run docker:up

# Parar PostgreSQL
pnpm run docker:down

# Ver logs
pnpm run docker:logs

# Resetar banco (CUIDADO: apaga dados)
pnpm run docker:reset

# Acessar psql
pnpm run db:psql
```

---

## 🐛 Problemas Conhecidos e Soluções

### 1. Erro 422 (Unprocessable Entity)

**Causa:** Dados enviados não correspondem ao schema Pydantic do backend

**Solução:**
- Verificar logs detalhados no console (interceptor em `apiClient`)
- Comparar tipos TypeScript com schema Pydantic
- Garantir que valores monetários sejam números, não strings

### 2. Conexão com API Falha

**Causa:** URL incorreta ou API não acessível na rede

**Solução:**
- Verificar se API está rodando: `curl http://<ip>:8000/health`
- Testar conectividade: `ping <ip>`
- Verificar firewall
- Usar IP correto da rede local (ex: 192.168.15.2:8000)

### 3. Sessão Expira Constantemente

**Causa:** TTL muito curto ou relógio do sistema dessincronizado

**Solução:**
- Ajustar `DEFAULT_SESSION_TTL_MS` em `authStore.ts`
- Verificar sincronização de relógio do sistema

### 4. WebSocket Desconecta

**Causa:** Timeout de conexão ou rede instável

**Solução:**
- Implementar reconexão automática (já implementado em `realtimeOrders.ts`)
- Verificar estabilidade da rede
- Aumentar timeout do WebSocket

### 5. Imagens Não Carregam

**Causa:** Base64 muito grande ou formato inválido

**Solução:**
- Comprimir imagens antes do upload
- Validar formato (JPEG, PNG)
- Limitar tamanho máximo

---

## 📚 Recursos e Documentação

### Documentação Interna

- **README.md**: Visão geral do projeto
- **DOCUMENTACAO_COMPLETA.md**: Documentação técnica completa (1443 linhas)
- **FUNCIONALIDADES_SISTEMA.md**: Lista de funcionalidades
- **documentation/**: Pasta com ~37 arquivos de documentação

### Tecnologias

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tauri](https://tauri.app/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [React Router](https://reactrouter.com/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [PostgreSQL](https://www.postgresql.org/)

---

## 🎯 Contexto para Agentes de IA

### Quando Trabalhar com Este Projeto

1. **Entenda a Arquitetura Distribuída**: Frontend desktop + Backend API separado
2. **Não Confunda Tauri com Backend**: Tauri é apenas empacotador, não processa lógica
3. **Comunicação HTTP Pura**: Toda comunicação é React → HTTP → FastAPI
4. **API Externa**: A API roda em outro computador na rede
5. **Tipos são Críticos**: TypeScript no frontend, Pydantic no backend - devem estar sincronizados

### Padrões de Modificação

#### Adicionar Nova Funcionalidade

1. **Backend (API Python)**:
   - Criar endpoint em FastAPI
   - Definir schema Pydantic
   - Implementar lógica de negócio
   - Atualizar banco de dados se necessário

2. **Frontend (React)**:
   - Criar tipos TypeScript em `src/api/types/`
   - Criar função de endpoint em `src/api/endpoints/`
   - Criar/atualizar componente React
   - Adicionar rota se necessário
   - Atualizar store Zustand se necessário

#### Corrigir Bug

1. **Identificar Camada**: Frontend, Backend ou Banco de Dados
2. **Verificar Logs**: Console do navegador, logs da API, logs do PostgreSQL
3. **Reproduzir**: Criar teste que reproduz o bug
4. **Corrigir**: Implementar correção
5. **Testar**: Verificar que correção funciona e não quebra outras funcionalidades

#### Adicionar Novo Tipo de Produção

1. **Banco de Dados**: Adicionar campos específicos em `order_items`
2. **Backend**: Atualizar schema Pydantic
3. **Frontend**: 
   - Atualizar tipos TypeScript
   - Adicionar campos no formulário `CreateOrderComplete.tsx`
   - Atualizar lógica de validação
   - Atualizar impressão de ficha

### Perguntas Frequentes para Agentes

**P: Onde adiciono um novo endpoint?**
R: Backend (FastAPI) primeiro, depois crie função correspondente em `src/api/endpoints/`

**P: Como adiciono um novo campo ao pedido?**
R: 1) Altere tabela `orders` no PostgreSQL, 2) Atualize schema Pydantic no backend, 3) Atualize tipos TypeScript, 4) Atualize componentes React

**P: Como funciona a autenticação?**
R: JWT token gerado no backend, salvo no `authStore` (Zustand), injetado automaticamente em todas as requisições via interceptor do Axios

**P: Onde estão os estilos?**
R: Tailwind CSS inline nos componentes + `src/index.css` para estilos globais

**P: Como adiciono uma nova página?**
R: 1) Crie componente em `src/pages/`, 2) Adicione rota em `App.tsx`, 3) Use `React.lazy()` para lazy loading

**P: Como funciona o sistema de notificações?**
R: Dual: 1) Polling HTTP via `useNotifications.ts`, 2) WebSocket via `useRealtimeNotifications.ts`

**P: Onde ficam os testes?**
R: `src/tests/` - use Vitest + Testing Library

**P: Como debugar problemas de API?**
R: 1) Verificar console do navegador, 2) Verificar logs detalhados do interceptor (erros 422), 3) Testar endpoint diretamente com curl/Postman

---

## 🔐 Segurança

- **Autenticação JWT**: Tokens com expiração
- **HTTPS**: Usar HTTPS em produção
- **Validação**: Validação no frontend E backend
- **SQL Injection**: Protegido via SQLAlchemy ORM
- **XSS**: React escapa automaticamente
- **CORS**: Configurado no backend FastAPI

---

## 📊 Performance

- **Lazy Loading**: Rotas carregadas sob demanda
- **Paginação**: Listas paginadas para evitar sobrecarga
- **Debounce**: Busca com debounce para reduzir requisições
- **Memoization**: React.memo em componentes pesados
- **WebSocket**: Reduz polling desnecessário
- **Code Splitting**: Vite divide código automaticamente

---

## 🌐 Ambiente de Produção

- **Build**: `pnpm run tauri:build`
- **Executável**: Gerado em `src-tauri/target/release/`
- **Instalador**: Windows (.msi), Linux (.deb, .AppImage), macOS (.dmg)
- **Atualizações**: Sistema de atualização automática via Tauri Updater
- **Configuração**: URL da API configurada na primeira execução

---

## 📞 Suporte e Manutenção

### Logs

- **Frontend**: Console do navegador (DevTools)
- **Backend**: Logs da API Python
- **Banco de Dados**: Logs do PostgreSQL
- **Tauri**: Logs do Rust (stdout/stderr)

### Backup

- **Banco de Dados**: Fazer backup regular do PostgreSQL
- **Configurações**: Salvas localmente via Tauri FS

### Monitoramento

- **Health Check**: Endpoint `/health` para verificar status da API
- **Métricas**: Painel de Desempenho mostra estatísticas do sistema

---

**Última Atualização:** 2026-02-04  
**Versão do Sistema:** 1.2.2  
**Autor:** Equipe SGP v4
