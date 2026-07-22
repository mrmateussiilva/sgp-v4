import { OrderWithItems } from '@/types';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

function buildPrompt(order: OrderWithItems): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let urgencyText = 'Sem data de entrega definida';
  if (order.data_entrega) {
    const delivery = new Date(order.data_entrega + 'T00:00:00');
    const diffDays = Math.round((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) urgencyText = `ATRASADO há ${Math.abs(diffDays)} dia(s)`;
    else if (diffDays === 0) urgencyText = 'Entrega HOJE';
    else if (diffDays === 1) urgencyText = 'Entrega AMANHÃ';
    else urgencyText = `Entrega em ${diffDays} dias`;
  }

  const statusLine = [
    `Financeiro: ${order.financeiro ? '✓' : '✗'}`,
    `Conferência: ${order.conferencia ? '✓' : '✗'}`,
    `Impressão: ${order.sublimacao ? '✓' : '✗'}`,
    `Costura: ${order.costura ? '✓' : '✗'}`,
    `Expedição: ${order.expedicao ? '✓' : '✗'}`,
  ].join(' | ');

  const itemsText = (order.items || [])
    .map((item, idx) => {
      const parts: string[] = [];
      if (item.tipo_producao) parts.push(`Tipo: ${item.tipo_producao}`);
      if (item.descricao) parts.push(`Descrição: ${item.descricao}`);
      if (item.largura && item.altura) parts.push(`Medidas: ${item.largura}x${item.altura}m`);
      if (item.tecido) parts.push(`Tecido: ${item.tecido}`);
      if (item.quantity) parts.push(`Qtd: ${item.quantity}`);
      if (item.observacao) parts.push(`Obs: ${item.observacao}`);
      return `  Item ${idx + 1}: ${parts.join(', ') || item.item_name}`;
    })
    .join('\n');

  const localizacao = [order.cidade_cliente, order.estado_cliente].filter(Boolean).join('/');

  return `Você é um assistente especializado em gestão de pedidos para empresas gráficas e têxteis (banners, lonas, camisetas sublimadas, etc.).

Analise o pedido abaixo e forneça uma análise concisa em português com os seguintes tópicos em Markdown:

## 🔍 Situação Geral
Resumo do estado atual do pedido, prazo e urgência.

## ⚠️ Pontos de Atenção
Lista dos principais riscos ou observações relevantes (prazo, forma de envio, itens complexos, etc.).

## ✅ Próximos Passos
O que precisa ser feito agora para garantir a entrega no prazo.

---
**DADOS DO PEDIDO:**

Número: #${order.numero || order.id}
Cliente: ${order.cliente || order.customer_name}${localizacao ? ` — ${localizacao}` : ''}
Prazo: ${order.data_entrega || 'Não definido'} (${urgencyText})
Forma de envio: ${order.forma_envio || 'Não informado'}
Prioridade: ${order.prioridade || 'NORMAL'}
Rascunho: ${order.rascunho ? 'Sim (fora do fluxo de produção)' : 'Não'}
Status de produção: ${statusLine}
${order.observacao ? `Observações: ${order.observacao}` : ''}

Itens do pedido:
${itemsText || '  Nenhum item cadastrado'}

---
Seja objetivo e direto. Foque no que é mais importante para a equipe de produção agir agora.`;
}

export async function analyzeOrderWithGemini(
  order: OrderWithItems,
  apiKey: string
): Promise<string> {
  const prompt = buildPrompt(order);

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP ${response.status}`;
    if (response.status === 400) throw new Error('API Key inválida ou requisição malformada.');
    if (response.status === 403) throw new Error('API Key sem permissão. Verifique sua chave do Gemini.');
    if (response.status === 429) throw new Error('Limite de requisições atingido. Aguarde um momento e tente novamente.');
    throw new Error(`Erro na API Gemini: ${message}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Resposta inválida da API Gemini.');
  return text;
}
