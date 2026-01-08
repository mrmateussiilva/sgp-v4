import { OrderItem, OrderWithItems } from '../types';
import { imageToBase64 } from './imageLoader';
import { isValidImagePath } from './path';

// ============================================================================
// TYPES
// ============================================================================

type OrderFinancials = {
  itemsSubtotal: number;
  freightValue: number;
  discountValue: number;
  finalTotal: number;
};

type ItemDetail = {
  label: string;
  value: string;
};

// ============================================================================
// UTILITY FUNCTIONS - Parsing e Formatação
// ============================================================================

const parseCurrencyValue = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$numberDecimal === 'string') {
      return parseCurrencyValue(obj.$numberDecimal);
    }
    if (obj.value !== undefined) {
      return parseCurrencyValue(obj.value);
    }
    return 0;
  }

  const raw = String(value).trim();
  if (!raw) return 0;

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

const formatCurrency = (value: unknown): string =>
  new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(parseCurrencyValue(value));

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getFieldValue = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return undefined;
};

// ============================================================================
// DATA COLLECTION - Coleta de dados dos itens
// ============================================================================

const collectItemDetails = (item: OrderItem): ItemDetail[] => {
  const details: ItemDetail[] = [];
  const itemRecord = item as unknown as Record<string, unknown>;
  const tipoProducao = (item.tipo_producao || '').toLowerCase();
  
  // Determina o tipo de produção
  const isTotem = tipoProducao.includes('totem');
  const isAdesivo = tipoProducao.includes('adesivo');
  const isLona = tipoProducao.includes('lona');

  const addDetail = (label: string, value: unknown) => {
    if (value === null || value === undefined) return;
    
    let stringValue = '';
    if (typeof value === 'string') {
      stringValue = value.trim();
    } else if (typeof value === 'number') {
      stringValue = value.toString();
    } else if (typeof value === 'boolean') {
      if (!value) return; // Se for false, não adiciona
      stringValue = 'Sim';
    }

    // Não exibe se for vazio, "Não informado" ou "Não"
    if (stringValue && stringValue !== 'Não informado' && stringValue !== 'Não' && stringValue.toLowerCase() !== 'sem-emenda' && stringValue.toLowerCase() !== 'nenhum') {
      details.push({ label, value: stringValue });
    }
  };

  const addCurrency = (label: string, value: unknown) => {
    const amount = parseCurrencyValue(value);
    if (amount > 0) {
      details.push({ label, value: formatCurrency(amount) });
    }
  };

  // ===== CAMPOS COMUNS A TODOS =====
  addDetail('Tipo de Produção', item.tipo_producao);
  addDetail('Descrição', item.descricao);
  addDetail('Quantidade', item.quantity);
  
  // Dimensões (se houver)
  if (item.largura) addDetail('Largura', item.largura);
  if (item.altura) addDetail('Altura', item.altura);
  if (item.metro_quadrado) addDetail('m²', item.metro_quadrado);
  
  // Equipe
  if (item.designer) addDetail('Designer', item.designer);
  if (item.vendedor) addDetail('Vendedor', item.vendedor);

  // ===== CAMPOS ESPECÍFICOS POR TIPO =====
  
  if (isTotem) {
    // TOTEM: Material é o principal
    addDetail('Material', item.tecido);
    addDetail('Tipo de Acabamento', item.tipo_acabamento);
    
  } else if (isAdesivo) {
    // ADESIVO: Tipo de adesivo e valores
    addDetail('Tipo de Adesivo', item.tecido || getFieldValue(itemRecord, 'tipo_adesivo'));
    addCurrency('Valor do Adesivo', getFieldValue(itemRecord, 'valor_adesivo'));
    addDetail('Qtd. Adesivos', getFieldValue(itemRecord, 'quantidade_adesivo'));
    addCurrency('Outros Valores', getFieldValue(itemRecord, 'outros_valores_adesivo'));
    
  } else if (isLona) {
    // LONA: Campos específicos de lona
    addDetail('Tecido', item.tecido);
    addDetail('Terceirizado', getFieldValue(itemRecord, 'terceirizado'));
    addDetail('Acabamento Lona', getFieldValue(itemRecord, 'acabamento_lona'));
    addCurrency('Valor Lona', getFieldValue(itemRecord, 'valor_lona'));
    addDetail('Qtd. Lona', getFieldValue(itemRecord, 'quantidade_lona'));
    addCurrency('Outros Valores', getFieldValue(itemRecord, 'outros_valores_lona'));
    
  } else {
    // PAINEL ou OUTROS: Campos padrão
    addDetail('Tecido', item.tecido);
    addDetail('Overloque', getFieldValue(itemRecord, 'overloque'));
    addDetail('Elástico', getFieldValue(itemRecord, 'elastico'));
    addDetail('Tipo de Acabamento', item.tipo_acabamento);
    
    // Ilhós (só se tiver)
    if (item.quantidade_ilhos) {
      addDetail('Qtd. Ilhós', item.quantidade_ilhos);
      if (item.espaco_ilhos) addDetail('Espaço Ilhós', item.espaco_ilhos);
      addCurrency('Valor Ilhós', item.valor_ilhos);
    }
    
    // Cordinha (só se tiver)
    if (item.quantidade_cordinha) {
      addDetail('Qtd. Cordinha', item.quantidade_cordinha);
      if (item.espaco_cordinha) addDetail('Espaço Cordinha', item.espaco_cordinha);
      addCurrency('Valor Cordinha', item.valor_cordinha);
    }
    
    // Emenda (só se tiver)
    if (item.emenda && item.emenda.toLowerCase() !== 'sem-emenda') {
      addDetail('Emenda', item.emenda);
      if (item.emenda_qtd) addDetail('Qtd. Emendas', item.emenda_qtd);
    }

    addDetail('Zíper', getFieldValue(itemRecord, 'ziper'));
    addDetail('Cordinha', getFieldValue(itemRecord, 'cordinha_extra'));
    addDetail('Alcinha', getFieldValue(itemRecord, 'alcinha'));
    addDetail('Toalha pronta', getFieldValue(itemRecord, 'toalha_pronta'));
  }

  return details;
};

