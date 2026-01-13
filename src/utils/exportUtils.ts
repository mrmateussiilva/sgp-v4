import { OrderWithItems } from '../types';
import { formatDateForDisplay } from '@/utils/date';
import { isTauri } from '@/utils/isTauri';

// Lazy load de bibliotecas pesadas - carregadas apenas quando necessário
const loadPapa = async () => {
  const module = await import('papaparse');
  return module.default;
};

const loadJsPDF = async () => {
  const module = await import('jspdf');
  return module.default;
};

const loadAutoTable = async () => {
  const module = await import('jspdf-autotable');
  return module.default;
};

type EnvioReportGroup = {
  forma_envio: string;
  pedidos: OrderWithItems[];
};

const resolveNumericValue = (value: number | string) => {
  if (typeof value === 'number') {
    return value;
  }
  const numeric = parseFloat(value.toString().replace(',', '.'));
  return Number.isNaN(numeric) ? 0 : numeric;
};

const formatCurrency = (value: number | string) =>
  `R$ ${resolveNumericValue(value).toFixed(2)}`;

const buildCityState = (order: OrderWithItems) => {
  const cidade = order.cidade_cliente?.trim() ?? '';
  const estado = order.estado_cliente?.trim() ?? '';
  if (cidade && estado) return `${cidade}/${estado}`;
  return cidade || estado || '-';
};

const formatIntervalLabel = (start: string, end?: string | null) => {
  const startLabel = formatDateForDisplay(start, '-');
  if (!end || end === start) {
    return startLabel;
  }
  return `${startLabel} - ${formatDateForDisplay(end, '-')}`;
};

const openPdfInPrintWindow = (doc: any, filename: string) => {
  if (typeof window === 'undefined') {
    doc.save(filename);
    return;
  }

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  // Abre uma nova janela para impressão (aproveita o gesto do usuário)
  let printWindow: Window | null = null;
  try {
    printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.warn('Falha ao abrir nova janela para impressão:', err);
    printWindow = null;
  }

  if (printWindow) {
    // Tenta chamar print() após um pequeno delay para garantir carregamento
    setTimeout(() => {
      try {
        printWindow?.focus();
        printWindow?.print();
      } catch (error) {
        console.warn('Erro ao chamar print() na nova janela:', error);
      }
    }, 500);

    // Limpa a URL após um tempo
    setTimeout(() => {
      try { URL.revokeObjectURL(blobUrl); } catch (_) { /* noop */ }
    }, 10000);
    return;
  }

  // Fallback: usa iframe oculto
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.src = blobUrl;

  const cleanup = () => {
    try { URL.revokeObjectURL(blobUrl); } catch (_) { /* noop */ }
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  iframe.onload = () => {
    try {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        throw new Error('Janela de impressão indisponível');
      }
      
      // Aguarda um pouco para garantir que o PDF carregou
      setTimeout(() => {
        try {
          frameWindow.focus();
          frameWindow.print();
          setTimeout(cleanup, 2000);
        } catch (error) {
          console.warn('Erro ao imprimir via iframe:', error);
          cleanup();
          doc.save(filename);
        }
      }, 300);
    } catch (error) {
      console.warn('Erro ao configurar impressão via iframe:', error);
      cleanup();
      doc.save(filename);
    }
  };

  iframe.onerror = () => {
    console.warn('Erro ao carregar PDF no iframe');
    cleanup();
    doc.save(filename);
  };

  document.body.appendChild(iframe);
};

/**
 * Função universal para abrir conteúdo em visualizador em tela cheia
 * Funciona tanto para PDFs (jsPDF) quanto para HTML
 * Permite que o usuário escolha entre salvar ou imprimir
 */
