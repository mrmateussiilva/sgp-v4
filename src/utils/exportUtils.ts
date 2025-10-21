import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderWithItems } from '../types';
import { formatDateForDisplay } from '@/utils/date';

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

const openPdfInPrintWindow = (doc: jsPDF, filename: string) => {
  if (typeof window === 'undefined') {
    doc.save(filename);
    return;
  }

  try {
    const autoPrint = (doc as unknown as { autoPrint?: (options?: unknown) => void }).autoPrint;
    if (typeof autoPrint === 'function') {
      autoPrint({ variant: 'non-conform' });
    }
  } catch (error) {
    console.warn('autoPrint indisponível. Seguiremos com fluxo padrão.', error);
  }

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = blobUrl;

  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
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
      frameWindow.focus();
      const printResult = frameWindow.print();
      const maybePromise = printResult as unknown as { then?: (onfulfilled?: unknown, onrejected?: (reason?: unknown) => void) => unknown };
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(
          () => setTimeout(cleanup, 3000),
          (error) => {
            console.warn('Impressão bloqueada. Salvando PDF.', error);
            cleanup();
            doc.save(filename);
          },
        );
      } else {
        setTimeout(cleanup, 3000);
      }
    } catch (error) {
      console.warn('Erro ao iniciar impressão. Baixando PDF.', error);
      cleanup();
      doc.save(filename);
    }
  };

  iframe.onerror = () => {
    cleanup();
    doc.save(filename);
  };

  document.body.appendChild(iframe);
};

export const exportToCSV = (orders: OrderWithItems[]) => {
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

export const exportToPDF = (orders: OrderWithItems[]) => {
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

export const exportEnvioReportToPDF = (
  groups: EnvioReportGroup[],
  startDate: string,
  endDate?: string | null
) => {
  if (!groups.length) {
    return;
  }

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
