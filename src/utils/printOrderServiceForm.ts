import { OrderWithItems, OrderItem } from '../types';
import { generateTemplatePrintContent, loadTemplates } from './templateProcessor';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Imprime ficha de serviço usando template da API
 * @param order - Pedido a ser impresso
 * @param templateType - Tipo de template: 'geral' (A4) ou 'resumo' (1/3 A4)
 * @param items - Itens específicos para imprimir (opcional, se não fornecido, imprime todos)
 */
export const printOrderServiceForm = async (
  order: OrderWithItems, 
  templateType: 'geral' | 'resumo' = 'geral',
  items?: OrderItem[]
) => {
  // Sempre usar template da API
  const templateContent = await generateTemplatePrintContent(templateType, order, items);
  
  if (!templateContent) {
    throw new Error(
      `Template ${templateType} não encontrado. Certifique-se de que a API está disponível e os templates estão configurados.`
    );
  }

  const content = `<div class="template-document">${templateContent.html}</div>`;
  const styles = `
    ${templateContent.css}
    .template-document {
      width: 100%;
      background: white;
    }
    @page {
      size: ${templateType === 'resumo' ? '187mm 280mm' : 'A4 portrait'};
      margin: ${templateType === 'resumo' ? '0' : '10mm'};
    }
    ${templateType === 'resumo' ? `
    body {
      width: 187mm;
      height: 280mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    ` : ''}
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      color: #1a1a1a;
    }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      body {
        padding: 0 !important;
        margin: 0 !important;
        background: white !important;
      }
      
      button,
      .no-print,
      nav,
      header {
        display: none !important;
      }
      
      .template-page {
        page-break-after: always;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .template-page:last-child {
        page-break-after: auto;
      }
      /* CSS de 3 itens por página é gerenciado por templateProcessor.ts e generateBasicTemplateCSS */
    }
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Ficha de Serviço #${escapeHtml((order.numero || order.id).toString())}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${content}
        <script>
          (function(){
            function doPrint(){
              try { window.focus(); window.print(); } catch(e){}
            }
            window.addEventListener('load', function(){ setTimeout(doPrint, 150); }, { once:true });
          })();
        </script>
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
      setTimeout(() => {
        try { 
          temp.contentWindow?.focus(); 
          temp.contentWindow?.print(); 
        } catch {
          // Ignorar erros de impressão
        }
        setTimeout(() => { 
          try { 
            document.body.removeChild(temp); 
          } catch {
            // Ignorar erros de remoção
          }
        }, 1000);
      }, 300);
    }
    return;
  }
  
  win.document.open();
  win.document.write(html);
  win.document.close();
};

/**
 * Imprime múltiplos pedidos usando template da API
 * @param orders - Array de pedidos a serem impressos
 * @param templateType - Tipo de template: 'geral' (A4) ou 'resumo' (1/3 A4)
 */
export const printMultipleOrdersServiceForm = async (
  orders: OrderWithItems[],
  templateType: 'geral' | 'resumo' = 'geral'
): Promise<string> => {
  if (orders.length === 0) {
    throw new Error('Nenhum pedido fornecido para impressão');
  }

  // Carregar template uma vez (todos os pedidos usam o mesmo template)
  const firstOrder = orders[0];
  const templateContent = await generateTemplatePrintContent(templateType, firstOrder);
  
  if (!templateContent) {
    throw new Error(
      `Template ${templateType} não encontrado. Certifique-se de que a API está disponível e os templates estão configurados.`
    );
  }

  // Carregar template para obter dimensões reais
  const templates = await loadTemplates();
  const template = templates?.[templateType];
  
  if (!template) {
    throw new Error(`Template ${templateType} não encontrado para obter dimensões`);
  }

  // Usar dimensões reais do template
  const templateHeight = template.height; // 92mm para resumo

  // Gerar conteúdo HTML para cada pedido
  const ordersHtml = await Promise.all(
    orders.map(async (order) => {
      const orderTemplateContent = await generateTemplatePrintContent(templateType, order);
      if (!orderTemplateContent) {
        console.warn(`Erro ao gerar template para pedido #${order.numero || order.id}`);
        return '';
      }
      return orderTemplateContent.html;
    })
  );

  // Filtrar pedidos que falharam
  const validOrdersHtml = ordersHtml.filter(html => html !== '');

  if (validOrdersHtml.length === 0) {
    throw new Error('Nenhum pedido pôde ser processado para impressão');
  }

  // Para template resumo, organizar como EXATAMENTE 3 itens por página (OBRIGATÓRIO)
  let combinedContent: string;
  if (templateType === 'resumo') {
    // Template resumo: EXATAMENTE 3 itens por página (OBRIGATÓRIO)
    const itemsPerPage = 3; // FORÇAR 3 itens por página
    
    const pages: string[][] = [];
    
    // Agrupar itens em grupos de 3 (EXATAMENTE 3 por página)
    for (let i = 0; i < validOrdersHtml.length; i += itemsPerPage) {
      pages.push(validOrdersHtml.slice(i, i + itemsPerPage));
    }
    
    // Cada página contém EXATAMENTE 3 itens
    combinedContent = pages.map((pageItems, pageIndex) => {
      const isLastPage = pageIndex === pages.length - 1;
      // Garantir que sempre tenha 3 slots (preencher com vazio se necessário)
      while (pageItems.length < 3) {
        pageItems.push('');
      }
      return `<div class="resumo-page page-group" style="height: 297mm !important; max-height: 297mm !important; min-height: 297mm !important; overflow: hidden !important; ${isLastPage ? '' : 'page-break-after: always !important;'} page-break-inside: avoid !important; break-inside: avoid !important; display: flex !important; flex-direction: column !important; gap: 0 !important; padding: 0 !important; margin: 0 !important; width: 210mm !important; box-sizing: border-box !important;">
        ${pageItems.join('\n')}
      </div>`;
    }).join('\n');
  } else {
    // Para template geral, manter comportamento atual (um por página)
    combinedContent = validOrdersHtml.join('\n');
  }
  
  const styles = `
    ${templateContent.css}
    .template-document {
      width: 100%;
      background: white;
    }
    @page {
      size: ${templateType === 'resumo' ? 'A4 landscape' : 'A4 portrait'};
      margin: 10mm;
    }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      color: #1a1a1a;
    }
    ${templateType === 'resumo' ? `
    .resumo-page.page-group {
      width: 210mm !important;
      height: 297mm !important; /* Altura fixa A4 */
      max-height: 297mm !important;
      min-height: 297mm !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    /* Cada template-page/item-container é um item que ocupa exatamente 1/3 da página */
    .resumo-page.page-group .template-page,
    .resumo-page.page-group .item-container {
      flex: 0 0 auto !important;
      height: calc(297mm / 3) !important; /* Exatamente 1/3 (33%) */
      max-height: calc(297mm / 3) !important;
      min-height: calc(297mm / 3) !important;
      width: 100% !important;
      page-break-after: auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: hidden !important;
      position: relative !important;
      box-sizing: border-box !important;
      border-bottom: 1px solid #e5e7eb !important; /* Separador visual */
      padding: 2mm !important;
    }
    .resumo-page.page-group .template-page:last-child,
    .resumo-page.page-group .item-container:last-child {
      border-bottom: none !important;
    }
    @media print {
      .resumo-page.page-group {
        height: 100vh !important;
        max-height: 100vh !important;
        min-height: 100vh !important;
      }
      .resumo-page.page-group .template-page,
      .resumo-page.page-group .item-container {
        height: calc(100vh / 3) !important; /* Exatamente 1/3 da viewport */
        max-height: calc(100vh / 3) !important;
        min-height: calc(100vh / 3) !important;
        orphans: 999 !important;
        widows: 999 !important;
      }
    }
    .resumo-page .template-page:last-child {
      margin-bottom: 0;
      border-bottom: none;
    }
    /* Campos dentro da faixa não podem crescer verticalmente */
    .resumo-page .template-page .template-field {
      overflow: hidden;
      text-overflow: ellipsis;
      word-wrap: break-word;
      max-height: 100%;
    }
    ` : ''}
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      body {
        padding: 0 !important;
        margin: 0 !important;
        background: white !important;
      }
      
      button,
      .no-print,
      nav,
      header {
        display: none !important;
      }
      
      ${templateType === 'resumo' ? `
      .resumo-page {
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
      }
      /* Faixa horizontal única - altura fixa, nunca cresce */
      .resumo-page .template-page {
        flex: 0 0 auto !important;
        height: ${templateHeight}mm !important;
        max-height: ${templateHeight}mm !important;
        min-height: ${templateHeight}mm !important;
        width: 100% !important;
        page-break-after: auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 2mm !important;
        overflow: hidden !important;
      }
      .resumo-page .template-page:last-child {
        margin-bottom: 0 !important;
        border-bottom: none !important;
      }
      /* Campos nunca crescem verticalmente */
      .resumo-page .template-page .template-field {
        overflow: hidden !important;
        max-height: 100% !important;
      }
      ` : `
      .template-page {
        page-break-after: always;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .template-page:last-child {
        page-break-after: auto;
      }
      `}
    }
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Fichas de Serviço - ${validOrdersHtml.length} pedido(s)</title>
        <style>${styles}</style>
        <style>
          /* Override robusto para Tauri/print:
             evita que ESPECIFICAÇÕES TÉCNICAS “suma” por overflow/scroll. */
          .section-content.especificacoes-content {
            overflow: visible !important;
            max-height: none !important;
          }
          /* Ajuste leve para caber mais linhas, sem mexer no template original */
          .section-content.especificacoes-content .spec-item {
            font-size: 8.5pt !important;
            line-height: 1.2 !important;
            margin-bottom: 0.4mm !important;
          }
        </style>
      </head>
      <body>
        <div class="template-document">${combinedContent}</div>
        <script>
          // Garantir que nenhum bloco comece “rolado” para baixo (alguns WebViews fazem isso)
          (function () {
            window.addEventListener('load', function () {
              try {
                document.querySelectorAll('.section-content.especificacoes-content').forEach(function (el) {
                  try { el.scrollTop = 0; } catch (e) {}
                });
              } catch (e) {}
            }, { once: true });
          })();
        </script>
      </body>
    </html>
  `;

  return html;
};
