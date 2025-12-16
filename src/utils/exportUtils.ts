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

  // Verificar se está no Tauri - tentar múltiplas formas de detecção
  const tauriCheck = isTauri();
  const tauriCheckAlt = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    (window.location.port === '1420' || window.location.protocol === 'tauri:');
  console.log('[openInViewer] Verificando Tauri:', { tauriCheck, tauriCheckAlt, hostname: window.location.hostname, port: window.location.port });
  
  // Tentar usar Tauri se detectado (apenas para PDFs)
  if (content.type === 'pdf' && (tauriCheck || tauriCheckAlt)) {
    console.log('[openInViewer] Tentando usar diálogo do Tauri...');
    try {
      console.log('[openInViewer] Importando módulos do Tauri...');
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const { open } = await import('@tauri-apps/plugin-shell');
      console.log('[openInViewer] Módulos importados com sucesso');

      console.log('[openInViewer] Abrindo diálogo de salvar...');
      const filePath = await save({
        defaultPath: content.filename,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      console.log('[openInViewer] Diálogo retornou:', filePath);

      if (filePath) {
        console.log('[openInViewer] Convertendo blob para array de bytes...');
        const blob = content.doc.output('blob');
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        console.log('[openInViewer] Escrevendo arquivo...');
        await writeFile(filePath, uint8Array);
        console.log('[openInViewer] Arquivo salvo, abrindo...');
        
        await open(filePath);
        console.log('[openInViewer] Arquivo aberto com sucesso');
        URL.revokeObjectURL(blobUrl);
        return;
      } else {
        console.log('[openInViewer] Usuário cancelou o diálogo');
        URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch (tauriError) {
      console.error('[openInViewer] Erro ao abrir via Tauri:', tauriError);
      console.log('[openInViewer] Tentando fallback: iframe...');
    }
  }

  // Criar iframe em tela cheia para visualização
  console.log('[openInViewer] Criando iframe em tela cheia...');
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.zIndex = '9999';
    iframe.style.backgroundColor = '#f5f5f5';
    iframe.src = blobUrl;
    
    // Container para botões de controle
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.gap = '10px';
    container.style.flexDirection = 'column';
    
    // Botão de imprimir
    const printBtn = document.createElement('button');
    printBtn.textContent = '🖨️ Imprimir';
    printBtn.style.padding = '10px 20px';
    printBtn.style.backgroundColor = '#3b82f6';
    printBtn.style.color = 'white';
    printBtn.style.border = 'none';
    printBtn.style.borderRadius = '5px';
    printBtn.style.cursor = 'pointer';
    printBtn.style.fontSize = '14px';
    printBtn.style.fontWeight = '500';
    printBtn.onclick = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    };
    
    // Botão de salvar (apenas para PDFs)
    let saveBtn: HTMLButtonElement | null = null;
    if (content.type === 'pdf') {
      saveBtn = document.createElement('button');
      saveBtn.textContent = '💾 Salvar';
      saveBtn.style.padding = '10px 20px';
      saveBtn.style.backgroundColor = '#10b981';
      saveBtn.style.color = 'white';
      saveBtn.style.border = 'none';
      saveBtn.style.borderRadius = '5px';
      saveBtn.style.cursor = 'pointer';
      saveBtn.style.fontSize = '14px';
      saveBtn.style.fontWeight = '500';
      saveBtn.onclick = () => {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = content.filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      };
    }
    
    // Botão de fechar
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Fechar';
    closeBtn.style.padding = '10px 20px';
    closeBtn.style.backgroundColor = '#ef4444';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '5px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '14px';
    closeBtn.style.fontWeight = '500';
    
    const cleanup = () => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        URL.revokeObjectURL(blobUrl);
      } catch (_) { /* noop */ }
    };
    
    closeBtn.onclick = cleanup;
    
    // Adicionar botões ao container
    if (saveBtn) {
      container.appendChild(saveBtn);
    }
    container.appendChild(printBtn);
    container.appendChild(closeBtn);
    
    // Adicionar ao DOM
    document.body.appendChild(iframe);
    document.body.appendChild(container);
    
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