export const openInViewer = async (
  content: { type: 'pdf'; doc: any; filename: string } | { type: 'html'; html: string; title: string }
) => {
  console.log('[openInViewer] Iniciando função', { type: content.type });
  
  if (typeof window === 'undefined') {
    if (content.type === 'pdf') {
      content.doc.save(content.filename);
    }
    return;
  }

  let blobUrl: string;
  
  if (content.type === 'pdf') {
    console.log('[openInViewer] Gerando blob do PDF');
    const blob = content.doc.output('blob');
    blobUrl = URL.createObjectURL(blob);
    console.log('[openInViewer] Blob criado, URL:', blobUrl);
  } else {
    console.log('[openInViewer] Criando blob do HTML');
    const blob = new Blob([content.html], { type: 'text/html' });
    blobUrl = URL.createObjectURL(blob);
    console.log('[openInViewer] Blob HTML criado, URL:', blobUrl);
  }

  // Não usar diálogo de salvar do Tauri para visualização/impressão
  // Isso força o usuário a salvar antes de ver o PDF
  // Vamos direto para o iframe ou window.open que permite visualizar e imprimir sem salvar primeiro

  // Criar iframe em tela cheia para visualização
  console.log('[openInViewer] Criando iframe em tela cheia...');
  try {
    // Container principal com overlay escuro
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = '#1a1a1a';
    overlay.style.zIndex = '9998';
    
    // Container do conteúdo principal (tela cheia)
    const mainContainer = document.createElement('div');
    mainContainer.style.position = 'fixed';
    mainContainer.style.top = '0';
    mainContainer.style.left = '0';
    mainContainer.style.width = '100%';
    mainContainer.style.height = '100%';
    mainContainer.style.zIndex = '9999';
    mainContainer.style.backgroundColor = '#ffffff';
    mainContainer.style.overflow = 'hidden';
    mainContainer.style.display = 'flex';
    mainContainer.style.flexDirection = 'column';
    
    // Barra superior (header)
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '16px 24px';
    header.style.backgroundColor = '#f8f9fa';
    header.style.borderBottom = '1px solid #e9ecef';
    
    // Título
    const title = document.createElement('div');
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.gap = '12px';
    const titleIcon = document.createElement('span');
    titleIcon.textContent = '📄';
    titleIcon.style.fontSize = '20px';
    const titleText = document.createElement('span');
    titleText.textContent = (content.type === 'html' ? content.title : 'Visualização') || 'Visualização';
    titleText.style.fontSize = '18px';
    titleText.style.fontWeight = '600';
    titleText.style.color = '#1a1a1a';
    titleText.style.letterSpacing = '-0.02em';
    title.appendChild(titleIcon);
    title.appendChild(titleText);
    
    // Container de botões (header)
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.alignItems = 'center';
    
    // Função helper para criar botões estilizados
    const createStyledButton = (
      text: string,
      icon: string,
      bgColor: string,
      hoverBgColor: string,
      onClick: () => void
    ) => {
      const btn = document.createElement('button');
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.gap = '8px';
      btn.style.padding = '10px 18px';
      btn.style.backgroundColor = bgColor;
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.borderRadius = '8px';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '14px';
      btn.style.fontWeight = '500';
      btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)';
      btn.style.transition = 'all 0.2s ease';
      btn.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      
      const iconSpan = document.createElement('span');
      iconSpan.textContent = icon;
      iconSpan.style.fontSize = '16px';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = text;
      
      btn.appendChild(iconSpan);
      btn.appendChild(textSpan);
      
      // Hover effect
      btn.addEventListener('mouseenter', () => {
        btn.style.backgroundColor = hoverBgColor;
        btn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)';
        btn.style.transform = 'translateY(-1px)';
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.style.backgroundColor = bgColor;
        btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)';
        btn.style.transform = 'translateY(0)';
      });
      
      btn.addEventListener('mousedown', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
      });
      
      btn.addEventListener('mouseup', () => {
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)';
      });
      
      btn.onclick = onClick;
      return btn;
    };
    
    // Botão de imprimir
    const printBtn = createStyledButton(
      'Imprimir',
      '🖨️',
      '#3b82f6',
      '#2563eb',
      () => {
        if (iframe.contentWindow) {
          setTimeout(() => {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
          }, 100);
        }
      }
    );
    
    // Botão de salvar (apenas para PDFs)
    let saveBtn: HTMLButtonElement | null = null;
    if (content.type === 'pdf') {
      saveBtn = createStyledButton(
        'Salvar',
        '💾',
        '#10b981',
        '#059669',
        async () => {
          try {
            // Verificar se está no Tauri
            const tauriCheck = isTauri();
            const tauriCheckAlt = typeof window !== 'undefined' && 
              (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
              (window.location.port === '1420' || window.location.protocol === 'tauri:');
            
            if (tauriCheck || tauriCheckAlt) {
              // Usar API do Tauri para salvar
              const { save } = await import('@tauri-apps/plugin-dialog');
              const { writeFile } = await import('@tauri-apps/plugin-fs');
              
              const filePath = await save({
                defaultPath: content.filename,
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
              });
              
              if (filePath) {
                // Converter blob para array de bytes
                const blob = content.doc.output('blob');
                const arrayBuffer = await blob.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Salvar arquivo
                await writeFile(filePath, uint8Array);
                console.log('[openInViewer] Arquivo salvo com sucesso:', filePath);
              }
            } else {
              // Fallback: usar download via link
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = content.filename;
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              setTimeout(() => {
                document.body.removeChild(link);
              }, 100);
            }
          } catch (error) {
            console.error('[openInViewer] Erro ao salvar arquivo:', error);
            // Fallback em caso de erro
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = content.filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
            }, 100);
          }
        }
      );
    }
    
    // Botão de fechar
    const closeBtn = createStyledButton(
      'Fechar',
      '✕',
      '#6b7280',
      '#4b5563',
      () => {
        cleanup();
      }
    );
    
    // Adicionar botões ao container
    buttonContainer.appendChild(printBtn);
    if (saveBtn) {
      buttonContainer.appendChild(saveBtn);
    }
    buttonContainer.appendChild(closeBtn);
    
    // Montar header
    header.appendChild(title);
    header.appendChild(buttonContainer);
    
    // Container do iframe
    const iframeContainer = document.createElement('div');
    iframeContainer.style.flex = '1';
    iframeContainer.style.position = 'relative';
    iframeContainer.style.overflow = 'hidden';
    iframeContainer.style.backgroundColor = '#ffffff';
    
    // Iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.backgroundColor = '#ffffff';
    iframe.src = blobUrl;
    
    iframeContainer.appendChild(iframe);
    
    // Montar estrutura principal
    mainContainer.appendChild(header);
    mainContainer.appendChild(iframeContainer);
    
    const cleanup = () => {
      try {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        if (document.body.contains(mainContainer)) {
          document.body.removeChild(mainContainer);
        }
        URL.revokeObjectURL(blobUrl);
      } catch (_) { /* noop */ }
    };
    
    // Adicionar ao DOM
    document.body.appendChild(overlay);
    document.body.appendChild(mainContainer);
    
    // Adicionar animação de entrada
    mainContainer.style.opacity = '0';
    mainContainer.style.transform = 'scale(0.95)';
    setTimeout(() => {
      mainContainer.style.transition = 'all 0.3s ease';
      mainContainer.style.opacity = '1';
      mainContainer.style.transform = 'scale(1)';
    }, 10);
    
    console.log('[openInViewer] Iframe criado e adicionado ao DOM');
    
    // Limpar após um tempo se não for fechado (5 minutos)
    setTimeout(() => {
      cleanup();
    }, 300000);
    
    return;
  } catch (iframeError) {
    console.error('[openInViewer] Erro ao criar iframe:', iframeError);
  }

  // Fallback: tentar window.open
  console.log('[openInViewer] Tentando window.open como fallback...');
  let newWindow: Window | null = null;
  try {
    newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    console.log('[openInViewer] window.open retornou:', newWindow);
    
    if (newWindow) {
      console.log('[openInViewer] Janela aberta com sucesso');
      newWindow.focus();
      setTimeout(() => {
        try { URL.revokeObjectURL(blobUrl); } catch (_) { /* noop */ }
      }, 60000);
      return;
    }
  } catch (err) {
    console.error('[openInViewer] Erro ao abrir nova janela:', err);
  }

  // Fallback final: download direto (apenas para PDFs)
  if (content.type === 'pdf') {
    console.log('[openInViewer] Usando fallback final: download direto');
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = content.filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (_) { /* noop */ }
    }, 100);
  }
};

