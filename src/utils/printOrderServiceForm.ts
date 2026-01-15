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
 * Função compartilhada para fazer cleanup de imagens no documento de impressão
 * Remove molduras, títulos "VISUALIZAÇÃO" e garante que imagens ocupem o máximo de espaço
 */
const performCleanup = (doc: Document) => {
  try {
    const normalizeText = (s: string) => {
      return String(s || '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    };

    const stripStyles = (el: Element) => {
      try {
        (el as HTMLElement).style.setProperty('border', '0', 'important');
        (el as HTMLElement).style.setProperty('outline', '0', 'important');
        (el as HTMLElement).style.setProperty('box-shadow', 'none', 'important');
        (el as HTMLElement).style.setProperty('background', 'transparent', 'important');
        (el as HTMLElement).style.setProperty('padding', '0', 'important');
        (el as HTMLElement).style.setProperty('margin', '0', 'important');
        (el as HTMLElement).style.setProperty('border-radius', '0', 'important');
      } catch (e) {
        // Ignorar erros
      }
    };

    const hasOtherText = (el: Element) => {
      try {
        const raw = (el.textContent || '').trim();
        const norm = normalizeText(raw);
        const cleaned = norm.replace(/VISUALIZACAO[ A-Z]*/g, '').trim();
        return cleaned.length > 0;
      } catch (e) {
        return false;
      }
    };

    const items = doc.querySelectorAll('.item');
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (!item) continue;

      const img = item.querySelector('img');
      if (!img) continue;

      const right = item.querySelector('.right-column') || 
                   (img.closest && img.closest('.right-column')) || 
                   img.parentElement || 
                   item;

      // 1) Esconder título "VISUALIZAÇÃO"
      try {
        const nodes = right.querySelectorAll('*');
        for (let i = 0; i < nodes.length; i++) {
          const el = nodes[i];
          if (!el) continue;

          // Texto solto "VISUALIZAÇÃO" dentro de containers
          try {
            if (el.childNodes && el.childNodes.length) {
              for (let n = 0; n < el.childNodes.length; n++) {
                const node = el.childNodes[n];
                if (node && node.nodeType === 3) {
                  const rawNode = node.textContent || '';
                  if (normalizeText(rawNode).startsWith('VISUALIZACAO')) {
                    node.textContent = '';
                  }
                }
              }
            }
          } catch (e) {
            // Ignorar erros
          }

          // Elementos cujo conteúdo é "VISUALIZAÇÃO..." e não contém imagem
          try {
            const raw = (el.textContent || '').trim();
            if (!raw) continue;
            if (!normalizeText(raw).startsWith('VISUALIZACAO')) continue;
            if (el.querySelector && el.querySelector('img')) continue;
            (el as HTMLElement).style.setProperty('display', 'none', 'important');
            (el as HTMLElement).style.setProperty('margin', '0', 'important');
            (el as HTMLElement).style.setProperty('padding', '0', 'important');
            (el as HTMLElement).style.setProperty('height', '0', 'important');
          } catch (e) {
            // Ignorar erros
          }
        }
      } catch (e) {
        // Ignorar erros
      }

      // 2) Remover "molduras" somente na cadeia que contém a imagem
      try {
        if (img.classList) img.classList.add('__sgp_img_wrap__');

        let p: Element | null = img.parentElement;
        while (p && p !== item) {
          try {
            const imgs = p.querySelectorAll ? p.querySelectorAll('img') : [];
            if (!imgs || imgs.length !== 1 || imgs[0] !== img) break;
            if (hasOtherText(p)) break;
          } catch (e) {
            // Ignorar erros
          }

          if (p.classList) p.classList.add('__sgp_img_wrap__');
          stripStyles(p);
          p = p.parentElement;
        }

        // Também limpa o container "right" se ele for "só imagem"
        try {
          if (right && right !== item && right.contains && right.contains(img) && !hasOtherText(right)) {
            if (right.classList) right.classList.add('__sgp_img_wrap__');
            stripStyles(right);
          }
        } catch (e) {
          // Ignorar erros
        }

        // Garante imagem proporcional e ocupando o container
        stripStyles(img);
        (img as HTMLElement).style.setProperty('display', 'block', 'important');
        (img as HTMLElement).style.setProperty('width', '100%', 'important');
        (img as HTMLElement).style.setProperty('height', '100%', 'important');
        (img as HTMLElement).style.setProperty('max-width', '100%', 'important');
        (img as HTMLElement).style.setProperty('max-height', '100%', 'important');
        (img as HTMLElement).style.setProperty('object-fit', 'contain', 'important');
        (img as HTMLElement).style.setProperty('object-position', 'center', 'important');
      } catch (e) {
        // Ignorar erros
      }
    }
  } catch (e) {
    console.warn('Erro durante cleanup:', e);
  }
};

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

    /* ============================================================
       FIX: evitar sobreposição no template RESUMO (3 por página)
       - quando ESPECIFICAÇÕES cresce, alguns templates usam rodapé absolute
       - aqui a gente força o rodapé a fluir e corta overflow dentro do slot
       ============================================================ */
    ${templateType === 'resumo' ? `
    .item,
    .item-container,
    .resumo-item {
      box-sizing: border-box !important;
    }

    /* Slot fixo do resumo (aprox 99mm por item). Permite conteúdo visível sem cortar. */
    .item {
      height: 90mm !important;
      overflow: visible !important;
      position: relative !important;
    }

    /* Mata posicionamento absoluto do rodapé (Designer/Vendedor) se existir */
    .item .designer,
    .item .vendedor,
    .item .designer-vendedor,
    .item .bottom-row,
    .item .footer-row,
    .item .meta-row {
      position: static !important;
    }

    /* Ajuda a caber mais linhas sem “invadir” o slot */
    .section-content.especificacoes-content {
      overflow: visible !important;
      max-height: none !important;
    }
    .section-content.especificacoes-content .spec-item {
      font-size: 8.2pt !important;
      line-height: 1.15 !important;
      margin-bottom: 0.3mm !important;
    }

    /* ============================================================
       MELHORIA: aumentar imagem (proporcional) no RESUMO sem quebrar 3 itens/página
       - mantém slot de 99mm (altura do .item)
       - só redistribui espaço interno e garante object-fit
       - regras são “tolerantes”: só aplicam se as classes existirem no template da API
       ============================================================ */
    .item .content-wrapper {
      gap: 2mm !important;
    }
    .item .left-column {
      width: 35% !important;
      flex: 0 0 35% !important;
      max-width: 35% !important;
    }
    .item .right-column {
      width: 63% !important;
      flex: 1 1 63% !important;
      max-width: 63% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .item .ficha-image-container,
    .item .image-container,
    .item .visualizacao,
    .item .visualizacao-container {
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      /* Limitar altura máxima para 70mm, mas permitir que seja menor se necessário */
      max-height: 70mm !important;
      min-height: 0 !important;
      height: auto !important;
      overflow: visible !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    /* Remove título/“moldura” que costuma reduzir a área útil da imagem */
    .item .visualizacao-title,
    .item .visualizacao-header,
    .item .visualizacao h1,
    .item .visualizacao h2,
    .item .visualizacao h3,
    .item .visualizacao h4,
    .item .visualizacao .title,
    .item .visualizacao .header,
    .item .image-title,
    .item .image-header {
      display: none !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
    }

    /* Algumas versões colocam uma borda tracejada/“preview frame” */
    .item .visualizacao .preview,
    .item .visualizacao .preview-frame,
    .item .visualizacao .frame,
    .item .visualizacao .border,
    .item .image-container .preview,
    .item .image-container .preview-frame,
    .item .image-container .frame,
    .item .image-container .border {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Garante que a imagem ocupe o máximo possível mantendo proporção */
    .item .ficha-image,
    .item .ficha-image-container img,
    .item .image-container img,
    .item .visualizacao img {
      width: auto !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: 70mm !important;
      object-fit: contain !important;
      object-position: center !important;
      display: block !important;
    }

    /* Remove qualquer “moldura”/efeito na coluna da imagem (inclui pseudo-elementos) */
    .item .right-column,
    .item .right-column * {
      border: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
      background-image: none !important;
      filter: none !important;
    }
    .item .right-column *::before,
    .item .right-column *::after {
      content: none !important;
      border: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    .item .right-column {
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Fallback robusto: remove moldura exatamente na cadeia de wrappers da imagem (independente do template da API) */
    .item .__sgp_img_wrap__,
    .item .__sgp_img_wrap__ * {
      border: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
      background-image: none !important;
      filter: none !important;
      padding: 0 !important;
      margin: 0 !important;
      border-radius: 0 !important;
    }
    .item .__sgp_img_wrap__::before,
    .item .__sgp_img_wrap__::after,
    .item .__sgp_img_wrap__ *::before,
    .item .__sgp_img_wrap__ *::after {
      content: none !important;
      border: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
    }

    /* Fazer a imagem ocupar o máximo do espaço lateral disponível (mantendo proporção) */
    .item .content-wrapper {
      height: 100% !important;
      align-items: stretch !important;
      gap: 0.5mm !important;
      overflow: visible !important;
    }
    .item .left-column,
    .item .right-column {
      height: 100% !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    .item .__sgp_img_wrap__:not(img) {
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      overflow: visible !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .item img.__sgp_img_wrap__ {
      width: auto !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: 70mm !important;
      object-fit: contain !important;
      object-position: center !important;
      display: block !important;
    }
    ` : ''}
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Ficha de Serviço #${escapeHtml((order.numero || order.id).toString())}</title>
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
      
      // Executar cleanup e print via TypeScript após carregar
      const tryPrint = () => {
        try {
          if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
            performCleanup(doc);
      setTimeout(() => {
        try { 
          temp.contentWindow?.focus(); 
          temp.contentWindow?.print(); 
              } catch (e) {
                console.warn('Erro ao chamar print no iframe:', e);
        }
            }, 150);
            
        setTimeout(() => { 
          try { 
            document.body.removeChild(temp); 
          } catch {
            // Ignorar erros de remoção
          }
            }, 4000);
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

  // Executar cleanup e print via TypeScript após janela carregar
  const tryPrint = () => {
    try {
      if (win && win.document.readyState === 'complete' || win.document.readyState === 'interactive') {
        performCleanup(win.document);
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
};

/**
 * Imprime múltiplos pedidos usando template da API
 * @param orders - Array de pedidos a serem impressos
 * @param templateType - Tipo de template: 'geral' (A4) ou 'resumo' (1/3 A4)
 */
export const printMultipleOrdersServiceForm = async (
  orders: OrderWithItems[],
  templateType: 'geral' | 'resumo' = 'geral'
): Promise<void> => {
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
    orders.map(async (order, index) => {
      const orderTemplateContent = await generateTemplatePrintContent(templateType, order);
      if (!orderTemplateContent) {
        console.warn(`Erro ao gerar template para pedido #${order.numero || order.id}`);
        return '';
      }
      // Cada pedido fica isolado em um container `.pedido` com índice para controle de quebra
      // Índice baseado em 1 para facilitar seleção CSS (1, 2, 3, 4, 5, 6...)
      const pedidoIndex = index + 1;
      return `<article class="pedido" data-pedido-index="${pedidoIndex}">
        ${orderTemplateContent.html}
      </article>`;
    })
  );

  // Filtrar pedidos que falharam
  const validOrdersHtml = ordersHtml.filter(html => html !== '');

  if (validOrdersHtml.length === 0) {
    throw new Error('Nenhum pedido pôde ser processado para impressão');
  }

  // Para impressão múltipla, cada `.pedido` é um bloco independente.
  // Quebras de página são controladas EXPLICITAMENTE via CSS (ver @media print abaixo).
  const combinedContent: string = validOrdersHtml.join('\n');
  
  const styles = `
    ${templateContent.css}
    .template-document {
      width: 100%;
      background: white;
    }
    @page {
      size: A4;
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
    /* CSS de impressão para 3 itens por página está no generateBasicTemplateCSS */
    /* Manter apenas regras específicas adicionais se necessário */
    ` : ''}
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      @page {
        size: A4;
        margin: 10mm;
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

      /* Container principal da impressão deve ser bloco (evitar flex/grid) */
      .template-document {
        display: block !important;
        overflow: visible !important;
      }

      /* Cada pedido é um bloco independente e não deve quebrar internamente */
      .pedido {
        display: block !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        break-after: auto !important;
        page-break-after: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        min-height: 0 !important;
        overflow: visible !important;
      }

      /* Neutralizar paginação/alturas fixas do template dentro do pedido */
      .pedido .print-page,
      .pedido .template-page,
      .pedido .items-container,
      .pedido .item-container,
      .pedido .item {
        display: block !important;
        position: static !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        page-break-after: auto !important;
        break-after: auto !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      /* Quebrar página APENAS ENTRE pedidos: a cada 3 pedidos */
      .pedido:nth-of-type(3n) {
        break-after: page !important;
        page-break-after: always !important;
      }

      /* Garantir que o último pedido não force página em branco */
      .pedido:last-child {
        break-after: auto !important;
        page-break-after: auto !important;
      }

    }

    /* ============================================================
       FIX: evitar sobreposição no template RESUMO (3 por página)
       ============================================================ */
    ${templateType === 'resumo' ? `
    .item,
    .item-container,
    .resumo-item {
      box-sizing: border-box !important;
    }

    .item {
      height: 99mm !important;
      overflow: visible !important;
      position: relative !important;
    }

    /* Na impressão múltipla, remover altura fixa para permitir altura natural */
    .pedido .item {
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
    }

    .item .designer,
    .item .vendedor,
    .item .designer-vendedor,
    .item .bottom-row,
    .item .footer-row,
    .item .meta-row {
      position: static !important;
    }

    .section-content.especificacoes-content {
      overflow: visible !important;
      max-height: none !important;
    }
    .section-content.especificacoes-content .spec-item {
      font-size: 8.2pt !important;
      line-height: 1.15 !important;
      margin-bottom: 0.3mm !important;
    }

    /* ============================================================
       MELHORIA: aumentar imagem (proporcional) no RESUMO sem quebrar 3 itens/página
       ============================================================ */
    .item .content-wrapper {
      gap: 2mm !important;
    }
    .item .left-column {
      width: 35% !important;
      flex: 0 0 35% !important;
      max-width: 35% !important;
    }
    .item .right-column {
      width: 63% !important;
      flex: 1 1 63% !important;
      max-width: 63% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .item .ficha-image-container,
    .item .image-container,
    .item .visualizacao,
    .item .visualizacao-container {
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      /* Limitar altura máxima para 70mm, mas permitir que seja menor se necessário */
      max-height: 70mm !important;
      min-height: 0 !important;
      height: auto !important;
      overflow: visible !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .item .visualizacao-title,
    .item .visualizacao-header,
    .item .visualizacao h1,
    .item .visualizacao h2,
    .item .visualizacao h3,
    .item .visualizacao h4,
    .item .visualizacao .title,
    .item .visualizacao .header,
    .item .image-title,
    .item .image-header {
      display: none !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
    }

    .item .visualizacao .preview,
    .item .visualizacao .preview-frame,
    .item .visualizacao .frame,
    .item .visualizacao .border,
    .item .image-container .preview,
    .item .image-container .preview-frame,
    .item .image-container .frame,
    .item .image-container .border {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .item .ficha-image,
    .item .ficha-image-container img,
    .item .image-container img,
    .item .visualizacao img {
      width: auto !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: 70mm !important;
      object-fit: contain !important;
      object-position: center !important;
      display: block !important;
    }

    /* Remove qualquer “moldura”/efeito na coluna da imagem (inclui pseudo-elementos) */
    .item .right-column,
    .item .right-column * {
      border: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
      background-image: none !important;
      filter: none !important;
    }
    .item .right-column *::before,
    .item .right-column *::after {
      content: none !important;
      border: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    .item .right-column {
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Fallback robusto: remove moldura exatamente na cadeia de wrappers da imagem (independente do template da API) */
    .item .__sgp_img_wrap__,
    .item .__sgp_img_wrap__ * {
      border: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
      background-image: none !important;
      filter: none !important;
      padding: 0 !important;
      margin: 0 !important;
      border-radius: 0 !important;
    }
    .item .__sgp_img_wrap__::before,
    .item .__sgp_img_wrap__::after,
    .item .__sgp_img_wrap__ *::before,
    .item .__sgp_img_wrap__ *::after {
      content: none !important;
      border: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
    }

    /* Fazer a imagem ocupar o máximo do espaço lateral disponível (mantendo proporção) */
    .item .content-wrapper {
      height: 100% !important;
      align-items: stretch !important;
      gap: 0.5mm !important;
      overflow: visible !important;
    }
    .item .left-column,
    .item .right-column {
      height: 100% !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    .item .__sgp_img_wrap__:not(img) {
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      overflow: visible !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .item img.__sgp_img_wrap__ {
      width: auto !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: 70mm !important;
      object-fit: contain !important;
      object-position: center !important;
      display: block !important;
    }
    ` : ''}
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
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
      </body>
    </html>
  `;

  // Abrir nova janela e imprimir
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
      
      // Executar cleanup e print via TypeScript após carregar
      const tryPrint = () => {
        try {
          if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
            // Reset scrollTop em elementos de especificações
            try {
              doc.querySelectorAll('.section-content.especificacoes-content').forEach((el) => {
                try { (el as HTMLElement).scrollTop = 0; } catch (e) {}
              });
            } catch (e) {}
            
            performCleanup(doc);
            setTimeout(() => {
              try {
                temp.contentWindow?.focus();
                temp.contentWindow?.print();
              } catch (e) {
                console.warn('Erro ao chamar print no iframe:', e);
              }
            }, 150);
            
            setTimeout(() => {
              try {
                document.body.removeChild(temp);
              } catch {
                // Ignorar erros de remoção
              }
            }, 4000);
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

  // Executar cleanup e print via TypeScript após janela carregar
  const tryPrint = () => {
    try {
      if (win && (win.document.readyState === 'complete' || win.document.readyState === 'interactive')) {
        // Reset scrollTop em elementos de especificações
        try {
          win.document.querySelectorAll('.section-content.especificacoes-content').forEach((el) => {
            try { (el as HTMLElement).scrollTop = 0; } catch (e) {}
          });
        } catch (e) {}
        
        performCleanup(win.document);
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
};
