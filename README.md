# SGP v4 - Sistema de Gerenciamento de Pedidos

Sistema desktop completo para gerenciamento de pedidos, construído com React, Tauri v2 e integração com API Python FastAPI.

## 🎯 Contexto Principal do Projeto

### Ambiente de Desenvolvimento e Build

- **Desenvolvimento**: Linux
- **Build de Produção**: Windows 10
- **Cliente Frontend**: Gerado pelo Tauri
- **Comunicação**: Exclusivamente via requisições HTTP do frontend para uma API Python que roda em outro computador

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    AMBIENTE DE DESENVOLVIMENTO              │
│                         (Linux)                             │
│                                                              │
│  ┌─────────────┐                                            │
│  │   React +   │  ──── Tauri v2 ────►  Build Windows 10    │
│  │   Tauri     │                                            │
│  │ (Frontend)  │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │ (Comunicação exclusiva)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    OUTRO COMPUTADOR                          │
│                                                              │
│  ┌──────────────┐                                           │
│  │   FastAPI    │  ◄─────── Requisições HTTP ────────────┐ │
│  │   (Python)   │                                          │ │
│  └──────────────┘                                          │ │
│         │                                                   │ │
│         ▼                                                   │ │
│  ┌──────────────┐                                          │ │
│  │  PostgreSQL  │                                          │ │
│  │  (Database)  │                                          │ │
│  └──────────────┘                                          │ │
└─────────────────────────────────────────────────────────────┘
```

### Características Importantes

1. **Tauri como Gerador de Cliente**: O Tauri v2 é usado exclusivamente para gerar o cliente desktop (frontend), não há comunicação direta entre Tauri e o backend.

2. **Comunicação HTTP Pura**: Toda a comunicação é feita via requisições HTTP do frontend React diretamente para a API Python, sem intermediários.

3. **Arquitetura Distribuída**: 
   - Frontend (Tauri/React) roda no computador do usuário
   - Backend (FastAPI/Python) roda em outro computador na rede
   - Comunicação via rede HTTP

4. **Build Cross-Platform**: 
   - Desenvolvido no Linux
   - Build gerado para Windows 10
   - Tauri permite gerar builds para diferentes plataformas

## 🛠 Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Tauri v2** - Framework para aplicações desktop multiplataforma
- **Shadcn UI** - Componentes modernos e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Navegação
- **Zustand** - Gerenciamento de estado
- **Vite** - Bundler
- **Axios** - Cliente HTTP (com adaptador Tauri)

### Backend (Outro Computador)
- **Python FastAPI** - API REST
- **PostgreSQL** - Banco de dados

## 📦 Requisitos

### Para Desenvolvimento (Linux)
- Node.js 18+
- Rust (última versão estável)
- pnpm
- Dependências do sistema (WebKit, GTK, etc.)

### Para Build (Windows 10)
- Tauri CLI configurado para gerar builds Windows
- Certificados para assinatura (se necessário)

### Para Execução
- API Python FastAPI rodando em outro computador acessível via rede
- Conexão de rede entre o cliente e o servidor da API

## 🚀 Início Rápido

### Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Executar em modo desenvolvimento
pnpm run tauri:dev
```

### Build para Windows 10

```bash
# Gerar build para Windows
pnpm run tauri:build
```

O executável será gerado em `src-tauri/target/release/`.

## 📚 Documentação Completa

Para documentação detalhada, consulte:
- [Documentação Completa](./documentation/README.md)
- [Guia de Instalação](./documentation/INSTALACAO.md)
- [Troubleshooting](./documentation/TROUBLESHOOTING.md)

## ⚙️ Configuração

### Configuração da API

O frontend precisa ser configurado com a URL da API Python. Isso pode ser feito:
- Via interface de configuração na primeira execução
- Ou editando o arquivo de configuração em `src/utils/config.ts`

### Variáveis de Ambiente

Consulte `env.example` para variáveis de ambiente disponíveis.

## 🔧 Estrutura do Projeto

```
sgp_v4/
├── src/                    # Código fonte React/TypeScript
│   ├── components/         # Componentes React
│   ├── pages/             # Páginas da aplicação
│   ├── services/           # Serviços (API client, adaptadores)
│   ├── store/             # Estado global (Zustand)
│   └── utils/             # Utilitários
├── src-tauri/             # Código Rust do Tauri
│   ├── src/               # Código Rust
│   └── tauri.conf.json    # Configuração do Tauri
├── documentation/          # Documentação detalhada
└── database/               # Scripts SQL
```

## 📝 Notas Importantes

- **Não há comunicação Rust ↔ Python**: Toda comunicação é React ↔ FastAPI via HTTP
- **Tauri v2**: Projeto totalmente migrado para Tauri v2
- **Cross-compilation**: Build Windows gerado a partir do Linux
- **Rede**: Cliente e servidor devem estar na mesma rede ou acessíveis via IP

## 📄 Licença

[Adicione informações de licença aqui]

