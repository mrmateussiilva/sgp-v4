import { OrderWithItems } from '@/types';
import { loadGeminiContext } from '@/utils/geminiContext';

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

  // Impacto logístico da forma de envio
  const envioMap: Record<string, string> = {
    'retirada': 'cliente retira (sem margem de postagem)',
    'correios': 'Correios — precisa postar 2 dias antes do prazo',
    'transportadora': 'transportadora — agendar coleta 1 dia antes',
    'motoboy': 'motoboy — agendar no mesmo dia',
  };
  const envioNorm = (order.forma_envio || '').toLowerCase();
  const envioInfo = Object.entries(envioMap).find(([k]) => envioNorm.includes(k))?.[1]
    ?? (order.forma_envio ? `envio: "${order.forma_envio}"` : 'forma de envio não informada');

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

  const empresaContext = loadGeminiContext();
  const contextBlock = empresaContext
    ? `CONTEXTO DA EMPRESA (use isso para personalizar a análise):
${empresaContext}

`
    : '';

  return `${contextBlock}Você é gerente de produção de uma empresa gráfica/têxtil. Conheça nosso fluxo e tempos típicos:

FLUXO: Financeiro → Conferência → Impressão → Costura → Expedição
TEMPOS ESTIMADOS POR ETAPA (dias úteis):
- Impressão sublimação têxtil (camiseta, canga, mochilinha): 0,5 dia
- Impressão lona/banner pequeno (até 2m²): 0,5 dia
- Impressão lona/banner grande (>2m²): 1-2 dias
- Costura simples: 0,5 dia por peça
- Costura complexa (mochilinha, totem com estrutura): 1-2 dias
- Quantidades acima de 10 unidades: dobrar estimativa
LOGÍSTICA: Correios precisa 2 dias de antecedência; Transportadora 1 dia; Retirada e motoboy sem margem extra

PEDIDO #${order.numero || order.id}:
- Cliente: ${order.cliente || order.customer_name}${localizacao ? ` (${localizacao})` : ''}
- Prazo: ${prazoLabel}${diasRestantes !== null ? ` (${diasRestantes < 0 ? 'ATRASADO' : diasRestantes + 'd restantes'})` : ''}
- Envio: ${envioInfo}
- Prioridade: ${order.prioridade || 'NORMAL'}
- Concluído: ${feitas.length ? feitas.join(', ') : 'nada ainda'}
- Pendente: ${pendentes.length ? pendentes.join(' → ') : 'tudo concluído'}
${order.observacao ? `- Obs: ${order.observacao}` : ''}
- Itens:
${itens ? `- ${itens}` : '- (sem itens)'}

SUA TAREFA: Dê um diagnóstico REAL que o operador não consegue ver olhando para a tela.
1. Calcule se o prazo é VIÁVEL considerando o que falta + tipo de item + logística
2. Identifique qual etapa vai ser o GARGALO real (não repita o óbvio)
3. Dê UMA ação concreta e imediata

FORMATO OBRIGATÓRIO (máx 4 linhas, sem títulos/seções):
[🟢/🟡/🔴] [veredito do prazo com cálculo]
[⚠️ se houver risco específico não óbvio]
[▶] [1 ação imediata]`;
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
