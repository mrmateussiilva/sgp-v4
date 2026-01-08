import { OrderWithItems, OrderItem } from '../types';
import { generateTemplatePrintContent, agruparItensPorPagina } from './templateProcessor';

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

    /* Slot fixo do resumo (aprox 99mm por item). Corta excesso ao invés de sobrepor. */
    .item {
      height: 99mm !important;
      overflow: hidden !important;
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
      overflow: hidden !important;
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
      width: 65% !important;
      flex: 1 1 65% !important;
      max-width: 65% !important;
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
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
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
        <script>
          (function(){
            // Guard para evitar abrir 2 diálogos de impressão
            if (window.__SGP_PRINTED__) return;
            window.__SGP_PRINTED__ = true;
            function cleanup(){
              try {
                function normalizeText(s){
                  return String(s || '')
                    .trim()
                    .toUpperCase()
                    .normalize('NFD')
                    .replace(/[\\u0300-\\u036f]/g, '');
                }
                function stripStyles(el){
                  try {
                    el.style.setProperty('border', '0', 'important');
                    el.style.setProperty('outline', '0', 'important');
                    el.style.setProperty('box-shadow', 'none', 'important');
                    el.style.setProperty('background', 'transparent', 'important');
                    el.style.setProperty('padding', '0', 'important');
                    el.style.setProperty('margin', '0', 'important');
                    el.style.setProperty('border-radius', '0', 'important');
                  } catch (e) {}
                }
                function hasOtherText(el){
                  try {
                    var raw = (el.textContent || '');
                    var norm = normalizeText(raw);
                    norm = norm.replace(/VISUALIZACAO[ A-Z]*/g, '').trim();
                    return norm.length > 0;
                  } catch (e) {}
                  return false;
                }

                var items = document.querySelectorAll('.item');
                for (var idx = 0; idx < items.length; idx++) {
                  var item = items[idx];
                  if (!item) continue;

                  var img = item.querySelector('img');
                  if (!img) continue;

                  // Preferir limpar apenas a coluna/área da imagem.
                  var right = item.querySelector('.right-column') || img.closest('.right-column') || img.parentElement || item;

                  // 1) Esconder título "VISUALIZAÇÃO" (sem remover layout inteiro)
                  try {
                    var nodes = right.querySelectorAll('*');
                    for (var i = 0; i < nodes.length; i++) {
                      var el = nodes[i];
                      if (!el) continue;

                      // texto solto "VISUALIZAÇÃO" dentro de containers
                      try {
                        if (el.childNodes && el.childNodes.length) {
                          for (var n = 0; n < el.childNodes.length; n++) {
                            var node = el.childNodes[n];
                            if (node && node.nodeType === 3) {
                              var rawNode = node.textContent || '';
                              if (normalizeText(rawNode).startsWith('VISUALIZACAO')) node.textContent = '';
                            }
                          }
                        }
                      } catch (e) {}

                      // elementos cujo conteúdo é "VISUALIZAÇÃO..." e não contém imagem
                      try {
                        var raw = (el.textContent || '').trim();
                        if (!raw) continue;
                        if (!normalizeText(raw).startsWith('VISUALIZACAO')) continue;
                        if (el.querySelector && el.querySelector('img')) continue;
                        el.style.setProperty('display', 'none', 'important');
                        el.style.setProperty('margin', '0', 'important');
                        el.style.setProperty('padding', '0', 'important');
                        el.style.setProperty('height', '0', 'important');
                      } catch (e) {}
                    }
                  } catch (e) {}

                  // 2) Remover “molduras” somente na cadeia que contém a imagem (sem apagar outros dados)
                  try {
                    // Marca e limpa somente wrappers que realmente pertencem à imagem.
                    try { if (img.classList) img.classList.add('__sgp_img_wrap__'); } catch (e) {}

                    var p = img.parentElement;
                    while (p && p !== item) {
                      try {
                        var imgs = p.querySelectorAll ? p.querySelectorAll('img') : [];
                        if (!imgs || imgs.length !== 1 || imgs[0] !== img) break;
                        if (hasOtherText(p)) break;
                      } catch (e) {}

                      try { if (p.classList) p.classList.add('__sgp_img_wrap__'); } catch (e) {}
                      stripStyles(p);
                      p = p.parentElement;
                    }

                    // Também limpa o container “right” se ele for “só imagem” (sem outros textos).
                    try {
                      if (right && right !== item && right.contains && right.contains(img) && !hasOtherText(right)) {
                        try { if (right.classList) right.classList.add('__sgp_img_wrap__'); } catch (e) {}
                        stripStyles(right);
                      }
                    } catch (e) {}

                    // garante imagem proporcional e ocupando o container
                    stripStyles(img);
                    img.style.setProperty('display', 'block', 'important');
                    img.style.setProperty('width', '100%', 'important');
                    img.style.setProperty('height', '100%', 'important');
                    img.style.setProperty('max-width', '100%', 'important');
                    img.style.setProperty('max-height', '100%', 'important');
                    img.style.setProperty('object-fit', 'contain', 'important');
                    img.style.setProperty('object-position', 'center', 'important');
                  } catch (e) {}
                }
              } catch (e) {}
            }
            function doPrint(){
              cleanup();
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
      // Não chamar print() aqui: o HTML já chama (e tem guard). Evita dupla impressão.
      setTimeout(() => {
        try {
          document.body.removeChild(temp);
        } catch {
          // Ignorar erros de remoção
        }
      }, 4000);
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
    const ITENS_POR_PAGINA = 3;
    
    // Usar função de agrupamento para organizar os itens em páginas
    const paginas = agruparItensPorPagina(validOrdersHtml, ITENS_POR_PAGINA);
    
    // Cada página contém no máximo 3 itens (última página pode ter menos)
    combinedContent = paginas.map((paginaItens, pageIndex) => {
      const isLastPage = pageIndex === paginas.length - 1;
      // Preencher com slots vazios se necessário para manter layout consistente
      const itensParaRenderizar = [...paginaItens];
      while (itensParaRenderizar.length < ITENS_POR_PAGINA) {
        itensParaRenderizar.push('');
      }
      // Usar classe .print-page para consistência com CSS do templateProcessor
      return `<div class="print-page"${isLastPage ? '' : ' data-page-break="always"'}>
        <div class="items-container">
          ${itensParaRenderizar.join('\n')}
        </div>
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
      size: ${templateType === 'resumo' ? 'A4 portrait' : 'A4 portrait'};
      margin: ${templateType === 'resumo' ? '0' : '10mm'};
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
      /* Regras de impressão para 3 itens por página - já definidas acima em @media print dentro do bloco ${templateType === 'resumo'} */
      /* Não duplicar regras aqui - usar apenas .resumo-page.page-group já definido acima */
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
      overflow: hidden !important;
      position: relative !important;
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
      overflow: hidden !important;
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
      width: 65% !important;
      flex: 1 1 65% !important;
      max-width: 65% !important;
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
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
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
        <script>
          (function(){
            // Guard para evitar abrir 2 diálogos de impressão
            if (window.__SGP_PRINTED__) return;
            window.__SGP_PRINTED__ = true;
            function cleanup(){
              try {
                function normalizeText(s){
                  return String(s || '')
                    .trim()
                    .toUpperCase()
                    .normalize('NFD')
                    .replace(/[\\u0300-\\u036f]/g, '');
                }
                function stripStyles(el){
                  try {
                    el.style.setProperty('border', '0', 'important');
                    el.style.setProperty('outline', '0', 'important');
                    el.style.setProperty('box-shadow', 'none', 'important');
                    el.style.setProperty('background', 'transparent', 'important');
                    el.style.setProperty('padding', '0', 'important');
                    el.style.setProperty('margin', '0', 'important');
                    el.style.setProperty('border-radius', '0', 'important');
                  } catch (e) {}
                }
                function hasOtherText(el){
                  try {
                    var raw = (el.textContent || '');
                    var norm = normalizeText(raw);
                    norm = norm.replace(/VISUALIZACAO[ A-Z]*/g, '').trim();
                    return norm.length > 0;
                  } catch (e) {}
                  return false;
                }

                var items = document.querySelectorAll('.item');
                for (var idx = 0; idx < items.length; idx++) {
                  var item = items[idx];
                  if (!item) continue;

                  var img = item.querySelector('img');
                  if (!img) continue;

                  var right = item.querySelector('.right-column') || img.closest('.right-column') || img.parentElement || item;

                  try {
                    var nodes = right.querySelectorAll('*');
                    for (var i = 0; i < nodes.length; i++) {
                      var el = nodes[i];
                      if (!el) continue;

                      try {
                        if (el.childNodes && el.childNodes.length) {
                          for (var n = 0; n < el.childNodes.length; n++) {
                            var node = el.childNodes[n];
                            if (node && node.nodeType === 3) {
                              var rawNode = node.textContent || '';
                              if (normalizeText(rawNode).startsWith('VISUALIZACAO')) node.textContent = '';
                            }
                          }
                        }
                      } catch (e) {}

                      try {
                        var raw = (el.textContent || '').trim();
                        if (!raw) continue;
                        if (!normalizeText(raw).startsWith('VISUALIZACAO')) continue;
                        if (el.querySelector && el.querySelector('img')) continue;
                        el.style.setProperty('display', 'none', 'important');
                        el.style.setProperty('margin', '0', 'important');
                        el.style.setProperty('padding', '0', 'important');
                        el.style.setProperty('height', '0', 'important');
                      } catch (e) {}
                    }
                  } catch (e) {}

                  try {
                    try { if (img.classList) img.classList.add('__sgp_img_wrap__'); } catch (e) {}

                    var p = img.parentElement;
                    while (p && p !== item) {
                      try {
                        var imgs = p.querySelectorAll ? p.querySelectorAll('img') : [];
                        if (!imgs || imgs.length !== 1 || imgs[0] !== img) break;
                        if (hasOtherText(p)) break;
                      } catch (e) {}

                      try { if (p.classList) p.classList.add('__sgp_img_wrap__'); } catch (e) {}
                      stripStyles(p);
                      p = p.parentElement;
                    }

                    try {
                      if (right && right !== item && right.contains && right.contains(img) && !hasOtherText(right)) {
                        try { if (right.classList) right.classList.add('__sgp_img_wrap__'); } catch (e) {}
                        stripStyles(right);
                      }
                    } catch (e) {}

                    stripStyles(img);
                    img.style.setProperty('display', 'block', 'important');
                    img.style.setProperty('width', '100%', 'important');
                    img.style.setProperty('height', '100%', 'important');
                    img.style.setProperty('max-width', '100%', 'important');
                    img.style.setProperty('max-height', '100%', 'important');
                    img.style.setProperty('object-fit', 'contain', 'important');
                    img.style.setProperty('object-position', 'center', 'important');
                  } catch (e) {}
                }
              } catch (e) {}
            }
            function doPrint(){
              cleanup();
              try { window.focus(); window.print(); } catch(e){}
            }
            window.addEventListener('load', function(){ setTimeout(doPrint, 150); }, { once:true });
          })();
        </script>
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
      // Não chamar print() aqui: o HTML já chama (e tem guard). Evita dupla impressão.
      setTimeout(() => {
        try {
          document.body.removeChild(temp);
        } catch {
          // Ignorar erros de remoção
        }
      }, 4000);
    }
    return;
  }
  
  win.document.open();
  win.document.write(html);
  win.document.close();
};
