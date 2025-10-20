import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Printer, X, ChevronDown } from 'lucide-react';
import { OrderItem, OrderWithItems } from '../types';
import { api } from '../services/api';

interface OrderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithItems | null;
}

export const OrderViewModal: React.FC<OrderViewModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!order) return null;

  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);

  // Buscar formas de pagamento
  useEffect(() => {
    const fetchFormasPagamento = async () => {
      try {
        const formas = await api.getFormasPagamentoAtivas();
        setFormasPagamento(formas);
      } catch (error) {
        console.error("Erro ao carregar formas de pagamento:", error);
      }
    };
    fetchFormasPagamento();
  }, []);

  // Função para obter o nome da forma de pagamento
  const getFormaPagamentoNome = (id?: number) => {
    if (!id) return 'Não informado';
    const forma = formasPagamento.find(fp => fp.id === id);
    return forma ? forma.nome : 'Não encontrado';
  };

  // Função para lidar com clique na imagem
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // Função para fechar o modal de imagem
  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = generatePrintContent(order);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido #${order.numero || order.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .info-item {
              margin-bottom: 8px;
            }
            .info-label {
              font-weight: bold;
              color: #555;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
            }
            .status-pendente { background-color: #fef3c7; color: #92400e; }
            .status-em-processamento { background-color: #dbeafe; color: #1e40af; }
            .status-concluido { background-color: #d1fae5; color: #065f46; }
            .status-cancelado { background-color: #fee2e2; color: #991b1b; }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .items-table th,
            .items-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .items-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .total-section {
              text-align: right;
              margin-top: 20px;
              font-size: 18px;
              font-weight: bold;
            }
            .production-status {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-top: 10px;
            }
            .production-item {
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              text-align: center;
            }
            .production-completed {
              background-color: #d1fae5;
              color: #065f46;
            }
            .production-pending {
              background-color: #fef3c7;
              color: #92400e;
            }
            .item-details {
              margin-top: 6px;
              font-size: 12px;
              color: #444;
            }
            .item-details-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 6px;
              margin-top: 8px;
            }
            .item-detail {
              padding: 6px;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              background-color: #f9fafb;
            }
            .item-detail strong {
              display: block;
              font-size: 10px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              margin-bottom: 2px;
            }
            .item-observacao {
              margin-top: 10px;
              padding: 8px;
              border: 1px dashed #fb923c;
              border-radius: 4px;
              background-color: #fff7ed;
              color: #9a3412;
            }
            .item-imagem {
              margin-top: 10px;
            }
            .item-imagem strong {
              font-size: 12px;
              color: #374151;
            }
            .item-image-preview {
              margin-top: 6px;
              max-width: 180px;
              max-height: 180px;
              border-radius: 6px;
              border: 1px solid #d1d5db;
            }
            .item-details-empty {
              font-size: 11px;
              color: #6b7280;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const generatePrintContent = (order: OrderWithItems) => {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const formatCurrencyPrint = (value: unknown) => formatCurrency(value);

    const formatDate = (dateString?: string) => {
      if (!dateString) return 'Não informado';
      return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getStatusClass = (status: string) => {
      switch (status) {
        case 'Pendente': return 'status-pendente';
        case 'Em Processamento': return 'status-em-processamento';
        case 'Concluído': return 'status-concluido';
        case 'Cancelado': return 'status-cancelado';
        default: return 'status-pendente';
      }
    };

    const buildItemDetailsHtml = (item: OrderItem) => {
      const detailBlocks: string[] = [];

      const addDetail = (label: string, value?: string | number | null | undefined) => {
        if (value === undefined || value === null) return;
        const stringValue =
          typeof value === 'number'
            ? value.toString()
            : value.toString().trim();
        if (!stringValue) return;

        detailBlocks.push(`
          <div class="item-detail">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(stringValue)}</span>
          </div>
        `);
      };

      const addCurrencyDetail = (label: string, value?: string | number | null) => {
        if (value === undefined || value === null) return;
        const formatted = formatCurrencyPrint(value);
        addDetail(label, formatted);
      };

      addDetail('Tipo de Produção', item.tipo_producao);
      addDetail('Descrição', item.descricao);
      addDetail('Quantidade de Painéis', item.quantidade_paineis);
      addCurrencyDetail('Valor Unitário Informado', item.valor_unitario);
      addDetail('Largura', item.largura);
      addDetail('Altura', item.altura);
      addDetail('m²', item.metro_quadrado);
      addDetail('Vendedor', item.vendedor);
      addDetail('Designer', item.designer);
      addDetail('Tecido', item.tecido);

      if (item.overloque !== undefined && item.overloque !== null) {
        addDetail('Overloque', item.overloque ? 'Sim' : 'Não');
      }

      if (item.elastico !== undefined && item.elastico !== null) {
        addDetail('Elástico', item.elastico ? 'Sim' : 'Não');
      }

      addDetail('Tipo de Acabamento', item.tipo_acabamento);
      addDetail('Qtd. Ilhós', item.quantidade_ilhos);
      const formatSpacingValue = (value?: string | null) => {
        if (!value) return undefined;
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        return trimmed.toLowerCase().endsWith('cm') ? trimmed : `${trimmed} cm`;
      };
      const spacingIlhos = formatSpacingValue(item.espaco_ilhos);
      if (spacingIlhos) {
        addDetail('Espaço Ilhós', spacingIlhos);
      }
      addCurrencyDetail('Valor Ilhós', item.valor_ilhos);
      addDetail('Qtd. Cordinha', item.quantidade_cordinha);
      const spacingCordinha = formatSpacingValue(item.espaco_cordinha);
      if (spacingCordinha) {
        addDetail('Espaço Cordinha', spacingCordinha);
      }
      addCurrencyDetail('Valor Cordinha', item.valor_cordinha);

      const formatEmendaType = (value?: string | null) => {
        if (!value) return '';
        const trimmed = value.trim();
        if (!trimmed || trimmed.toLowerCase() === 'sem-emenda') return '';
        return trimmed
          .split(/[-_]/)
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(' ');
      };

      const emendaFormatted = formatEmendaType(item.emenda);
      if (emendaFormatted) {
        addDetail('Emenda', emendaFormatted);
        const emendaQuantidadeValue = (item.emenda_qtd ?? (item as any).emendaQtd) as string | undefined;
        if (emendaQuantidadeValue && emendaQuantidadeValue.trim().length > 0) {
          const emendaQtdNumber = parseNumberValue(emendaQuantidadeValue);
          const emendaQtdLabel = `${emendaQuantidadeValue} ${emendaQtdNumber === 1 ? 'emenda' : 'emendas'}`;
          addDetail('Qtd. Emendas', emendaQtdLabel);
        }
      }

      const observationHtml =
        item.observacao && item.observacao.trim().length > 0
          ? `
            <div class="item-observacao">
              <strong>Observação:</strong><br>
              ${escapeHtml(item.observacao).replace(/\n/g, '<br>')}
            </div>
          `
          : '';

      const imageHtml =
        item.imagem && item.imagem.trim().length > 0
          ? `
            <div class="item-imagem">
              <strong>Imagem:</strong><br>
              <img src="${escapeHtml(item.imagem)}" alt="Imagem do item" class="item-image-preview"/>
            </div>
          `
          : '';

      if (detailBlocks.length === 0 && !observationHtml && !imageHtml) {
        return `
          <div class="item-details">
            <span class="item-details-empty">Nenhum detalhe adicional informado.</span>
          </div>
        `;
      }

      return `
        <div class="item-details">
          ${
            detailBlocks.length > 0
              ? `<div class="item-details-grid">
                  ${detailBlocks.join('')}
                </div>`
              : ''
          }
          ${observationHtml}
          ${imageHtml}
        </div>
      `;
    };

    const orderTotal = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + parseCurrencyValue(item.subtotal), 0)
      : 0;

    const totalValueForPrint =
      orderTotal > 0
        ? orderTotal
        : parseCurrencyValue(order.total_value || order.valor_total || 0);

    return `
      <div class="header">
        <h1>PEDIDO #${order.numero || order.id}</h1>
      </div>

      <div class="section">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Nome do Cliente:</span><br>
            ${order.customer_name || order.cliente || 'Não informado'}
          </div>
          <div class="info-item">
            <span class="info-label">Telefone do Cliente:</span><br>
            ${order.telefone_cliente || 'Não informado'}
          </div>
          <div class="info-item">
            <span class="info-label">Cidade do Cliente:</span><br>
            ${order.cidade_cliente || 'Não informado'}
          </div>
          <div class="info-item">
            <span class="info-label">Status do Pedido:</span><br>
            <span class="status-badge ${getStatusClass(order.status)}">${order.status}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Data de Entrada:</span><br>
            ${formatDate(order.data_entrada)}
          </div>
          <div class="info-item">
            <span class="info-label">Data de Entrega:</span><br>
            ${formatDate(order.data_entrega)}
          </div>
          <div class="info-item">
            <span class="info-label">Forma de Envio:</span><br>
            ${order.forma_envio || 'Não informado'}
          </div>
        </div>
      </div>

      <hr style="margin: 20px 0; border: 1px solid #ddd;">

      <div class="section">
        <div class="section-title">Itens do Pedido</div>
        
        <table class="items-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 50px;">#</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 100px;">Qtd</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 120px;">Valor Unit.</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 120px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items && order.items.length > 0 ? `
              ${order.items.map((item, index) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${index + 1}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    <div style="font-weight: bold;">${escapeHtml(item.item_name)}</div>
                    ${buildItemDetailsHtml(item)}
                  </td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrencyPrint(item.unit_price)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${formatCurrencyPrint(item.subtotal)}</td>
                </tr>
              `).join('')}
            ` : ''}

            ${order.items && order.items.length > 0 ? `
              <tr style="background-color: #f5f5f5; font-weight: bold;">
                <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total:</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 16px;">
                  ${formatCurrencyPrint(totalValueForPrint)}
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <hr style="margin: 20px 0; border: 1px solid #ddd;">

      <div class="section">
        <div class="section-title">Forma de Pagamento - Valores</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <strong>Forma de Pagamento:</strong><br>
            <span style="color: #333;">${getFormaPagamentoNome(order.forma_pagamento_id)}</span>
          </div>
          <div style="text-align: right;">
            <strong>Valor Total:</strong><br>
              <span style="font-size: 20px; font-weight: bold; color: #059669;">
              ${formatCurrencyPrint(totalValueForPrint)}
            </span>
          </div>
        </div>
      </div>
    `;
  };

  const parseCurrencyValue = (value: unknown): number => {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'object') {
      const decimalObject = value as Record<string, unknown> & { toString?: () => string };

      if (typeof decimalObject.$numberDecimal === 'string') {
        return parseCurrencyValue(decimalObject.$numberDecimal);
      }

      if (typeof decimalObject.value === 'string' || typeof decimalObject.value === 'number') {
        return parseCurrencyValue(decimalObject.value);
      }

      const maybeString = decimalObject.toString?.();
      if (maybeString && maybeString !== '[object Object]') {
        return parseCurrencyValue(maybeString);
      }

      return 0;
    }

    const normalized = String(value)
      .replace(/[^\d.,-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (value: unknown) => {
    const numValue = parseCurrencyValue(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Não informado';
    
    try {
      // Se a data está no formato YYYY-MM-DD (ISO), usar diretamente
      if (typeof dateString === 'string' && dateString.includes('-') && dateString.length === 10) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
      }
      
      // Para outros formatos, tentar parsear normalmente
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error);
      return 'Data inválida';
    }
  };

  const orderTotalFromItems = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + parseCurrencyValue(item.subtotal), 0)
    : 0;

  const fallbackTotal = parseCurrencyValue(order.total_value ?? order.valor_total ?? 0);
  const orderTotalValue = orderTotalFromItems > 0 ? orderTotalFromItems : fallbackTotal;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente': return 'bg-yellow-100 text-yellow-800';
      case 'Em Processamento': return 'bg-blue-100 text-blue-800';
      case 'Concluído': return 'bg-green-100 text-green-800';
      case 'Cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const normalizeText = (value?: string | null) => value?.trim() ?? '';

  const hasTextValue = (value?: string | null, options?: { disallow?: string[] }) => {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (options?.disallow?.some((entry) => lower === entry)) {
      return false;
    }
    return true;
  };

  const parseNumberValue = (value?: string | number | null) => {
    if (typeof value === 'number') return value;
    if (!value) return NaN;
    const normalized = value
      .toString()
      .trim()
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(normalized);
  };

  const hasPositiveNumber = (value?: string | number | null) => {
    const parsed = parseNumberValue(value);
    return !Number.isNaN(parsed) && parsed > 0;
  };

  const hasMeaningfulDimension = (value?: string | null) => {
    if (!value) return false;
    const parsed = parseNumberValue(value);
    if (!Number.isNaN(parsed)) {
      return parsed > 0;
    }
    return hasTextValue(value);
  };

  const hasQuantityValue = (value?: string | null) => {
    if (!value) return false;
    const parsed = parseNumberValue(value);
    if (!Number.isNaN(parsed)) {
      return parsed > 0;
    }
    return hasTextValue(value);
  };

  type DetailVariant = 'neutral' | 'accent' | 'warning';

  interface DetailEntry {
    label: string;
    value: React.ReactNode;
    variant: DetailVariant;
  }

  const buildDetailSections = (item: OrderItem): DetailEntry[] => {
    const sections: DetailEntry[] = [];

    const formatSpacing = (value?: string | null) => {
      const normalized = normalizeText(value);
      if (!normalized) {
        return '';
      }
      return /cm$/i.test(normalized) ? normalized : `${normalized} cm`;
    };

    if (hasPositiveNumber(item.valor_unitario)) {
      sections.push({
        label: 'Valor Unitário Informado',
        value: formatCurrency(item.valor_unitario!),
        variant: 'neutral',
      });
    }

    if (item.overloque) {
      sections.push({ label: 'Overloque', value: 'Sim', variant: 'accent' });
    }

    if (item.elastico) {
      sections.push({ label: 'Elástico', value: 'Sim', variant: 'accent' });
    }

    if (hasTextValue(item.tipo_acabamento, { disallow: ['nenhum'] })) {
      sections.push({
        label: 'Tipo de Acabamento',
        value: item.tipo_acabamento,
        variant: 'accent',
      });
    }

    if (hasQuantityValue(item.quantidade_ilhos)) {
      sections.push({
        label: 'Qtd. Ilhós',
        value: (
          <span className="text-lg font-bold text-red-600">
            {item.quantidade_ilhos}
          </span>
        ),
        variant: 'warning',
      });
    }

    if (hasQuantityValue(item.espaco_ilhos)) {
      const spacing = formatSpacing(item.espaco_ilhos);
      if (spacing) {
        sections.push({
          label: 'Espaço Ilhós',
          value: spacing,
          variant: 'warning',
        });
      }
    }

    if (hasPositiveNumber(item.valor_ilhos)) {
      sections.push({
        label: 'Valor Ilhós',
        value: formatCurrency(item.valor_ilhos!),
        variant: 'neutral',
      });
    }

    if (hasQuantityValue(item.quantidade_cordinha)) {
      sections.push({
        label: 'Qtd. Cordinha',
        value: (
          <span className="text-lg font-bold text-red-600">
            {item.quantidade_cordinha}
          </span>
        ),
        variant: 'warning',
      });
    }

    if (hasQuantityValue(item.espaco_cordinha)) {
      const spacing = formatSpacing(item.espaco_cordinha);
      if (spacing) {
        sections.push({
          label: 'Espaço Cordinha',
          value: spacing,
          variant: 'warning',
        });
      }
    }

    if (hasPositiveNumber(item.valor_cordinha)) {
      sections.push({
        label: 'Valor Cordinha',
        value: formatCurrency(item.valor_cordinha!),
        variant: 'neutral',
      });
    }

    const emendaTipoRaw = normalizeText((item as any).emenda);
    const emendaTipo = emendaTipoRaw
      ? emendaTipoRaw
          .split(/[-_]/)
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(' ')
      : '';

    if (emendaTipoRaw && emendaTipoRaw !== "sem-emenda") {
      sections.push({
        label: 'Emenda',
        value: emendaTipo,
        variant: 'accent',
      });

      const emendaQuantidade = normalizeText((item as any).emenda_qtd ?? (item as any).emendaQtd);
      if (emendaQuantidade) {
        const emendaQtdNumber = parseNumberValue(emendaQuantidade);
        const emendaQtdLabel =
          emendaQtdNumber === 1
            ? `${emendaQuantidade} emenda`
            : `${emendaQuantidade} emendas`;
        sections.push({
          label: 'Qtd. Emendas',
          value: (
            <span className="text-lg font-bold text-red-600">
              {emendaQtdLabel}
            </span>
          ),
          variant: 'warning',
        });
      }
    }

    return sections;
  };

  const hasDetailedData = (item: OrderItem) => {
    const sections = buildDetailSections(item);
    const hasObservation = hasTextValue(item.observacao);
    const hasImage = hasTextValue(item.imagem);
    return sections.length > 0 || hasObservation || hasImage;
  };

  const getVariantClasses = (variant: DetailVariant) => {
    switch (variant) {
      case 'accent':
        return 'bg-indigo-600 text-white';
      case 'warning':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  const renderDetailLines = (entries: DetailEntry[]) => {
    if (entries.length === 0) {
      return null;
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white/95 p-4">
        <div className="grid gap-3">
          {entries.map((entry, index) => (
            <div
              key={`${entry.label}-${index}`}
              className="flex flex-wrap items-center gap-2"
            >
              <span
                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${getVariantClasses(
                  entry.variant
                )}`}
              >
                {entry.label}
              </span>
              <span className="text-sm text-slate-800">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderItemDetailsContent = (item: OrderItem) => {
    const detailEntries = buildDetailSections(item);

    const hasObservation = hasTextValue(item.observacao);
    const hasImage = hasTextValue(item.imagem);
    const tipo = normalizeText(item.tipo_producao);
    const descricao = normalizeText(item.descricao);
    const painelQuantidade = hasQuantityValue(item.quantidade_paineis)
      ? normalizeText(item.quantidade_paineis)
      : '';
    const itemQuantidade = item.quantity && item.quantity > 0 ? String(item.quantity) : '';
    const quantidadeDisplay = painelQuantidade || itemQuantidade;

    const summaryParts: string[] = [];
    if (tipo) summaryParts.push(tipo.toUpperCase());
    if (descricao) summaryParts.push(descricao);
    if (quantidadeDisplay) summaryParts.push(`Qtd: ${quantidadeDisplay}`);
    const summaryLine = summaryParts.join(' • ');

    const vendedor = normalizeText(item.vendedor);
    const designer = normalizeText(item.designer);
    const equipeLine = [
      vendedor ? `Vendedor: ${vendedor}` : '',
      designer ? `Designer: ${designer}` : '',
    ]
      .filter(Boolean)
      .join('  |  ');

    const largura = normalizeText(item.largura);
    const altura = normalizeText(item.altura);
    const area = normalizeText(item.metro_quadrado);
    let dimensoesLine = '';
    if (largura || altura || area) {
      const larguraLabel = largura || '-';
      const alturaLabel = altura || '-';
      const areaLabel = area ? ` = ${area}` : '';
      dimensoesLine = `${larguraLabel} x ${alturaLabel}${areaLabel}`;
    }

    const tecido = normalizeText(item.tecido);

    const highlightCards: Array<{ label: string; value: React.ReactNode; className: string }> = [];

    if (summaryLine) {
      highlightCards.push({
        label: 'Item',
        value: summaryLine,
        className: 'bg-slate-900 text-white',
      });
    }

    if (equipeLine) {
      highlightCards.push({
        label: 'Equipe',
        value: equipeLine,
        className: 'bg-purple-600 text-white',
      });
    }

    if (dimensoesLine) {
      highlightCards.push({
        label: 'Dimensões',
        value: dimensoesLine,
        className: 'bg-sky-600 text-white',
      });
    }

    if (tecido) {
      highlightCards.push({
        label: 'Tecido',
        value: tecido,
        className: 'bg-emerald-600 text-white',
      });
    }
    if (painelQuantidade) {
      const painelLabel =
        parseNumberValue(painelQuantidade) === 1
          ? 'Quantidade: 1 painel'
          : `Quantidade: ${painelQuantidade} painéis`;

      highlightCards.push({
        label: 'Painéis',
        value: (
          <span className="text-lg font-semibold leading-tight">
            {painelLabel}
          </span>
        ),
        className: 'bg-rose-600 text-white',
      });
    }

    if (highlightCards.length === 0 && detailEntries.length === 0 && !hasObservation && !hasImage) {
      return (
        <div className="text-sm text-slate-500">
          Nenhum detalhe adicional informado.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className={`space-y-4 ${hasImage ? 'lg:w-2/3' : 'w-full'}`}>
          {highlightCards.length > 0 && (
            <div className="grid gap-3 lg:grid-cols-2">
              {highlightCards.map((card) => (
                <div
                  key={`${card.label}-${card.value}`}
                  className={`rounded-lg px-4 py-3 shadow-sm ${card.className}`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    {card.label}
                  </div>
                  <div className="text-sm font-semibold leading-snug">
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {renderDetailLines(detailEntries)}

          {hasObservation && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <span className="font-semibold">Observação:</span>{' '}
              {item.observacao}
            </div>
          )}
        </div>

        {hasImage && (
          <div className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:w-1/3">
            <span className="text-sm font-semibold text-slate-700">
              Visualização da Imagem
            </span>
            <div className="flex w-full flex-col items-center gap-3">
              <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                <img
                  src={item.imagem!}
                  alt={`Imagem do item ${item.item_name}`}
                  className="h-full w-full object-contain"
                  onError={(event) => {
                    const target = event.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleImageClick(item.imagem!)}
                className="w-full"
              >
                Abrir imagem em destaque
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] h-[90vh] max-w-none max-h-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Pedido #{order.numero || order.id}</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cabeçalho do Pedido */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">Pedido #{order.numero || order.id}</h2>
          </div>

          {/* Informações Principais */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-semibold">Nome do Cliente:</span><br />
              {order.customer_name || order.cliente || 'Não informado'}
            </div>
            <div>
              <span className="font-semibold">Telefone:</span><br />
              {order.telefone_cliente || 'Não informado'}
            </div>
            <div>
              <span className="font-semibold">Cidade:</span><br />
              {order.cidade_cliente || 'Não informado'}
            </div>
            <div>
              <span className="font-semibold">Status:</span><br />
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </div>
          </div>

          {/* Datas e Forma de Envio */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold">Data de Entrada:</span><br />
              {formatDate(order.data_entrada)}
            </div>
            <div>
              <span className="font-semibold">Data de Entrega:</span><br />
              {formatDate(order.data_entrega)}
            </div>
            <div>
              <span className="font-semibold">Forma de Envio:</span><br />
              {order.forma_envio || 'Não informado'}
            </div>
          </div>

          <Separator />

          {/* Itens */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Itens do Pedido</h3>

            {order.items && order.items.length > 0 ? (
              <div className="space-y-3">
                {order.items.map((item, index) => {
                  const key = String(item.id ?? `order-${index}`);
                  const isOpen = openItemKey === key;
                  const toggleOpen = () =>
                    setOpenItemKey((current) => (current === key ? null : key));

                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={toggleOpen}
                        className="w-full bg-slate-50/60 px-4 py-3 text-left transition hover:bg-slate-100/80"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-sm font-semibold text-slate-500">#{index + 1}</span>
                            <div>
                              <div className="font-semibold text-slate-900">{item.item_name}</div>
                              {hasDetailedData(item) ? (
                                <div className="text-xs text-emerald-600">
                                  Clique para ver os detalhes completos
                                </div>
                              ) : (
                                <div className="text-xs text-slate-500">
                                  Nenhum detalhe adicional informado
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                            <div className="font-medium">Qtd: {item.quantity}</div>
                            <div>Valor unit.: {formatCurrency(item.unit_price)}</div>
                            <div className="font-semibold text-slate-900">
                              Subtotal: {formatCurrency(item.subtotal)}
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="space-y-4 border-t border-slate-200 bg-white px-4 py-4">
                          <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                            <div className="flex flex-wrap items-center gap-4">
                              <span>
                                Quantidade: <strong>{item.quantity}</strong>
                              </span>
                              <span>
                                Valor unitário: <strong>{formatCurrency(item.unit_price)}</strong>
                              </span>
                              <span>
                                Subtotal: <strong>{formatCurrency(item.subtotal)}</strong>
                              </span>
                            </div>
                          </div>

                          {renderItemDetailsContent(item)}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex flex-col items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-600">Total do Pedido</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatCurrency(orderTotalValue)}
                  </span>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 10-1.5 0v3a.75.75 0 00.334.624l1.5 1a.75.75 0 10.832-1.248l-1.166-.777V6.5zM10 13a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-emerald-900">
                        Expandir itens para ver detalhes
                      </h3>
                      <p className="mt-2 text-sm text-emerald-800">
                        Os campos extras preenchidos no formulário aparecem dentro de cada item.
                        Se algum campo não estiver visível, significa que ele não foi informado.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum item encontrado para este pedido.</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Forma de Pagamento e Valores */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Forma de Pagamento - Valores</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Forma de Pagamento:</span><br />
                {getFormaPagamentoNome(order.forma_pagamento_id)}
              </div>
              <div className="text-right">
                <span className="font-semibold">Valor Total:</span><br />
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(orderTotalValue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Modal de Imagem */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={closeImageModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center justify-between">
                <span>Visualização da Imagem</span>
                <Button onClick={closeImageModal} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-0">
              <div className="flex justify-center">
                <img 
                  src={selectedImage} 
                  alt="Imagem do item"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