// Função para abrir PDF em nova janela sem chamar print() automaticamente
// Permite que o usuário escolha entre salvar ou imprimir
// Usa a função universal openInViewer internamente
export const openPdfInWindow = async (doc: any, filename: string) => {
  return openInViewer({ type: 'pdf', doc, filename });
};

export const exportToCSV = async (orders: OrderWithItems[]) => {
  const Papa = await loadPapa();
  const csvData = orders.map((order) => ({
    ID: order.id,
    Cliente: order.customer_name,
    Endereco: order.address,
    'Valor Total': formatCurrency(order.total_value),
    Status: order.status,
    'Data de Criacao': formatDateForDisplay(order.created_at ?? null, 'Não informado'),
    Itens: order.items.map((item) => item.item_name).join('; '),
  }));

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `pedidos_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (orders: OrderWithItems[]) => {
  const [jsPDF, autoTable] = await Promise.all([loadJsPDF(), loadAutoTable()]);
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Relatório de Pedidos', 14, 22);

  doc.setFontSize(11);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

  const tableData = orders.map((order) => [
    order.id.toString(),
    order.customer_name,
    order.status,
    formatCurrency(order.total_value),
    formatDateForDisplay(order.created_at ?? null, 'Não informado'),
  ]);

  autoTable(doc, {
    head: [['ID', 'Cliente', 'Status', 'Valor Total', 'Data']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [25, 118, 210] },
  });

  doc.save(`pedidos_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportEnvioReportToPDF = async (
  groups: EnvioReportGroup[],
  startDate: string,
  endDate?: string | null
) => {
  if (!groups.length) {
    return;
  }

  const [jsPDF, autoTable] = await Promise.all([loadJsPDF(), loadAutoTable()]);
  const doc = new jsPDF();
  const intervalLabel = formatIntervalLabel(startDate, endDate);
  const totalPedidos = groups.reduce((acc, group) => acc + group.pedidos.length, 0);

  doc.setFontSize(18);
  doc.text('Relatório de Envios', 14, 18);

  doc.setFontSize(11);
  doc.text(`Período: ${intervalLabel}`, 14, 26);
  doc.text(`Total de pedidos: ${totalPedidos}`, 14, 32);

  const generatedAt = formatDateForDisplay(new Date().toISOString(), '-');
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(`Gerado em: ${generatedAt}`, pageWidth - 14, 26, { align: 'right' });

  let currentY = 38;

  groups.forEach((group, index) => {
    const header = group.forma_envio ? group.forma_envio.toUpperCase() : 'SEM FORMA DE ENVIO';

    doc.setFontSize(13);
    doc.text(`Forma de envio: ${header}`, 14, currentY);

    const body = group.pedidos.map((pedido) => {
      const itens = pedido.items.map((item) => item.item_name).join(', ') || '-';
      const observacao = pedido.observacao?.trim() || '-';
      const dataEntrega = formatDateForDisplay(pedido.data_entrega ?? null, '-');

      return [
        pedido.cliente || '-',
        itens,
        buildCityState(pedido),
        observacao,
        dataEntrega,
      ];
    });

    autoTable(doc, {
      head: [['Cliente', 'Itens', 'Cidade/Estado', 'Observação', 'Entrega']],
      body,
      startY: currentY + 4,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 52 },
        2: { cellWidth: 26 },
        3: { cellWidth: 46 },
        4: { cellWidth: 18, halign: 'center' },
      },
      headStyles: { fillColor: [37, 99, 235], halign: 'center', fontSize: 9, textColor: 255 },
      theme: 'grid',
    });

    const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    const lastY = (lastTable?.finalY ?? currentY) + 10;
    currentY = lastY;

    if (index < groups.length - 1) {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 20;
      }
    }
  });

  const suffix = endDate && endDate !== startDate ? `${startDate}_${endDate}` : startDate;
  const filename = `relatorio_envios_${suffix}.pdf`;
  try {
    openPdfInPrintWindow(doc, filename);
  } catch (error) {
    console.error('Erro ao tentar abrir janela de impressão. Baixando PDF.', error);
    doc.save(filename);
  }
};

