import { OrderWithItems } from '@/types';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Lista de modelos em ordem de preferência — se o primeiro falhar, tenta o próximo
const GEMINI_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite-preview-06-17',
];


function buildPrompt(order: OrderWithItems): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calcula prazo com precisão
  let diasRestantes: number | null = null;
  let prazoLabel = 'sem prazo definido';
  if (order.data_entrega) {
    const delivery = new Date(order.data_entrega + 'T00:00:00');
    diasRestantes = Math.round((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes < 0) prazoLabel = `ATRASADO ${Math.abs(diasRestantes)}d`;
    else if (diasRestantes === 0) prazoLabel = 'entrega HOJE';
    else if (diasRestantes === 1) prazoLabel = 'entrega AMANHÃ';
    else prazoLabel = `${diasRestantes} dias para entrega`;
  }

  // Determina etapa atual e o que falta
  const etapas = [
    { nome: 'Financeiro', feito: !!order.financeiro },
    { nome: 'Conferência', feito: !!order.conferencia },
    { nome: 'Impressão', feito: !!order.sublimacao },
    { nome: 'Costura', feito: !!order.costura },
    { nome: 'Expedição', feito: !!order.expedicao },
  ];
  const feitas = etapas.filter(e => e.feito).map(e => e.nome);
  const pendentes = etapas.filter(e => !e.feito).map(e => e.nome);
  const etapaAtual = pendentes[0] || 'Concluído';

  // Impacto logístico da forma de envio
  const envioMap: Record<string, string> = {
    'retirada': 'cliente retira (sem prazo de postagem)',
    'correios': 'Correios (postar com ~2 dias de antecedência)',
    'transportadora': 'transportadora (agendar coleta com ~1 dia de antecedência)',
    'motoboy': 'motoboy/entrega local (agendar no dia)',
  };
  const envioNorm = (order.forma_envio || '').toLowerCase();
  const envioInfo = Object.entries(envioMap).find(([k]) => envioNorm.includes(k))?.[1]
    ?? `"${order.forma_envio || 'não informado'}"`;

  // Itens: só o que importa para produção
  const itens = (order.items || []).map(item => {
    const partes: string[] = [];
    if (item.tipo_producao) partes.push(item.tipo_producao);
    if (item.descricao) partes.push(item.descricao);
    if (item.largura && item.altura) partes.push(`${item.largura}x${item.altura}m`);
    if (item.quantity && item.quantity > 1) partes.push(`x${item.quantity}`);
    if (item.tecido) partes.push(`[${item.tecido}]`);
    if (item.observacao) partes.push(`(obs: ${item.observacao})`);
    return partes.join(' ') || item.item_name;
  }).join('\n- ');

  const localizacao = [order.cidade_cliente, order.estado_cliente].filter(Boolean).join('/');

  return `Você é especialista em produção gráfica/têxtil (sublimação, lona, banner, adesivo, totem, costura).

DADOS DO PEDIDO #${order.numero || order.id}:
- Cliente: ${order.cliente || order.customer_name}${localizacao ? ` (${localizacao})` : ''}
- Prazo: ${prazoLabel}
- Envio: ${envioInfo}
- Prioridade: ${order.prioridade || 'NORMAL'}
- Etapa atual: ${etapaAtual}${feitas.length ? ` (concluídas: ${feitas.join(', ')})` : ' (nenhuma etapa concluída)'}
${pendentes.length ? `- Falta ainda: ${pendentes.join(' → ')}` : '- Todas etapas concluídas'}
${order.observacao ? `- Obs: ${order.observacao}` : ''}
- Itens:
${itens ? `- ${itens}` : '- (sem itens cadastrados)'}

TAREFA: Analise este pedido e responda em português com no máximo 4 bullet points curtos (máx 2 linhas cada).
REGRAS:
1. NÃO repita dados que já estão acima (prazo, cliente, etc.)
2. Foque em riscos REAIS e ações CONCRETAS para a equipe de produção
3. Considere o tipo de item (ex: lona grande demora mais, costura é mais lenta que impressão, etc.)
4. Se o pedido estiver tranquilo, diga em 1 linha e pare
5. Use ícones simples (⚠️ risco, ✅ ok, 🚚 logística, 🔧 produção)`;
}

export async function analyzeOrderWithGemini(
  order: OrderWithItems,
  apiKey: string
): Promise<string> {
  const prompt = buildPrompt(order);
  let lastError: Error = new Error('Nenhum modelo disponível.');

  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 350,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status}`;

        // Erros que não devem tentar o próximo modelo
        if (response.status === 400) throw new Error('API Key inválida ou requisição malformada.');
        if (response.status === 403) throw new Error('API Key sem permissão. Verifique sua chave em aistudio.google.com.');
        if (response.status === 429) throw new Error(
          '⏳ Cota da API Gemini atingida (plano gratuito: 15 req/min).\n\nAguarde cerca de 1 minuto e tente novamente.'
        );

        // Modelo indisponível/depreciado (404 ou mensagem de deprecação) → tenta próximo
        if (response.status === 404 || message.includes('no longer available') || message.includes('not found')) {
          lastError = new Error(`Modelo ${model} indisponível.`);
          continue;
        }

        throw new Error(`Erro na API Gemini (${response.status}): ${message}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Resposta inválida da API Gemini.');
      return text;

    } catch (err) {
      // Se for erro que já lançamos explicitamente (400, 403, 429), propaga direto
      if (err instanceof Error && (
        err.message.includes('API Key') ||
        err.message.includes('Cota da API') ||
        err.message.includes('sem permissão')
      )) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      // Modelo falhou por outro motivo → tenta próximo
    }
  }

  throw lastError;
}
