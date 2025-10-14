import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderWithItems } from '../types';

export const exportToCSV = (orders: OrderWithItems[]) => {
  const csvData = orders.map((order) => ({
    ID: order.id,
    Cliente: order.customer_name,
    Endereco: order.address,
    'Valor Total': typeof order.total_value === 'number' 
      ? order.total_value.toFixed(2) 
      : parseFloat(order.total_value.toString()).toFixed(2),
    Status: order.status,
    'Data de Criacao': new Date(order.created_at).toLocaleDateString('pt-BR'),
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

  // Título
  doc.setFontSize(18);
  doc.text('Relatório de Pedidos', 14, 22);

  // Data do relatório
  doc.setFontSize(11);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

  // Tabela
  const tableData = orders.map((order) => [
    order.id.toString(),
    order.customer_name,
    order.status,
    `R$ ${typeof order.total_value === 'number' 
      ? order.total_value.toFixed(2) 
      : parseFloat(order.total_value.toString()).toFixed(2)}`,
    new Date(order.created_at).toLocaleDateString('pt-BR'),
  ]);

  autoTable(doc, {
    head: [['ID', 'Cliente', 'Status', 'Valor Total', 'Data']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [25, 118, 210] },
  });

  // Salvar PDF
  doc.save(`pedidos_${new Date().toISOString().split('T')[0]}.pdf`);
};



