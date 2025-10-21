import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Printer, X, ChevronDown } from 'lucide-react';
import { OrderItem, OrderWithItems } from '../types';
import { api } from '../services/api';
import { printOrder } from '../utils/printOrder';

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
    const formaPagamentoNome = getFormaPagamentoNome(order.forma_pagamento_id);
    const enrichedOrder = {
      ...order,
      forma_pagamento_nome:
        formaPagamentoNome && formaPagamentoNome !== 'Não informado'
          ? formaPagamentoNome
          : undefined,
    };
    printOrder(enrichedOrder);
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

    const raw = String(value).trim();
    if (!raw) {
      return 0;
    }

    const cleaned = raw.replace(/[^\d.,-]/g, '');
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    let normalized = cleaned;

    if (lastComma > -1 && lastComma > lastDot) {
      // formato pt-BR: usar vírgula como decimal
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > -1 && lastDot > lastComma) {
      // formato en-US: usar ponto como decimal, remover vírgulas de milhar
      normalized = cleaned.replace(/,/g, '');
    } else {
      // Apenas um separador ou nenhum: tratar vírgula como decimal
      normalized = cleaned.replace(',', '.');
    }

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

  const freightValue = parseCurrencyValue((order as any).valor_frete ?? (order as any).frete ?? 0);

  const fallbackTotal = parseCurrencyValue(order.total_value ?? order.valor_total ?? 0);
  const computedOrderTotal = orderTotalFromItems + freightValue;
  const orderTotalValue = computedOrderTotal > 0 ? computedOrderTotal : fallbackTotal;
  const showFreight = freightValue > 0;

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
    const tipoProducao = normalizeText(item.tipo_producao).toLowerCase();
    const isLona = tipoProducao === 'lona';
    const isTotem = tipoProducao === 'totem';
    const isAdesivo = tipoProducao === 'adesivo';

    const formatSpacing = (value?: string | null) => {
      const normalized = normalizeText(value);
      if (!normalized) {
        return '';
      }
      return /cm$/i.test(normalized) ? normalized : `${normalized} cm`;
    };

    if (hasPositiveNumber(item.valor_unitario) && !isLona && !isTotem && !isAdesivo) {
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

    if (isLona) {
      const terceirizado = (item as any).terceirizado;
      if (typeof terceirizado === 'boolean') {
        sections.push({
          label: 'Terceirizado',
          value: terceirizado ? 'Sim' : 'Não',
          variant: terceirizado ? 'warning' : 'neutral',
        });
      }

      const acabamentoLonaRaw = normalizeText((item as any).acabamento_lona);
      if (acabamentoLonaRaw) {
        const acabamentoLabel = acabamentoLonaRaw
          .split(/[_-]/)
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(' ');
        sections.push({
          label: 'Acabamento',
          value: acabamentoLabel,
          variant: 'accent',
        });
      }

      const valorBaseLona = (item as any).valor_lona;
      if (hasPositiveNumber(valorBaseLona)) {
        sections.push({
          label: 'Valor Base',
          value: formatCurrency(valorBaseLona),
          variant: 'neutral',
        });
      }

      const outrosValoresLona = (item as any).outros_valores_lona;
      if (hasPositiveNumber(outrosValoresLona)) {
        sections.push({
          label: 'Outros Valores',
          value: formatCurrency(outrosValoresLona),
          variant: 'neutral',
        });
      }
    }

    if (isAdesivo) {
      const tipoAdesivo = normalizeText((item as any).tipo_adesivo);
      if (tipoAdesivo) {
        sections.push({
          label: 'Tipo de Adesivo',
          value: tipoAdesivo,
          variant: 'accent',
        });
      }

      const valorAdesivo = (item as any).valor_adesivo;
      if (hasPositiveNumber(valorAdesivo)) {
        sections.push({
          label: 'Valor do Adesivo',
          value: formatCurrency(valorAdesivo),
          variant: 'neutral',
        });
      }

      const outrosValoresAdesivo = (item as any).outros_valores_adesivo;
      if (hasPositiveNumber(outrosValoresAdesivo)) {
        sections.push({
          label: 'Outros Valores',
          value: formatCurrency(outrosValoresAdesivo),
          variant: 'neutral',
        });
      }

      const quantidadeAdesivo = normalizeText((item as any).quantidade_adesivo);
      if (quantidadeAdesivo) {
        sections.push({
          label: 'Quantidade Solicitada',
          value: quantidadeAdesivo,
          variant: 'accent',
        });
      }
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
      const areaLabel = area ? ` = ${area} m²` : '';
      const larguraSuffix = largura ? ' m' : '';
      const alturaSuffix = altura ? ' m' : '';
      dimensoesLine = `${larguraLabel}${larguraSuffix} x ${alturaLabel}${alturaSuffix}${areaLabel}`;
    }

    const materialLabel = tipo === 'totem' ? 'Material' : tipo === 'adesivo' ? 'Tipo de Adesivo' : 'Tecido';
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
      const medidasSuffix = ' (m)';
      highlightCards.push({
        label: 'Dimensões',
        value: `${dimensoesLine}${medidasSuffix}`,
        className: 'bg-sky-600 text-white',
      });
    }

    if (tecido) {
      highlightCards.push({
        label: materialLabel,
        value: tecido,
        className: 'bg-emerald-600 text-white',
      });
    }
    if (painelQuantidade) {
      const unitLabel = tipo === 'totem' ? 'totem' : tipo === 'adesivo' ? 'adesivo' : 'painel';
      const unitPlural = tipo === 'totem' ? 'totens' : tipo === 'adesivo' ? 'adesivos' : 'painéis';
      const painelLabel =
        parseNumberValue(painelQuantidade) === 1
          ? `Quantidade: 1 ${unitLabel}`
          : `Quantidade: ${painelQuantidade} ${unitPlural}`;

      highlightCards.push({
        label: tipo === 'totem' ? 'Totens' : tipo === 'adesivo' ? 'Adesivos' : 'Painéis',
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
              <div className="text-right space-y-1">
                <div>
                  <span className="font-semibold">Itens:</span>
                  <span className="ml-2 text-base font-medium text-slate-700">
                    {formatCurrency(orderTotalFromItems)}
                  </span>
                </div>
                {showFreight && (
                  <div>
                    <span className="font-semibold">Frete:</span>
                    <span className="ml-2 text-base font-medium text-slate-700">
                      {formatCurrency(freightValue)}
                    </span>
                  </div>
                )}
                <div className="pt-1">
                  <span className="font-semibold">Valor Total:</span><br />
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(orderTotalValue)}
                  </span>
                </div>
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
