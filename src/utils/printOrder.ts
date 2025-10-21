import { OrderItem, OrderWithItems } from '../types';

type DetailEntry = {
  label: string;
  value: string;
};

type OrderFinancials = {
  itemsSubtotal: number;
  freightValue: number;
  discountValue: number;
  finalTotal: number;
};

const PLACEHOLDER_LINE = '____________________________';

const parseCurrencyValue = (value: unknown): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'object') {
    const decimalObject = value as Record<string, unknown> & { toString?: () => string };

    if (typeof decimalObject.$numberDecimal === 'string') {
      return parseCurrencyValue(decimalObject.$numberDecimal);
    }

    if (typeof decimalObject.value === 'string' || typeof decimalObject.value === 'number') {
      return parseCurrencyValue(decimalObject.value);
    }

    const maybeString = decimalObject.toString?.();
    if (maybeString && maybeString !== '[object Object]') {
      return parseCurrencyValue(maybeString);
    }

    return 0;
  }

  const raw = String(value).trim();
  if (!raw) {
    return 0;
  }

  const cleaned = raw.replace(/[^\d.,-]/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalized = cleaned;

  if (lastComma > -1 && lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > -1 && lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned.replace(',', '.');
  }

  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parseNumberValue = (value?: string | number | null) => {
  if (typeof value === 'number') return value;
  if (!value) return NaN;
  const normalized = value
    .toString()
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(normalized);
};

const formatCurrency = (value: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    parseCurrencyValue(value)
  );

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (value?: string | null) => {
  if (!value) return 'Não informado';

  try {
    if (value.length === 10 && value.includes('-')) {
      const date = new Date(`${value}T00:00:00`);
      return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleDateString('pt-BR');
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleDateString('pt-BR');
  } catch {
    return 'Não informado';
  }
};

const formatStatus = (value?: string | null) => {
  if (!value) return 'Não informado';
  return value
    .toString()
    .trim()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
};

const getStatusBadgeModifier = (status?: string | null) => {
  if (!status) return 'status-neutro';

  const normalized = status
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');

  if (normalized.includes('cancel')) {
    return 'status-cancelado';
  }

  if (normalized.includes('conclu')) {
    return 'status-concluido';
  }

  if (normalized.includes('process') || normalized.includes('andamento')) {
    return 'status-andamento';
  }

  if (normalized.includes('pend')) {
    return 'status-pendente';
  }

  return 'status-neutro';
};

const normalizeSpacingValue = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.toLowerCase().endsWith('cm') ? trimmed : `${trimmed} cm`;
};

const formatEmendaType = (value?: string | null) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'sem-emenda') return '';
  return trimmed
    .split(/[-_]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const pickString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
};

const pickBoolean = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === 'boolean' ? (value as boolean) : undefined;
};

const pickNumericLike = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === 'number' || typeof value === 'string' ? value : undefined;
};

