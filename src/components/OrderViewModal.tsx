import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Printer, X, ChevronDown } from 'lucide-react';
import { OrderItem, OrderWithItems } from '../types';
import { api } from '../services/api';
import { printOrder } from '../utils/printOrder';
import { printOrderServiceForm } from '../utils/printOrderServiceForm';
import { printTemplateResumo } from '../utils/printTemplate';
import { getItemDisplayEntries } from '@/utils/order-item-display';
import { normalizeImagePath, isValidImagePath } from '@/utils/path';
import FichaDeServicoButton from './FichaDeServicoButton';
import { useAuthStore } from '../store/authStore';

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
  const sessionToken = useAuthStore((state) => state.sessionToken) || '';
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageCaption, setSelectedImageCaption] = useState<string>('');
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [itemImageErrors, setItemImageErrors] = useState<Record<string, boolean>>({});

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

  if (!order) return null;

  // Função para obter o nome da forma de pagamento
  const getFormaPagamentoNome = (id?: number) => {
    if (!id) return 'Não informado';
    const forma = formasPagamento.find(fp => fp.id === id);
    return forma ? forma.nome : 'Não encontrado';
  };

  // Função para lidar com clique na imagem
  const handleImageClick = (imageUrl: string, caption?: string) => {
    if (!imageUrl || !isValidImagePath(imageUrl)) {
      return;
    }
    const normalizedPath = normalizeImagePath(imageUrl);
    setSelectedImage(normalizedPath);
    setSelectedImageCaption(caption?.trim() ?? '');
    setImageError(false);
  };

  // Função para fechar o modal de imagem
  const closeImageModal = (open?: boolean) => {
    // Só fecha se explicitamente solicitado (open === false)
    // Isso previne fechamento automático indesejado
    if (open === false) {
      setSelectedImage(null);
      setSelectedImageCaption('');
      setImageError(false);
    }
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

  const handlePrintServiceForm = () => {
    const formaPagamentoNome = getFormaPagamentoNome(order.forma_pagamento_id);
    const enrichedOrder = {
      ...order,
      forma_pagamento_nome:
        formaPagamentoNome && formaPagamentoNome !== 'Não informado'
          ? formaPagamentoNome
          : undefined,
    };
    printOrderServiceForm(enrichedOrder);
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
      case 'Concluido': return 'bg-green-100 text-green-800';
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

  interface DetailSectionsResult {
    entries: DetailEntry[];
    omitKeys: Set<string>;
  }

  const buildDetailSections = (item: OrderItem): DetailSectionsResult => {
    const sections: DetailEntry[] = [];
    const omitKeys = new Set<string>();
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

    const addBooleanFlag = (flag: keyof OrderItem | string, label: string) => {
      if ((item as any)[flag]) {
        sections.push({
          label,
          value: 'Sim',
          variant: 'accent',
        });
        omitKeys.add(String(flag));
      }
    };

    if (hasPositiveNumber(item.valor_unitario)) {
      omitKeys.add('valor_unitario');
    }

    addBooleanFlag('overloque', 'Overloque');
    addBooleanFlag('elastico', 'Elástico');

    if (hasTextValue(item.tipo_acabamento, { disallow: ['nenhum'] })) {
      sections.push({
        label: 'Tipo de Acabamento',
        value: item.tipo_acabamento,
        variant: 'accent',
      });
      omitKeys.add('tipo_acabamento');
    }

    const ilhosParts: string[] = [];
    if (hasQuantityValue(item.quantidade_ilhos)) {
      ilhosParts.push(`Qtd: ${normalizeText(item.quantidade_ilhos)}`);
      omitKeys.add('quantidade_ilhos');
    }
    const ilhosSpacing = formatSpacing(item.espaco_ilhos);
    if (ilhosSpacing) {
      ilhosParts.push(`Espaçamento: ${ilhosSpacing}`);
      omitKeys.add('espaco_ilhos');
    }
    if (hasPositiveNumber(item.valor_ilhos)) {
      omitKeys.add('valor_ilhos');
    }
    if (ilhosParts.length > 0) {
      sections.push({
        label: 'Ilhós',
        value: ilhosParts.join(' • '),
        variant: 'warning',
      });
    }

    const cordinhaParts: string[] = [];
    if (hasQuantityValue(item.quantidade_cordinha)) {
      cordinhaParts.push(`Qtd: ${normalizeText(item.quantidade_cordinha)}`);
      omitKeys.add('quantidade_cordinha');
    }
    const cordinhaSpacing = formatSpacing(item.espaco_cordinha);
    if (cordinhaSpacing) {
      cordinhaParts.push(`Espaçamento: ${cordinhaSpacing}`);
      omitKeys.add('espaco_cordinha');
    }
    if (hasPositiveNumber(item.valor_cordinha)) {
      omitKeys.add('valor_cordinha');
    }
    if (cordinhaParts.length > 0) {
      sections.push({
        label: 'Cordinha',
        value: cordinhaParts.join(' • '),
        variant: 'warning',
      });
    }

    if (isLona) {
      const terceirizado = (item as any).terceirizado;
      if (typeof terceirizado === 'boolean') {
        omitKeys.add('terceirizado');
      }

      const acabamentoLonaRaw = normalizeText((item as any).acabamento_lona);
      if (acabamentoLonaRaw) {
        omitKeys.add('acabamento_lona');
      }

      const valorBaseLona = (item as any).valor_lona;
      if (hasPositiveNumber(valorBaseLona)) {
        omitKeys.add('valor_lona');
      }

      const outrosValoresLona = (item as any).outros_valores_lona;
      if (hasPositiveNumber(outrosValoresLona)) {
        omitKeys.add('outros_valores_lona');
      }

      const quantidadeLona = normalizeText((item as any).quantidade_lona);
      if (quantidadeLona) {
        sections.push({
          label: 'Quantidade de Lonas',
          value: quantidadeLona,
          variant: 'accent',
        });
        omitKeys.add('quantidade_lona');
      }
    }

    if (isTotem) {
      const acabamentoTotem = normalizeText((item as any).acabamento_totem);
      if (acabamentoTotem) {
        const label = acabamentoTotem
          .split(/[_-]/)
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(' ');
        sections.push({
          label: 'Acabamento do Totem',
          value: label,
          variant: 'accent',
        });
        omitKeys.add('acabamento_totem');
      }

      const acabamentoTotemOutro = normalizeText((item as any).acabamento_totem_outro);
      if (acabamentoTotemOutro) {
        sections.push({
          label: 'Acabamento Extra',
          value: acabamentoTotemOutro,
          variant: 'accent',
        });
        omitKeys.add('acabamento_totem_outro');
      }

      const quantidadeTotem = normalizeText((item as any).quantidade_totem);
      if (quantidadeTotem) {
        sections.push({
          label: 'Quantidade de Totens',
          value: quantidadeTotem,
          variant: 'accent',
        });
        omitKeys.add('quantidade_totem');
      }

      const valorTotem = (item as any).valor_totem;
      if (hasPositiveNumber(valorTotem)) {
        omitKeys.add('valor_totem');
      }

      const outrosValoresTotem = (item as any).outros_valores_totem;
      if (hasPositiveNumber(outrosValoresTotem)) {
        omitKeys.add('outros_valores_totem');
      }
    }

    if (isAdesivo) {
      const tipoAdesivo = normalizeText((item as any).tipo_adesivo);
      if (tipoAdesivo) {
        omitKeys.add('tipo_adesivo');
      }

      const valorAdesivo = (item as any).valor_adesivo;
      if (hasPositiveNumber(valorAdesivo)) {
        omitKeys.add('valor_adesivo');
      }

      const outrosValoresAdesivo = (item as any).outros_valores_adesivo;
      if (hasPositiveNumber(outrosValoresAdesivo)) {
        omitKeys.add('outros_valores_adesivo');
      }

      const quantidadeAdesivo = normalizeText((item as any).quantidade_adesivo);
      if (quantidadeAdesivo) {
        omitKeys.add('quantidade_adesivo');
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
      const emendaQuantidade = normalizeText((item as any).emenda_qtd ?? (item as any).emendaQtd);
      let emendaValue: React.ReactNode = emendaTipo;
      if (emendaQuantidade) {
        const emendaQtdNumber = parseNumberValue(emendaQuantidade);
        const emendaQtdLabel = Number.isNaN(emendaQtdNumber)
          ? emendaQuantidade
          : emendaQtdNumber === 1
            ? `${emendaQuantidade} emenda`
            : `${emendaQuantidade} emendas`;
        emendaValue = (
          <span>
            {emendaTipo}{' '}
            <span className="text-sm text-amber-700">({emendaQtdLabel})</span>
          </span>
        );
        omitKeys.add('emenda_qtd');
      }

      sections.push({
        label: 'Emenda',
        value: emendaValue,
        variant: 'accent',
      });
      omitKeys.add('emenda');
    }

    const extraFlags: Array<[keyof OrderItem | string, string]> = [
      ['ziper', 'Zíper'],
      ['cordinha_extra', 'Cordinha Extra'],
      ['alcinha', 'Alcinha'],
      ['toalha_pronta', 'Toalha Pronta'],
    ];

    extraFlags.forEach(([key, label]) => {
      if ((item as any)[key]) {
        sections.push({
          label,
          value: 'Sim',
          variant: 'accent',
        });
        omitKeys.add(String(key));
      }
    });

    return { entries: sections, omitKeys };
  };

  const hasDetailedData = (item: OrderItem) => {
    const { entries, omitKeys } = buildDetailSections(item);
    const fallbackOmitKeys = new Set(omitKeys);
    [
      'tipo_producao',
      'descricao',
      'vendedor',
      'designer',
      'largura',
      'altura',
      'metro_quadrado',
      'tecido',
      'tipo_adesivo',
      'quantidade_paineis',
      'quantidade_totem',
      'quantidade_adesivo',
      'quantidade_lona',
      'valor_unitario',
      'subtotal',
      'legenda_imagem',
    ].forEach((key) => fallbackOmitKeys.add(key));
    const fallback = getItemDisplayEntries(item as any, {
      omitKeys: Array.from(fallbackOmitKeys),
    });
    const hasObservation = hasTextValue(item.observacao);
    const hasImage = hasTextValue(item.imagem);
    const hasBasicInfo = [
      normalizeText(item.tipo_producao),
      normalizeText(item.descricao),
      normalizeText(item.vendedor),
      normalizeText(item.designer),
      normalizeText(item.largura),
      normalizeText(item.altura),
      normalizeText(item.metro_quadrado),
      normalizeText(item.tecido),
      normalizeText((item as any).legenda_imagem),
    ].some(Boolean);
    return entries.length > 0 || fallback.length > 0 || hasObservation || hasImage || hasBasicInfo;
  };

  const getVariantClasses = (variant: DetailVariant) => {
    switch (variant) {
      case 'accent':
        return 'text-indigo-600';
      case 'warning':
        return 'text-amber-600';
      default:
        return 'text-slate-600';
    }
  };

  const renderDetailLines = (entries: DetailEntry[]) => {
    if (entries.length === 0) {
      return null;
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3">
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div
              key={`${entry.label}-${index}`}
              className="flex flex-wrap items-baseline gap-2 text-xs sm:text-sm"
            >
              <span className={`font-semibold ${getVariantClasses(entry.variant)}`}>
                {entry.label}:
              </span>
              <span className="text-slate-800">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderItemDetailsContent = (item: OrderItem) => {
    const { entries: detailEntries, omitKeys } = buildDetailSections(item);
    const fallbackOmitKeys = new Set(omitKeys);
    [
      'tipo_producao',
      'descricao',
      'vendedor',
      'designer',
      'largura',
      'altura',
      'metro_quadrado',
      'tecido',
      'tipo_adesivo',
      'quantidade_paineis',
      'quantidade_totem',
      'quantidade_adesivo',
      'quantidade_lona',
      'valor_unitario',
      'subtotal',
      'legenda_imagem',
    ].forEach((key) => fallbackOmitKeys.add(key));

    const fallbackEntries = getItemDisplayEntries(item as any, {
      omitKeys: Array.from(fallbackOmitKeys),
    });
    const primaryLabels = new Set(detailEntries.map((entry) => entry.label.toLowerCase()));
    const filteredFallback = fallbackEntries.filter((entry) => {
      const lower = entry.label.toLowerCase();
      if (lower === 'observação do item') {
        return false;
      }
      return !primaryLabels.has(lower);
    });

    const hasObservation = hasTextValue(item.observacao);
    const hasImage = hasTextValue(item.imagem);
    const tipo = normalizeText(item.tipo_producao);
    const tipoLower = tipo.toLowerCase();
    const isLonaType = tipoLower === 'lona';
    const descricao = normalizeText(item.descricao);
    const painelQuantidade = hasQuantityValue(item.quantidade_paineis)
      ? normalizeText(item.quantidade_paineis)
      : '';
    const quantidadeTotem = normalizeText((item as any).quantidade_totem);
    const quantidadeAdesivo = normalizeText((item as any).quantidade_adesivo);
    const quantidadeLona = normalizeText((item as any).quantidade_lona);
    const itemQuantidade = item.quantity && item.quantity > 0 ? String(item.quantity) : '';
    const quantidadeDisplay =
      painelQuantidade || quantidadeTotem || quantidadeAdesivo || quantidadeLona || itemQuantidade;

    const vendedor = normalizeText(item.vendedor);
    const designer = normalizeText(item.designer);
    const largura = normalizeText(item.largura);
    const altura = normalizeText(item.altura);
    const area = normalizeText(item.metro_quadrado);
    const material =
      normalizeText(item.tecido) || normalizeText((item as any).tipo_adesivo);
    const legendaImagem = normalizeText((item as any).legenda_imagem);

    const formatMeasure = (value: string) => {
      if (!value) return '-';
      if (/[a-zA-Z]/.test(value)) {
        return value;
      }
      return `${value} m`;
    };

    const formatAreaValue = (value: string) => {
      if (!value) return '';
      if (/m²|m2|metro/i.test(value)) {
        return value;
      }
      return `${value} m²`;
    };

    const dimensionBase = `${formatMeasure(largura)} x ${formatMeasure(altura)}`;
    const dimensionLine = area ? `${dimensionBase} = ${formatAreaValue(area)}` : dimensionBase;

    const infoRows: React.ReactNode[] = [];
    const summaryParts: string[] = [];
    if (tipo) summaryParts.push(tipo.toUpperCase());
    if (descricao) summaryParts.push(descricao);
    if (quantidadeDisplay) summaryParts.push(`Qtd: ${quantidadeDisplay}`);
    if (summaryParts.length > 0) {
      infoRows.push(
        <div key="summary" className="text-sm font-semibold text-slate-900">
          {summaryParts.join(' • ')}
        </div>
      );
    }

    const teamSegments: React.ReactNode[] = [
      <span key="vendor">
        Vendedor: <strong>{vendedor || '-'}</strong>
      </span>,
      <span key="designer">
        Designer: <strong>{designer || '-'}</strong>
      </span>,
      <span key="dimensions">
        Largura x Altura = <strong>{dimensionLine}</strong>
      </span>,
    ];

    infoRows.push(
      <div
        key="team"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700"
      >
        {teamSegments.map((segment, index) => (
          <React.Fragment key={index}>
            {segment}
            {index < teamSegments.length - 1 && (
              <span className="text-slate-300">|</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );

    if (material) {
      infoRows.push(
        <div key="material" className="text-sm text-slate-700">
          <span className="font-semibold">Material:</span>{' '}
          <span>{material}</span>
        </div>
      );
    }

    if (isLonaType) {
      const acabamentoLona = normalizeText((item as any).acabamento_lona);
      if (acabamentoLona) {
        const normalized = acabamentoLona.toLowerCase();
        const refilarDisplay =
          normalized === 'refilar'
            ? 'Sim'
            : normalized === 'nao_refilar' || normalized === 'não_refilar'
              ? 'Não'
              : acabamentoLona
                  .split(/[_-]/)
                  .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
                  .join(' ');

        infoRows.push(
          <div key="refilar" className="text-sm text-slate-700">
            <span className="font-semibold">Refilar:</span>{' '}
            <span>{refilarDisplay}</span>
          </div>
        );
      }

      const terceirizado = (item as any).terceirizado;
      if (typeof terceirizado === 'boolean') {
        infoRows.push(
          <div key="terceirizado" className="text-sm text-slate-700">
            <span className="font-semibold">Vai ser terceirizado:</span>{' '}
            <span>{terceirizado ? 'Sim' : 'Não'}</span>
          </div>
        );
      }
    }

    if (
      infoRows.length === 0 &&
      detailEntries.length === 0 &&
      filteredFallback.length === 0 &&
      !hasObservation &&
      !hasImage
    ) {
      return (
        <div className="text-sm text-slate-500">
          Nenhum detalhe adicional informado.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row">
        <div className={`space-y-3 sm:space-y-4 ${hasImage ? 'lg:w-2/3' : 'w-full'}`}>
          {infoRows.length > 0 && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3">
              {infoRows.map((row, index) => (
                <div key={index}>{row}</div>
              ))}
            </div>
          )}

          {renderDetailLines(detailEntries)}

          {filteredFallback.length > 0 && (
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
              {filteredFallback.map((entry) => (
                <div
                  key={entry.key}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 sm:px-3 py-1.5 sm:py-2"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {entry.label}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-900">{entry.value}</div>
                </div>
              ))}
            </div>
          )}

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
                {(() => {
                  const imagePath = item.imagem;
                  const isValid = isValidImagePath(imagePath || '');
                  const normalizedPath = imagePath ? normalizeImagePath(imagePath) : '';
                  const itemKey = String(item.id ?? item.item_name);
                  const hasError = itemImageErrors[itemKey] || false;
                  
                  // Debug log
                  if (imagePath) {
                    console.log('[OrderViewModal] Processando imagem:', {
                      original: imagePath,
                      isValid,
                      normalized: normalizedPath,
                      hasError,
                      itemKey
                    });
                  }
                  
                  // Se não for válido, mostrar placeholder
                  if (!isValid || !normalizedPath) {
                    return (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
                        <span className="text-sm">Imagem não disponível</span>
                      </div>
                    );
                  }
                  
                  // Se houver erro, mostrar placeholder
                  if (hasError) {
                    return (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
                        <span className="text-sm">Erro ao carregar imagem</span>
                      </div>
                    );
                  }
                  
                  // Renderizar imagem
                  return (
                    <img
                      key={`img-${itemKey}-${normalizedPath}`}
                      src={normalizedPath}
                      alt={`Imagem do item ${item.item_name}`}
                      className="h-full w-full object-contain"
                      style={{ display: 'block' }}
                      onLoad={() => {
                        console.log('[OrderViewModal] ✅ Imagem carregada com sucesso:', {
                          normalizedPath,
                          itemKey
                        });
                        // Garantir que o erro seja removido se a imagem carregar
                        setItemImageErrors(prev => {
                          const updated = { ...prev };
                          delete updated[itemKey];
                          return updated;
                        });
                      }}
                      onError={(event) => {
                        const target = event.currentTarget as HTMLImageElement;
                        const imageSrc = target.src;
                        console.error('[OrderViewModal] ❌ Erro ao carregar imagem:', {
                          originalPath: imagePath,
                          normalizedPath,
                          finalSrc: imageSrc,
                          itemKey,
                          status: target.complete ? 'complete' : 'incomplete',
                          naturalWidth: target.naturalWidth,
                          naturalHeight: target.naturalHeight
                        });
                        // Marcar erro no estado
                        setItemImageErrors(prev => ({
                          ...prev,
                          [itemKey]: true
                        }));
                      }}
                    />
                  );
                })()}
              </div>
              {isValidImagePath(item.imagem!) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageClick(item.imagem!, legendaImagem)}
                  className="w-full"
                >
                  Abrir imagem em destaque
                </Button>
              )}
              {legendaImagem && (
                <p className="w-full rounded-md bg-white px-3 py-2 text-center text-xs text-slate-600 shadow-sm">
                  {legendaImagem}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none overflow-hidden flex flex-col" size="full">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-base sm:text-lg">Pedido #{order.numero || order.id}</span>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm" className="text-xs sm:text-sm">
                <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Imprimir</span>
                <span className="sm:hidden">Impr.</span>
              </Button>
              {sessionToken && (
                <FichaDeServicoButton 
                  order={order} 
                  sessionToken={sessionToken} 
                />
              )}
              {!sessionToken && (
                <>
                  <Button onClick={handlePrintServiceForm} variant="outline" size="sm" className="text-xs sm:text-sm">
                    <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Ficha Geral</span>
                    <span className="sm:hidden">Geral</span>
                  </Button>
                  <Button 
                    onClick={() => printTemplateResumo(order)} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs sm:text-sm"
                    title="Imprimir ficha resumo (1/3 A4) para produção"
                  >
                    <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Ficha Resumo</span>
                    <span className="sm:hidden">Resumo</span>
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Cabeçalho do Pedido */}
          <div className="text-center border-b pb-3">
            <h2 className="text-xl sm:text-2xl font-bold">Pedido #{order.numero || order.id}</h2>
          </div>

          {/* Informações Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
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
            <h3 className="text-base sm:text-lg font-semibold mb-3">Itens do Pedido</h3>

            {order.items && order.items.length > 0 ? (
              <div className="space-y-3">
                {order.items.map((item, index) => {
                  const key = String(item.id ?? `order-${index}`);
                  const isOpen = openItemKey === key;
                  const toggleOpen = () => {
                    const willOpen = openItemKey !== key;
                    setOpenItemKey((current) => (current === key ? null : key));
                    // Resetar erro de imagem quando o item é expandido para tentar carregar novamente
                    if (willOpen && item.imagem) {
                      const itemKey = String(item.id ?? item.item_name);
                      setItemImageErrors(prev => {
                        const updated = { ...prev };
                        delete updated[itemKey];
                        return updated;
                      });
                    }
                  };

                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={toggleOpen}
                        className="w-full bg-slate-50/60 px-3 sm:px-4 py-2 sm:py-3 text-left transition hover:bg-slate-100/80"
                      >
                        <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <span className="text-xs sm:text-sm font-semibold text-slate-500">#{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm sm:text-base text-slate-900 truncate">{item.item_name}</div>
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

                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
                            <div className="font-medium">Qtd: {item.quantity}</div>
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="space-y-3 sm:space-y-4 border-t border-slate-200 bg-white px-3 sm:px-4 py-3 sm:py-4">
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
            <h3 className="text-base sm:text-lg font-semibold mb-3">Forma de Pagamento - Valores</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Forma de Pagamento:</span><br />
                {getFormaPagamentoNome(order.forma_pagamento_id)}
              </div>
              <div className="text-left sm:text-right space-y-1">
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
        <Dialog open={!!selectedImage} onOpenChange={(open) => closeImageModal(open)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0" size="lg" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="p-6 pb-0 flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <span>Visualização da Imagem</span>
                <Button onClick={() => closeImageModal(false)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-4 overflow-y-auto">
              <div className="flex flex-col items-center gap-4">
                {!imageError ? (
                  <img
                    src={selectedImage}
                    alt="Imagem do item"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                    onError={() => {
                      setImageError(true);
                    }}
                  />
                ) : (
                  <div className="flex h-[70vh] w-full items-center justify-center rounded-lg bg-slate-100">
                    <div className="text-center">
                      <p className="text-slate-500 mb-2">Imagem não encontrada</p>
                      <p className="text-sm text-slate-400">O arquivo pode ter sido movido ou excluído</p>
                    </div>
                  </div>
                )}
                {selectedImageCaption && !imageError && (
                  <p className="max-w-3xl text-center text-sm text-slate-600">
                    {selectedImageCaption}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