// ============================================================================
// HTML BUILDERS - Construção de HTML
// ============================================================================

const formatOrderDate = (dateValue?: string | null): string => {
  if (!dateValue) return 'Não informado';
  try {
    const date = dateValue.includes('T') ? new Date(dateValue) : new Date(`${dateValue}T00:00:00`);
    return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleDateString('pt-BR');
  } catch {
    return 'Não informado';
  }
};

const buildOrderHeader = (order: OrderWithItems): string => {
  const orderId = (order.numero || order.id).toString();
  const customerName = order.customer_name || order.cliente || 'Não informado';
  const phone = order.telefone_cliente || 'Não informado';
  const city = order.cidade_cliente || '';
  const state = order.estado_cliente || '';
  const location = [city, state].filter(Boolean).join(' / ') || 'Não informado';
  const formaEnvio = order.forma_envio || 'Não informado';
  const prioridade = order.prioridade || '';
  
  const entradaDate = formatOrderDate(order.data_entrada || order.created_at);
  const entregaDate = formatOrderDate(order.data_entrega);

  return `
    <div class="header">
      <div class="header-line1">
        <span><strong>Pedido #${escapeHtml(orderId)}</strong></span>
        <span><strong>Cliente:</strong> ${escapeHtml(customerName)}</span>
        <span><strong>Telefone:</strong> ${escapeHtml(phone)}</span>
        <span><strong>Local:</strong> ${escapeHtml(location)}</span>
    </div>
      <div class="header-line2">
        <span><strong>Entrada:</strong> ${escapeHtml(entradaDate)} → <strong>Entrega:</strong> ${escapeHtml(entregaDate)}</span>
        <span><strong>Envio:</strong> ${escapeHtml(formaEnvio)}</span>
        ${prioridade ? `<span class="priority"><strong>Prioridade:</strong> ${escapeHtml(prioridade)}</span>` : ''}
        </div>
      <div class="header-divider"></div>
    </div>
  `;
};