const collectItemDetailEntries = (item: OrderItem) => {
  const entries: DetailEntry[] = [];
  const tipoProducao = (item.tipo_producao || '').toLowerCase();
  const isTotem = tipoProducao === 'totem';
  const isAdesivo = tipoProducao === 'adesivo';
  const itemRecord = item as Record<string, unknown>;

  const push = (label: string, value?: string | number | null | undefined) => {
    if (value === undefined || value === null) return;
    const stringValue = typeof value === 'number' ? value.toString() : value.toString().trim();
    if (!stringValue || stringValue.toLowerCase() === 'não informado') return;
    entries.push({ label, value: stringValue });
  };

  const pushCurrency = (label: string, value?: string | number | null) => {
    const amount = parseCurrencyValue(value);
    if (amount === 0) return;
    push(label, formatCurrency(amount));
  };

  const pushBoolean = (label: string, value?: boolean | null) => {
    if (value === undefined || value === null) return;
    push(label, value ? 'Sim' : 'Não');
  };

  push('Tipo de Produção', item.tipo_producao);
  push('Largura', item.largura);
  push('Altura', item.altura);
  push('m²', item.metro_quadrado);
  push('Designer', item.designer);
  push('Vendedor', item.vendedor);
  push(isTotem ? 'Material' : isAdesivo ? 'Tipo de Adesivo' : 'Tecido', item.tecido);
  pushBoolean('Overloque', item.overloque);
  pushBoolean('Elástico', item.elastico);
  push('Tipo de Acabamento', item.tipo_acabamento);
  push('Qtd. Ilhós', item.quantidade_ilhos);
  const espacoIlhos = normalizeSpacingValue(item.espaco_ilhos);
  if (espacoIlhos) push('Espaço Ilhós', espacoIlhos);
  pushCurrency('Valor Ilhós', item.valor_ilhos);
  push('Qtd. Cordinha', item.quantidade_cordinha);
  const espacoCordinha = normalizeSpacingValue(item.espaco_cordinha);
  if (espacoCordinha) push('Espaço Cordinha', espacoCordinha);
  pushCurrency('Valor Cordinha', item.valor_cordinha);

  const emendaFormatted = formatEmendaType(item.emenda);
  if (emendaFormatted) {
    push('Emenda', emendaFormatted);
    const emendaQuantidadeValue = item.emenda_qtd ?? pickString(itemRecord, 'emendaQtd');
    if (emendaQuantidadeValue && emendaQuantidadeValue.trim().length > 0) {
      const emendaQtdNumber = parseNumberValue(emendaQuantidadeValue);
      const emendaQtdLabel = `${emendaQuantidadeValue} ${
        emendaQtdNumber === 1 ? 'emenda' : 'emendas'
      }`;
      push('Qtd. Emendas', emendaQtdLabel);
    }
  }

  pushBoolean('Terceirizado', pickBoolean(itemRecord, 'terceirizado'));
  push('Acabamento Lona', pickString(itemRecord, 'acabamento_lona'));
  pushCurrency('Valor Lona', pickNumericLike(itemRecord, 'valor_lona'));
  push('Qtd. Lona', pickNumericLike(itemRecord, 'quantidade_lona'));
  pushCurrency('Outros Valores Lona', pickNumericLike(itemRecord, 'outros_valores_lona'));
  push('Tipo de Adesivo', pickString(itemRecord, 'tipo_adesivo'));
  pushCurrency('Valor do Adesivo', pickNumericLike(itemRecord, 'valor_adesivo'));
  push('Qtd. Adesivos', pickNumericLike(itemRecord, 'quantidade_adesivo'));
  pushCurrency('Outros Valores Adesivo', pickNumericLike(itemRecord, 'outros_valores_adesivo'));

  const observation =
    item.observacao && item.observacao.trim().length > 0
      ? item.observacao.trim()
      : undefined;

  const imageUrl = item.imagem && item.imagem.trim().length > 0 ? item.imagem.trim() : undefined;

  return { entries, observation, imageUrl };
};

const renderValue = (
  value: string | number | null | undefined,
  placeholder = PLACEHOLDER_LINE
) => {
  if (value === null || value === undefined) {
    return `<div class="valor placeholder">${placeholder}</div>`;
  }

  const stringValue = typeof value === 'number' ? value.toString() : value.toString().trim();
  if (!stringValue || stringValue.toLowerCase() === 'não informado') {
    return `<div class="valor placeholder">${placeholder}</div>`;
  }

  return `<div class="valor">${escapeHtml(stringValue)}</div>`;
};

const buildCampo = (
  label: string,
  value: string | number | null | undefined,
  placeholder?: string,
  extraClass?: string
) => `
  <div class="campo${extraClass ? ` ${extraClass}` : ''}">
    <label>${escapeHtml(label)}:</label>
    ${renderValue(value, placeholder ?? PLACEHOLDER_LINE)}
  </div>
`;

const buildHeaderInfo = (label: string, rawValue?: string | null) => {
  const value =
    rawValue === undefined || rawValue === null
      ? 'Não informado'
      : rawValue.toString().trim() || 'Não informado';

  return `
    <div class="cabecalho-dado">
      <span class="cabecalho-label">${escapeHtml(label)}</span>
      <span class="cabecalho-valor">${escapeHtml(value)}</span>
    </div>
  `;
};

