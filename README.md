# SGP v4 - Sistema de Gerenciamento de Pedidos

Sistema desktop completo para gerenciamento de pedidos, construído com React, Tauri e integração com API Python FastAPI.

## ⚠️ MUDANÇA DE ARQUITETURA

**ATUALIZAÇÃO IMPORTANTE:** O backend Rust foi substituído por uma arquitetura baseada em API HTTP. O React agora se comunica diretamente com uma API Python FastAPI externa localizada em `/home/mateus/Projetcs/api-sgp`.

### Nova Arquitetura

```
┌─────────────┐         HTTP/REST         ┌──────────────┐
│   React +   │ ◄───────────────────────► │  FastAPI     │
│   Tauri     │     (192.168.0.10:8000)   │  (Python)    │
│  (Frontend) │                            │  (Backend)   │
└─────────────┘                            └──────────────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │  PostgreSQL  │
                                            │  (Database)  │
                                            └──────────────┘
```

## 📋 Índice

- **[🚀 Início Rápido](#-início-rápido)** ← Comece aqui!
- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Requisitos](#requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Executando o Projeto](#executando-o-projeto)
- [Build para Produção](#build-para-produção)
- [Estrutura do Projeto](#estrutura-do-projeto)

## 🎯 Sobre o Projeto

O SGP v4 é um sistema desktop para gerenciamento de pedidos, onde cada pedido é representado como uma "ficha" individual com informações completas sobre cliente, itens, valores e status. O sistema oferece uma interface moderna e intuitiva, com recursos de exportação de relatórios e autenticação segura.

## ✨ Funcionalidades

### Gestão de Pedidos
- ✅ **Cadastro de Pedidos**: Criar novos pedidos com múltiplos itens
- ✅ **Listagem de Pedidos**: Visualizar todos os pedidos com filtros e busca
- ✅ **Edição de Pedidos**: Modificar pedidos existentes
- ✅ **Exclusão de Pedidos**: Remover pedidos com confirmação
- ✅ **Visualização Detalhada**: Modal com informações completas do pedido
- ✅ **Paginação**: Listagem paginada para melhor performance

### Recursos Adicionais
- ✅ **Autenticação**: Login seguro via API HTTP
- ✅ **Filtros Avançados**: Por status, cliente ou data
- ✅ **Busca**: Localizar pedidos por nome de cliente ou ID
- ✅ **Exportação de Relatórios**: CSV e PDF
- ✅ **Status de Pedidos**: Pendente, Em Processamento, Concluído, Cancelado
- ✅ **Interface Responsiva**: Design moderno com Shadcn UI e Tailwind CSS
- ✅ **Notificações Toast**: Feedback visual elegante para ações do usuário
- ✅ **Sidebar Responsiva**: Navegação adaptável para desktop e mobile

## 🛠 Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Tauri** - Framework para aplicações desktop multiplataforma
- **Shadcn UI** - Componentes modernos e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** para navegação
- **Zustand** para gerenciamento de estado
- **Vite** como bundler

### Backend
- **Python FastAPI** - API REST externa (`/home/mateus/Projetcs/api-sgp`)
- **PostgreSQL** - Banco de dados (gerenciado pela API Python)

## 📦 Requisitos

Antes de começar, certifique-se de ter instalado:

1. **Node.js** (versão 18 ou superior)
   - Download: https://nodejs.org/

2. **Rust** (última versão estável)
   - Download: https://www.rust-lang.org/tools/install
   - No Linux/macOS: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

3. **API Python FastAPI** rodando em `/home/mateus/Projetcs/api-sgp`

4. **Dependências do Sistema** (Linux)
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

## 🚀 Instalação e Configuração

### 1. Clone o Repositório

```bash
cd /home/mateus/Projetcs/Testes/sgp_v4
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure a URL da API

Copie o arquivo de exemplo:

```bash
cp env.example .env
```

Edite o arquivo `.env` e configure a URL da API Python:

```env
VITE_API_URL=http://192.168.0.10:8000
```

**Importante:** Ajuste o IP `192.168.0.10` para o IP da máquina onde a API Python está rodando.

### 4. Inicie a API Python (Backend)

Em outro terminal, navegue até o diretório da API e inicie:

```bash
cd /home/mateus/Projetcs/api-sgp
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 🎮 Executando o Projeto

### Modo Desenvolvimento

```bash
# Certifique-se que a API Python está rodando em http://192.168.0.10:8000

# Execute o aplicativo Tauri
npm run tauri:dev
```

Isso irá:
1. Iniciar o servidor de desenvolvimento Vite (frontend)
2. Compilar e executar o frontend Tauri
3. Abrir a janela do aplicativo desktop
4. Conectar-se à API Python via HTTP

### Executar Apenas o Frontend (Web)

```bash
npm run dev
```

Acesse: http://localhost:1420

## 📦 Build para Produção

### Gerar Executável

```bash
npm run tauri:build
```

Os executáveis serão gerados em:
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Linux**: `src-tauri/target/release/bundle/deb/` ou `appimage/`

## 📁 Estrutura do Projeto

```
sgp_v4/
├── src/
│   ├── components/              # Componentes React
│   │   ├── ui/                  # Componentes Shadcn UI
│   │   ├── OrderList.tsx
│   │   ├── OrderForm.tsx
│   │   └── OrderDetails.tsx
│   ├── pages/                   # Páginas principais
│   │   ├── Login.tsx
│   │   └── Dashboard.tsx
│   ├── services/                # Serviços e APIs
│   │   └── api.ts              # Cliente HTTP para API Python
│   ├── store/                   # Gerenciamento de estado (Zustand)
│   │   ├── authStore.ts
│   │   └── orderStore.ts
│   ├── types/                   # Definições TypeScript
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                # Estilos globais com Tailwind
├── src-tauri/
│   ├── src/
│   │   └── main.rs             # Entry point simplificado (sem backend)
│   ├── icons/                   # Ícones do app
│   ├── Cargo.toml              # Dependências Rust
│   └── tauri.conf.json         # Configuração Tauri
├── .env                         # Variáveis de ambiente (criar)
├── tailwind.config.js          # Configuração Tailwind CSS
├── postcss.config.js           # Configuração PostCSS
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## ⚙️ Configuração da API

### URL da API

A URL da API pode ser configurada de duas formas:

1. **Arquivo `.env`** (recomendado):
   ```env
   VITE_API_URL=http://192.168.0.10:8000
   ```

2. **Variável de ambiente do sistema**:
   ```bash
   export VITE_API_URL=http://192.168.0.10:8000
   ```

### Autenticação

O sistema usa Bearer Token para autenticação. O token é enviado no header `Authorization` de todas as requisições:

```javascript
headers: {
  'Authorization': 'Bearer <session_token>'
}
```

## 🔧 Solução de Problemas

### Erro de Conexão com a API

**Problema:** `Error: Failed to fetch` ou erro 404

**Solução:**
1. Verifique se a API Python está rodando: `curl http://192.168.0.10:8000/health`
2. Verifique a URL no arquivo `.env`
3. Ajuste o IP se necessário (não pode ser `localhost` em ambiente de rede)

### Erro ao Compilar Rust

**Problema:** Erros de compilação do Tauri

**Solução:**
1. Atualize o Rust: `rustup update`
2. Instale as dependências do sistema (veja seção de Requisitos)
3. Limpe o cache: `cargo clean` (dentro de `src-tauri/`)

### Porta 1420 em Uso

**Problema:** A porta do Vite já está em uso

**Solução:**
- Altere a porta no `vite.config.ts` e no `tauri.conf.json`

## 🌐 Variáveis de Ambiente

### .env (raiz do projeto)

```env
# URL da API Python FastAPI
VITE_API_URL=http://192.168.0.10:8000
```

## 📝 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                 # Frontend apenas (web)
npm run tauri:dev          # App desktop completo

# Build
npm run build              # Build frontend
npm run tauri:build        # Build executável desktop

# Testes e Qualidade
npm test                   # Executar testes
npm run lint               # Verificar código
npm run format             # Formatar código

# Iniciar API Python (em outro terminal)
cd /home/mateus/Projetcs/api-sgp
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 🔒 Segurança

- ✅ Autenticação via Bearer Token
- ✅ Validação de inputs no frontend
- ✅ Comunicação HTTPS (recomendado em produção)
- ✅ Rotas protegidas com autenticação
- ✅ Estado de autenticação persistido localmente

## 📈 Endpoints da API

A API deve fornecer os seguintes endpoints:

### Autenticação
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout

### Pedidos
- `GET /orders` - Listar pedidos
- `GET /orders/:id` - Buscar pedido por ID
- `POST /orders` - Criar pedido
- `PUT /orders/:id` - Atualizar pedido
- `DELETE /orders/:id` - Excluir pedido

### Clientes
- `GET /clientes` - Listar clientes
- `POST /clientes` - Criar cliente
- `PUT /clientes/:id` - Atualizar cliente
- `DELETE /clientes/:id` - Excluir cliente

### Catálogos
- `GET /vendedores/ativos` - Listar vendedores ativos
- `GET /designers/ativos` - Listar designers ativos
- `GET /materiais/ativos` - Listar materiais ativos
- `GET /formas-envio/ativas` - Listar formas de envio
- `GET /formas-pagamento/ativas` - Listar formas de pagamento

### Relatórios
- `POST /reports/generate` - Gerar relatório

Consulte a documentação da API Python para detalhes completos dos endpoints.

---

**Desenvolvido com ❤️ usando React, Tauri e FastAPI**
