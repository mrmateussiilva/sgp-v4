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

const openPdfInPrintWindow = (doc: unknown, filename: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any;
  if (typeof window === 'undefined') {
    d.save(filename);
    return;
  }

  const blob = d.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  // Abre uma nova janela para impressão (aproveita o gesto do usuário)
  let printWindow: Window | null = null;
  try {
    printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
  } catch {
    printWindow = null;
  }

  if (printWindow) {
    // Tenta chamar print() após um pequeno delay para garantir carregamento
    setTimeout(() => {
      try {
        printWindow?.focus();
        printWindow?.print();
      } catch {
        // ignore
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
        } catch {
          cleanup();
          d.save(filename);
        }
      }, 300);
    } catch {
      cleanup();
      d.save(filename);
    }
  };

  iframe.onerror = () => {
    cleanup();
    d.save(filename);
  };

  document.body.appendChild(iframe);
};

/**
 * Função universal para abrir conteúdo em visualizador em tela cheia
 * Funciona tanto para PDFs (jsPDF) quanto para HTML
 * Permite que o usuário escolha entre salvar ou imprimir
 */
export const openInViewer = async (
  content: { type: 'pdf'; doc: unknown; filename: string } | { type: 'html'; html: string; title: string }
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = (content as any).doc;

  if (typeof window === 'undefined') {
    if (content.type === 'pdf') {
      doc.save(content.filename);
    }
    return;
  }

  let blobUrl: string;

  if (content.type === 'pdf') {
    const blob = doc.output("blob");
    blobUrl = URL.createObjectURL(blob);
  } else {
    const blob = new Blob([content.html], { type: 'text/html' });
    blobUrl = URL.createObjectURL(blob);
  }

  // Criar iframe em tela cheia para visualização
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const blob = (content.doc as any).output('blob');
                const arrayBuffer = await blob.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);

                // Salvar arquivo
                await writeFile(filePath, uint8Array);
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
          } catch {
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

    // Limpar após um tempo se não for fechado (5 minutos)
    setTimeout(() => {
      cleanup();
    }, 300000);

    return;
  } catch {
    // fallback
  }

  let newWindow: Window | null = null;
  try {
    newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

    if (newWindow) {
      newWindow.focus();
      setTimeout(() => {
        try { URL.revokeObjectURL(blobUrl); } catch (_) { /* noop */ }
      }, 60000);
      return;
    }
  } catch {
    // fallback
  }

  if (content.type === 'pdf') {
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

// Usa a função universal openInViewer internamente
export const openPdfInWindow = async (doc: unknown, filename: string) => {
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
  } catch {
    doc.save(filename);
  }
};

export interface EnvioReportOptions {
  consolidarPorCliente?: boolean;
  ocultarObsCopia?: boolean;
  incluirColunaCheck?: boolean;
}

export interface ConsolidatedClientEnvio {
  cliente: string;
  cidadeEstado: string;
  numerosPedidos: string[];
  pedidosCount: number;
  itens: string[];
  observacoes: string[];
  datasEntrega: string[];
  todosProntos: boolean;
}

