import { OrderWithItems, OrderItem } from '../types';
import { generateTemplatePrintContent } from './templateProcessor';

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
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .template-page:last-child {
        page-break-after: auto;
      }
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

  // Combinar todos os HTMLs em um único documento
  const combinedContent = validOrdersHtml.join('\n');
  
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
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .template-page:last-child {
        page-break-after: auto;
      }
    }
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Fichas de Serviço - ${validOrdersHtml.length} pedido(s)</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="template-document">${combinedContent}</div>
      </body>
    </html>
  `;

  return html;
};
