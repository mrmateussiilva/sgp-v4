# Funcionalidades do Sistema SGP v4

## Visão Geral
Sistema desktop para gerenciamento de pedidos de produção, desenvolvido com React + Tauri v2. Comunica-se via HTTP com API Python FastAPI externa que gerencia PostgreSQL.

---

## 1. Autenticação e Acesso
- **Login/Logout**: Autenticação via sessão com tokens
- **Controle de acesso**: Rotas protegidas baseadas em autenticação
- **Permissões**: Diferenciação entre usuários comuns e administradores
- **Configuração de API**: Tela para configurar URL da API na primeira execução

---

## 2. Gestão de Pedidos

### 2.1 Criação de Pedidos
- Formulário completo para criar novos pedidos
- Múltiplos itens por pedido
- Diferentes tipos de produção (painel, totem, lona, adesivo, almofada, bolsinha)
- Campos específicos por tipo de produção
- Upload de imagens para itens
- Cálculo automático de valores
- Seleção de cliente (com autocomplete)
- Formas de envio e pagamento
- Datas de entrada e entrega
- Prioridades (NORMAL, ALTA)
- Observações e descrições

### 2.2 Listagem de Pedidos
- Tabela paginada com todos os pedidos
- Filtros por status, cliente, data, setores de produção
- Busca por texto (cliente, ID, número do pedido)
- Visualização de status de produção (checkboxes)
- Ordenação por diferentes colunas
- Seleção múltipla para ações em lote
- Visualização em modo Kanban (drag & drop)
- Atualização automática via WebSocket

### 2.3 Edição de Pedidos
- Edição completa de dados do pedido
- Edição rápida de metadados (cliente, datas, valores)
- Reabertura de pedidos concluídos
- Atualização de status de produção
- Modificação de itens
- Upload/remoção de imagens

### 2.4 Visualização de Pedidos
- Modal com informações completas
- Visualização de imagens dos itens
- Detalhes técnicos de cada item
- Valores e totais
- Histórico de alterações

### 2.5 Status de Produção
Acompanhamento através de checkboxes por setor:
- **Financeiro**: Aprovação financeira
- **Conferência**: Conferência de materiais/quantidades
- **Sublimação**: Processo de sublimação
- **Costura**: Processo de costura
- **Expedição**: Preparação para envio

Regras automáticas:
- Quando todos setores são marcados, status muda para "pronto"
- Ao desmarcar financeiro, outros setores são desmarcados
- Status principal calculado automaticamente

---

## 3. Gestão de Clientes
- CRUD completo (Criar, Listar, Editar, Excluir)
- Importação em lote via CSV
- Autocomplete em formulários
- Validação de campos obrigatórios
- Busca e filtros

---

## 4. Tela do Designer
- Workspace visual para designers
- Visualização de pedidos atribuídos
- Interface Kanban para organização
- Gestão de artes/imagens
- Status específicos para designer

---

## 5. Relatórios e Fechamentos

### 5.1 Relatórios de Envios
- Relatório de pedidos por envio
- Filtros por período e status
- Exportação em PDF/CSV

### 5.2 Fechamentos Financeiros
Sistema completo de relatórios analíticos e sintéticos:

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
- Exportação em PDF/CSV
- Visualização hierárquica (grupos e subgrupos)

---

## 6. Fichas de Serviço/Produção
- Geração de fichas de produção em PDF
- Template configurável
- Impressão individual ou em lote
- Integração com dados do pedido
- Editor de templates (administradores)

---

## 7. Painel de Desempenho (Admin)
- Gráficos e estatísticas
- Métricas de produção
- Análise de performance
- Dashboard com KPIs

---

## 8. Módulos Administrativos
Acesso restrito a administradores:

### 8.1 Gestão de Usuários
- Criar, editar, excluir usuários
- Definir permissões (admin/comum)
- Ativar/desativar usuários

### 8.2 Gestão de Materiais
- CRUD de materiais
- Categorização e organização

### 8.3 Gestão de Designers
- Cadastro de designers
- Associação com pedidos

### 8.4 Gestão de Vendedores
- Cadastro de vendedores
- Associação com pedidos

### 8.5 Gestão de Tipos de Produção
- Configuração de tipos (painel, totem, lona, etc.)
- Campos específicos por tipo

### 8.6 Gestão de Formas de Envio
- Cadastro de formas de envio
- Configuração de valores/descontos

### 8.7 Gestão de Formas de Pagamento
- Cadastro de formas de pagamento
- Configuração de valores/descontos

### 8.8 Gestão de Templates de Relatórios
- Configuração de templates para relatórios
- Personalização de formatos

---

## 9. Exportação e Impressão
- Exportação de pedidos em CSV
- Exportação de relatórios em PDF
- Impressão de fichas de serviço
- Impressão em lote
- Geração de PDFs com formatação profissional

---

## 10. Notificações em Tempo Real
- Atualizações via WebSocket
- Notificações toast para eventos
- Sincronização automática entre usuários
- Notificações de novos pedidos
- Atualização de status em tempo real

---

## 11. Sistema de Atualização
- Verificação automática de atualizações
- Download e instalação automática
- Controle de versão
- Tela de status de atualização

---

## 12. Interface e UX
- Design moderno com Shadcn UI e Tailwind CSS
- Tema claro/escuro
- Sidebar responsiva e colapsável
- Interface responsiva
- Componentes acessíveis
- Feedback visual (toasts, loading states)
- Navegação intuitiva
- Code splitting para performance

---

## 13. Busca e Filtros
- Busca global por texto
- Filtros avançados por múltiplos critérios
- Filtros por status
- Filtros por data (entrada/entrega)
- Filtros por cliente, vendedor, designer
- Filtros por tipo de produção
- Filtros por setores de produção
- Salvamento de filtros frequentes

---

## 14. Dashboard
- Visão geral do sistema
- Estatísticas rápidas
- Acesso rápido a funcionalidades principais
- Cards informativos
- Gráficos e métricas

---

## Tecnologias Principais
- **Frontend**: React 18, TypeScript, Tauri v2, Shadcn UI, Tailwind CSS
- **Estado**: Zustand
- **Navegação**: React Router
- **Comunicação**: HTTP/REST (Axios com adaptador Tauri)
- **Backend**: API Python FastAPI (externa)
- **Banco de Dados**: PostgreSQL (gerenciado pela API)
- **Tempo Real**: WebSocket
- **PDF**: React-PDF, PDFMake, jsPDF
- **Exportação**: CSV (Papaparse)

---

## Características Técnicas
- Aplicação desktop multiplataforma (Windows, Linux, macOS)
- Comunicação HTTP pura (sem comunicação Rust ↔ Python)
- Build cross-platform (desenvolvido no Linux, build para Windows)
- Sessões persistidas com expiração
- Autenticação via Bearer Token
- Paginação para performance
- Lazy loading de rotas
- Tratamento de erros robusto
- Validação de dados no frontend e backend
