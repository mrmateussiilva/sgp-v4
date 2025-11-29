import { OrderWithItems } from '../types';

// ============================================================================
// TYPES
// ============================================================================

type OrderFinancials = {
  itemsSubtotal: number;
  freightValue: number;
  discountValue: number;
  finalTotal: number;
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

const formatOrderDate = (dateValue?: string | null): string => {
  if (!dateValue) return '';
  try {
    const date = dateValue.includes('T') ? new Date(dateValue) : new Date(`${dateValue}T00:00:00`);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

// ============================================================================
// DATA COLLECTION - Coleta de dados dos itens
// ============================================================================

// Função collectItemDetails removida pois não estava sendo utilizada

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
// HTML BUILDERS - Construção de HTML
// ============================================================================

const buildServiceFormHeader = (order: OrderWithItems): string => {
  const customerName = order.customer_name || order.cliente || 'Não informado';
  const phone = order.telefone_cliente || '';
  const city = order.cidade_cliente || '';
  const state = order.estado_cliente || '';
  const location = [city, state].filter(Boolean).join('/') || 'Não informado';
  
  const entradaDate = formatOrderDate(order.data_entrada || order.created_at);
  const entregaDate = formatOrderDate(order.data_entrega);

  return `
    <div class="service-form-header">
      <div class="title">EMISSÃO FICHA DE SERVIÇO</div>
      <div class="dates">
        <span class="date-label">Entrada:</span>
        <span class="date-value">${escapeHtml(entradaDate)}</span>
        <span class="date-separator">|</span>
        <span class="date-label">Entrega:</span>
        <span class="date-value">${escapeHtml(entregaDate)}</span>
      </div>
      <div class="customer-info">
        <span class="customer-name">${escapeHtml(customerName)}</span>
        <span class="customer-phone">${escapeHtml(phone)}</span>
        <span class="customer-location">${escapeHtml(location)}</span>
      </div>
    </div>
  `;
};

const buildServiceFormBody = (order: OrderWithItems, financials: OrderFinancials): string => {
  const orderId = (order.numero || order.id).toString();
  const formaEnvio = order.forma_envio || '';
  const formaPagamento = order.forma_pagamento_id ? 'A definir' : '';
  
  // Coletar informações dos itens
  let item = null;
  if (Array.isArray(order.items) && order.items.length > 0) {
    item = order.items[0]; // Primeiro item para informações principais
  }

  const descricao = item?.descricao || '';
  const tamanho = item ? `${item.largura || ''} x ${item.altura || ''}` : '';
  const metroQuadrado = item?.metro_quadrado ? ` (${item.metro_quadrado}m²)` : '';
  const tamanhoCompleto = tamanho + metroQuadrado;
  
  const arte = item?.designer || '';
  const designer = item?.vendedor || '';
  const exclusiva = '';
  const vrArte = '';
  
  const rip = '';
  const maquina = '';
  const impressao = '';
  const dataImpressao = '';
  
  const tecido = item?.tecido || '';
  const ilhos = item?.quantidade_ilhos ? `${item.quantidade_ilhos} unidades` : '';
  const emendas = item?.emenda || '';
  const overloque = item?.overloque ? 'Sim' : '';
  const elastico = item?.elastico ? 'Sim' : '';
  
  const revisao = '';
  const expedicao = '';

  return `
    <div class="service-form-body">
      <table class="form-table">
        <tbody>
          <tr>
            <td class="field-label">Nro. OS:</td>
            <td class="field-value">${escapeHtml(orderId)}</td>
          </tr>
          <tr>
            <td class="field-label">Descrição:</td>
            <td class="field-value">${escapeHtml(descricao)}</td>
          </tr>
          <tr>
            <td class="field-label">Tamanho:</td>
            <td class="field-value">${escapeHtml(tamanhoCompleto)}</td>
          </tr>
          <tr>
            <td class="field-label">Arte / Designer / Exclusiva / Vr. Arte:</td>
            <td class="field-value">${escapeHtml(arte)} / ${escapeHtml(designer)} / ${escapeHtml(exclusiva)} / ${escapeHtml(vrArte)}</td>
          </tr>
          <tr>
            <td class="field-label">RIP / Máquina / Impressão / Data Impressão:</td>
            <td class="field-value">${escapeHtml(rip)} / ${escapeHtml(maquina)} / ${escapeHtml(impressao)} / ${escapeHtml(dataImpressao)}</td>
          </tr>
          <tr>
            <td class="field-label">Tecido / Ilhós / Emendas / Overloque / Elástico:</td>
            <td class="field-value">${escapeHtml(tecido)} / ${escapeHtml(ilhos)} / ${escapeHtml(emendas)} / ${escapeHtml(overloque)} / ${escapeHtml(elastico)}</td>
          </tr>
          <tr>
            <td class="field-label">Revisão / Expedição:</td>
            <td class="field-value">${escapeHtml(revisao)} / ${escapeHtml(expedicao)}</td>
          </tr>
          <tr>
            <td class="field-label">Forma de Envio / Pagamento:</td>
            <td class="field-value">${escapeHtml(formaEnvio)} / ${escapeHtml(formaPagamento)}</td>
          </tr>
          <tr class="financial-row">
            <td class="field-label">Valores:</td>
            <td class="field-value financial-values">
              <div class="financial-line">
                <span>Tecido:</span>
                <span>${formatCurrency(financials.itemsSubtotal)}</span>
              </div>
              <div class="financial-line">
                <span>Outros:</span>
                <span>R$ 0,00</span>
              </div>
              <div class="financial-line">
                <span>SubTotal:</span>
                <span>${formatCurrency(financials.itemsSubtotal)}</span>
              </div>
              <div class="financial-line">
                <span>Frete:</span>
                <span>${formatCurrency(financials.freightValue)}</span>
              </div>
              <div class="financial-line total-line">
                <span>Total:</span>
                <span>${formatCurrency(financials.finalTotal)}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

const buildServiceFormFooter = (order: OrderWithItems): string => {
  const observacao = order.observacao || '';
  
  return `
    <div class="service-form-footer">
      <div class="observations">
        <div class="field-label">Observações:</div>
        <div class="field-value">${escapeHtml(observacao)}</div>
      </div>
      <div class="signature-section">
        <div class="signature-line"></div>
        <div class="signature-label">Assinatura</div>
      </div>
    </div>
  `;
};

// ============================================================================
// CONTENT GENERATION - Geração de Conteúdo
// ============================================================================

const generateServiceFormContent = (order: OrderWithItems): string => {
  const financials = computeOrderFinancials(order);
  
  // Gerar duas fichas por página (uma superior e uma inferior)
  const singleForm = `
    <div class="service-form-single">
      ${buildServiceFormHeader(order)}
      ${buildServiceFormBody(order, financials)}
      ${buildServiceFormFooter(order)}
    </div>
  `;

  return `
    <div class="service-form-document">
      ${singleForm}
      ${singleForm}
    </div>
  `;
};

// ============================================================================
// STYLES - Estilos CSS
// ============================================================================

const buildServiceFormStyles = (): string => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  body {
    font-family: 'Courier New', 'Roboto Mono', monospace;
    font-size: 11pt;
    line-height: 1.2;
    color: #000;
    background: #fff;
    padding: 0;
    margin: 0;
  }

  .service-form-document {
    width: 100%;
    max-width: 190mm;
    margin: 0 auto;
    background: #fff;
  }

  .service-form-single {
    width: 100%;
    border: 1px solid #999;
    margin-bottom: 8mm;
    background: #fff;
  }

  /* ========== CABEÇALHO ========== */
  .service-form-header {
    padding: 4mm 6mm 3mm 6mm;
    border-bottom: 1px solid #999;
  }

  .title {
    font-size: 14pt;
    font-weight: bold;
    margin-bottom: 3mm;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dates {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
    margin-bottom: 2mm;
    font-size: 10pt;
  }

  .date-label {
    font-weight: bold;
  }

  .date-value {
    font-family: monospace;
  }

  .date-separator {
    color: #999;
  }

  .customer-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12pt;
    font-weight: bold;
  }

  .customer-name {
    flex: 1;
  }

  .customer-phone {
    margin: 0 8px;
  }

  .customer-location {
    font-size: 10pt;
    font-weight: normal;
  }

  /* ========== CORPO DA FICHA ========== */
  .service-form-body {
    padding: 3mm 6mm;
  }

  .form-table {
    width: 100%;
    border-collapse: collapse;
  }

  .form-table td {
    padding: 2mm;
    border: 1px solid #999;
    vertical-align: top;
    font-size: 10pt;
  }

  .field-label {
    font-weight: bold;
    width: 45%;
    background: #f8f8f8;
    border-right: 1px solid #999;
  }

  .field-value {
    width: 55%;
  }

  .financial-row .field-value {
    padding: 1mm;
  }

  .financial-values {
    display: flex;
    flex-direction: column;
    gap: 1mm;
  }

  .financial-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1mm 2mm;
    border: 1px solid #ccc;
    background: #fafafa;
    font-family: monospace;
    font-size: 9pt;
  }

  .financial-line.total-line {
    font-weight: bold;
    background: #e8e8e8;
    border: 2px solid #999;
  }

  /* ========== RODAPÉ ========== */
  .service-form-footer {
    padding: 3mm 6mm 4mm 6mm;
    border-top: 1px solid #999;
  }

  .observations {
    margin-bottom: 4mm;
  }

  .observations .field-label {
    font-weight: bold;
    margin-bottom: 1mm;
    display: block;
    font-size: 10pt;
  }

  .observations .field-value {
    min-height: 12mm;
    border: 1px solid #999;
    padding: 2mm;
    background: #fff;
    font-size: 10pt;
  }

  .signature-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 4mm;
  }

  .signature-line {
    width: 60mm;
    height: 1px;
    border-bottom: 1px solid #000;
    margin-bottom: 1mm;
  }

  .signature-label {
    font-size: 9pt;
    font-weight: bold;
    text-transform: uppercase;
  }

  /* ========== IMPRESSÃO ========== */
  @media print {
    body {
      padding: 0;
      margin: 0;
    }

    .service-form-document {
      max-width: 190mm;
      margin: 0;
    }

    .service-form-single {
      border: 1px solid #999;
      margin-bottom: 5mm;
      page-break-inside: avoid;
    }

    .service-form-single:last-child {
      margin-bottom: 0;
    }

    .service-form-header,
    .service-form-body,
    .service-form-footer {
      page-break-inside: avoid;
    }

    /* Garantir que duas fichas caibam por página */
    .service-form-single {
      max-height: 130mm;
      overflow: hidden;
    }
  }

  /* ========== RESPONSIVO ========== */
  @media screen and (max-width: 768px) {
    body {
      font-size: 11pt;
    }

    .service-form-document {
      margin: 5mm;
    }

    .customer-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 2mm;
    }

    .dates {
      justify-content: center;
    }

    .form-table td {
      padding: 2mm;
    }

    .field-label {
      width: 35%;
    }

    .field-value {
      width: 65%;
    }
  }
`;

export const printOrderServiceForm = (order: OrderWithItems) => {
  const content = generateServiceFormContent(order);
  const styles = buildServiceFormStyles();

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
        <title>Ficha de Serviço #${escapeHtml((order.numero || order.id).toString())}</title>
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