const buildItemCard = (
  item: OrderItem, 
  itemIndex: number,
  totalQuantity: number,
  isLastItem: boolean, 
  financials: OrderFinancials,
  imageBase64Map?: Map<string, string>
): string => {
  const itemRecord = item as unknown as Record<string, unknown>;
  const details = collectItemDetails(item);
  const imagePath = item.imagem?.trim();
  const imageCaption = getFieldValue(itemRecord, 'legenda_imagem');
  
  // Usar base64 se disponível, senão usar o caminho original
  const imageUrl = imagePath && imageBase64Map?.has(imagePath) 
    ? imageBase64Map.get(imagePath)! 
    : imagePath;

  // Calcular valores financeiros do item
  const subtotal = parseCurrencyValue(item.subtotal);
  const discount = parseCurrencyValue(
    getFieldValue(itemRecord, 'desconto') || 
    getFieldValue(itemRecord, 'valor_desconto') || 
    0
  );
  const total = Math.max(subtotal - discount, 0);

  const detailsHtml = details.length > 0 
    ? details.map(detail => `
        <tr>
          <td class="label">${escapeHtml(detail.label)}:</td>
          <td class="value">${escapeHtml(detail.value)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="2" class="no-data">Nenhum detalhe disponível</td></tr>';

  return `
    <div class="item-page">
      <div class="item-section">
        <!-- Card de Numeração -->
        <div class="item-numbering-card">
          <div class="numbering-label">Tecido</div>
          <div class="numbering-value">${itemIndex}/${totalQuantity}</div>
      </div>

        <!-- Linha 4: Área de Detalhes (60% + 40%) -->
        <div class="item-content-row">
          <div class="item-details-column">
            <table class="details-table">
              <tbody>
                ${detailsHtml}
              </tbody>
            </table>
            ${item.observacao?.trim() ? `
              <div class="observation">
                <strong>Observações:</strong> ${escapeHtml(item.observacao.trim()).replace(/\n/g, '<br />')}
    </div>
            ` : ''}
        </div>
        <div class="item-image-column">
          ${imageUrl ? `
            <div class="image-wrapper">
              <img src="${escapeHtml(imageUrl)}" alt="Imagem do item" />
              ${imageCaption ? `<div class="image-caption">${escapeHtml(imageCaption)}</div>` : ''}
            </div>
          ` : '<div class="no-image">Sem imagem</div>'}
        </div>
        </div>

        <!-- Linha 5: Resumo Financeiro do Item -->
        <div class="item-financial-section">
          <h3>Resumo Financeiro do Item</h3>
          <table class="financial-table">
            <tbody>
              <tr>
                <td class="label">Subtotal:</td>
                <td class="value">${formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td class="label">Desconto:</td>
                <td class="value">${formatCurrency(discount)}</td>
              </tr>
              <tr class="total-row">
                <td class="label"><strong>Total do Item:</strong></td>
                <td class="value"><strong>${formatCurrency(total)}</strong></td>
              </tr>
            </tbody>
          </table>
    </div>
    </div>

      ${isLastItem ? `
        <!-- Linha 6: Divisória -->
        <div class="item-divider"></div>
        
        <!-- Linha 7: Financeiro do Pedido (Total) - Apenas no último item -->
        ${buildFinancialSummary(financials)}
      ` : ''}
    </div>
  `;
};

const buildFinancialSummary = (financials: OrderFinancials): string => {
  return `
    <!-- Linha 7: Financeiro do Pedido (Total) -->
    <div class="order-financial-section">
      <h2>Informações Financeiras do Pedido (Total)</h2>
      <table class="financial-table">
        <tbody>
          <tr>
            <td class="label">Subtotal dos Itens:</td>
            <td class="value">${formatCurrency(financials.itemsSubtotal)}</td>
          </tr>
          <tr>
            <td class="label">Desconto Total:</td>
            <td class="value">${formatCurrency(financials.discountValue)}</td>
          </tr>
          <tr>
            <td class="label">Frete:</td>
            <td class="value">${formatCurrency(financials.freightValue)}</td>
          </tr>
          <tr class="final-total-row">
            <td class="label"><strong>💰 TOTAL FINAL:</strong></td>
            <td class="value"><strong>${formatCurrency(financials.finalTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

// ============================================================================
// FINANCIAL CALCULATIONS - Cálculos Financeiros
// ============================================================================

const computeOrderFinancials = (order: OrderWithItems): OrderFinancials => {
  const itemsSubtotal = Array.isArray(order.items)
    ? order.items.reduce((sum, current) => sum + parseCurrencyValue(current.subtotal), 0)
    : 0;

  const orderRecord = order as unknown as Record<string, unknown>;
  const freightValue = parseCurrencyValue(
    getFieldValue(orderRecord, 'valor_frete') || 
    getFieldValue(orderRecord, 'frete') || 
    0
  );

  const explicitDiscount = parseCurrencyValue(
    getFieldValue(orderRecord, 'desconto') ||
    getFieldValue(orderRecord, 'valor_desconto') ||
    getFieldValue(orderRecord, 'desconto_total') ||
    0
  );

  const totalValue = parseCurrencyValue(
    order.total_value || 
    getFieldValue(orderRecord, 'valor_total') || 
    0
  );

  let discountValue = explicitDiscount > 0 ? explicitDiscount : 0;

  if (discountValue <= 0 && totalValue > 0) {
    const inferredDiscount = itemsSubtotal + freightValue - totalValue;
    if (inferredDiscount > 0) {
      discountValue = inferredDiscount;
    }
  }

  const totalBeforeDiscount = itemsSubtotal + freightValue;
  const finalTotal = totalValue > 0 ? totalValue : Math.max(totalBeforeDiscount - discountValue, 0);

  return {
    itemsSubtotal,
    freightValue,
    discountValue,
    finalTotal,
  };
};

// ============================================================================
// CONTENT GENERATION - Geração de Conteúdo
// ============================================================================

const generatePrintContent = (order: OrderWithItems, imageBase64Map?: Map<string, string>): string => {
  const financials = computeOrderFinancials(order);
  const headerHtml = buildOrderHeader(order);

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return `
      <div class="document">
        ${headerHtml}
        <div class="no-items">
          <p>Nenhum item encontrado para este pedido.</p>
        </div>
        ${buildFinancialSummary(financials)}
      </div>
    `;
  }

  // Expandir itens baseado na quantidade (cada unidade = 1 página)
  const expandedItems: Array<{ item: OrderItem; itemIndex: number; totalQuantity: number }> = [];
  
  order.items.forEach((item) => {
    const quantity = item.quantity || 1;
    for (let i = 1; i <= quantity; i++) {
      expandedItems.push({
        item,
        itemIndex: i,
        totalQuantity: quantity
      });
    }
  });

  // Cada unidade em uma página, com cabeçalho repetido
  const totalPages = expandedItems.length;
  const pagesHtml = expandedItems
    .map((expanded, index) => {
      const isLastPage = index === totalPages - 1;
      return `
        <div class="page">
          ${headerHtml}
          ${buildItemCard(expanded.item, expanded.itemIndex, expanded.totalQuantity, isLastPage, financials, imageBase64Map)}
        </div>
      `;
    })
    .join('');

  return `<div class="document">${pagesHtml}</div>`;
};

// ============================================================================
// STYLES - Estilos CSS
// ============================================================================

const buildStyles = (): string => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  @page {
    size: A4 portrait;
    margin: 6mm;
  }

  body {
    font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #1a1a1a;
    background: #fff;
    padding: 0;
    margin: 0;
  }

  .document {
    width: 100%;
  }

  /* ========== PÁGINA ========== */
  .page {
    width: 100%;
    max-height: 285mm;
    display: flex;
    flex-direction: column;
    page-break-after: always;
    padding: 6mm;
    overflow: hidden;
  }

  .page:last-child {
    page-break-after: auto;
  }

  .item-page {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  /* ========== CABEÇALHO ========== */
  .header {
    flex-shrink: 0;
    padding: 4mm 0;
    border-bottom: 3px solid #1e293b;
    margin-bottom: 4mm;
    background: linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%);
    border-radius: 4px;
    padding-left: 2mm;
    padding-right: 2mm;
  }

  .header-line1,
  .header-line2 {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    padding: 2px 0;
    line-height: 1.5;
  }

  .header-line1 {
    font-size: 12pt;
    font-weight: 600;
    margin-bottom: 2mm;
  }

  .header-line2 {
    font-size: 10pt;
    color: #475569;
  }

  .header-line1 span,
  .header-line2 span {
    white-space: nowrap;
    padding: 1px 4px;
  }

  .header-line1 span strong {
    color: #0f172a;
    font-weight: 700;
  }

  .header-line2 .priority {
    color: #dc2626;
    font-weight: bold;
    background: #fee2e2;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .header-divider {
    height: 2px;
    background: linear-gradient(to right, #1e293b 0%, transparent 100%);
    margin-top: 3mm;
  }

  /* ========== ITEM SECTION ========== */
  .item-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* ========== CARD DE NUMERAÇÃO ========== */
  .item-numbering-card {
    flex-shrink: 0;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
    color: white;
    padding: 10px 20px;
    border-radius: 10px;
    margin-bottom: 10px;
    align-self: flex-start;
    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.25), 0 2px 4px rgba(37, 99, 235, 0.15);
    min-width: 110px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .numbering-label {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.95;
    margin-bottom: 3px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .numbering-value {
    font-size: 20pt;
    font-weight: 800;
    letter-spacing: 1.5px;
    line-height: 1;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .item-content-row {
    flex: 1;
    display: grid;
    grid-template-columns: 58% 42%;
    gap: 6px;
    margin-bottom: 6px;
    min-height: 0;
  }

  .item-details-column {
    padding-right: 6px;
    overflow-y: auto;
    max-height: 160mm;
  }

  .details-table {
    width: 100%;
    border-collapse: collapse;
  }

  .details-table td {
    padding: 4px 8px;
    font-size: 10pt;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
    transition: background-color 0.1s;
  }

  .details-table tr:hover td {
    background-color: #f8fafc;
  }

  .details-table td.label {
    font-weight: 600;
    width: 160px;
    color: #475569;
    background: #f1f5f9;
    border-right: 2px solid #cbd5e1;
  }

  .details-table td.value {
    color: #1e293b;
    font-weight: 500;
  }

  .details-table tr:last-child td {
    border-bottom: none;
  }

  .no-data {
    text-align: center;
    color: #999;
    font-style: italic;
    padding: 10px;
    font-size: 10pt;
  }

  .observation {
    margin-top: 8px;
    padding: 8px 10px;
    background: linear-gradient(to right, #fef3c7 0%, #fef9e7 100%);
    border-left: 4px solid #f59e0b;
    border-radius: 4px;
    font-size: 9.5pt;
    line-height: 1.5;
    box-shadow: 0 1px 3px rgba(245, 158, 11, 0.1);
  }

  .observation strong {
    display: block;
    margin-bottom: 4px;
    color: #92400e;
    font-weight: 700;
  }

  /* Coluna de Imagem */
  .item-image-column {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    max-height: 160mm;
  }

  .image-wrapper {
    width: 100%;
    max-height: 160mm;
    border: 2px solid #cbd5e1;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 8px;
    gap: 10px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .image-wrapper img {
    max-width: 100%;
    max-height: 140mm;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .image-caption {
    width: 100%;
    font-size: 32pt;
    color: #475569;
    text-align: center;
    line-height: 1.4;
    word-break: break-word;
    font-weight: 500;
    padding: 4px;
    background: #ffffff;
    border-radius: 3px;
  }

  .no-image {
    width: 100%;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #999;
    border: 1px dashed #ccc;
    background: #f9f9f9;
    font-size: 9pt;
  }

  /* ========== RESUMO FINANCEIRO DO ITEM ========== */
  .item-financial-section {
    flex-shrink: 0;
    padding: 8px 0 10px 0;
    border-top: 2px solid #cbd5e1;
    margin-top: 4px;
  }

  .item-financial-section h3 {
    font-size: 11.5pt;
    font-weight: 700;
    margin-bottom: 6px;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .financial-table {
    width: 100%;
    max-width: 450px;
    border-collapse: collapse;
  }

  .financial-table td {
    padding: 5px 8px;
    font-size: 10pt;
    border-bottom: 1px solid #e2e8f0;
  }

  .financial-table td.label {
    font-weight: 600;
    width: 180px;
    color: #475569;
    background: #f8fafc;
  }

  .financial-table td.value {
    text-align: right;
    font-weight: 600;
    color: #1e293b;
    font-family: 'Courier New', monospace;
  }

  .financial-table tr:last-child td {
    border-bottom: none;
  }

  .financial-table tr.total-row td {
    border-top: 3px solid #1e293b;
    padding-top: 8px;
    font-size: 11pt;
    background: #f1f5f9;
    font-weight: 700;
  }

  /* ========== DIVISÓRIA ========== */
  .item-divider {
    flex-shrink: 0;
    height: 2px;
    background: #000;
    margin: 8px 0;
  }

  /* ========== FINANCEIRO DO PEDIDO (TOTAL) ========== */
  .order-financial-section {
    flex-shrink: 0;
    max-height: 55mm;
    padding: 12px 14px;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border: 3px solid #1e293b;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .order-financial-section h2 {
    font-size: 12pt;
    font-weight: 700;
    margin-bottom: 8px;
    text-align: center;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding-bottom: 6px;
    border-bottom: 2px solid #1e293b;
  }

  .order-financial-section .financial-table {
    max-width: 480px;
    margin: 0 auto;
  }

  .order-financial-section tr.final-total-row td {
    border-top: 3px solid #1e293b;
    padding-top: 10px;
    font-size: 12pt;
    font-weight: 800;
    background: #ffffff;
    color: #0f172a;
  }

  .order-financial-section tr.final-total-row td.value {
    font-size: 14pt;
    color: #059669;
    font-family: 'Courier New', monospace;
  }

  /* ========== MENSAGENS ========== */
  .no-items {
    text-align: center;
    padding: 30px;
    color: #666;
    font-size: 11pt;
  }

  /* ========== IMPRESSÃO ========== */
  @media print {
    body {
      padding: 0;
      margin: 0;
    }

    .page {
      max-height: 285mm;
      page-break-after: always;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .header,
    .order-financial-section,
    .item-financial-section,
    .item-numbering-card {
      page-break-inside: avoid;
    }

    .item-numbering-card {
      box-shadow: none;
      border: 2px solid #2563eb;
    }
  }

  /* ========== RESPONSIVO ========== */
  @media screen and (max-width: 768px) {
    body {
      font-size: 10pt;
    }

    .page {
      max-height: none;
      padding: 5mm;
    }

    .header-line1,
    .header-line2 {
      flex-direction: column;
      gap: 4px;
      font-size: 10pt;
    }

    .item-content-row {
      grid-template-columns: 1fr;
      max-height: none;
    }

    .item-details-column,
    .item-image-column {
      max-height: none;
    }

    .details-table td {
      font-size: 9pt;
      padding: 2px 4px;
    }

    .details-table td.label {
      width: 120px;
    }

    .financial-table td {
      font-size: 9pt;
    }
  }
`;

export const printOrder = async (order: OrderWithItems) => {
  const orderIdentifier = String(order.numero || order.id || '').trim() || 'pedido';
  const sanitizedIdentifier = orderIdentifier
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-');
  const printTitle = `Pedido-${sanitizedIdentifier}`;
  const previousTitle = document.title;

  // Carregar todas as imagens para base64 antes de gerar o conteúdo
  const imageBase64Map = new Map<string, string>();
  
  if (Array.isArray(order.items)) {
    const imagePromises = order.items
      .filter(item => item.imagem && isValidImagePath(item.imagem))
      .map(async (item) => {
        try {
          const imagePath = item.imagem!.trim();
          console.log('[printOrder] 🔄 Carregando imagem para impressão:', imagePath);
          const base64 = await imageToBase64(imagePath);
          imageBase64Map.set(imagePath, base64);
          console.log('[printOrder] ✅ Imagem carregada para impressão:', imagePath);
        } catch (error) {
          console.error('[printOrder] ❌ Erro ao carregar imagem para impressão:', {
            imagem: item.imagem,
            error
          });
          // Continuar mesmo se uma imagem falhar
        }
      });
    
    await Promise.all(imagePromises);
    console.log('[printOrder] 📊 Total de imagens carregadas:', imageBase64Map.size);
  }
  
  const content = generatePrintContent(order, imageBase64Map);
  const styles = buildStyles();

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(printTitle)}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;

  // Abrir nova janela e imprimir (mesma abordagem dos relatórios)
  let win: Window | null = null;
  try {
    win = window.open('', '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.warn('Não foi possível abrir janela de impressão:', err);
    win = null;
  }
  
  if (!win) {
    // Fallback: usa iframe oculto
    const temp = document.createElement('iframe');
    temp.style.position = 'fixed';
    temp.style.width = '0';
    temp.style.height = '0';
    temp.style.border = '0';
    document.body.appendChild(temp);
    const doc = temp.contentDocument || temp.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      
      // Executar print via TypeScript após carregar
      const tryPrint = () => {
        try {
          if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
            setTimeout(() => {
              try {
                temp.contentWindow?.focus();
                temp.contentWindow?.print();
              } catch (e) {
                console.warn('Erro ao chamar print no iframe:', e);
              }
              setTimeout(() => {
                try {
                  document.body.removeChild(temp);
                } catch {
                  // Ignorar erros de remoção
                }
              }, 1000);
            }, 150);
          } else {
            setTimeout(tryPrint, 50);
          }
        } catch (e) {
          console.warn('Erro ao tentar imprimir:', e);
        }
      };
      
      if (doc.readyState === 'complete') {
        tryPrint();
      } else {
        doc.addEventListener('DOMContentLoaded', tryPrint, { once: true });
        temp.addEventListener('load', tryPrint, { once: true });
      }
    }
    return;
  }
  
  win.document.open();
  win.document.write(html);
  win.document.close();
  
  // Executar print via TypeScript após janela carregar
  const tryPrint = () => {
    try {
      if (win && (win.document.readyState === 'complete' || win.document.readyState === 'interactive')) {
        setTimeout(() => {
          try {
            win?.focus();
            win?.print();
          } catch (e) {
            console.warn('Erro ao chamar print:', e);
          }
        }, 150);
      } else {
        setTimeout(tryPrint, 50);
      }
    } catch (e) {
      console.warn('Erro ao tentar imprimir:', e);
    }
  };

  if (win.document.readyState === 'complete') {
    tryPrint();
  } else {
    win.addEventListener('load', tryPrint, { once: true });
    win.document.addEventListener('DOMContentLoaded', tryPrint, { once: true });
  }
  
  // Restaurar título anterior após um tempo
  setTimeout(() => {
    document.title = previousTitle;
  }, 1000);
};
