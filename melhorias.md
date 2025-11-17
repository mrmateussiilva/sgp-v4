# Melhorias recomendadas

## 1. Confiabilidade e testes
- Mockar `@/services/api` e `ordersSocket` nos testes de `OrderList` para evitar chamadas reais e permitir que `pnpm test --run` passe sem depender de sessão.
- Atualizar asserções dos testes para refletir o texto real da UI (“Sistema de Gerenciamento de Pedidos”), evitando falsos negativos quando o layout muda.
- Considerar adicionar testes para fluxos críticos (login, logout, filtros) com stores mockados para garantir que futuras refatorações não quebrem o app desktop.

## 2. Arquitetura do serviço de API
- Dividir `src/services/api.ts` por domínio (pedidos, cadastros, relatórios) e mover os mapeamentos de DTOs para arquivos específicos; isso reduz conflitos e facilita testes unitários.
- Expor endpoints reais de paginação/filtragem no backend e ajustar `getPendingOrdersPaginated`, `getReadyOrdersPaginated` e `getOrdersWithFilters` para não carregar todos os pedidos na memória do cliente.
- Centralizar o tratamento de erros HTTP (principalmente 401/403) no interceptor de `apiClient`, disparando `onApiFailure`, limpando o store e notificando o usuário automaticamente.

## 3. Estado e UX em tempo real
- Fazer o toggle de “tempo real” em `OrderList` realmente pausar/reiniciar `useOrderAutoSync` (desinscrever do websocket ou ignorar eventos enquanto o usuário edita).
- Registrar o número de assinantes/estado de conexão no Zustand para permitir que outros componentes exibam status consistente (hoje cada hook mantém seu próprio estado local).
- Envolver logs de depuração (`console.log` com ícones) em uma verificação de ambiente (`if (import.meta.env.DEV)`) ou usar um logger com níveis para evitar ruído em produção.

## 4. Consistência na autenticação
- Remover o parâmetro `sessionToken` dos métodos como `getMateriais`/`createMaterial` ou utilizá-lo de fato (chamando `setAuthToken(token)`) para permitir chamadas com tokens explícitos em testes/scripts.
- Garantir que `requireSessionToken` trate a expiração apenas uma vez e dispare um evento global; componentes como `OrderList` não deveriam duplicar esse código.

## 5. Configuração e observabilidade
- Validar `VITE_ANALYTICS_API_URL` no bootstrap do app (falhar cedo com mensagem clara quando estiver vazio) e considerar uma tela de diagnóstico para APIs auxiliares.
- Adicionar métricas/telemetria básica (contagem de falhas de sincronização, tempo médio de carregamento de pedidos) para facilitar troubleshooting no ambiente desktop.

## 6. Documentação e DX
- Documentar no README como iniciar o backend FastAPI para desenvolvimento local, já que o app depende dele para funcionar.
- Expandir `documentation/` com guias específicos (ex.: como configurar notificações em tempo real e requisitos de rede) e incluir uma seção de “Testes conhecidos” com passos para rodar Vitest.
