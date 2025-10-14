# SGP v4 - Sistema de Gerenciamento de Pedidos

Sistema desktop completo para gerenciamento de pedidos, construído com React, Tauri (Rust) e PostgreSQL.

## 📋 Índice

- **[🚀 Início Rápido](QUICKSTART.md)** ← Comece aqui!
- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Requisitos](#requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Executando o Projeto](#executando-o-projeto)
- [Build para Produção](#build-para-produção)
- [Testes](#testes)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Credenciais de Teste](#credenciais-de-teste)

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
- ✅ **Autenticação**: Login seguro com senhas criptografadas (bcrypt)
- ✅ **Filtros Avançados**: Por status, cliente ou data
- ✅ **Busca**: Localizar pedidos por nome de cliente ou ID
- ✅ **Exportação de Relatórios**: 
  - CSV (usando PapaParse)
  - PDF (usando jsPDF)
- ✅ **Status de Pedidos**: Pendente, Em Processamento, Concluído, Cancelado
- ✅ **Interface Responsiva**: Design moderno com Shadcn UI e Tailwind CSS
- ✅ **Notificações Toast**: Feedback visual elegante para ações do usuário
- ✅ **Sidebar Responsiva**: Navegação adaptável para desktop e mobile

## 🛠 Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Shadcn UI** - Componentes modernos e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **Radix UI** - Primitivos de UI sem estilos
- **Lucide React** - Ícones modernos
- **React Router** para navegação
- **Zustand** para gerenciamento de estado
- **Vite** como bundler

### Backend
- **Tauri 1.5** (Framework Rust para desktop)
- **SQLx** para integração com PostgreSQL
- **bcrypt** para hash de senhas
- **Serde** para serialização

### Banco de Dados
- **PostgreSQL** (via Docker ou instalado diretamente)

### Ferramentas
- **ESLint** e **Prettier** para formatação
- **Vitest** para testes
- **PapaParse** para exportação CSV
- **jsPDF** para exportação PDF

## 📦 Requisitos

Antes de começar, certifique-se de ter instalado:

1. **Node.js** (versão 18 ou superior)
   - Download: https://nodejs.org/

2. **Rust** (última versão estável)
   - Download: https://www.rust-lang.org/tools/install
   - No Linux/macOS: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
   - No Windows: Baixe o instalador no site oficial

3. **PostgreSQL** (versão 14 ou superior)
   
   **Opção 1: Usar Docker (Recomendado)** 🐳
   - Docker Desktop: https://www.docker.com/products/docker-desktop
   
   **Opção 2: Instalação Direta**
   - **Windows**: https://www.postgresql.org/download/windows/
   - **macOS**: `brew install postgresql@14` ou baixe do site oficial
   - **Linux (Ubuntu/Debian)**: 
     ```bash
     sudo apt update
     sudo apt install postgresql postgresql-contrib
     ```
   - **Linux (Arch)**: 
     ```bash
     sudo pacman -S postgresql
     sudo -u postgres initdb -D /var/lib/postgres/data
     sudo systemctl start postgresql
     sudo systemctl enable postgresql
     ```

4. **Dependências do Sistema** (Linux)
   - Ubuntu/Debian:
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
   - Arch Linux:
     ```bash
     sudo pacman -S webkit2gtk base-devel curl wget openssl gtk3 libappindicator-gtk3 librsvg
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

**Nota sobre Shadcn UI:** As dependências do Shadcn UI já estão incluídas no `package.json`. Os componentes UI foram pré-configurados na pasta `src/components/ui/`.

### 3. Configure o PostgreSQL

**📖 Guia detalhado:** Consulte [DOCKER.md](DOCKER.md) para instruções completas sobre Docker.

#### Opção A: Usar Docker (Mais Fácil) 🐳

```bash
# 1. Copiar arquivo de configuração
cp src-tauri/.env.example src-tauri/.env

# 2. Iniciar PostgreSQL no Docker
npm run docker:up

# 3. Verificar se está rodando
docker-compose ps
```

Pronto! O banco de dados está configurado e rodando. Pule para a seção [Executando o Projeto](#-executando-o-projeto).

**Comandos úteis:**
```bash
npm run docker:up        # Iniciar banco
npm run docker:down      # Parar banco
npm run docker:logs      # Ver logs
npm run docker:reset     # Resetar banco (apaga dados!)
npm run docker:pgadmin   # Iniciar com interface web
npm run db:psql          # Acessar banco via terminal
```

#### Opção B: PostgreSQL Instalado Localmente

#### 3.1. Inicie o Serviço PostgreSQL

**Windows:**
- O serviço inicia automaticamente após a instalação

**macOS:**
```bash
brew services start postgresql@14
```

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Para iniciar automaticamente no boot
```

#### 3.2. Acesse o PostgreSQL

```bash
# Tornar-se o usuário postgres
sudo -u postgres psql
```

#### 3.3. Crie o Banco de Dados e Usuário

Execute os seguintes comandos no console do PostgreSQL:

```sql
-- Criar banco de dados
CREATE DATABASE sgp_database;

-- Criar usuário (opcional, pode usar o usuário postgres)
CREATE USER sgp_user WITH PASSWORD 'sua_senha_segura';

-- Dar permissões ao usuário
GRANT ALL PRIVILEGES ON DATABASE sgp_database TO sgp_user;

-- Sair do console
\q
```

#### 3.4. Execute o Script de Inicialização

```bash
# Executar o script init.sql para criar as tabelas e dados de teste
psql -U postgres -d sgp_database -f database/init.sql

# Ou se criou um usuário específico:
psql -U sgp_user -d sgp_database -f database/init.sql
```

### 4. Configure as Variáveis de Ambiente

Se você usou Docker, o arquivo `.env` já foi criado com as configurações corretas.

Se instalou PostgreSQL localmente, edite o arquivo `src-tauri/.env`:

```bash
cp src-tauri/.env.example src-tauri/.env
```

Edite com suas credenciais:

```env
# Para Docker (já configurado)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sgp_database

# Para PostgreSQL local
DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/sgp_database

# Se criou um usuário específico:
# DATABASE_URL=postgresql://sgp_user:sua_senha_segura@localhost:5432/sgp_database
```

**Importante:** Substitua `sua_senha` pela senha real do PostgreSQL.

## 🎮 Executando o Projeto

### Modo Desenvolvimento

**Com Docker:**
```bash
# 1. Certifique-se que o banco está rodando
npm run docker:up

# 2. Execute o aplicativo
npm run tauri:dev
```

**Sem Docker:**
```bash
# Certifique-se que PostgreSQL está rodando
sudo systemctl status postgresql  # Linux
# ou
brew services list  # macOS

# Execute o aplicativo
npm run tauri:dev
```

Isso irá:
1. Iniciar o servidor de desenvolvimento Vite (frontend)
2. Compilar e executar o backend Tauri
3. Abrir a janela do aplicativo desktop

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

## 🧪 Testes

### Executar Testes Unitários

```bash
npm test
```

### Executar Testes com Cobertura

```bash
npm run test:coverage
```

### Linting e Formatação

```bash
# Verificar erros de lint
npm run lint

# Formatar código
npm run format
```

## 📁 Estrutura do Projeto

```
sgp_v4/
├── database/
│   └── init.sql                 # Script de inicialização do banco
├── src/
│   ├── components/              # Componentes React
│   │   ├── ui/                  # Componentes Shadcn UI
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── separator.tsx
│   │   │   └── textarea.tsx
│   │   ├── OrderList.tsx
│   │   ├── OrderForm.tsx
│   │   └── OrderDetails.tsx
│   ├── hooks/                   # React Hooks customizados
│   │   └── use-toast.ts
│   ├── lib/                     # Bibliotecas e utilitários
│   │   └── utils.ts             # Função cn() para classes CSS
│   ├── pages/                   # Páginas principais
│   │   ├── Login.tsx
│   │   └── Dashboard.tsx
│   ├── services/                # Serviços e APIs
│   │   └── api.ts
│   ├── store/                   # Gerenciamento de estado (Zustand)
│   │   ├── authStore.ts
│   │   └── orderStore.ts
│   ├── tests/                   # Testes
│   │   ├── setup.ts
│   │   ├── OrderList.test.tsx
│   │   └── authStore.test.ts
│   ├── types/                   # Definições TypeScript
│   │   └── index.ts
│   ├── utils/                   # Utilitários
│   │   └── exportUtils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                # Estilos globais com Tailwind
├── src-tauri/
│   ├── src/
│   │   ├── commands/            # Comandos Tauri (handlers)
│   │   │   ├── auth.rs
│   │   │   ├── orders.rs
│   │   │   └── mod.rs
│   │   ├── db.rs               # Configuração do banco
│   │   ├── models.rs           # Modelos de dados
│   │   └── main.rs             # Entry point Rust
│   ├── icons/                   # Ícones do app
│   ├── Cargo.toml              # Dependências Rust
│   ├── tauri.conf.json         # Configuração Tauri
│   └── .env                     # Variáveis de ambiente (criar)
├── tailwind.config.js          # Configuração Tailwind CSS
├── postcss.config.js           # Configuração PostCSS
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔐 Credenciais de Teste

O sistema vem com usuários de teste pré-cadastrados:

| Usuário  | Senha     | Descrição |
|----------|-----------|-----------|
| admin    | admin123  | Administrador |
| usuario  | user123   | Usuário comum |

**Nota:** As senhas estão criptografadas com bcrypt no banco de dados.

## 📊 Dados de Teste

O script `init.sql` cria automaticamente:
- 2 usuários de teste
- 5 pedidos de exemplo com diferentes status
- Múltiplos itens associados aos pedidos

## 🔧 Solução de Problemas

### Erro de Conexão com PostgreSQL

**Problema:** `Error connecting to database`

**Solução:**
1. Verifique se o PostgreSQL está rodando: `sudo systemctl status postgresql`
2. Verifique as credenciais no arquivo `.env`
3. Teste a conexão: `psql -U postgres -d sgp_database`

### Erro ao Compilar Rust

**Problema:** Erros de compilação do Tauri

**Solução:**
1. Atualize o Rust: `rustup update`
2. Instale as dependências do sistema (veja seção de Requisitos)
3. Limpe o cache: `cargo clean` (dentro de `src-tauri/`)

### Erro ao Instalar Dependências Node

**Problema:** Falha ao executar `npm install`

**Solução:**
1. Limpe o cache: `npm cache clean --force`
2. Delete `node_modules` e `package-lock.json`
3. Execute: `npm install` novamente

### Porta 1420 em Uso

**Problema:** A porta do Vite já está em uso

**Solução:**
- Altere a porta no `vite.config.ts` e no `tauri.conf.json`

## 🌐 Variáveis de Ambiente

### src-tauri/.env

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/sgp_database
APP_ENV=development
```

## 📝 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                 # Frontend apenas
npm run tauri:dev          # App desktop completo

# Build
npm run build              # Build frontend
npm run tauri:build        # Build executável desktop

# Testes e Qualidade
npm test                   # Executar testes
npm run lint               # Verificar código
npm run format             # Formatar código

# Docker (PostgreSQL)
npm run docker:up          # Iniciar banco de dados
npm run docker:down        # Parar banco de dados
npm run docker:logs        # Ver logs do PostgreSQL
npm run docker:reset       # Resetar banco (apaga dados!)
npm run docker:pgadmin     # Iniciar com interface web
npm run db:psql            # Acessar PostgreSQL via terminal

# PostgreSQL Direto (sem Docker)
psql -U postgres           # Acessar PostgreSQL
\l                         # Listar bancos
\c sgp_database           # Conectar ao banco
\dt                        # Listar tabelas
\q                         # Sair
```

## 🎨 Shadcn UI & Design System

### Sobre o Shadcn UI

O projeto utiliza **Shadcn UI**, uma coleção de componentes reutilizáveis construídos com Radix UI e Tailwind CSS. Diferente de bibliotecas tradicionais, o Shadcn UI copia os componentes diretamente para o seu projeto, dando controle total sobre o código.

### Componentes Implementados

Todos os componentes estão em `src/components/ui/`:

- ✅ **Button** - Botões com múltiplas variantes
- ✅ **Card** - Cards para organização de conteúdo
- ✅ **Dialog** - Modais e dialogs
- ✅ **Input** - Campos de entrada
- ✅ **Label** - Labels para formulários
- ✅ **Select** - Dropdown select
- ✅ **Table** - Tabelas responsivas
- ✅ **Toast** - Sistema de notificações
- ✅ **Badge** - Badges de status
- ✅ **Separator** - Separadores visuais
- ✅ **Textarea** - Área de texto

### Customização de Cores

As cores são definidas por variáveis CSS em `src/index.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%;      /* Azul principal */
  --secondary: 210 40% 96.1%;        /* Cinza claro */
  --destructive: 0 84.2% 60.2%;      /* Vermelho */
  --muted: 210 40% 96.1%;            /* Cinza suave */
  /* ... outras cores */
}
```

Para alterar as cores do tema:
1. Edite as variáveis CSS em `src/index.css`
2. Use o formato HSL: `hue saturation lightness`
3. Não é necessário reiniciar o servidor

### Tailwind CSS

O projeto usa Tailwind CSS para estilização. Principais arquivos:

- **`tailwind.config.js`** - Configuração do Tailwind e extensões de tema
- **`postcss.config.js`** - Configuração do PostCSS
- **`src/index.css`** - Importações do Tailwind e variáveis globais

### Adicionando Novos Componentes Shadcn

Para adicionar novos componentes do Shadcn UI (caso necessário):

```bash
# Exemplo: adicionar componente de accordion
npx shadcn-ui@latest add accordion

# O componente será criado em src/components/ui/accordion.tsx
```

**Nota:** Os componentes principais já estão incluídos. Use este comando apenas para adicionar componentes extras.

### Recursos Visuais

- **Design Responsivo**: Adaptável a diferentes tamanhos de tela
- **Paleta de Cores Moderna**: Tons neutros com detalhes em azul
- **Badges de Status**: Cores semânticas para cada status de pedido
  - 🟡 Pendente (warning)
  - 🔵 Em Processamento (info)
  - 🟢 Concluído (success)
  - 🔴 Cancelado (destructive)
- **Sistema de Toasts**: Notificações elegantes com animações suaves
- **Dialogs Modernos**: Modais com animações e backdrop blur
- **Sidebar Responsiva**: Menu lateral que se adapta a mobile
- **Microinterações**: Hover states e transições suaves
- **Tipografia Clara**: Hierarquia visual bem definida
- **Acessibilidade**: Componentes Radix UI com suporte a teclado e leitores de tela

## 🔒 Segurança

- ✅ Senhas criptografadas com bcrypt
- ✅ Validação de inputs no frontend e backend
- ✅ Proteção contra SQL Injection (uso de prepared statements)
- ✅ Rotas protegidas com autenticação
- ✅ Estado de autenticação persistido localmente

## 📈 Escalabilidade

O projeto está estruturado para:
- Adicionar novos módulos facilmente
- Expandir o schema do banco de dados
- Implementar novos comandos Tauri
- Adicionar novos componentes React
- Integrar com APIs externas

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é um sistema proprietário desenvolvido para fins comerciais.

## 👨‍💻 Suporte

Para dúvidas ou problemas:
1. Verifique a seção de [Solução de Problemas](#-solução-de-problemas)
2. Consulte a documentação oficial:
   - [Tauri](https://tauri.app/)
   - [React](https://react.dev/)
   - [PostgreSQL](https://www.postgresql.org/docs/)
   - [Material-UI](https://mui.com/)

---

**Desenvolvido com ❤️ usando React, Tauri e PostgreSQL**

