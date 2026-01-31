# Guia de Estilo PWA - SGP v4

Este guia define os padrões visuais para o PWA do SGP v4, garantindo consistência com a identidade visual da aplicação desktop.

## 1. Cores (Paleta Base)
O sistema utiliza um tema baseado em variáveis HSL do Shadcn UI. Para o mobile, os componentes devem seguir estas cores principais:

### Tema Claro (Light Mode)
- **Background**: `hsl(0, 0%, 100%)` (Branco)
- **Foreground**: `hsl(222.2, 84%, 4.9%)` (Azul Marinho quase preto)
- **Primary**: `hsl(221.2, 83.2%, 53.3%)` (Azul Vibrante)
- **Secondary**: `hsl(210, 40%, 96.1%)` (Cinza Azulado claro)
- **Muted**: `hsl(210, 40%, 96.1%)` (Cinza para textos menos importantes)
- **Destructive**: `hsl(0, 84.2%, 60.2%)` (Vermelho para alertas)
- **Border**: `hsl(214.3, 31.8%, 91.4%)` (Cinza claro para bordas)

### Tema Escuro (Dark Mode) - Obrigatório
- **Background**: `hsl(222.2, 84%, 4.9%)`
- **Foreground**: `hsl(210, 40%, 98%)`
- **Primary**: `hsl(217.2, 91.2%, 59.8%)`
- **Secondary**: `hsl(217.2, 32.6%, 17.5%)`

## 2. Tipografia
- **Fonte Principal**: Sans-serif moderna (Inter ou Roboto, se disponível via Google Fonts).
- **Estilo de Texto**:
  - `Titles`: Semibold/Bold.
  - `Labels/Inputs`: **Obrigatório o uso de Uppercase** para consistência com o desktop (exceto senhas e campos numéricos).
  - `Cards`: Conteúdo informativo deve usar fontes legíveis em telas pequenas (mínimo 14px).

## 3. Elementos de Interface (UI)
- **Border Radius**: Padrão de `0.5rem` (8px), seguindo a variável `--radius` do desktop.
- **Sombra (Elevation)**:
  - Usar sombras suaves para separar os cards do fundo (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1)`).
- **Scrollbars**: No mobile, esconder barras nativas ou usar a `custom-scrollbar` fina do projeto (5px).

## 4. Componentes Chave no Mobile
- **Cards de Pedido**:
  - Título (Número do Pedido) em destaque.
  - Badge de Status com cor correspondente (ex: Azul para Pendente, Verde para Concluído).
  - Ícones da biblioteca **Lucide React**.
- **Inputs de Busca**:
  - Devem ocupar 100% da largura da tela.
  - Placeholder em Uppercase.
- **Modais/Sheets**:
  - Para detalhes de pedidos, prefira usar `Sheets` (gavetas que abrem de baixo para cima) em vez de `Dialogs` centrais, para melhor UX mobile.

## 5. Mockup / Inspiração
O app deve parecer uma versão simplificada e vertical do Dashboard desktop:
- Navbar fixo no topo com o logo "S.G.P".
- Lista de pedidos em blocos (Cards) com espaçamento de `1rem`.
- Tema que se adapta automaticamente à configuração do sistema do usuário.