export const cleanShippingObservation = (
  obs?: string | null,
  ocultarObsCopia = true
): string => {
  if (!obs) return '';
  let text = obs.trim();
  if (ocultarObsCopia) {
    text = text
      .replace(/c[oó]pias+dos+pedidos*#?d+s*[-–:|]?s*/gi, '')
      .trim();
  }
  return text;
};

const formatOrderShortNum = (pedido: OrderWithItems): string => {
  const raw = String(pedido.numero || pedido.id || '').trim();
  const stripped = raw.replace(/^0+/, '');
  return `#${stripped || raw || pedido.id}`;
};

const extractOrderItemsList = (pedido: OrderWithItems): string[] => {
  if (!Array.isArray(pedido.items) || pedido.items.length === 0) {
    return [];
  }
  return pedido.items
    .map((item) => {
      const name = (item.item_name || item.descricao || '').trim();
      return name;
    })
    .filter((name) => name.length > 0);
};

export const consolidateEnvioGroupOrders = (
  pedidos: OrderWithItems[],
  options: EnvioReportOptions = {}
): ConsolidatedClientEnvio[] => {
  const { consolidarPorCliente = true, ocultarObsCopia = true } = options;

  if (!consolidarPorCliente) {
    return pedidos.map((pedido) => {
      const obs = cleanShippingObservation(pedido.observacao, ocultarObsCopia);
      const dataStr = formatDateForDisplay(pedido.data_entrega ?? null, '-');
      return {
        cliente: (pedido.cliente || pedido.customer_name || 'CLIENTE NÃO INFORMADO').trim(),
        cidadeEstado: buildCityState(pedido),
        numerosPedidos: [formatOrderShortNum(pedido)],
        pedidosCount: 1,
        itens: extractOrderItemsList(pedido),
        observacoes: obs ? [obs] : [],
        datasEntrega: [dataStr],
        todosProntos: Boolean(pedido.pronto),
      };
    });
  }

  const map = new Map<string, ConsolidatedClientEnvio>();

  pedidos.forEach((pedido) => {
    const clienteNome = (pedido.cliente || pedido.customer_name || 'CLIENTE NÃO INFORMADO').trim();
    const key = clienteNome.toUpperCase();
    const numPedido = formatOrderShortNum(pedido);
    const itensPedido = extractOrderItemsList(pedido);
    const obsLimpa = cleanShippingObservation(pedido.observacao, ocultarObsCopia);
    const dataStr = formatDateForDisplay(pedido.data_entrega ?? null, '-');
    const cidadeUf = buildCityState(pedido);

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        cliente: clienteNome,
        cidadeEstado: cidadeUf,
        numerosPedidos: [numPedido],
        pedidosCount: 1,
        itens: [...itensPedido],
        observacoes: obsLimpa ? [obsLimpa] : [],
        datasEntrega: [dataStr],
        todosProntos: Boolean(pedido.pronto),
      });
    } else {
      existing.pedidosCount += 1;
      if (!existing.numerosPedidos.includes(numPedido)) {
        existing.numerosPedidos.push(numPedido);
      }
      if (existing.cidadeEstado === '-' && cidadeUf !== '-') {
        existing.cidadeEstado = cidadeUf;
      }
      itensPedido.forEach((it) => {
        existing.itens.push(it);
      });
      if (obsLimpa && !existing.observacoes.some((o) => o.toLowerCase() === obsLimpa.toLowerCase())) {
        existing.observacoes.push(obsLimpa);
      }
      if (!existing.datasEntrega.includes(dataStr)) {
        existing.datasEntrega.push(dataStr);
      }
      existing.todosProntos = existing.todosProntos && Boolean(pedido.pronto);
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    a.cliente.localeCompare(b.cliente, 'pt-BR')
  );
};

export const formatEnvioReportWhatsAppText = (
  groups: EnvioReportGroup[],
  startDate: string,
  endDate?: string | null,
  options: EnvioReportOptions = {}
): string => {
  const intervalLabel = formatIntervalLabel(startDate, endDate ?? null);
  const totalPedidos = groups.reduce((acc, g) => acc + g.pedidos.length, 0);
  const uniqueClients = new Set<string>();
  let totalItens = 0;

  groups.forEach((g) => {
    g.pedidos.forEach((p) => {
      const c = (p.cliente || p.customer_name || '').trim().toUpperCase();
      if (c) uniqueClients.add(c);
      totalItens += p.items?.length || 0;
    });
  });

  const lines: string[] = [];
  lines.push(`📦 *RELATÓRIO EXECUTIVO DE EXPEDIÇÃO*`);
  lines.push(`📅 *Período:* ${intervalLabel}`);
  lines.push(
    `📊 *Resumo:* ${totalPedidos} pedido(s) • ${uniqueClients.size} cliente(s) • ${totalItens} item(ns)`
  );
  lines.push('──────────────────────');

  groups.forEach((group) => {
    const header = (group.forma_envio || 'SEM FORMA DE ENVIO').toUpperCase();
    const consolidated = consolidateEnvioGroupOrders(group.pedidos, options);
    lines.push(`\n🚚 *${header}* (${group.pedidos.length} pedido${group.pedidos.length !== 1 ? 's' : ''})`);

    consolidated.forEach((row, idxRow) => {
      const pedidosBadge = row.numerosPedidos.join(', ');
      const localStr = row.cidadeEstado !== '-' ? ` 📍 _${row.cidadeEstado}_` : '';
      lines.push(`${idxRow + 1}. *${row.cliente}* (${pedidosBadge})${localStr}`);
      row.itens.forEach((item) => {
        lines.push(`   • ${item}`);
      });
      if (row.observacoes.length > 0) {
        lines.push(`   ⚠️ *Obs:* ${row.observacoes.join(' | ')}`);
      }
    });
  });

  return lines.join('\n');
};

