# 🚀 Melhorias Sugeridas para o SGP v4

Este documento detalha as áreas de melhoria identificadas após análise do código fonte, complementando o `MELHORIAS_PROJETO.md` já existente.

## 🚨 1. Segurança (Alta Prioridade)

### 1.1 Content Security Policy (CSP) Permissiva
O arquivo `src-tauri/tauri.conf.json` está configurado com `http://*:*` e `https://*:*`.
- **Risco**: Permite que a aplicação carregue scripts e recursos de qualquer origem, facilitando ataques XSS.
- **Sugestão**: Restringir para domínios específicos (ex: API do backend, serviços de autenticação) ou usar `connect-src` apenas para IPs da rede local se necessário.

## 🏗️ 2. Arquitetura e Organização

### 2.1 Refatoração do "God Component" (`CreateOrderComplete.tsx`)
O arquivo possui **~3.500 linhas**. Ele mistura:
- Lógica de formulário complexa.
- Regras de negócio de validação.
- Manipulação de abas/itens.
- Renderização de UI.
- Funções utilitárias duplicadas (`formatCurrencyValue`, `parseLocaleNumber`).

**Sugestão de Refatoração**:
1.  **Custom Hooks**: Extrair lógica para `src/hooks/orders/`.
    -   `useOrderForm.ts`: Gestão do estado do formulário principal.
    -   `useOrderTabs.ts`: Gestão das abas de itens.
    -   `useOrderCalculations.ts`: Cálculos de totais e preços.
2.  **Componentização**: Quebrar o render em componentes menores em `src/components/orders/`.
    -   `OrderFormHeader.tsx`
    -   `OrderItemTabs.tsx`
    -   `OrderSummary.tsx`
3.  **Utils**: Mover funções de formatação para `src/utils/formatters.ts` e reutilizar em todo o projeto.

### 2.2 Modularização do Serviço de API (`src/services/api.ts`)
O arquivo `api.ts` tem **~3.000 linhas** e mistura:
- Definição de Tipos e Interfaces.
- Configuração do Axios.
- Mappers de dados (API <-> Frontend).
- Chamadas de API para *todos* os domínios (clientes, pedidos, produtos).

**Sugestão**:
-   Criar pasta `src/api/`.
    -   `client.ts`: Configuração base do Axios.
    -   `endpoints/orders.ts`: Rotas de pedidos.
    -   `endpoints/products.ts`: Rotas de produtos.
    -   `mappers/`: Funções de transformação de dados.
    -   `types/`: Interfaces separadas (ou mover para `src/types/` globalmente).

## 💎 3. Qualidade de Código e Manutenibilidade

### 3.1 Tipagem (TypeScript)
-   Uso excessivo de `any` em `api.ts` (ex: `deriveQuantity(source: any)`).
-   **Ação**: Definir interfaces estritas para as respostas da API e evitar casting forçado (`as unknown as ...`).

### 3.2 Padronização de Logging
-   Ainda existem muitos `console.log` espalhados (ex: `CreateOrderComplete.tsx`), apesar da existência de `src/utils/logger.ts`.
-   **Ação**: Substituir chamadas diretas de `console` pelo `logger` para garantir que logs de debug não vazem em produção.

### 3.3 Centralização de Utilitários
-   Detectada duplicação de funções de formatação de moeda e data (`formatCurrencybr`, `toDateInputValue`) dentro de componentes.
-   **Ação**: Centralizar em `src/utils/date.ts` e `src/utils/currency.ts` (ou `formatters.ts`).

## ⚡ 4. Performance

### 4.1 React Query (TanStack Query)
Atualmente o gerenciamento de estado assíncrono é feito manualmente com `useEffect` e `useState` (ex: `isLoadingOrder`).
-   **Problema**: Boilerplate excessivo, risco de race conditions, falta de cache automático.
-   **Sugestão**: Migrar chamadas GET para `useQuery` e POST/PUT para `useMutation`. Isso simplificará drasticamente componentes como `CreateOrderComplete.tsx`.

### 4.2 Re-renders Desnecessários
-   O componente gigante `CreateOrderComplete` provavelmente renderiza a árvore inteira ao digitar um caractere em um input.
-   **Sugestão**: Com a quebra em sub-componentes, usar `React.memo` e composição para isolar renderizações.
