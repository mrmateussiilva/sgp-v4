# 📚 Documentação Completa - SGP v4
## Sistema de Gerenciamento de Pedidos

> **Documentação completa do sistema SGP v4 para contexto completo do ChatGPT**

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Tecnologias Utilizadas](#3-tecnologias-utilizadas)
4. [Estrutura do Projeto](#4-estrutura-do-projeto)
5. [Banco de Dados](#5-banco-de-dados)
6. [Funcionalidades Principais](#6-funcionalidades-principais)
7. [API e Comunicação](#7-api-e-comunicação)
8. [Componentes e Páginas](#8-componentes-e-páginas)
9. [Fluxos de Uso](#9-fluxos-de-uso)
10. [Instalação e Configuração](#10-instalação-e-configuração)
11. [Desenvolvimento](#11-desenvolvimento)
12. [Build e Deploy](#12-build-e-deploy)

---

## 1. Visão Geral

### 1.1 O que é o SGP v4?

O **Sistema de Gerenciamento de Pedidos (SGP) v4** é uma aplicação desktop multiplataforma desenvolvida para gerenciar pedidos de produção de forma completa. Cada pedido é representado como uma "ficha" individual com informações detalhadas sobre cliente, itens, valores, status de produção e muito mais.

### 1.2 Características Principais

- ✅ **Desktop App**: Aplicação desktop usando Tauri (substituto moderno do Electron)
- ✅ **Interface Moderna**: UI construída com React 18, Shadcn UI e Tailwind CSS
- ✅ **Backend API**: Comunicação com API Python FastAPI via HTTP/REST
- ✅ **Banco de Dados**: PostgreSQL como banco de dados relacional
- ✅ **Multiplataforma**: Funciona em Windows, Linux e macOS
- ✅ **Tempo Real**: Notificações e atualizações em tempo real via WebSocket
- ✅ **Relatórios**: Geração de relatórios em PDF e exportação em CSV
- ✅ **Autenticação**: Sistema de login com sessões e controle de acesso

### 1.3 Propósito do Sistema

O sistema foi desenvolvido para gerenciar pedidos de produção com foco em:
- Controle completo do ciclo de vida do pedido
- Acompanhamento de status de produção por setores (financeiro, conferência, sublimação, costura, expedição)
- Gestão de clientes, materiais, designers e vendedores
- Geração de relatórios financeiros e de envio
- Impressão de fichas de serviço e listas de produção

---

## 2. Arquitetura do Sistema

### 2.1 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Tauri)              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript                          │   │
│  │  - Componentes UI (Shadcn)                      │   │
│  │  - Gerenciamento de Estado (Zustand)            │   │
│  │  - Roteamento (React Router)                    │   │
│  └─────────────────────────────────────────────────┘   │
│                      │                                   │
│                      ▼                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Tauri Runtime                                  │   │
│  │  - Janela Desktop                               │   │
│  │  - Sistema de Arquivos                          │   │
│  │  - Eventos e Notificações                       │   │
│  │  - Plugins (dialog, fs, http, shell)            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        │ HTTP/REST + WebSocket
                        │ (Bearer Token Auth)
                        ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND (Python FastAPI)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  FastAPI                                        │   │
│  │  - Endpoints REST                               │   │
│  │  - Autenticação JWT                             │   │
│  │  - WebSocket para tempo real                    │   │
│  │  - Validação de dados                           │   │
│  └─────────────────────────────────────────────────┘   │
│                      │                                   │
│                      ▼                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                            │   │
│  │  - Tabelas de negócio                           │   │
│  │  - Índices e constraints                        │   │
│  │  - Migrações e schema                           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Camadas do Sistema

#### **Frontend (React + Tauri)**
- **Localização**: `/home/mateus/Projetcs/Testes/sgp_v4/src/`
- **Responsabilidade**: Interface do usuário, lógica de apresentação, interação com API
- **Tecnologias**: React 18, TypeScript, Shadcn UI, Tailwind CSS, Zustand, React Router

#### **Backend (Python FastAPI)**
- **Localização**: `/home/mateus/Projetcs/api-sgp` (projeto separado)
- **Responsabilidade**: Lógica de negócio, validação, persistência, autenticação
- **Tecnologias**: Python, FastAPI, SQLAlchemy, PostgreSQL, WebSocket

#### **Banco de Dados (PostgreSQL)**
- **Tipo**: Banco relacional PostgreSQL
- **Responsabilidade**: Persistência de dados, integridade referencial, queries complexas

### 2.3 Fluxo de Dados

1. **Usuário interage** com a interface React
2. **Componente React** chama função de `services/api.ts`
3. **api.ts** utiliza `apiClient` (axios) para fazer requisição HTTP
4. **Tauri** intercepta requisições (se necessário) e as envia para API Python
5. **FastAPI** processa requisição, valida dados, consulta/atualiza banco
6. **PostgreSQL** retorna dados ou confirma operação
7. **FastAPI** retorna resposta JSON
8. **Frontend** recebe resposta e atualiza estado/UI
9. **Zustand Store** atualiza estado global (se necessário)

---

## 3. Tecnologias Utilizadas

### 3.1 Frontend

#### Core
- **React 18.2.0**: Biblioteca JavaScript para construção de interfaces
- **TypeScript 5.3.3**: Superset do JavaScript com tipagem estática
- **Vite 5.1.0**: Build tool e dev server extremamente rápido

#### UI e Estilização
- **Shadcn UI**: Componentes UI modernos e acessíveis baseados em Radix UI
- **Tailwind CSS 3.4.1**: Framework CSS utility-first
- **Radix UI**: Componentes primitivos acessíveis (@radix-ui/react-*)
- **Lucide React 0.323.0**: Biblioteca de ícones

#### Estado e Roteamento
- **Zustand 4.5.0**: Biblioteca leve de gerenciamento de estado
- **React Router DOM 6.22.0**: Roteamento para aplicações React

#### Desktop e Integração
- **Tauri 2.9.1**: Framework para criar aplicações desktop com tecnologias web
- **@tauri-apps/plugin-http**: Plugin para requisições HTTP
- **@tauri-apps/plugin-fs**: Plugin para sistema de arquivos
- **@tauri-apps/plugin-dialog**: Plugin para diálogos nativos
- **@tauri-apps/plugin-shell**: Plugin para executar comandos shell

#### Utilidades
- **Axios 1.6.8**: Cliente HTTP para fazer requisições
- **jsPDF 2.5.1**: Geração de PDFs no cliente
- **jspdf-autotable 3.8.2**: Plugin para tabelas em PDF
- **papaparse 5.4.1**: Parse de arquivos CSV
- **recharts 2.8.0**: Biblioteca de gráficos para React
- **class-variance-authority**: Gerenciamento de variantes de componentes

### 3.2 Backend (API Python)

- **Python**: Linguagem de programação
- **FastAPI**: Framework web moderno e rápido
- **SQLAlchemy**: ORM para banco de dados
- **PostgreSQL**: Banco de dados relacional
- **WebSocket**: Para notificações em tempo real

### 3.3 Banco de Dados

- **PostgreSQL**: Banco de dados relacional
- **Extensões**: uuid-ossp para UUIDs

### 3.4 Ferramentas de Desenvolvimento

- **ESLint**: Linter para JavaScript/TypeScript
- **Prettier**: Formatador de código
- **Vitest**: Framework de testes
- **Docker**: Containerização do banco de dados
- **Docker Compose**: Orquestração de containers

---

## 4. Estrutura do Projeto

### 4.1 Estrutura de Diretórios

```
sgp_v4/
├── src/                          # Código-fonte do frontend
│   ├── components/               # Componentes React
│   │   ├── ui/                   # Componentes Shadcn UI base
│   │   ├── OrderList.tsx         # Lista de pedidos
│   │   ├── OrderForm.tsx         # Formulário de pedido
│   │   ├── OrderViewModal.tsx    # Modal de visualização
│   │   ├── CreateOrderComplete.tsx # Formulário completo
│   │   ├── FichaDeServico.tsx    # Componente de ficha
│   │   └── ...                   # Outros componentes
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
│   ├── services/                 # Serviços e APIs
│   │   ├── api.ts                # Cliente HTTP principal
│   │   ├── apiClient.ts          # Configuração do Axios
│   │   ├── tauriAxiosAdapter.ts  # Adaptador Tauri para Axios
│   │   ├── analyticsService.ts   # Serviço de analytics
│   │   └── orderEvents.ts        # Eventos de pedidos
│   │
│   ├── store/                    # Estado global (Zustand)
│   │   ├── authStore.ts          # Estado de autenticação
│   │   └── orderStore.ts         # Estado de pedidos
│   │
│   ├── hooks/                    # Hooks customizados
│   │   ├── useNotifications.ts   # Notificações HTTP
│   │   ├── useRealtimeNotifications.ts # Notificações WebSocket
│   │   ├── useOrderEvents.ts     # Eventos de pedidos
│   │   ├── useAutoRefresh.ts     # Auto-refresh
│   │   ├── useAutoUpdateCheck.ts # Verificação de atualizações
│   │   └── use-toast.ts          # Sistema de toasts
│   │
│   ├── utils/                    # Funções utilitárias
│   │   ├── config.ts             # Configuração (Tauri FS)
│   │   ├── path.ts               # Normalização de caminhos
│   │   ├── exportUtils.ts        # Exportação CSV/PDF
│   │   ├── fechamentoReport.ts   # Relatórios de fechamento
│   │   ├── printOrder.ts         # Impressão de pedidos
│   │   ├── printOrderServiceForm.ts # Impressão de fichas
│   │   ├── date.ts               # Formatação de datas
│   │   └── isTauri.ts            # Detecção de ambiente
│   │
│   ├── types/                    # Definições TypeScript
│   │   └── index.ts              # Tipos principais
│   │
│   ├── contexts/                 # Contextos React
│   │   └── AlertContext.tsx      # Contexto de alertas
│   │
│   ├── lib/                      # Bibliotecas e helpers
│   │   ├── utils.ts              # Utilitários gerais
│   │   └── realtimeOrders.ts     # WebSocket de pedidos
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
│   ├── fix_passwords.sql         # Correção de senhas
│   └── README.md                 # Documentação do banco
│
├── documentation/                # Documentação do projeto
│   ├── README.md                 # Documentação principal
│   ├── START_HERE.md             # Guia de início
│   ├── SCHEMA_COMPLETO.md        # Schema do banco
│   └── ...                       # Outros documentos
│
├── dist/                         # Build de produção (gerado)
├── node_modules/                 # Dependências npm (gerado)
├── public/                       # Arquivos estáticos
├── package.json                  # Configuração npm
├── pnpm-lock.yaml               # Lock file do pnpm
├── tsconfig.json                 # Configuração TypeScript
├── vite.config.ts                # Configuração Vite
├── tailwind.config.js            # Configuração Tailwind
├── postcss.config.js             # Configuração PostCSS
├── docker-compose.yml            # Configuração Docker
└── env.example                   # Exemplo de variáveis de ambiente
```

### 4.2 Arquivos Principais

#### Frontend
- **`src/main.tsx`**: Entry point React, habilita devtools, renderiza App
- **`src/App.tsx`**: Componente raiz, roteamento, configuração de API, listeners de eventos
- **`src/services/api.ts`**: Cliente HTTP principal, todas as chamadas à API
- **`src/services/apiClient.ts`**: Configuração do Axios, interceptores, adaptador Tauri
- **`src/store/authStore.ts`**: Estado global de autenticação (Zustand)
- **`src/store/orderStore.ts`**: Estado global de pedidos (Zustand)
- **`src/types/index.ts`**: Definições de tipos TypeScript

#### Tauri
- **`src-tauri/src/main.rs`**: Entry point Rust, inicializa plugins e comandos
- **`src-tauri/Cargo.toml`**: Dependências Rust
- **`src-tauri/tauri.conf.json`**: Configuração da aplicação Tauri

#### Configuração
- **`package.json`**: Scripts npm, dependências do projeto
- **`vite.config.ts`**: Configuração do Vite
- **`tailwind.config.js`**: Configuração do Tailwind CSS
- **`tsconfig.json`**: Configuração do TypeScript
- **`docker-compose.yml`**: Configuração do PostgreSQL

---

## 5. Banco de Dados

### 5.1 Visão Geral

O banco de dados PostgreSQL contém todas as tabelas necessárias para o funcionamento do sistema. O schema é gerenciado através de scripts SQL na pasta `database/`.

### 5.2 Tabelas Principais

#### **users** (Usuários do sistema)
```sql
- id: SERIAL PRIMARY KEY
- username: VARCHAR(100) UNIQUE NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- is_admin: BOOLEAN DEFAULT FALSE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### **orders** (Pedidos)
```sql
- id: SERIAL PRIMARY KEY
- numero: VARCHAR(50) UNIQUE NOT NULL
- data_entrada: DATE NOT NULL
- data_entrega: DATE
- observacao: TEXT
- prioridade: VARCHAR(20) DEFAULT 'NORMAL' -- 'NORMAL', 'ALTA'
- status: VARCHAR(50) DEFAULT 'pendente' -- 'pendente', 'em_producao', 'pronto', 'entregue', 'cancelado'

-- Dados do cliente
- cliente: VARCHAR(255) NOT NULL
- telefone_cliente: VARCHAR(50)
- cidade_cliente: VARCHAR(100)
- estado_cliente: VARCHAR(2)

-- Valores
- valor_total: DECIMAL(10, 2)
- valor_frete: DECIMAL(10, 2)
- valor_itens: DECIMAL(10, 2)
- forma_envio: VARCHAR(100)
- forma_envio_id: INTEGER REFERENCES envios(id)
- forma_pagamento_id: INTEGER REFERENCES pagamentos(id)

-- Status de produção (checkboxes)
- financeiro: BOOLEAN DEFAULT FALSE
- conferencia: BOOLEAN DEFAULT FALSE
- sublimacao: BOOLEAN DEFAULT FALSE
- costura: BOOLEAN DEFAULT FALSE
- expedicao: BOOLEAN DEFAULT FALSE
- pronto: BOOLEAN DEFAULT FALSE
- sublimacao_maquina: VARCHAR(100)
- sublimacao_data_impressao: DATE

-- Timestamps
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### **order_items** (Itens do pedido)
```sql
- id: SERIAL PRIMARY KEY
- order_id: INTEGER REFERENCES orders(id) ON DELETE CASCADE
- item_name: VARCHAR(255) NOT NULL
- quantity: INTEGER NOT NULL
- unit_price: DECIMAL(10, 2)
- subtotal: DECIMAL(10, 2)

-- Campos de produção
- tipo_producao: VARCHAR(50) -- 'painel', 'totem', 'lona', 'almofada', 'bolsinha'
- descricao: TEXT
- largura: VARCHAR(20)
- altura: VARCHAR(20)
- metro_quadrado: VARCHAR(20)
- vendedor: VARCHAR(100)
- designer: VARCHAR(100)
- tecido: VARCHAR(100)

-- Acabamentos
- overloque: BOOLEAN
- elastico: BOOLEAN
- tipo_acabamento: VARCHAR(50)
- quantidade_ilhos: VARCHAR(20)
- espaco_ilhos: VARCHAR(20)
- valor_ilhos: VARCHAR(20)
- quantidade_cordinha: VARCHAR(20)
- espaco_cordinha: VARCHAR(20)
- valor_cordinha: VARCHAR(20)
- emenda: VARCHAR(50)
- emenda_qtd: VARCHAR(20)

-- Campos específicos por tipo
- quantidade_paineis: VARCHAR(20)
- valor_painel: VARCHAR(20)
- valores_adicionais: VARCHAR(100)
- valor_unitario: VARCHAR(20)
- terceirizado: BOOLEAN
- acabamento_lona: VARCHAR(100)
- valor_lona: VARCHAR(20)
- quantidade_lona: VARCHAR(20)
- outros_valores_lona: VARCHAR(100)
- tipo_adesivo: VARCHAR(50)
- valor_adesivo: VARCHAR(20)
- quantidade_adesivo: VARCHAR(20)
- outros_valores_adesivo: VARCHAR(100)
- ziper: BOOLEAN
- cordinha_extra: BOOLEAN
- alcinha: BOOLEAN
- toalha_pronta: BOOLEAN
- acabamento_totem: VARCHAR(100)
- acabamento_totem_outro: VARCHAR(100)
- valor_totem: VARCHAR(20)
- quantidade_totem: VARCHAR(20)
- outros_valores_totem: VARCHAR(100)

-- Imagens e observações
- imagem: TEXT -- base64 ou caminho de arquivo
- legenda_imagem: VARCHAR(255)
- observacao: TEXT

- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### **clientes** (Clientes)
```sql
- id: SERIAL PRIMARY KEY
- nome: VARCHAR(255) NOT NULL
- cep: VARCHAR(10)
- cidade: VARCHAR(100)
- estado: VARCHAR(2)
- telefone: VARCHAR(50)
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### **materiais** (Materiais de produção)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- description: TEXT
- tipo_producao: VARCHAR(50) NOT NULL
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### **designers** (Designers)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- email: VARCHAR(255)
- phone: VARCHAR(50)
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### **vendedores** (Vendedores)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- email: VARCHAR(255)
- phone: VARCHAR(50)
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### **tecidos** (Tecidos)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- description: TEXT
- gsm: INTEGER -- gramatura
- composition: TEXT -- composição
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### **envios** (Formas de envio)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- value: DECIMAL(10, 2)
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### **pagamentos** (Formas de pagamento)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- value: DECIMAL(10, 2) -- desconto/acréscimo
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 5.3 Status e Enums

#### Status Principal do Pedido
- `pendente`: Pedido criado, aguardando processamento
- `em_producao`: Pedido em produção
- `pronto`: Produção finalizada
- `entregue`: Entregue ao cliente
- `cancelado`: Pedido cancelado

#### Status de Produção (Checkboxes)
- `financeiro`: Aprovado financeiramente
- `conferencia`: Conferido
- `sublimacao`: Sublimação concluída
- `costura`: Costura concluída
- `expedicao`: Pronto para expedição
- `pronto`: Todos os setores concluídos (calculado automaticamente)

#### Tipos de Produção
- `painel`: Painéis
- `totem`: Totens
- `lona`: Lonas
- `almofada`: Almofadas
- `bolsinha`: Bolsinhas

#### Prioridades
- `NORMAL`: Prioridade normal
- `ALTA`: Prioridade alta

### 5.4 Relacionamentos

```
users (1) ── (N) orders
orders (1) ── (N) order_items
orders (N) ── (1) envios (forma_envio_id)
orders (N) ── (1) pagamentos (forma_pagamento_id)
```

### 5.5 Scripts SQL

- **`database/init.sql`**: Inicialização básica do banco (usuários, pedidos básicos)
- **`database/migrate_full_system.sql`**: Migração completa com todas as tabelas
- **`database/migrate_timestamps.sql`**: Correção de tipos de timestamp
- **`database/admin_tables.sql`**: Tabelas administrativas adicionais
- **`database/fix_passwords.sql`**: Correção de hashes de senha

---

## 6. Funcionalidades Principais

### 6.1 Autenticação e Segurança

- **Login/Logout**: Sistema de autenticação com sessões
- **Controle de Acesso**: Rotas protegidas baseadas em autenticação
- **Permissões**: Diferenciação entre usuários normais e administradores
- **Bearer Token**: Autenticação via token JWT nas requisições HTTP
- **Persistência de Sessão**: Sessão salva em localStorage com expiração

### 6.2 Gestão de Pedidos

#### Criar Pedido
- Formulário completo com múltiplos itens
- Diferentes tipos de produção (painel, totem, lona, adesivo, etc.)
- Campos específicos por tipo de produção
- Upload de imagens para itens
- Cálculo automático de valores
- Validação de campos obrigatórios

#### Listar Pedidos
- Tabela paginada com todos os pedidos
- Filtros por status, cliente, data, setores de produção
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
- Modal com informações completas
- Visualização de imagens dos itens
- Detalhes técnicos de cada item
- Valores e totais
- Histórico de alterações

#### Excluir Pedido
- Exclusão com confirmação
- Validação de permissões
- Cascade delete de itens

### 6.3 Status de Produção

O sistema permite acompanhar o progresso do pedido através de checkboxes por setor:

- **Financeiro**: Aprovação financeira
- **Conferência**: Conferência de materiais/quantidades
- **Sublimação**: Processo de sublimação
- **Costura**: Processo de costura
- **Expedição**: Preparação para envio

**Regras de Status:**
- Quando todos os setores são marcados, `pronto = true` e `status = 'pronto'`
- Ao desmarcar `financeiro`, todos os outros setores são desmarcados
- Status principal é calculado automaticamente baseado nos checkboxes

### 6.4 Gestão de Clientes

- **CRUD Completo**: Criar, listar, editar, excluir clientes
- **Importação em Lote**: Importar clientes via CSV
- **Autocomplete**: Busca inteligente de clientes em formulários
- **Validação**: Validação de campos obrigatórios e formatos

### 6.5 Módulos Administrativos

Acesso restrito a administradores:

#### Gestão de Usuários
- Criar, editar, excluir usuários
- Definir permissões de administrador
- Alterar senhas

#### Gestão de Materiais
- CRUD de materiais
- Associar materiais a tipos de produção
- Ativar/desativar materiais

#### Gestão de Designers
- CRUD de designers
- Informações de contato
- Ativar/desativar designers

#### Gestão de Vendedores
- CRUD de vendedores
- Informações de contato
- Ativar/desativar vendedores

#### Gestão de Formas de Envio
- CRUD de formas de envio
- Definir valores padrão

#### Gestão de Formas de Pagamento
- CRUD de formas de pagamento
- Definir descontos/acréscimos

#### Gestão de Templates
- Templates de ficha de serviço
- Templates de relatórios
- Customização de layouts

### 6.6 Relatórios

#### Relatório de Fechamentos
- Agrupamento por designer, cliente ou período
- Relatório analítico ou sintético
- Filtros por data e status
- Cálculo de totais (frete, serviços, total)
- Exportação em PDF
- Impressão direta

#### Relatório de Envios
- Agrupamento por forma de envio
- Filtro por data de entrega
- Lista de clientes e endereços
- Tipos de produção por pedido
- Observações importantes
- Exportação em PDF e impressão

### 6.7 Painel de Desempenho

- **Estatísticas Gerais**: Total de pedidos, valores, etc.
- **Gráficos**: Visualizações de dados
- **Filtros por Período**: Análise temporal
- **Métricas de Produção**: Tempo médio, produtividade por setor

### 6.8 Impressão

- **Ficha de Serviço**: Impressão individual por item
- **Lista de Produção**: Impressão em lote de múltiplos pedidos
- **Pedido Completo**: Impressão de todo o pedido
- **Layout Otimizado**: HTML/CSS otimizado para impressão

### 6.9 Notificações em Tempo Real

- **Polling HTTP**: Verificação periódica de novas notificações
- **WebSocket**: Conexão em tempo real para atualizações instantâneas
- **Toasts**: Notificações visuais de novas ações
- **Sincronização Automática**: Atualização automática da lista de pedidos

### 6.10 Configuração

- **Configuração de API**: Definir URL da API Python
- **Teste de Conexão**: Verificar conectividade com a API
- **Persistência**: Configuração salva via Tauri FS
- **Fallback**: Tela de configuração quando API não está acessível

---

## 7. API e Comunicação

### 7.1 Configuração da API

A URL da API Python é configurada através da interface (`ConfigApi`) e salva em arquivo local via Tauri FS. O arquivo de configuração é lido na inicialização da aplicação.

**Processo:**
1. Usuário informa URL da API (ex: `http://192.168.0.10:8000`)
2. Sistema testa conexão com endpoints `/health` e `/pedidos`
3. Se bem-sucedido, salva configuração via `saveConfig()`
4. Configuração é carregada em toda inicialização via `loadConfig()`

### 7.2 Cliente HTTP

O cliente HTTP é configurado em `services/apiClient.ts`:

- **Base URL**: Configurada dinamicamente via `setApiUrl()`
- **Interceptores**: Injeção automática de token Bearer
- **Adaptador Tauri**: Substitui adapter padrão do axios por `@tauri-apps/api/http`
- **Tratamento de Erros**: Notificação de falhas de rede

### 7.3 Endpoints Principais (API Python)

#### Autenticação
- `POST /auth/login` - Login do usuário
- `POST /auth/logout` - Logout
- `GET /auth/me` - Informações do usuário atual

#### Pedidos
- `GET /api/pedidos` - Listar pedidos (com filtros)
- `GET /api/pedidos/pendentes` - Pedidos pendentes (paginado)
- `GET /api/pedidos/prontos` - Pedidos prontos (paginado)
- `GET /api/pedidos/:id` - Buscar pedido por ID
- `POST /api/pedidos` - Criar pedido
- `PUT /api/pedidos/:id` - Atualizar pedido completo
- `PATCH /api/pedidos/:id/metadata` - Atualizar metadados
- `PATCH /api/pedidos/:id/status` - Atualizar status
- `DELETE /api/pedidos/:id` - Excluir pedido
- `GET /api/pedidos/:id/ficha` - Obter ficha do pedido

#### Clientes
- `GET /api/clientes` - Listar clientes
- `GET /api/clientes/:id` - Buscar cliente por ID
- `POST /api/clientes` - Criar cliente
- `PUT /api/clientes/:id` - Atualizar cliente
- `DELETE /api/clientes/:id` - Excluir cliente
- `POST /api/clientes/import` - Importar clientes em lote

#### Catálogos
- `GET /api/vendedores/ativos` - Listar vendedores ativos
- `GET /api/designers/ativos` - Listar designers ativos
- `GET /api/materiais/ativos` - Listar materiais ativos
- `GET /api/formas-envio/ativas` - Listar formas de envio ativas
- `GET /api/formas-pagamento/ativas` - Listar formas de pagamento ativas

#### Administrativo
- `GET /api/vendedores` - Listar todos os vendedores
- `POST /api/vendedores` - Criar vendedor
- `PUT /api/vendedores/:id` - Atualizar vendedor
- `DELETE /api/vendedores/:id` - Excluir vendedor
- (Mesmo padrão para designers, materiais, formas de envio, formas de pagamento, usuários)

#### Relatórios
- `POST /api/relatorios/fechamento` - Gerar relatório de fechamento
- `GET /api/pedidos/por-data-entrega` - Pedidos por data de entrega

#### Notificações
- `GET /api/notificacoes/ultimos` - Últimas notificações (polling)
- `WebSocket /ws/orders` - Conexão WebSocket para tempo real

### 7.4 WebSocket (Tempo Real)

O sistema utiliza WebSocket para atualizações em tempo real:

- **Endpoint**: `ws://<api_url>/ws/orders`
- **Autenticação**: Token na query string e mensagem `authenticate`
- **Eventos**:
  - `order_created`: Novo pedido criado
  - `order_updated`: Pedido atualizado
  - `order_deleted`: Pedido excluído
  - `order_status_updated`: Status do pedido alterado

**Implementação:**
- `lib/realtimeOrders.ts`: Gerenciador de WebSocket
- `hooks/useOrderEvents.ts`: Hook para eventos de pedidos
- `hooks/useRealtimeNotifications.ts`: Hook para notificações em tempo real
- `hooks/useOrderAutoSync.ts`: Sincronização automática do estado

### 7.5 Tipos de Dados

#### Request/Response Types (TypeScript)

Principais tipos definidos em `src/types/index.ts`:

- `OrderWithItems`: Pedido completo com itens
- `OrderItem`: Item de pedido
- `CreateOrderRequest`: Requisição de criação
- `UpdateOrderRequest`: Requisição de atualização
- `UpdateOrderStatusRequest`: Requisição de atualização de status
- `OrderFilters`: Filtros para busca
- `PaginatedOrders`: Resposta paginada
- `Cliente`: Dados de cliente
- `ReportRequestPayload`: Requisição de relatório
- `ReportResponse`: Resposta de relatório

---

## 8. Componentes e Páginas

### 8.1 Componentes Principais

#### OrderList.tsx
- **Propósito**: Lista principal de pedidos
- **Funcionalidades**: Tabela paginada, filtros, busca, ações em lote, impressão em lote
- **Estado**: Utiliza `orderStore` e estado local para filtros
- **Integração**: `api.getOrders`, `api.updateOrderStatus`, WebSocket para atualizações

#### CreateOrderComplete.tsx
- **Propósito**: Formulário completo de criação/edição de pedidos
- **Funcionalidades**: Múltiplos itens, diferentes tipos de produção, validação, cálculo de valores
- **Estado**: Estado local complexo com múltiplos itens
- **Integração**: `api.createOrder`, `api.updateOrder`

#### OrderViewModal.tsx
- **Propósito**: Visualização detalhada de pedido
- **Funcionalidades**: Exibição completa de dados, imagens, impressão, ficha de serviço
- **Estado**: Recebe pedido via props
- **Integração**: `printOrder`, `printOrderServiceForm`

#### OrderForm.tsx
- **Propósito**: Formulário simplificado de pedido
- **Funcionalidades**: Criação rápida de pedidos simples
- **Estado**: Estado local
- **Integração**: `api.createOrder`

#### FichaDeServico.tsx
- **Propósito**: Componente de ficha de serviço imprimível
- **Funcionalidades**: Layout otimizado para impressão, campos específicos por tipo
- **Estado**: Recebe item via props
- **Integração**: Utilizado em `OrderViewModal` e impressão

#### Componentes de Formulário por Tipo
- `FormPainelCompleto.tsx`: Formulário para painéis
- `FormLonaProducao.tsx`: Formulário para lonas
- `FormTotemProducao.tsx`: Formulário para totens
- `FormAdesivoProducao.tsx`: Formulário para adesivos

#### Componentes Auxiliares
- `ClienteAutocomplete.tsx`: Autocomplete de clientes
- `SelectDesigner.tsx`: Select de designers
- `SelectVendedor.tsx`: Select de vendedores
- `MedidasCalculator.tsx`: Calculadora de medidas

### 8.2 Páginas Principais

#### Login.tsx
- **Rota**: `/login`
- **Funcionalidade**: Tela de autenticação
- **Integração**: `api.login`, `authStore.login`
- **Proteção**: Redireciona para `/dashboard` se já autenticado

#### Dashboard.tsx
- **Rota**: `/dashboard/*`
- **Funcionalidade**: Shell principal da aplicação
- **Componentes**: Sidebar, Header, área de conteúdo
- **Rotas Internas**: Gerencia sub-rotas do dashboard
- **Proteção**: `PrivateRoute`

#### DashboardOverview.tsx
- **Rota**: `/dashboard`
- **Funcionalidade**: Visão geral com estatísticas e ações rápidas
- **Componentes**: Cards de estatísticas, lista de pedidos recentes

#### OrderList (via Dashboard)
- **Rota**: `/dashboard/orders`
- **Funcionalidade**: Lista de pedidos com todas as funcionalidades

#### CreateOrderComplete (via Dashboard)
- **Rota**: `/dashboard/orders/new` (criação)
- **Rota**: `/dashboard/orders/edit/:id` (edição)
- **Funcionalidade**: Formulário completo de pedido

#### Clientes.tsx
- **Rota**: `/dashboard/clientes`
- **Funcionalidade**: Gestão completa de clientes (CRUD)

#### Fechamentos.tsx
- **Rota**: `/dashboard/fechamentos`
- **Funcionalidade**: Relatórios de fechamento financeiro
- **Acesso**: Apenas administradores
- **Integração**: `api.generateReport`, `exportToPdf`

#### RelatoriosEnvios.tsx
- **Rota**: `/dashboard/relatorios-envios`
- **Funcionalidade**: Relatórios de envio por data
- **Integração**: `api.getOrdersByDeliveryDateRange`, `printEnvioReport`

#### PainelDesempenho.tsx
- **Rota**: `/dashboard/painel-desempenho`
- **Funcionalidade**: Analytics e métricas
- **Acesso**: Apenas administradores

#### Admin.tsx
- **Rota**: `/dashboard/admin`
- **Funcionalidade**: Hub de módulos administrativos
- **Acesso**: Apenas administradores
- **Módulos**: Links para todas as gestões administrativas

#### ConfigApi.tsx
- **Rota**: Exibida quando API não está configurada
- **Funcionalidade**: Configuração da URL da API
- **Integração**: `loadConfig`, `saveConfig`, `verifyApiConnection`

### 8.3 Componentes UI (Shadcn)

Todos os componentes base estão em `src/components/ui/`:

- `button.tsx`: Botões com variantes
- `input.tsx`: Campos de entrada
- `textarea.tsx`: Área de texto
- `select.tsx`: Dropdown select
- `table.tsx`: Tabelas
- `dialog.tsx`: Modais
- `toast.tsx`: Sistema de toasts
- `card.tsx`: Cards e containers
- `tabs.tsx`: Abas
- `popover.tsx`: Popovers
- `checkbox.tsx`: Checkboxes
- `label.tsx`: Labels
- `badge.tsx`: Badges de status
- `tooltip.tsx`: Tooltips
- `separator.tsx`: Separadores

---

## 9. Fluxos de Uso

### 9.1 Fluxo de Inicialização

1. **Aplicação inicia** (`main.tsx` → `App.tsx`)
2. **Carrega configuração** (`loadConfig()` via Tauri FS)
3. **Se configuração existe:**
   - Normaliza URL (`normalizeApiUrl()`)
   - Testa conexão (`verifyApiConnection()`)
   - Se OK: Configura `apiClient` e permite acesso
   - Se falha: Exibe `ConfigApi`
4. **Se configuração não existe:** Exibe `ConfigApi`
5. **Usuário configura API** (se necessário)
6. **Sistema inicializa:**
   - Hooks de notificação (`useNotifications()`)
   - Listener de eventos Tauri (`listen("novo_pedido")`)
   - Verificação de atualizações (`useAutoUpdateCheck()`)
7. **Usuário acessa `/login` ou é redirecionado**
8. **Após login:** Acesso ao dashboard

### 9.2 Fluxo de Autenticação

1. **Usuário acessa `/login`**
2. **Preenche credenciais** (username, password)
3. **Clica em "Entrar"**
4. **Sistema chama** `api.login(credentials)`
5. **API retorna:** `{ session_token, user_id, username, is_admin, expires_in }`
6. **Sistema:**
   - Salva token em `apiClient` (`setAuthToken()`)
   - Atualiza `authStore` (`login()`)
   - Persiste sessão em `localStorage`
7. **Redireciona para `/dashboard`**

### 9.3 Fluxo de Criação de Pedido

1. **Usuário clica em "Novo Pedido"** (sidebar ou dashboard)
2. **Sistema navega para** `/dashboard/orders/new`
3. **`CreateOrderComplete` é renderizado**
4. **Usuário preenche:**
   - Dados do cliente (autocomplete)
   - Datas (entrada, entrega)
   - Prioridade
   - Adiciona itens (um ou mais)
   - Para cada item: seleciona tipo de produção e preenche campos específicos
   - Forma de envio
   - Forma de pagamento
   - Frete
   - Observações
5. **Sistema valida:**
   - Campos obrigatórios
   - Datas coerentes
   - Valores não negativos
   - Pelo menos um item
6. **Usuário clica em "Salvar"**
7. **Sistema monta** `CreateOrderRequest`
8. **Chama** `api.createOrder(request)`
9. **API cria pedido e retorna** `OrderWithItems`
10. **Sistema:**
    - Atualiza `orderStore` (`addOrder()`)
    - Exibe toast de sucesso
    - Navega para `/dashboard/orders`
11. **WebSocket notifica** outros usuários (se conectados)

### 9.4 Fluxo de Atualização de Status

1. **Usuário visualiza lista de pedidos** (`/dashboard/orders`)
2. **Clica em checkbox de setor** (ex: "Financeiro")
3. **Sistema abre modal de confirmação**
4. **Usuário confirma**
5. **Sistema monta** `UpdateOrderStatusRequest` com:
   - `financeiro: true`
   - Outros setores mantidos
6. **Chama** `api.updateOrderStatus(request)`
7. **API atualiza status e recalcula** `pronto` e `status` principal
8. **Retorna pedido atualizado**
9. **Sistema:**
    - Atualiza `orderStore` (`updateOrder()`)
    - Atualiza UI
    - WebSocket notifica outros usuários

### 9.5 Fluxo de Impressão

#### Impressão Individual
1. **Usuário visualiza pedido** (`OrderViewModal`)
2. **Clica em "Imprimir"** ou "Ficha de Serviço"
3. **Sistema chama** `printOrder()` ou `printOrderServiceForm()`
4. **Função gera HTML** com layout otimizado
5. **Abre iframe** ou nova janela
6. **Chama** `window.print()`
7. **Usuário imprime** ou salva como PDF

#### Impressão em Lote
1. **Usuário seleciona múltiplos pedidos** (checkboxes na lista)
2. **Clica em "Imprimir Selecionados"**
3. **Sistema gera** `generatePrintList(selectedOrders)`
4. **HTML com múltiplos pedidos** em formato de lista
5. **Abre iframe** e chama `print()`

### 9.6 Fluxo de Relatório de Fechamento

1. **Usuário acessa** `/dashboard/fechamentos`
2. **Preenche filtros:**
   - Tipo de relatório (analítico/sintético)
   - Agrupamento (designer×cliente, cliente×designer, etc.)
   - Data inicial
   - Data final
   - Status
3. **Clica em "Gerar Relatório"**
4. **Sistema chama** `api.generateReport(filters)`
5. **API retorna** `ReportResponse` com grupos e totais
6. **Sistema processa** via `generateFechamentoReport()`
7. **Exibe relatório** formatado
8. **Usuário pode:**
   - Exportar PDF (`exportToPdf()`)
   - Imprimir diretamente

### 9.7 Fluxo de Notificações em Tempo Real

#### Polling HTTP
1. **Sistema inicia** `useNotifications()` hook
2. **A cada 5 segundos:**
   - Chama `GET /api/notificacoes/ultimos`
   - Compara `ultimo_id` recebido
   - Se novo ID: Emite evento Tauri `novo_pedido`
3. **`App.tsx` escuta** evento e exibe toast

#### WebSocket
1. **Sistema conecta** WebSocket em `lib/realtimeOrders.ts`
2. **Autentica** com token
3. **Escuta eventos:**
   - `order_created`, `order_updated`, `order_deleted`, `order_status_updated`
4. **`useRealtimeNotifications` hook:**
   - Recebe eventos
   - Filtra eventos do próprio usuário
   - Exibe toasts apropriados
   - Atualiza `orderStore` (via `useOrderAutoSync`)
5. **UI atualiza automaticamente**

---

## 10. Instalação e Configuração

### 10.1 Pré-requisitos

#### Software Necessário
- **Node.js** 18+ (https://nodejs.org/)
- **Rust** (última versão estável) (https://www.rust-lang.org/tools/install)
- **PostgreSQL** (ou Docker para rodar PostgreSQL)
- **pnpm** ou **npm** (gerenciador de pacotes)

#### Dependências do Sistema (Linux)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### 10.2 Instalação

#### 1. Clone/Navegue para o Projeto
```bash
cd /home/mateus/Projetcs/Testes/sgp_v4
```

#### 2. Instale Dependências
```bash
npm install
# ou
pnpm install
```

#### 3. Configure Variáveis de Ambiente (Opcional)
```bash
cp env.example .env
# Edite .env se necessário (normalmente não é necessário, configuração via UI)
```

#### 4. Inicie Banco de Dados (Docker)
```bash
npm run docker:up
```

#### 5. Inicie API Python (Separadamente)
```bash
# Em outro terminal, navegue até o projeto da API
cd /home/mateus/Projetcs/api-sgp
# Inicie a API (comando específico do projeto da API)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 10.3 Primeira Execução

1. **Execute a aplicação:**
   ```bash
   npm run tauri:dev
   ```

2. **Configure a API:**
   - A tela `ConfigApi` será exibida
   - Informe a URL da API (ex: `http://192.168.0.10:8000`)
   - Clique em "Testar Conexão"
   - Se OK, clique em "Salvar e Conectar"

3. **Faça Login:**
   - Acesse `/login`
   - Use credenciais do banco de dados
   - (Usuários padrão: `admin/admin123` ou `usuario/user123` - verificar no banco)

4. **Pronto!** Acesse o dashboard

### 10.4 Configuração do Banco de Dados

O banco de dados pode ser configurado via Docker ou manualmente.

#### Via Docker (Recomendado)
```bash
npm run docker:up          # Inicia PostgreSQL
npm run docker:logs        # Ver logs
npm run docker:down        # Para PostgreSQL
npm run docker:reset       # Reseta banco (remove volumes)
```

#### Manualmente
1. Instale PostgreSQL
2. Crie banco de dados:
   ```sql
   CREATE DATABASE sgp_database;
   ```
3. Execute scripts SQL em ordem:
   ```bash
   psql -U postgres -d sgp_database -f database/init.sql
   psql -U postgres -d sgp_database -f database/migrate_full_system.sql
   ```

### 10.5 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                 # Frontend apenas (web)
npm run tauri:dev          # App desktop completo

# Docker
npm run docker:up          # Iniciar banco
npm run docker:down        # Parar banco
npm run docker:logs        # Ver logs
npm run docker:reset       # Resetar banco

# Build
npm run build              # Build frontend
npm run tauri:build        # Build executável

# Qualidade
npm test                   # Testes
npm run lint               # Lint
npm run format             # Formatar código

# Banco de Dados
npm run db:psql            # Acessar PostgreSQL via Docker
```

---

## 11. Desenvolvimento

### 11.1 Estrutura de Código

#### Convenções
- **Componentes**: PascalCase (ex: `OrderList.tsx`)
- **Hooks**: camelCase com prefixo `use` (ex: `useNotifications.ts`)
- **Utilitários**: camelCase (ex: `exportUtils.ts`)
- **Tipos/Interfaces**: PascalCase (ex: `OrderWithItems`)
- **Constantes**: UPPER_SNAKE_CASE (ex: `POLLING_INTERVAL`)

#### Organização
- **Componentes de UI**: `src/components/ui/`
- **Componentes de Domínio**: `src/components/`
- **Páginas**: `src/pages/`
- **Serviços**: `src/services/`
- **Hooks**: `src/hooks/`
- **Utilitários**: `src/utils/`
- **Tipos**: `src/types/`
- **Estado Global**: `src/store/`

### 11.2 Adicionar Nova Funcionalidade

#### 1. Criar Endpoint na API
- Definir endpoint na API Python FastAPI
- Documentar request/response

#### 2. Adicionar Função em `api.ts`
```typescript
export async function minhaNovaFuncao(params: MyParams): Promise<MyResponse> {
  const token = requireSessionToken();
  const response = await apiClient.post('/api/minha-rota', params, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}
```

#### 3. Adicionar Tipos em `types/index.ts`
```typescript
export interface MyParams {
  campo1: string;
  campo2: number;
}

export interface MyResponse {
  resultado: string;
}
```

#### 4. Criar Componente/Página
- Criar componente em `src/components/` ou `src/pages/`
- Usar componentes Shadcn UI
- Integrar com `api.ts`

#### 5. Adicionar Rota (se necessário)
- Adicionar rota em `App.tsx` ou `Dashboard.tsx`
- Proteger com `PrivateRoute` se necessário

### 11.3 Debugging

#### Console do Navegador
- Abrir DevTools (F12 ou Ctrl+Shift+I)
- Ver erros no Console
- Inspecionar Network para requisições HTTP

#### DevTools do Tauri
```bash
# Habilitar DevTools em desenvolvimento
npm run tauri:dev
# DevTools abre automaticamente
```

#### Logs Rust
```bash
RUST_LOG=debug npm run tauri:dev
```

#### Logs do Banco
```bash
npm run docker:logs
```

### 11.4 Testes

```bash
# Executar testes
npm test

# Modo watch
npm test -- --watch

# Coverage
npm test -- --coverage
```

### 11.5 Linting e Formatação

```bash
# Verificar código
npm run lint

# Corrigir automaticamente
npm run lint -- --fix

# Formatar código
npm run format
```

---

## 12. Build e Deploy

### 12.1 Build de Desenvolvimento

```bash
# Build frontend apenas
npm run build

# Build gera arquivos em dist/
```

### 12.2 Build de Produção (Executável)

```bash
# Build completo (frontend + Tauri)
npm run tauri:build
```

#### Saída do Build
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Linux**: `src-tauri/target/release/bundle/deb/` ou `appimage/`

### 12.3 Configuração de Build

#### Tauri (`src-tauri/tauri.conf.json`)
- Configuração da janela
- Permissões
- Ícones
- Bundle settings

#### Vite (`vite.config.ts`)
- Configuração do build
- Plugins
- Aliases

### 12.4 Distribuição

1. **Build executável** (`npm run tauri:build`)
2. **Localizar arquivo** na pasta de bundle
3. **Distribuir** para usuários
4. **Instruir** configuração da API (primeira execução)

---

## Apêndices

### A. Tipos TypeScript Principais

Ver `src/types/index.ts` para definições completas.

#### Principais Interfaces
- `OrderWithItems`: Pedido completo
- `OrderItem`: Item de pedido
- `CreateOrderRequest`: Criação de pedido
- `UpdateOrderRequest`: Atualização de pedido
- `OrderFilters`: Filtros de busca
- `Cliente`: Dados de cliente
- `ReportResponse`: Resposta de relatório

### B. Variáveis de Ambiente

#### `.env` (Opcional)
```env
VITE_API_URL=http://192.168.0.10:8000
```

**Nota**: Normalmente a configuração é feita via UI (`ConfigApi`).

### C. Scripts SQL Importantes

- `database/init.sql`: Inicialização básica
- `database/migrate_full_system.sql`: Migração completa
- `database/migrate_timestamps.sql`: Correção de timestamps
- `database/admin_tables.sql`: Tabelas administrativas

### D. Recursos Externos

- **Shadcn UI**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com
- **Tauri**: https://tauri.app
- **React**: https://react.dev
- **FastAPI**: https://fastapi.tiangolo.com

---

## Conclusão

Esta documentação fornece uma visão completa do sistema SGP v4, cobrindo:

- ✅ Arquitetura e tecnologias
- ✅ Estrutura do projeto
- ✅ Banco de dados e schema
- ✅ Funcionalidades principais
- ✅ API e comunicação
- ✅ Componentes e páginas
- ✅ Fluxos de uso
- ✅ Instalação e configuração
- ✅ Desenvolvimento
- ✅ Build e deploy

**Use esta documentação como referência completa para entender, manter e expandir o sistema.**

---

**Versão da Documentação**: 1.0  
**Data**: 2024  
**Projeto**: SGP v4 - Sistema de Gerenciamento de Pedidos

