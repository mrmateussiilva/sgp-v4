import { OrderWithItems, OrderItem } from '../types';
import { generateTemplatePrintContent } from './templateProcessor';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Imprime ficha usando template geral (A4 completo)
 */
export const printTemplateGeral = async (order: OrderWithItems, items?: OrderItem[]) => {
  const templateContent = await generateTemplatePrintContent('geral', order, items);

  if (!templateContent) {
    console.error('Template geral não encontrado');
    return;
  }

  printTemplateContent(templateContent, order, 'Geral');
};

/**
 * Imprime ficha usando template resumo (1/2 A4)
 */
export const printTemplateResumo = async (order: OrderWithItems, items?: OrderItem[]) => {
  const templateContent = await generateTemplatePrintContent('resumo', order, items);

  if (!templateContent) {
    console.error('Template resumo não encontrado');
    return;
  }

  printTemplateContent(templateContent, order, 'Resumo');
};

/**
 * Função interna para imprimir conteúdo do template
 */
const printTemplateContent = (
  templateContent: { html: string; css: string },
  order: OrderWithItems,
  templateName: string
) => {
  const content = `<div class="template-document">${templateContent.html}</div>`;
  const styles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    ${templateContent.css}
    
    .template-document {
      width: 100%;
    }
    
    @page {
      size: A4 portrait;
      margin: 0;
    }
    
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: white;
    }
    
    @media print {
      .template-page {
        page-break-after: always;
      }
      
      .template-page:last-child {
        page-break-after: auto;
      }
    }
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.visibility = 'hidden';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';

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
        <title>Ficha de Serviço ${templateName} - #${escapeHtml((order.numero || order.id).toString())}</title>
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

