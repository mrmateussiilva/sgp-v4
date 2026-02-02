# Plano de Conexão: Intranet SGP ↔ VPS Pública

Este plano descreve a estratégia para conectar o ecossistema local (onde ocorre a produção) com a VPS pública (que atende o cliente PWA), garantindo segurança, performance e integridade de dados.

## 🏗️ 1. Arquitetura da "Ponte" (Bridge)

Atualmente, o sistema usa um modelo de **Push Sync** (A Intranet empurra dados para a VPS). Vamos evoluir essa arquitetura para um modelo híbrido.

### Componentes:
- **Intranet API (Produtor):** Fonte da verdade para produção, máquinas e logs detalhados.
- **VPS API (Gateway/Mirror):** API pública que gerencia autenticação do PWA e mantém um "espelho" leve dos pedidos.

---

## 🛰️ 2. Estratégia de Sincronização

### 🔁 Fase 1: Sincronização Ativa Dinâmica (Push)
Expandir o `VpsSyncService` existente para enviar não apenas o status, mas o estado necessário para o PWA.
- **Payload Expandido:** Incluir resumo de itens e datas críticas.
- **Gatilhos:** Sincronizar em cada mudança de status no `pedidos/router.py`.
- **Segurança:** Utilizar `x-api-key` robusta e Headers de assinatura para evitar injeção de dados falsos na VPS.

### 🖼️ Fase 2: Gateway de Mídia (Imagens)
O PWA precisa ver as fotos da produção, mas as fotos estão no servidor local.
- **Opção A (Recomendada):** Sincronizar miniaturas (thumbnails) para um Bucket S3 ou para a própria VPS no momento do upload.
- **Opção B (Proxy):** A VPS atua como um proxy, solicitando a imagem da Intranet via túnel seguro quando o cliente PWA a requisita.

---

## 🔒 3. Tunelamento Seguro (Acesso Real-time)

Para funcionalidades que exigem consulta direta (ex: Logs de Máquina em tempo real ou Estoque), não é eficiente sincronizar tudo.
- **Sugestão:** Implementar **Cloudflare Tunnel** ou **Tailscale Funnel** no servidor da Intranet.
- **Funcionamento:** A VPS API faz chamadas internas para `http://intranet-sgp.internal` que são roteadas de forma segura para o servidor local sem precisar abrir portas no roteador (NAT).

---

## 📋 4. Plano de Ação (Roadmap)

### Passo 1: Unificação de Schemas
- Garantir que a VPS e a Intranet compartilhem o mesmo `PedidoBase` para evitar erros de validação (422 Unprocessable Entity).

### Passo 2: Endpoint de Recebimento na VPS
- Criar na API pública o endpoint `POST /internal/sync/pedidos` capaz de processar os payloads enviados pela Intranet.
- Implementar lógica de **Upsert** (Update or Insert) na VPS para manter o banco sincronizado.

### Passo 3: Autenticação Híbrida
- Configurar a VPS para validar tokens JWT emitidos ou baseados nos usuários da Intranet, permitindo que o gerente use a mesma senha no PWA e no Desktop.

### Passo 4: Monitoramento de Saúde (Health)
- Criar um painel simples na Intranet para mostrar o status da conexão com a VPS (ex: "Sincronização: OK | Último Sync: há 2 min").

---

> [!IMPORTANT]
> **Por que este modelo?**
> Manter a produção na Intranet protege seus dados em caso de queda de internet, enquanto a VPS garante que seus clientes tenham acesso 24/7 aos status dos pedidos através do PWA, mesmo que o servidor local esteja temporariamente offline.