export const buildEnvioReportHtml = (
  groups: EnvioReportGroup[],
  startDate: string,
  endDate?: string | null,
  options: EnvioReportOptions = {}
): string => {
  const intervalLabel = formatIntervalLabel(startDate, endDate ?? null);
  const totalPedidos = groups.reduce((acc, g) => acc + g.pedidos.length, 0);
  const title = `Relatório Executivo de Envios - ${intervalLabel}`;
  const nowStr = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const uniqueClients = new Set<string>();
  const citiesCount = new Map<string, number>();
  let totalItens = 0;

  groups.forEach((g) => {
    g.pedidos.forEach((p) => {
      const c = (p.cliente || p.customer_name || '').trim().toUpperCase();
      if (c) uniqueClients.add(c);
      totalItens += p.items?.length || 0;
      const city = buildCityState(p);
      if (city && city !== '-') {
        citiesCount.set(city, (citiesCount.get(city) || 0) + 1);
      }
    });
  });

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const topCitiesSummary = Array.from(citiesCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([city, count]) => `${escapeHtml(city)} (${count})`)
    .join(' • ') || '-';

  const modalidadesPills = groups
    .map((g) => {
      const nome = escapeHtml((g.forma_envio || 'OUTROS').toUpperCase());
      return `<span class="mod-pill"><strong>${nome}:</strong> ${g.pedidos.length} ped.</span>`;
    })
    .join('');

  const incluirCheck = options.incluirColunaCheck !== false;

  const sections = groups
    .map((group) => {
      const header = group.forma_envio ? group.forma_envio.toUpperCase() : 'SEM FORMA DE ENVIO';
      const consolidatedRows = consolidateEnvioGroupOrders(group.pedidos, options);
      const groupItemsCount = group.pedidos.reduce((acc, p) => acc + (p.items?.length || 0), 0);

      const rows = consolidatedRows
        .map((row, idxRow) => {
          const itensHtml =
            row.itens.length > 0
              ? `<ul class="items-list">${row.itens
                  .map((item) => `<li>${escapeHtml(item)}</li>`)
                  .join('')}</ul>`
              : '<span class="muted">-</span>';

          const obsHtml =
            row.observacoes.length > 0
              ? row.observacoes
                  .map(
                    (obs) =>
                      `<div class="obs-alert"><span class="obs-dot">●</span> ${escapeHtml(obs)}</div>`
                  )
                  .join('')
              : '<span class="muted">—</span>';

          const pedidosPills = row.numerosPedidos
            .map((num) => `<span class="order-badge">${escapeHtml(num)}</span>`)
            .join(' ');

          const multiOrderCountBadge =
            row.pedidosCount > 1
              ? `<span class="multi-badge">${row.pedidosCount} fichas</span>`
              : '';

          return `
            <tr class="${idxRow % 2 === 1 ? 'row-even' : 'row-odd'}">
              ${incluirCheck ? '<td class="col-check"><div class="check-box"></div></td>' : ''}
              <td class="col-client">
                <div class="client-name">${escapeHtml(row.cliente)}</div>
                <div class="client-orders">${pedidosPills} ${multiOrderCountBadge}</div>
              </td>
              <td class="col-items">${itensHtml}</td>
              <td class="col-city">
                <span class="city-pill">${escapeHtml(row.cidadeEstado)}</span>
              </td>
              <td class="col-obs">${obsHtml}</td>
              <td class="col-date">${escapeHtml(row.datasEntrega.join(', '))}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <section class="group-section">
          <div class="group-header">
            <div class="group-title-wrap">
              <span class="group-tag">MODALIDADE</span>
              <h2>${escapeHtml(header)}</h2>
            </div>
            <div class="group-stats">
              <span><strong>${consolidatedRows.length}</strong> cliente(s)</span>
              <span class="sep">•</span>
              <span><strong>${group.pedidos.length}</strong> pedido(s)</span>
              <span class="sep">•</span>
              <span><strong>${groupItemsCount}</strong> item(ns)</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                ${incluirCheck ? '<th class="col-check">Conf.</th>' : ''}
                <th class="col-client">Cliente / Ficha</th>
                <th class="col-items">Itens Expedidos (${groupItemsCount})</th>
                <th class="col-city">Destino</th>
                <th class="col-obs">Instruções / Observações</th>
                <th class="col-date">Entrega</th>
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

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm 10mm 12mm 10mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        margin: 0;
        padding: 16px;
        background: #ffffff;
        font-size: 11px;
        line-height: 1.4;
      }
      @media print {
        body { padding: 0; }
        .no-print { display: none !important; }
      }
      /* Header Executivo */
      .report-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 10px;
        margin-bottom: 12px;
      }
      .brand-block {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .brand-eyebrow {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #2563eb;
      }
      .report-title {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
        letter-spacing: -0.02em;
      }
      .report-subtitle {
        font-size: 10.5px;
        color: #475569;
        margin-top: 2px;
      }
      .meta-block {
        text-align: right;
        font-size: 10px;
        color: #334155;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 10px;
      }
      .meta-block div + div {
        margin-top: 2px;
      }
      /* KPIs Executivos */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }
      .kpi-card {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-left: 3.5px solid #2563eb;
        border-radius: 6px;
        padding: 7px 10px;
      }
      .kpi-card.emerald { border-left-color: #059669; }
      .kpi-card.amber { border-left-color: #d97706; }
      .kpi-card.purple { border-left-color: #7c3aed; }
      .kpi-label {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        letter-spacing: 0.04em;
      }
      .kpi-value {
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
        margin-top: 1px;
      }
      .kpi-sub {
        font-size: 9px;
        color: #475569;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* Resumo de Modalidades & Cidades */
      .summary-strip {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 6px 10px;
        margin-bottom: 14px;
        font-size: 10px;
      }
      .mod-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .mod-pill {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 2px 7px;
        font-size: 9.5px;
        color: #0f172a;
      }
      .cities-strip {
        color: #334155;
        font-size: 9.5px;
      }
      /* Seções de Grupo (Forma de Envio) */
      .group-section {
        margin-bottom: 16px;
      }
      .group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #0f172a;
        color: #ffffff;
        padding: 6px 10px;
        border-radius: 6px 6px 0 0;
      }
      .group-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .group-tag {
        background: #2563eb;
        color: #ffffff;
        font-size: 8.5px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 3px;
        letter-spacing: 0.05em;
      }
      .group-header h2 {
        font-size: 12.5px;
        font-weight: 800;
        margin: 0;
        letter-spacing: 0.02em;
      }
      .group-stats {
        font-size: 10px;
        color: #cbd5e1;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .group-stats strong {
        color: #ffffff;
      }
      .sep { color: #64748b; }
      /* Tabela */
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10.5px;
        border: 1px solid #94a3b8;
      }
      thead th {
        background: #e2e8f0;
        color: #0f172a;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 9px;
        letter-spacing: 0.04em;
        padding: 6px 8px;
        border: 1px solid #94a3b8;
        text-align: left;
      }
      tbody td {
        padding: 6px 8px;
        border: 1px solid #cbd5e1;
        vertical-align: top;
      }
      tr {
        page-break-inside: avoid;
      }
      .row-even {
        background-color: #f8fafc;
      }
      .row-odd {
        background-color: #ffffff;
      }
      .col-check {
        width: 34px;
        text-align: center !important;
        vertical-align: middle;
      }
      .check-box {
        width: 13px;
        height: 13px;
        border: 1.5px solid #475569;
        border-radius: 3px;
        margin: 0 auto;
        background: #ffffff;
      }
      .col-client {
        width: 22%;
      }
      .client-name {
        font-weight: 700;
        color: #0f172a;
        font-size: 10.5px;
        line-height: 1.25;
      }
      .client-orders {
        margin-top: 3px;
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        align-items: center;
      }
      .order-badge {
        display: inline-block;
        font-size: 8.5px;
        font-weight: 700;
        color: #1e40af;
        background: #dbeafe;
        border: 1px solid #93c5fd;
        border-radius: 3px;
        padding: 0px 4px;
      }
      .multi-badge {
        display: inline-block;
        font-size: 8.5px;
        font-weight: 700;
        color: #065f46;
        background: #d1fae5;
        border: 1px solid #6ee7b7;
        border-radius: 3px;
        padding: 0px 4px;
      }
      .col-items {
        width: 42%;
      }
      .items-list {
        margin: 0;
        padding-left: 14px;
        list-style-type: disc;
      }
      .items-list li {
        margin-bottom: 2px;
        color: #1e293b;
        font-weight: 500;
      }
      .items-list li:last-child {
        margin-bottom: 0;
      }
      .col-city {
        width: 12%;
      }
      .city-pill {
        display: inline-block;
        font-weight: 600;
        color: #334155;
        font-size: 10px;
      }
      .col-obs {
        width: 16%;
      }
      .obs-alert {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        color: #92400e;
        font-weight: 700;
        font-size: 9.5px;
        padding: 3px 6px;
        border-radius: 4px;
        margin-bottom: 3px;
        line-height: 1.25;
      }
      .obs-alert:last-child {
        margin-bottom: 0;
      }
      .obs-dot {
        color: #d97706;
        margin-right: 2px;
      }
      .col-date {
        width: 8%;
        text-align: center !important;
        font-weight: 600;
        font-size: 9.5px;
        color: #334155;
        white-space: nowrap;
      }
      .muted {
        color: #94a3b8;
      }
      /* Rodapé de Conferência */
      .report-footer {
        margin-top: 18px;
        padding-top: 10px;
        border-top: 1px dashed #94a3b8;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 9.5px;
        color: #475569;
        page-break-inside: avoid;
      }
      .sig-box {
        display: flex;
        gap: 28px;
      }
      .sig-line {
        width: 170px;
        border-top: 1px solid #334155;
        padding-top: 3px;
        text-align: center;
        font-weight: 600;
        color: #334155;
      }
    </style>
  </head>
  <body>
    <header class="report-header">
      <div class="brand-block">
        <span class="brand-eyebrow">SGP • Relatório Executivo de Expedição</span>
        <h1 class="report-title">Romaneio Geral de Envios e Saídas</h1>
        <div class="report-subtitle">Relatório consolidado para conferência logística e acompanhamento da diretoria</div>
      </div>
      <div class="meta-block">
        <div><strong>Período de Entrega:</strong> ${escapeHtml(intervalLabel)}</div>
        <div><strong>Emitido em:</strong> ${escapeHtml(nowStr)}</div>
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Clientes Atendidos</div>
        <div class="kpi-value">${uniqueClients.size}</div>
        <div class="kpi-sub">Entregas consolidadas</div>
      </div>
      <div class="kpi-card emerald">
        <div class="kpi-label">Total de Pedidos</div>
        <div class="kpi-value">${totalPedidos}</div>
        <div class="kpi-sub">Fichas expedidas no período</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-label">Total de Itens</div>
        <div class="kpi-value">${totalItens}</div>
        <div class="kpi-sub">Volumes / peças produzidas</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-label">Modalidades</div>
        <div class="kpi-value">${groups.length}</div>
        <div class="kpi-sub">Formas de envio ativas</div>
      </div>
    </div>

    <div class="summary-strip">
      <div class="mod-pills">${modalidadesPills}</div>
      <div class="cities-strip"><strong>Principais Destinos:</strong> ${topCitiesSummary}</div>
    </div>

    ${sections}

    <footer class="report-footer">
      <div>
        <strong>SGP — Sistema de Gerenciamento de Pedidos</strong><br />
        Documento gerado eletronicamente em ${escapeHtml(nowStr)}
      </div>
      <div class="sig-box">
        <div class="sig-line">Conferência / Expedição</div>
        <div class="sig-line">Responsável / Portador</div>
      </div>
    </footer>
  </body>
</html>`;
};

export const previewEnvioReport = (
  groups: EnvioReportGroup[],
  startDate: string,
  endDate?: string | null,
  options: EnvioReportOptions = {}
) => {
  if (!groups.length) return;
  const intervalLabel = formatIntervalLabel(startDate, endDate ?? null);
  const title = `Relatório Executivo de Envios - ${intervalLabel}`;
  const html = buildEnvioReportHtml(groups, startDate, endDate, options);
  openInViewer({ type: 'html', html, title });
};

export const printEnvioReport = (
  groups: EnvioReportGroup[],
  startDate: string,
  endDate?: string | null,
  options: EnvioReportOptions = {}
) => {
  if (!groups.length) return;

  const html = buildEnvioReportHtml(groups, startDate, endDate, options);
  const htmlWithAutoPrint = html.replace(
    '</body>',
    `<script>
      (function(){
        function doPrint(){
          try { window.focus(); window.print(); } catch(e){}
        }
        if (document.readyState === 'complete') doPrint();
        else window.addEventListener('load', function(){ setTimeout(doPrint, 150); }, { once:true });
      })();
    </script></body>`
  );

  let win: Window | null = null;
  try {
    win = window.open('', '_blank');
  } catch {
    win = null;
  }
  if (!win) {
    const temp = document.createElement('iframe');
    temp.style.position = 'fixed';
    temp.style.width = '0';
    temp.style.height = '0';
    temp.style.border = '0';
    document.body.appendChild(temp);
    const doc = temp.contentDocument || temp.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlWithAutoPrint);
      doc.close();
      setTimeout(() => {
        try { temp.contentWindow?.focus(); temp.contentWindow?.print(); } catch (_) { /* noop */ }
        setTimeout(() => { try { document.body.removeChild(temp); } catch (_) { /* noop */ } }, 2000);
      }, 300);
    }
    return;
  }
  win.document.open();
  win.document.write(htmlWithAutoPrint);
  win.document.close();
};
