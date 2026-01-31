# Plano de Melhorias e Otimizações - SGP v4

Este documento apresenta uma análise técnica do projeto SGP v4 e propõe melhorias estratégicas para aumentar a performance, manutenibilidade e escalabilidade do sistema.

## 1. Arquitetura e Estrutura de Código

### 🏗️ Finalização da Refatoração de API
- **Situação Atual**: Existe um arquivo `src/services/api.ts` marcado como "legacy" que serve como fachada.
- **Melhoria**: Migrar todas as chamadas restantes para os módulos específicos em `src/api/endpoints/`.
- **Benefício**: Elimina o acoplamento com o arquivo legível e centraliza a lógica de tipos.

### 🧩 Abstração da Lógica no `App.tsx`
- **Situação Atual**: O `App.tsx` contém muita lógica de inicialização (verificação de conexão, changelog, listeners).
- **Melhoria**: Criar hooks especializados como `useAppInitialization` ou `useConnectionManager`.
- **Benefício**: Facilita o teste unitário da lógica de inicialização e simplifica o componente principal.

---

## 2. Performance e Experiência do Usuário (UX)

### 🚀 Virtualização de Listas
- **Situação Atual**: A tabela de pedidos renderiza todos os itens carregados.
- **Melhoria**: Implementar `react-window` ou `tanstack-virtual` no `OrderList.tsx`.
- **Benefício**: Melhora significativamente a performance em clientes com milhares de pedidos, reduzindo o lag de scroll.

### 📦 Otimização de Bundles (Lazy Loading)
- **Situação Atual**: Bibliotecas pesadas como `@react-pdf/renderer` e `jspdf` podem estar aumentando o bundle inicial.
- **Melhoria**: Garantir que componentes de exportação de PDF sejam carregados apenas sob demanda usando `React.lazy`.
- **Benefício**: Tempo de carregamento inicial (LCP) reduzido.

---

## 3. Qualidade Técnica e Robustez

### 🧪 Expansão da Suíte de Testes
- **Situação Atual**: O projeto tem suporte para `Vitest`, mas a cobertura de testes unitários para a lógica de negócio (services/utils) é baixa.
- **Melhoria**: Implementar testes nos `services` e `utils` (especialmente cálculos de valores e conversão de datas).
- **Benefício**: Evita regressões ao aplicar novas melhorias no sistema.

### 🛡️ Tratamento de Erros Global
- **Situação Atual**: O `api/client.ts` tem listeners, mas o tratamento visual de erro é feito via Toasts individuais.
- **Melhoria**: Implementar um `ErrorBoundary` global e um gerenciador de estados de erro na `Zustand store`.
- **Benefício**: Interface mais resiliente e mensagens de erro consistentes.

---

## 4. Novas Funcionalidades e Futuro (Inclui PWA)

### 📱 Sincronização Inteligente (Mobile)
- **Situação Atual**: O sistema depende de WebSockets para atualizações em tempo real.
- **Melhoria**: Implementar uma estratégia de "Offline-First" no PWA usando indexedDB para cache de pedidos.
- **Benefício**: Permite que vendedores consultem pedidos mesmo em locais com conexão instável.

### 📊 Painel de Analytics Avançado
- **Situação Atual**: Existe um dashboard de desempenho básico.
- **Melhoria**: Adicionar filtros comparativos (mês atual vs anterior) e exportação de gráficos.
- **Benefício**: Melhora a tomada de decisão estratégica para administradores.

---

## 🛠️ Próximos Passos Sugeridos (Roadmap)

1. **Prioridade 1**: Finalizar a remoção do `api.ts` legacy.
2. **Prioridade 2**: Implementar virtualização na lista principal de pedidos.
3. **Prioridade 3**: Iniciar a suíte de testes nos serviços de catálogo.
4. **Prioridade 4**: Desenvolvimento do PWA seguindo o guia de estilo criado.

---
**Nota**: Este plano deve ser executado de forma incremental, priorizando as tarefas que removem dívida técnica antes de adicionar novas funcionalidades complexas.