export const printEnvioReport = (
  groups: EnvioReportGroup[],
  startDate: string,
  endDate?: string | null
) => {
  if (!groups.length) return;

  const intervalLabel = formatIntervalLabel(startDate, endDate ?? null);
  const totalPedidos = groups.reduce((acc, g) => acc + g.pedidos.length, 0);
  const title = `Relatório de Envios - ${intervalLabel}`;

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const sections = groups
    .map((group) => {
      const header = group.forma_envio ? group.forma_envio.toUpperCase() : 'SEM FORMA DE ENVIO';
      const rows = group.pedidos
        .map((pedido) => {
          const itens = pedido.items.map((i) => i.item_name).join(', ') || '-';
          const observacao = pedido.observacao?.trim() || '-';
          const dataEntrega = formatDateForDisplay(pedido.data_entrega ?? null, '-');
          return `
            <tr>
              <td>${escapeHtml(pedido.cliente || '-')}</td>
              <td>${escapeHtml(itens)}</td>
              <td>${escapeHtml(buildCityState(pedido))}</td>
              <td>${escapeHtml(observacao)}</td>
              <td class="center">${escapeHtml(dataEntrega)}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <section class="group">
          <h2>Forma de envio: ${escapeHtml(header)}</h2>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Cidade/Estado</th>
                <th>Observação</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </section>
      `;
    })
    .join('');

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:24px}
      h1{font-size:20px;margin:0 0 8px}
      .meta{color:#475569;margin-bottom:16px}
      .group{margin-top:16px;page-break-inside:avoid}
      h2{font-size:14px;margin:16px 0 8px;color:#111827}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top}
      thead th{background:#e2e8f0;text-align:center}
      .center{text-align:center}
      @media print{button{display:none}}
    </style>
  </head>
  <body>
    <h1>Relatório de Envios</h1>
    <div class="meta">Período: ${escapeHtml(intervalLabel)} | Total de pedidos: ${totalPedidos}</div>
    ${sections}
    <script>
      (function(){
        function doPrint(){
          try { window.focus(); window.print(); } catch(e){}
        }
        if (document.readyState === 'complete') doPrint();
        else window.addEventListener('load', function(){ setTimeout(doPrint, 150); }, { once:true });
      })();
    </script>
  </body>
  </html>`;

  let win: Window | null = null;
  try {
    win = window.open('', '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.warn('Não foi possível abrir janela de impressão:', err);
    win = null;
  }
  if (!win) {
    // Fallback: abre diálogo de impressão da própria página
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
        try { temp.contentWindow?.focus(); temp.contentWindow?.print(); } catch(_){}
        setTimeout(() => { try { document.body.removeChild(temp); } catch(_){} }, 1000);
      }, 300);
    }
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
};
