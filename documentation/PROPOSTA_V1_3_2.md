# Proposta de Melhorias - SGP v4 (Versão 1.3.2)

Este documento detalha as sugestões técnicas e funcionais para a próxima grande atualização do sistema, com foco em **Performance**, **Estabilidade** e **Novas Telas/Funcionalidades** para otimizar o fluxo de trabalho industrial.

---

## 🚀 1. Performance e Otimização

### 💾 Backend: Transição para PostgreSQL
Embora o SQLite seja excelente pela simplicidade, o crescimento do volume de dados e a concorrência de múltiplos usuários editando pedidos simultaneamente pode gerar travamentos (`database is locked`).
- **Sugestão:** Migrar para **PostgreSQL** em Docker.
- **Benefício:** Suporte nativo a tipos JSONB, melhor concorrência e escalabilidade.

### 🖼️ Processamento Dinâmico de Imagens
Atualmente, o frontend carrega imagens originais para exibir previews.
- **Sugestão:** Implementar a geração automática de **Thumbnails** (miniaturas) no momento do upload.
- **Benefício:** Redução drástica no consumo de memória do frontend e carregamento instantâneo das listas de pedidos.

### ⚡ Frontend: Virtualização de Listas
Com milhares de pedidos, o DOM do navegador pode ficar pesado ao scrollar.
- **Sugestão:** Implementar **Windowing/Virtualização** (ex: `react-window`) nas listas de pedidos e logs.
- **Benefício:** Interface fluida mesmo com 10.000+ registros carregados.

---

## 🛡️ 2. Estabilidade e Segurança

### 🧩 Estrutura de Dados Robusta
Atualmente, os itens dos pedidos são armazenados como strings JSON simples no SQLite.
- **Sugestão:** Utilizar suporte nativo a **JSONB** (no Postgres) para permitir filtros e buscas complexas *dentro* da estrutura de itens diretamente via SQL.
- **Benefício:** Maior integridade dos dados e facilidade na geração de relatórios granulares.

### 🚦 Sistema de Retry e Heartbeat para WebSocket
Melhorar a resiliência das notificações em tempo real.
- **Sugestão:** Implementar lógica de **Backoff Exponencial** para reconexão em caso de queda da rede.
- **Benefício:** Garante que a equipe de produção nunca pare de receber atualizações de pedidos novos.

### 🧪 Testes de Integração Críticos
- **Sugestão:** Criar uma suíte de testes E2E (Ponta-a-Ponta) cobrindo o fluxo: *Criação de Pedido -> Produção -> Expedição*.
- **Benefício:** Evita bugs em funcionalidades core ao fazer novas atualizações.

---

## 🖥️ 3. Novas Telas e UX

### 📦 Módulo de Gestão de Estoque (Inventory)
- **Funcionalidade:** Cadastro de insumos (Tecidos, Tintas, Materiais de Acabamento) com **baixa automática** baseada no consumo dos itens do pedido.
- **Diferencial:** Alertas de "Estoque Baixo" para compras programadas.

### 🌐 Portal do Cliente (Read-only)
- **Funcionalidade:** Uma interface web externa (ou link seguro) onde o cliente pode consultar o status real de seu pedido, sem acesso administrativo.
- **Diferencial:** Reduz o número de ligações/mensagens de clientes perguntando "já ficou pronto?".

### 📑 Auditoria e Timeline de Pedidos
- **Funcionalidade:** Uma aba "Histórico" em cada pedido mostrando quem alterou o status, quando as fotos foram tiradas e quem aprovou o financeiro.
- **Diferencial:** Transparência total e rastreabilidade de erros humanos.

---

## 🛠️ 4. Novas Funcionalidades Operacionais

### 📦 Ações em Massa (Bulk Actions)
- **Funcionalidade:** Selecionar múltiplos pedidos na lista para:
  - Mudar status de uma vez.
  - Imprimir múltiplas fichas de produção.
  - Atribuir diversos itens a uma máquina específica.

### 🏷️ Impressão de Etiquetas de Identificação
- **Funcionalidade:** Botão para imprimir etiquetas térmicas pequenas (ex: 10x15 ou menor) com QrCode, Número do Pedido e Nome do Cliente.
- **Diferencial:** Facilita a identificação física das peças no setor de costura e expedição.

### 🔔 Notificações Desktop Nativas
- **Funcionalidade:** Usar o sistema do Tauri para enviar notificações do Windows/Linux mesmo com o app minimizado.
- **Diferencial:** Alerta imediato para o setor gráfico quando entra um pedido de "Prioridade ALTA".

---

> [!TIP]
> **Recomendação de Prioridade para v1.3.2:**
> 1. Iniciar pela geração de **Thumbnails** (ganho imediato de UX).
> 2. Implementar **Ações em Massa** (ganho imediato de agilidade para o usuário).
> 3. Planejar o **Módulo de Estoque**.
