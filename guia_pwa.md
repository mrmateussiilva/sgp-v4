# Guia de Implementação PWA - SGP v4

Este guia define as diretrizes para a criação da versão PWA (Progressive Web App) do Sistema de Gerenciamento de Pedidos, focada em dispositivos móveis (Android/iOS) para consulta e atualizações rápidas de produção.

## 1. Objetivo
Criar uma interface leve e responsiva para consulta rápida de pedidos. O PWA deve ser **100% leitura**, sem capacidade de alteração de dados ou status, servindo como uma ferramenta de visualização para vendedores e equipe de produção.

## 2. Funcionalidades Obrigatórias (PWA)

- **Autenticação Segura**: Login via JWT para acesso aos dados.
- **Dashboard de Consulta**:
  - Resumo de pedidos do dia (Entregas e Entradas).
  - Indicadores de volume de produção (apenas visualização).
- **Listagem de Pedidos**:
  - Filtros por Status (Pendente, Em Produção, Pronto, Concluído).
  - Busca por número do pedido ou nome do cliente.
- **Visualização Detalhada do Pedido**:
  - Exibição de todos os itens e especificações técnicas.
  - Galeria de imagens dos itens.
  - Consulta detalhada dos checkboxes de status (apenas leitura do que foi marcado no desktop).
  - Visualização de observações.

## 3. Funcionalidades Excluídas (Somente Desktop)

- **TODAS as ações de escrita**: Criação, edição, exclusão ou atualização de qualquer campo.
- **Alteração de Status**: Checkboxes de produção (Financeiro, Costura, etc.) são apenas leitura no PWA.
- **Gestão Administrativa**: Configurações, materiais, usuários e templates.
- **Relatórios Analíticos**: Geração de PDFs e fechamentos financeiros.
- **Importação/Exportação**: Processamento de arquivos CSV.

## 4. Fluxo Principal do Usuário

### Consulta de Status e Itens
1. Usuário realiza o login.
2. Filtra a lista pelo cliente ou status desejado.
3. Clica no pedido para visualizar os detalhes técnicos e fotos.
4. Verifica em qual setor o pedido está (conforme marcado no sistema desktop).
5. Encerra a consulta (sem realizar nenhuma ação no sistema).

## 5. Permissões por Tipo de Usuário

No PWA, o nível de acesso é unificado para consulta, mudando apenas a visibilidade baseada no vínculo (se aplicável).

| Perfil | Acesso no PWA |
| :--- | :--- |
| **Geral (Produção/Vendas)** | **Leitura Total**: Pode visualizar qualquer pedido e seus detalhes. |

## 6. Requisitos Não Funcionais

- **Performance**: Foco em carregamento rápido da lista de pedidos.
- **Segurança**: Acesso restrito via API pública (VPS) com autenticação.
- **Offline (Desejável)**: Cache de pedidos consultados para visualização sem sinal de rede.
- **Mobile-First**: Interface otimizada exclusivamente para telas pequenas.

## 7. APIs Necessárias (Backend Público - VPS)

A API da VPS deve disponibilizar apenas métodos `GET`.

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Autenticação para acesso à API. |
| `GET` | `/api/pedidos` | Lista de pedidos com filtros e busca. |
| `GET` | `/api/pedidos/{id}` | Detalhes completos e itens do pedido. |
| `GET` | `/api/stats/summary` | Dados resumidos para o dashboard inicial. |

---
**Importante**: O PWA deve ser construído para garantir que, no nível do Frontend, não existam componentes de interação (botões de salvar, checkboxes clicáveis ou inputs). Toda a inteligência de alteração reside exclusivamente no sistema Desktop (Intranet).