const buildHeader = (order: OrderWithItems, financials: OrderFinancials) => {
  const entryDate = formatDate(order.data_entrada ?? order.created_at ?? null);
  const deliveryDate = formatDate(order.data_entrega ?? null);
  const updatedDate = formatDate(order.updated_at ?? order.created_at ?? null);
  const issuanceDate = entryDate;
  const displayDate = issuanceDate === 'Não informado' ? '___/___/______' : issuanceDate;
  const statusLabel = formatStatus(order.status);
  const statusModifier = getStatusBadgeModifier(order.status);
  const priority = (order.prioridade ?? '').toString().trim();
  const orderCode = (order.numero || order.id).toString();
  const itemsCount = Array.isArray(order.items) ? order.items.length : 0;
  const itemsLabel = `${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}`;

  return `
    <div class="cabecalho">
      <div class="cabecalho-topo">
        <div class="cabecalho-identificacao">
          <span class="badge-pedido">Pedido #${escapeHtml(orderCode)}</span>
          <span class="status-badge ${statusModifier}">${escapeHtml(statusLabel)}</span>
        </div>
        ${
          priority
            ? `<span class="prioridade-badge">${escapeHtml(priority)}</span>`
            : ''
        }
      </div>
      <div class="titulo-area">
        <div>
          <div class="titulo">FICHA DE PRODUÇÃO</div>
          <div class="titulo-subtitulo">Informações consolidadas para produção e expedição</div>
        </div>
        <div class="cabecalho-data">
          <span class="cabecalho-data-label">Emitido em</span>
          <span class="cabecalho-data-valor">${escapeHtml(displayDate)}</span>
        </div>
      </div>
      <div class="cabecalho-info">
        ${buildHeaderInfo('Data de Entrada', entryDate)}
        ${buildHeaderInfo('Previsão de Entrega', deliveryDate)}
        ${buildHeaderInfo('Última Atualização', updatedDate)}
        ${buildHeaderInfo('Itens no Pedido', itemsLabel)}
        ${buildHeaderInfo('Total Estimado', formatCurrency(financials.finalTotal))}
      </div>
    </div>
  `;
};

const buildOrderDetailsSection = (order: OrderWithItems, financials: OrderFinancials) => {
  const orderRecord = order as Record<string, unknown>;
  const formaPagamento =
    pickString(orderRecord, 'forma_pagamento_nome') ??
    pickString(orderRecord, 'forma_pagamento') ??
    undefined;
  const trackingCode = pickString(orderRecord, 'codigo_rastreamento');

  return `
    <div class="bloco detalhes-pedido">
      <h3>DETALHES DO PEDIDO</h3>
      <div class="dados-pedido">
        ${buildCampo('Prioridade', order.prioridade)}
        ${buildCampo('Forma de Envio', order.forma_envio)}
        ${buildCampo('Forma de Pagamento', formaPagamento)}
        ${buildCampo('Valor do Frete', formatCurrency(financials.freightValue))}
        ${buildCampo('Código de Rastreamento', trackingCode)}
      </div>
    </div>
  `;
};

const buildCustomerSection = (order: OrderWithItems) => {
  const customerName = order.customer_name || order.cliente || null;
  const phonePlaceholder = '(  ) ________-________';
  const orderRecord = order as Record<string, unknown>;
  const customerEmail =
    pickString(orderRecord, 'email_cliente') ?? pickString(orderRecord, 'email') ?? undefined;
  const customerAddress =
    order.address ||
    pickString(orderRecord, 'endereco_cliente') ||
    pickString(orderRecord, 'endereco') ||
    undefined;

  return `
    <div class="bloco cliente">
      <h3>DADOS DO CLIENTE E ENTREGA</h3>
      <div class="dados-cliente">
        ${buildCampo('Nome Completo', customerName)}
        ${buildCampo('Telefone', order.telefone_cliente, phonePlaceholder)}
        ${buildCampo('Email', customerEmail)}
        ${buildCampo('Endereço', customerAddress)}
        ${buildCampo('Cidade', order.cidade_cliente)}
        ${buildCampo('Estado', order.estado_cliente)}
      </div>
    </div>
  `;
};

const buildItemFinancialSection = (subtotal: number, discount: number, total: number) => `
  <div class="bloco resumo resumo-item">
    <h4>RESUMO FINANCEIRO DO ITEM</h4>
    <div class="linha-resumo">
      <span>Subtotal:</span>
      <span>${formatCurrency(subtotal)}</span>
    </div>
    <div class="linha-resumo">
      <span>Desconto:</span>
      <span>${formatCurrency(discount)}</span>
    </div>
    <div class="linha-resumo total">
      <span>Total do Item:</span>
      <span>${formatCurrency(total)}</span>
    </div>
  </div>
`;

