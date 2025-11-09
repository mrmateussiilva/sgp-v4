# 📊 Schema Completo do Sistema - SGP v4 Migrado

## 🗂️ Estrutura de Dados Completa

### 📋 Tabelas Principais

#### 1. **users** (existente)
```sql
- id: SERIAL PRIMARY KEY
- username: VARCHAR(100) UNIQUE NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- is_admin: BOOLEAN DEFAULT FALSE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 2. **orders** (pedidos - expandido)
```sql
- id: SERIAL PRIMARY KEY
- numero: VARCHAR(50) UNIQUE NOT NULL
- data_entrada: DATE NOT NULL
- data_entrega: DATE NOT NULL
- observacao: TEXT
- prioridade: VARCHAR(20) DEFAULT 'NORMAL' -- 'NORMAL', 'ALTA'
- status: VARCHAR(50) DEFAULT 'pendente' -- 'pendente', 'em_producao', 'pronto', 'entregue', 'cancelado'

-- Cliente
- cliente: VARCHAR(255) NOT NULL
- telefone_cliente: VARCHAR(50)
- cidade_cliente: VARCHAR(100)

-- Valores
- valor_total: DECIMAL(10, 2)
- valor_frete: DECIMAL(10, 2)
- valor_itens: DECIMAL(10, 2)
- tipo_pagamento: VARCHAR(100)
- obs_pagamento: TEXT

-- Envio
- forma_envio: VARCHAR(100)
- forma_envio_id: INTEGER REFERENCES envios(id)

-- Status de Produção (Kanban)
- financeiro: BOOLEAN DEFAULT FALSE
- conferencia: BOOLEAN DEFAULT FALSE
- sublimacao: BOOLEAN DEFAULT FALSE
- costura: BOOLEAN DEFAULT FALSE
- expedicao: BOOLEAN DEFAULT FALSE

-- Timestamps
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 3. **order_items** (itens do pedido - novo)
```sql
- id: SERIAL PRIMARY KEY
- order_id: INTEGER REFERENCES orders(id) ON DELETE CASCADE
- tipo_producao: VARCHAR(50) NOT NULL -- 'painel', 'totem', 'lona', 'almofada', 'bolsinha'
- descricao: TEXT NOT NULL
- largura: VARCHAR(20)
- altura: VARCHAR(20)
- metro_quadrado: VARCHAR(20)
- vendedor: VARCHAR(100)
- designer: VARCHAR(100)
- tecido: VARCHAR(100)

-- Acabamento (JSON ou campos separados)
- overloque: BOOLEAN DEFAULT FALSE
- elastico: BOOLEAN DEFAULT FALSE
- ilhos: BOOLEAN DEFAULT FALSE

- emenda: VARCHAR(20) -- 'sem-emenda', 'com-emenda'
- observacao: TEXT
- valor_unitario: DECIMAL(10, 2)
- imagem: TEXT -- base64 ou caminho

-- Campos específicos para totem
- ilhos_qtd: VARCHAR(20)
- ilhos_valor_unitario: DECIMAL(10, 2)
- ilhos_distancia: VARCHAR(20)

- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 4. **clientes** (novo)
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

#### 5. **materiais** (novo)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- description: TEXT
- tipo_producao: VARCHAR(50) NOT NULL -- 'painel', 'totem', 'lona', 'almofada', 'bolsinha'
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 6. **designers** (novo)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- email: VARCHAR(255)
- phone: VARCHAR(50)
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 7. **vendedores** (novo)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- email: VARCHAR(255)
- phone: VARCHAR(50)
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 8. **tecidos** (novo)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- description: TEXT
- gsm: INTEGER -- gramatura
- composition: TEXT -- composição
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 9. **envios** (formas de envio - novo)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- value: DECIMAL(10, 2)
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 10. **pagamentos** (formas de pagamento - novo)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- value: DECIMAL(10, 2) -- desconto/acréscimo se aplicável
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 11. **descontos** (novo)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- type: VARCHAR(50) -- 'percentual', 'valor_fixo'
- value: DECIMAL(10, 2)
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 12. **producoes** (tipos de produção - novo)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- description: TEXT
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## 🔄 Status do Sistema

### Status Principal (Kanban)
- **pendente** - Pedido criado
- **em_producao** - Em produção
- **pronto** - Produção finalizada
- **entregue** - Entregue ao cliente
- **cancelado** - Cancelado

### Status de Produção (Checkboxes)
- **financeiro** - Aprovado financeiramente
- **conferencia** - Conferido
- **sublimacao** - Sublimação concluída
- **costura** - Costura concluída
- **expedicao** - Pronto para expedição

## 📦 Tipos de Produção

- **painel** - Painéis
- **totem** - Totens
- **lona** - Lonas
- **almofada** - Almofadas
- **bolsinha** - Bolsinhas

## 🔗 Relacionamentos

```
users
  └── (não relacionado diretamente aos pedidos)

orders
  ├── order_items (1:N)
  ├── envios (N:1)
  └── clientes (via nome - pode ser FK futuramente)

order_items
  ├── materiais (via tipo_producao)
  ├── designers (via nome)
  ├── vendedores (via nome)
  └── tecidos (via nome)
```

## 🎯 Funcionalidades a Implementar

### Backend (Rust)
- [x] CRUD de Users
- [ ] CRUD de Orders (expandido)
- [ ] CRUD de Order Items
- [ ] CRUD de Clientes
- [ ] CRUD de Materiais
- [ ] CRUD de Designers
- [ ] CRUD de Vendedores
- [ ] CRUD de Tecidos
- [ ] CRUD de Envios
- [ ] CRUD de Pagamentos
- [ ] CRUD de Descontos
- [ ] CRUD de Produções
- [ ] Sistema de Relatórios
- [ ] Filtros Avançados
- [ ] Upload de Imagens
- [ ] Sistema de Cache

### Frontend (Shadcn UI)
- [x] Login
- [x] Dashboard básico
- [x] Lista de Pedidos (tabela)
- [ ] Kanban Board
- [ ] Formulário Completo de Pedidos
- [ ] Gestão de Clientes
- [ ] Páginas Admin (todas as entidades)
- [ ] Relatórios Avançados
- [ ] Filtros Avançados
- [ ] Upload de Imagens
- [ ] Calculadora de Áreas
- [ ] Sistema de Fechamento

## 📝 Próximos Passos

1. ✅ Analisar schema antigo
2. ⏳ Criar migration SQL
3. ⏳ Expandir models Rust
4. ⏳ Criar comandos Tauri
5. ⏳ Migrar componentes frontend

---

**Status:** Em desenvolvimento 🚧
**Última atualização:** 2025-01-14