const buildOrderFinancialSection = (financials: OrderFinancials) => `
  <div class="bloco resumo resumo-pedido">
    <h4>RESUMO FINANCEIRO DA FICHA</h4>
    <div class="linha-resumo">
      <span>Subtotal:</span>
      <span>${formatCurrency(financials.itemsSubtotal)}</span>
    </div>
    <div class="linha-resumo">
      <span>Desconto:</span>
      <span>${formatCurrency(financials.discountValue)}</span>
    </div>
    <div class="linha-resumo">
      <span>Frete:</span>
      <span>${formatCurrency(financials.freightValue)}</span>
    </div>
    <div class="linha-resumo total">
      <span>TOTAL FINAL:</span>
      <span>${formatCurrency(financials.finalTotal)}</span>
    </div>
  </div>
`;

const buildOrderObservation = (order: OrderWithItems) => {
  if (!order.observacao || order.observacao.trim().length === 0) {
    return '';
  }

  return `
    <div class="bloco observacao-pedido">
      <strong>Observações do Pedido</strong>
      <p>${escapeHtml(order.observacao.trim()).replace(/\n/g, '<br />')}</p>
    </div>
  `;
};

const buildItemSection = (
  order: OrderWithItems,
  item: OrderItem,
  index: number,
  financials: OrderFinancials
) => {
  const { entries, observation, imageUrl } = collectItemDetailEntries(item);
  const itemRecord = item as Record<string, unknown>;
  const itemName =
    (item.item_name && item.item_name.trim().length > 0 ? item.item_name.trim() : null) ||
    `Item ${index + 1}`;
  const description =
    (item.descricao && item.descricao.trim().length > 0 ? item.descricao.trim() : null) ||
    itemName;

  const itemSubtotal = parseCurrencyValue(item.subtotal);
  const itemDiscount = parseCurrencyValue(
    pickNumericLike(itemRecord, 'desconto') ?? pickNumericLike(itemRecord, 'valor_desconto') ?? 0
  );
  const itemTotal = Math.max(itemSubtotal - itemDiscount, 0);
  const unitPriceSource = item.unit_price ?? pickNumericLike(itemRecord, 'valor_unitario') ?? 0;

  const detailsHtml = entries.length
    ? `
      <div class="detalhes-item">
        <h4>Detalhes do Item</h4>
        <div class="detalhes-grid">
          ${entries
            .map(
              (entry) => `
                <div class="detalhe">
                  <span class="detalhe-label">${escapeHtml(entry.label)}</span>
                  <span class="detalhe-valor">${escapeHtml(entry.value)}</span>
                </div>
              `
            )
            .join('')}
        </div>
      </div>
    `
    : '';

  const observationHtml = observation
    ? `
      <div class="observacao-item">
        <strong>Observações do Item</strong>
        <p>${escapeHtml(observation).replace(/\n/g, '<br />')}</p>
      </div>
    `
    : '';

  const imageHtml = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="Imagem do item" />`
    : `<span>ÁREA PARA IMAGEM DO PRODUTO</span>`;

  return `
    <div class="ficha">
      ${buildHeader(order, financials)}
      ${buildOrderDetailsSection(order, financials)}
      ${buildCustomerSection(order)}

      <div class="bloco item">
        <div class="item-topo">
          <h3>ITEM ${index + 1}</h3>
          <span class="item-identificacao">${escapeHtml(itemName)}</span>
        </div>
        <div class="dados-item">
          ${buildCampo('Descrição do Item', description, undefined, 'campo-duas-colunas')}
          ${buildCampo('Quantidade', item.quantity)}
          ${buildCampo(
            'Preço Unitário',
            formatCurrency(unitPriceSource)
          )}
        </div>
        <div class="imagem">
          ${imageHtml}
        </div>
        ${detailsHtml}
        ${observationHtml}
      </div>

      ${buildItemFinancialSection(itemSubtotal, itemDiscount, itemTotal)}
      ${buildOrderFinancialSection(financials)}
      ${buildOrderObservation(order)}
    </div>
  `;
};

const buildEmptyOrderSection = (order: OrderWithItems, financials: OrderFinancials) => `
  <div class="ficha">
    ${buildHeader(order, financials)}
    ${buildOrderDetailsSection(order, financials)}
    ${buildCustomerSection(order)}
    <div class="bloco item">
      <h3>ITENS</h3>
      <div class="no-items">
        Nenhum item registrado para este pedido.
      </div>
    </div>
    ${buildOrderFinancialSection(financials)}
    ${buildOrderObservation(order)}
  </div>
`;

const computeOrderFinancials = (order: OrderWithItems): OrderFinancials => {
  const itemsSubtotal = Array.isArray(order.items)
    ? order.items.reduce((sum, current) => sum + parseCurrencyValue(current.subtotal), 0)
    : 0;

  const orderRecord = order as Record<string, unknown>;

  const freightValue = parseCurrencyValue(
    orderRecord.valor_frete ?? orderRecord.frete ?? order.valor_frete ?? 0
  );

  const explicitDiscount = parseCurrencyValue(
    orderRecord.desconto ??
      orderRecord.valor_desconto ??
      orderRecord.desconto_total ??
      orderRecord.discount ??
      0
  );

  const totalValue = parseCurrencyValue(order.total_value ?? order.valor_total ?? 0);

  let discountValue = explicitDiscount > 0 ? explicitDiscount : 0;

  if (discountValue <= 0 && totalValue > 0) {
    const inferredDiscount = itemsSubtotal + freightValue - totalValue;
    if (inferredDiscount > 0) {
      discountValue = inferredDiscount;
    }
  }

  const totalBeforeDiscount = itemsSubtotal + freightValue;
  const finalTotal =
    totalValue > 0 ? totalValue : Math.max(totalBeforeDiscount - discountValue, 0);

  return {
    itemsSubtotal,
    freightValue,
    discountValue,
    finalTotal,
  };
};

const generatePrintContent = (order: OrderWithItems) => {
  const financials = computeOrderFinancials(order);

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return `
      <div class="fichas-container">
        ${buildEmptyOrderSection(order, financials)}
      </div>
    `;
  }

  const fichas = order.items
    .map((item, index) => buildItemSection(order, item, index, financials))
    .join('');

  return `
    <div class="fichas-container">
      ${fichas}
    </div>
  `;
};

const buildStyles = () => `
  :root {
    color-scheme: light;
  }

  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f3f4f6;
    color: #111827;
    font-size: 12pt;
  }

  .fichas-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .ficha {
    background: #ffffff;
    margin-bottom: 18px;
    padding: 24px;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.06);
    page-break-after: always;
  }

  .ficha:last-child {
    page-break-after: avoid;
  }

  .cabecalho {
    display: flex;
    flex-direction: column;
    gap: 16px;
    border-bottom: 2px solid #111827;
    padding-bottom: 16px;
    margin-bottom: 16px;
  }

  .cabecalho-topo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .cabecalho-identificacao {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .badge-pedido {
    background: #111827;
    color: #ffffff;
    border-radius: 999px;
    padding: 4px 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 11pt;
  }

  .status-badge {
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 10pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: #e5e7eb;
    color: #1f2937;
    border: 1px solid transparent;
  }

  .status-badge.status-concluido {
    background: #d1fae5;
    border-color: #34d399;
    color: #065f46;
  }

  .status-badge.status-andamento {
    background: #dbeafe;
    border-color: #60a5fa;
    color: #1d4ed8;
  }

  .status-badge.status-pendente {
    background: #fef3c7;
    border-color: #f59e0b;
    color: #92400e;
  }

  .status-badge.status-cancelado {
    background: #fee2e2;
    border-color: #f87171;
    color: #991b1b;
  }

  .status-badge.status-neutro {
    background: #e5e7eb;
    border-color: #d1d5db;
    color: #1f2937;
  }

  .prioridade-badge {
    background: #ef4444;
    color: #ffffff;
    border-radius: 999px;
    padding: 4px 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 10pt;
  }

  .titulo-area {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 12px;
  }

  .titulo {
    font-size: 16pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin: 0;
    color: #111827;
  }

  .titulo-subtitulo {
    font-size: 10pt;
    color: #6b7280;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-top: 4px;
  }

  .cabecalho-data {
    text-align: right;
  }

  .cabecalho-data-label {
    font-size: 9pt;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    display: block;
    margin-bottom: 4px;
  }

  .cabecalho-data-valor {
    font-weight: 600;
    font-size: 12pt;
    color: #111827;
  }

  .cabecalho-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }

  .cabecalho-dado {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
  }

  .cabecalho-label {
    font-size: 9pt;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    display: block;
    margin-bottom: 4px;
  }

  .cabecalho-valor {
    font-size: 12pt;
    font-weight: 600;
    color: #111827;
    word-break: break-word;
  }

  .bloco {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 18px 20px;
    margin-bottom: 20px;
  }

  .bloco h3 {
    margin: 0 0 12px 0;
    font-size: 13pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #1f2937;
  }

  .dados-cliente,
  .dados-pedido {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }

  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .campo label {
    font-weight: 600;
    font-size: 9pt;
    text-transform: uppercase;
    color: #6b7280;
    letter-spacing: 0.08em;
  }

  .campo .valor {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    font-size: 12pt;
    border-radius: 8px;
    background-color: #ffffff;
    min-height: 28px;
    display: flex;
    align-items: center;
    line-height: 1.3;
  }

  .campo .valor.placeholder {
    color: #9ca3af;
    font-style: italic;
  }

  .item {
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 8px;
  }

  .item-topo {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  .item-topo h3 {
    margin: 0;
    font-size: 13pt;
    letter-spacing: 0.08em;
    color: #111827;
  }

  .item-identificacao {
    font-weight: 600;
    color: #374151;
    font-size: 11pt;
    background: #e5e7eb;
    padding: 4px 10px;
    border-radius: 999px;
  }

  .dados-item {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .dados-item .campo-duas-colunas {
    grid-column: span 2;
  }

  .imagem {
    border: 1px dashed #cbd5f5;
    min-height: 160px;
    max-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f1f5f9;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .imagem span {
    color: #64748b;
    font-size: 13px;
    text-align: center;
    padding: 0 16px;
  }

  .imagem img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .detalhes-item {
    margin-bottom: 16px;
  }

  .detalhes-item h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    text-transform: uppercase;
    color: #1f2937;
    letter-spacing: 0.08em;
  }

  .detalhes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .detalhe {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 8px;
    background-color: #ffffff;
  }

  .detalhe-label {
    display: block;
    font-size: 9pt;
    color: #6b7280;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .detalhe-valor {
    font-size: 11pt;
    font-weight: 600;
    color: #111827;
    word-break: break-word;
  }

  .observacao-item,
  .observacao-pedido {
    border-left: 4px solid #2563eb;
    background-color: #e0f2fe;
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 11pt;
    color: #1e3a8a;
    line-height: 1.5;
  }

  .observacao-item strong,
  .observacao-pedido strong {
    display: block;
    margin-bottom: 6px;
    text-transform: uppercase;
    font-size: 10pt;
    letter-spacing: 0.08em;
  }

  .observacao-item p,
  .observacao-pedido p {
    margin: 0;
  }

  .resumo {
    background-color: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 8px;
  }

  .resumo h4 {
    margin: 0 0 12px 0;
    font-size: 12pt;
    text-transform: uppercase;
    color: #111827;
    letter-spacing: 0.08em;
  }

  .linha-resumo {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 12pt;
    color: #111827;
  }

  .linha-resumo span:last-child {
    font-weight: 600;
  }

  .linha-resumo.total {
    font-weight: 700;
    border-top: 1px solid #d1d5db;
    padding-top: 6px;
    margin-top: 8px;
  }

  .no-items {
    font-size: 11pt;
    color: #6b7280;
    padding: 18px;
    text-align: center;
    border: 1px dashed #cbd5f5;
    border-radius: 8px;
    background: #f1f5f9;
  }

  @media screen and (max-width: 768px) {
    body {
      padding: 12px;
    }

    .titulo-area {
      align-items: flex-start;
    }

    .cabecalho-info {
      grid-template-columns: 1fr;
    }

    .dados-item,
    .dados-cliente,
    .dados-pedido {
      grid-template-columns: 1fr;
    }

    .dados-item .campo-duas-colunas {
      grid-column: span 1;
    }
  }

  @media print {
    body {
      padding: 0;
      background: #ffffff;
    }

    .ficha {
      margin-bottom: 12px;
      border-radius: 0;
      box-shadow: none;
      border-color: #9ca3af;
    }

    .bloco,
    .resumo,
    .item {
      background: #ffffff;
    }

    .observacao-item,
    .observacao-pedido {
      background: #f3f4f6;
      color: #111827;
    }

    .prioridade-badge,
    .badge-pedido,
    .status-badge {
      filter: grayscale(0);
    }
  }
`;

export const printOrder = (order: OrderWithItems) => {
  const content = generatePrintContent(order);
  const styles = buildStyles();

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Pedido #${escapeHtml((order.numero || order.id).toString())}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);
  doc.close();

  const handleAfterPrint = () => {
    setTimeout(() => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.removeChild(iframe);
    }, 200);
  };

  window.addEventListener('afterprint', handleAfterPrint);

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 100);
};
