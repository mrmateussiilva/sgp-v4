import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ChevronDown, Printer, Loader2, Save, Monitor, Edit2, X } from 'lucide-react';
import { OrderItem, OrderWithItems } from '../types';
import { api } from '../services/api';
import { getItemDisplayEntries, FIELD_ALLOWED_TYPES } from '@/utils/order-item-display';
import { logger } from '@/utils/logger';
import { isValidImagePath } from '@/utils/path';
import { loadAuthenticatedImage } from '@/utils/imageLoader';
import { OrderPrintManager } from './OrderPrintManager';
import { FormProducaoFields } from './FormProducaoFields';
import { useToast } from '@/hooks/use-toast';

interface OrderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithItems | null;
  onOrderUpdate?: (updatedOrder: OrderWithItems) => void;
}

export const OrderViewModal: React.FC<OrderViewModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderUpdate,
}) => {
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageCaption, setSelectedImageCaption] = useState<string>('');

  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});
  const [editingItems, setEditingItems] = useState<Record<string, boolean>>({});
  const [localProductionData, setLocalProductionData] = useState<Record<string, any>>({});
  const [isPrintManagerOpen, setIsPrintManagerOpen] = useState(false);
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [itemImageErrors, setItemImageErrors] = useState<Record<string, boolean>>({});
  const [itemImageUrls, setItemImageUrls] = useState<Map<string, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Buscar formas de pagamento
  useEffect(() => {
    const fetchFormasPagamento = async () => {
      try {
        const formas = await api.getFormasPagamentoAtivas();
        setFormasPagamento(formas);
      } catch (error) {
        logger.error("Erro ao carregar formas de pagamento:", error);
      }
    };
    fetchFormasPagamento();
  }, []);

  // Carregar imagens apenas dos itens expandidos (lazy loading otimizado)
  useEffect(() => {
    if (!isOpen || !order?.items || !openItemKey) return;

    const loadItemImage = async () => {
      // Encontrar o item expandido
      const expandedItem = order.items.find(
        (item) => String(item.id ?? item.item_name) === openItemKey
      );

      if (!expandedItem?.imagem || !isValidImagePath(expandedItem.imagem)) {
        return;
      }

      const itemKey = String(expandedItem.id ?? expandedItem.item_name);
      const imagePath = expandedItem.imagem;

      // Se já está carregada, não fazer nada
      if (itemImageUrls.has(itemKey)) {
        return;
      }

      // Se já está carregando, não fazer nada
      if (loadingImages.has(imagePath)) {
        return;
      }

      // Marcar como carregando
      setLoadingImages(prev => new Set(prev).add(imagePath));

      try {
        logger.debug(`[OrderViewModal] 🔄 Carregando imagem do item ${itemKey}:`, imagePath);
        const blobUrl = await loadAuthenticatedImage(imagePath);

        // Atualizar estado com a URL da imagem
        setItemImageUrls(prev => {
          const updated = new Map(prev);
          updated.set(itemKey, blobUrl);
          return updated;
        });

        logger.debug(`[OrderViewModal] ✅ Imagem do item ${itemKey} carregada com sucesso`);
      } catch (err) {
        logger.error(`[OrderViewModal] ❌ Erro ao carregar imagem do item ${itemKey}:`, {
          imagem: imagePath,
          error: err
        });
        // Marcar erro no estado
        setItemImageErrors(prev => ({
          ...prev,
          [itemKey]: true
        }));
      } finally {
        // Remover do set de carregamento
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(imagePath);
          return newSet;
        });
      }
    };

    loadItemImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, openItemKey]);

  // REMOVIDO: Cleanup que revogava blob URLs quando o modal fechava
  // O cache global do imageLoader já gerencia as blob URLs e não precisa ser limpo manualmente
  // Isso permite que as imagens sejam reutilizadas quando o modal reabrir

  // Inicializar localProductionData com os dados atuais dos itens quando o modal abre
  useEffect(() => {
    if (!isOpen || !order?.items) {
      // Limpar dados quando o modal fecha
      setLocalProductionData({});
      setEditingItems({});
      return;
    }

    // Inicializar localProductionData com os dados atuais de cada item
    const initialData: Record<string, any> = {};
    order.items.forEach((item) => {
      const itemKey = String(item.id);
      initialData[itemKey] = {
        data_impressao: item.data_impressao,
        rip_maquina: item.rip_maquina,
        machine_id: item.machine_id,
        perfil_cor: item.perfil_cor,
        tecido_fornecedor: item.tecido_fornecedor,
      };
    });
    setLocalProductionData(initialData);
  }, [isOpen, order?.id]); // Reinicializar quando o modal abre ou quando o pedido muda

  if (!order) return null;

  // Função para obter o nome da forma de pagamento
  const getFormaPagamentoNome = (id?: number) => {
    if (!id) return 'Não informado';
    const forma = formasPagamento.find(fp => fp.id === id);
    return forma ? forma.nome : 'Não encontrado';
  };

  // Função para lidar com clique na imagem
  const handleImageClick = async (imageUrl: string, caption?: string, itemId?: string | number) => {
    if (!imageUrl) {
      return;
    }

    // Se for base64, usar diretamente
    if (imageUrl.startsWith('data:image/')) {
      setImageError(false);
      setSelectedImage(imageUrl);
      setSelectedImageCaption(caption?.trim() ?? '');
      return;
    }

    if (!isValidImagePath(imageUrl)) {
      return;
    }

    try {
      // Resetar erro antes de tentar carregar
      setImageError(false);
      setSelectedImage(null);

      // Tentar encontrar a blob URL nos itens já carregados
      let blobUrl: string | undefined;

      // Se temos o itemId, tentar buscar diretamente pelo itemKey
      if (itemId !== undefined) {
        const itemKey = String(itemId);
        blobUrl = itemImageUrls.get(itemKey);
        if (blobUrl) {
          logger.debug('[OrderViewModal] ✅ Usando blob URL do cache para modal (por itemId):', { itemKey, imageUrl });
        }
      }

      // Se não encontrou pelo itemId, procurar pelo caminho da imagem
      if (!blobUrl) {
        for (const [itemKey, url] of itemImageUrls.entries()) {
          const item = order?.items?.find(i => String(i.id ?? i.item_name) === itemKey);
          if (item?.imagem === imageUrl) {
            blobUrl = url;
            logger.debug('[OrderViewModal] ✅ Usando blob URL do cache para modal (por caminho):', { itemKey, imageUrl });
            break;
          }
        }
      }

      // Se não encontrou, carregar a imagem
      if (!blobUrl) {
        logger.debug('[OrderViewModal] 🔄 Carregando imagem para modal:', imageUrl);
        blobUrl = await loadAuthenticatedImage(imageUrl);
        logger.debug('[OrderViewModal] ✅ Imagem carregada para modal:', blobUrl);
      }

      // Verificar se a blob URL é válida
      if (!blobUrl) {
        throw new Error('Blob URL não foi criada');
      }

      setSelectedImage(blobUrl);
      setSelectedImageCaption(caption?.trim() ?? '');
      setImageError(false);
    } catch (error) {
      logger.error('[OrderViewModal] ❌ Erro ao carregar imagem para modal:', error);
      setImageError(true);
      setSelectedImage(null);
    }
  };

  // Função para fechar o modal de imagem
  const closeImageModal = (open?: boolean) => {
    if (!open) {
      setSelectedImage(null);
      setSelectedImageCaption('');
      setImageError(false);
    }
  };

  const handleSaveProductionData = async (itemId: number | string) => {
    const itemKey = String(itemId);
    const data = localProductionData[itemKey];

    if (!data) return;

    setIsSaving(prev => ({ ...prev, [itemKey]: true }));
    try {
      const originalItem = order.items.find(i => String(i.id) === itemKey);
      await api.updateOrderItem(Number(itemId), { ...originalItem, ...data, pedido_id: order.id });

      toast({
        title: "Dados de produção salvos",
        description: "Os dados foram atualizados com sucesso.",
      });

      // Atualizar o item na lista do pedido localmente para refletir a mudança imediatamente
      const updatedOrder = { ...order };
      const itemIndex = updatedOrder.items.findIndex(i => String(i.id) === itemKey);

      if (itemIndex >= 0) {
        updatedOrder.items[itemIndex] = {
          ...updatedOrder.items[itemIndex],
          ...data
        };

        // Notificar o componente pai sobre a atualização
        if (onOrderUpdate) {
          onOrderUpdate(updatedOrder);
        }
      }

      // Desativar modo de edição
      setEditingItems(prev => ({ ...prev, [itemKey]: false }));

      // Registrar sucesso
      setSaveSuccess(prev => ({ ...prev, [itemKey]: true }));

      // Limpar mensagem de sucesso após alguns segundos
      setTimeout(() => {
        setSaveSuccess(prev => ({ ...prev, [itemKey]: false }));
      }, 5000);

    } catch (error) {
      logger.error("Erro ao salvar dados de produção:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar os dados de produção.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleProductionDataChange = (itemId: number | string, field: string, value: any) => {
    const itemKey = String(itemId);
    setLocalProductionData(prev => ({
      ...prev,
      [itemKey]: {
        ...(prev[itemKey] || {}),
        [field]: value
      }
    }));
  };

  const handleEditProductionData = (itemId: number | string) => {
    const itemKey = String(itemId);
    setEditingItems(prev => ({ ...prev, [itemKey]: true }));
  };

  const handleCancelEdit = (itemId: number | string) => {
    const itemKey = String(itemId);
    setEditingItems(prev => ({ ...prev, [itemKey]: false }));
    // Reverter localProductionData removendo a entrada (ou resetando para original)
    // Vamos manter os dados no localProductionData caso o usuário queira editar de novo, 
    // mas a UI vai mostrar os dados do "item" original se localProductionData for removido.
    // Melhor: manter os dados lá, mas resetar para o original.

    const item = order.items.find(i => String(i.id) === itemKey);
    if (item) {
      setLocalProductionData(prev => ({
        ...prev,
        [itemKey]: {
          data_impressao: item.data_impressao,
          rip_maquina: item.rip_maquina,
          machine_id: item.machine_id,
          perfil_cor: item.perfil_cor,
          tecido_fornecedor: item.tecido_fornecedor,
        }
      }));
    }
  };


  const handlePrint = async () => {
    setIsPrintManagerOpen(true);
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

    // Se é formato YYYY-MM-DD, formatar diretamente sem Date (evita deslocamento de fuso)
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = dateString.split('-');
      return `${d}/${m}/${y}`;
    }

    // Se tem timestamp, extrair apenas a parte da data
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}T/)) {
      const dateOnly = dateString.split('T')[0];
      const [y, m, d] = dateOnly.split('-');
      return `${d}/${m}/${y}`;
    }

    // Tentar extrair data do início
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, y, m, d] = dateMatch;
      return `${d}/${m}/${y}`;
    }

    return 'Data inválida';
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

  const isMochilinhaType = (tipoProducao?: string): boolean => {
    if (!tipoProducao) return false;
    const normalized = tipoProducao.toLowerCase().trim();
    return normalized === 'mochilinha' ||
      normalized === 'bolsinha' ||
      normalized.includes('mochilinha') ||
      normalized.includes('bolsinha');
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
    const fieldAllowedForTipo = (fieldKey: string): boolean => {
      const allowed = FIELD_ALLOWED_TYPES[fieldKey];
      if (!allowed) return true;
      return allowed.some((t) => t.toLowerCase() === tipoProducao);
    };
    const isLona = tipoProducao === 'lona';
    const isTotem = tipoProducao === 'totem';
    const isAdesivo = tipoProducao === 'adesivo';
    const isPainel = tipoProducao === 'painel' || tipoProducao === 'generica';
    const isMochilinha = isMochilinhaType(tipoProducao);
    const isImpressao3D = tipoProducao === 'impressao_3d' ||
      tipoProducao === 'impressao 3d' ||
      tipoProducao === 'impressão 3d' ||
      tipoProducao === 'impressão_3d';

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
    addBooleanFlag('ziper', 'Zíper');
    addBooleanFlag('cordinha_extra', 'Cordinha extra');
    addBooleanFlag('alcinha', 'Alcinha');
    addBooleanFlag('toalha_pronta', 'Toalha pronta');
    addBooleanFlag('terceirizado', 'Terceirizado');
    addBooleanFlag('baininha', 'Baininha');

    // Acabamento genérico (se não for mochilinha/painel)
    if (!isMochilinha && !isPainel && !isLona && !isTotem) {
      const tipoAcabamento = (item as any).tipo_acabamento || (item as any).tipo_alcinha;
      if (hasTextValue(tipoAcabamento, { disallow: ['nenhum'] })) {
        sections.push({
          label: 'Tipo de Acabamento',
          value: tipoAcabamento,
          variant: 'accent',
        });
        omitKeys.add('tipo_acabamento');
        omitKeys.add('tipo_alcinha');
      }
    }
    // Ilhós - quantidade e espaçamento
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
    if (ilhosParts.length > 0) {
      sections.push({
        label: 'Ilhós',
        value: ilhosParts.join(' • '),
        variant: 'warning',
      });
    }

    // Valor dos Ilhós - campo separado para maior clareza
    if (hasPositiveNumber(item.valor_ilhos)) {
      sections.push({
        label: 'Valor dos Ilhós',
        value: formatCurrency(parseCurrencyValue(item.valor_ilhos)),
        variant: 'accent',
      });
      omitKeys.add('valor_ilhos');
    }

    // Cordinha - quantidade e espaçamento
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
    if (cordinhaParts.length > 0) {
      sections.push({
        label: 'Cordinha',
        value: cordinhaParts.join(' • '),
        variant: 'warning',
      });
    }

    // Valor da Cordinha - campo separado para maior clareza
    if (hasPositiveNumber(item.valor_cordinha)) {
      sections.push({
        label: 'Valor da Cordinha',
        value: formatCurrency(parseCurrencyValue(item.valor_cordinha)),
        variant: 'accent',
      });
      omitKeys.add('valor_cordinha');
    }

    // Campos específicos para PAINEL/GENERICA
    if (isPainel) {
      const quantidadePaineis = normalizeText(item.quantidade_paineis);
      if (quantidadePaineis) {
        sections.push({
          label: 'Quantidade de Painéis',
          value: quantidadePaineis,
          variant: 'accent',
        });
        omitKeys.add('quantidade_paineis');
      }

      const valorPainel = (item as any).valor_painel;
      if (hasPositiveNumber(valorPainel)) {
        sections.push({
          label: 'Valor do Painel',
          value: formatCurrency(parseCurrencyValue(valorPainel)),
          variant: 'accent',
        });
        omitKeys.add('valor_painel');
      }

      const valoresAdicionais = (item as any).valores_adicionais;
      if (hasPositiveNumber(valoresAdicionais)) {
        sections.push({
          label: 'Valores Adicionais',
          value: formatCurrency(parseCurrencyValue(valoresAdicionais)),
          variant: 'warning',
        });
        omitKeys.add('valores_adicionais');
      }
    }

    // Campos específicos para LONA
    if (isLona) {
      const terceirizado = (item as any).terceirizado;
      if (typeof terceirizado === 'boolean') {
        sections.push({
          label: 'Terceirizado',
          value: terceirizado ? 'Sim' : 'Não',
          variant: 'accent',
        });
        omitKeys.add('terceirizado');
      }

      const acabamentoLonaRaw = normalizeText((item as any).acabamento_lona);
      if (acabamentoLonaRaw) {
        const acabamentoDisplay = acabamentoLonaRaw.toLowerCase() === 'refilar'
          ? 'Refilar'
          : acabamentoLonaRaw.toLowerCase() === 'nao_refilar' || acabamentoLonaRaw.toLowerCase() === 'não_refilar'
            ? 'Não Refilar'
            : acabamentoLonaRaw
              .split(/[_-]/)
              .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
              .join(' ');
        sections.push({
          label: 'Acabamento da Lona',
          value: acabamentoDisplay,
          variant: 'accent',
        });
        omitKeys.add('acabamento_lona');
      }

      const valorBaseLona = (item as any).valor_lona;
      if (hasPositiveNumber(valorBaseLona)) {
        sections.push({
          label: 'Valor da Lona',
          value: formatCurrency(parseCurrencyValue(valorBaseLona)),
          variant: 'accent',
        });
        omitKeys.add('valor_lona');
      }

      const outrosValoresLona = (item as any).outros_valores_lona;
      if (hasPositiveNumber(outrosValoresLona)) {
        sections.push({
          label: 'Outros Valores (Lona)',
          value: formatCurrency(parseCurrencyValue(outrosValoresLona)),
          variant: 'warning',
        });
        omitKeys.add('outros_valores_lona');
      }

      const quantidadeLona = normalizeText((item as any).quantidade_lona);
      if (quantidadeLona && quantidadeLona !== '1') {
        sections.push({
          label: 'Quantidade de Lonas',
          value: quantidadeLona,
          variant: 'accent',
        });
        omitKeys.add('quantidade_lona');
      }
    }

    // Campos específicos para TOTEM
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
      if (quantidadeTotem && quantidadeTotem !== '1') {
        sections.push({
          label: 'Quantidade de Totens',
          value: quantidadeTotem,
          variant: 'accent',
        });
        omitKeys.add('quantidade_totem');
      }

      const valorTotem = (item as any).valor_totem;
      if (hasPositiveNumber(valorTotem)) {
        sections.push({
          label: 'Valor do Totem',
          value: formatCurrency(parseCurrencyValue(valorTotem)),
          variant: 'accent',
        });
        omitKeys.add('valor_totem');
      }

      const outrosValoresTotem = (item as any).outros_valores_totem;
      if (hasPositiveNumber(outrosValoresTotem)) {
        sections.push({
          label: 'Outros Valores (Totem)',
          value: formatCurrency(parseCurrencyValue(outrosValoresTotem)),
          variant: 'warning',
        });
        omitKeys.add('outros_valores_totem');
      }
    }

    // Campos específicos para ADESIVO
    if (isAdesivo) {
      const quantidadeAdesivo = normalizeText((item as any).quantidade_adesivo);
      if (quantidadeAdesivo && quantidadeAdesivo !== '1') {
        sections.push({
          label: 'Quantidade de Adesivos',
          value: quantidadeAdesivo,
          variant: 'accent',
        });
        omitKeys.add('quantidade_adesivo');
      }

      const valorAdesivo = (item as any).valor_adesivo;
      if (hasPositiveNumber(valorAdesivo)) {
        sections.push({
          label: 'Valor do Adesivo',
          value: formatCurrency(parseCurrencyValue(valorAdesivo)),
          variant: 'accent',
        });
        omitKeys.add('valor_adesivo');
      }

      const outrosValoresAdesivo = (item as any).outros_valores_adesivo;
      if (hasPositiveNumber(outrosValoresAdesivo)) {
        sections.push({
          label: 'Outros Valores (Adesivo)',
          value: formatCurrency(parseCurrencyValue(outrosValoresAdesivo)),
          variant: 'warning',
        });
        omitKeys.add('outros_valores_adesivo');
      }

      const tipoAdesivo = normalizeText((item as any).tipo_adesivo);
      if (tipoAdesivo) {
        // Já aparece como "Material" na seção principal, mas vamos adicionar aqui também se necessário
        omitKeys.add('tipo_adesivo');
      }
    }

    // Campos específicos para MOCHILINHA / BOLSINHA
    if (isMochilinha) {
      const tipoAcabamento = (item as any).tipo_acabamento || (item as any).tipo_alcinha;
      if (hasTextValue(tipoAcabamento, { disallow: ['nenhum'] })) {
        const ac = String(tipoAcabamento).toLowerCase().trim();
        const alcaDisplay = ac === 'alca' ? 'Alça' :
          ac === 'cordinha' ? 'Cordinha' :
            ac === 'alca_cordinha' ? 'Alça + Cordinha' : tipoAcabamento;
        sections.push({
          label: 'Acabamento (Alça/Cordinha)',
          value: alcaDisplay,
          variant: 'accent',
        });
        omitKeys.add('tipo_acabamento');
        omitKeys.add('tipo_alcinha');
      }

      const valorUnitarioMochilinha = (item as any).valor_unitario;
      if (hasPositiveNumber(valorUnitarioMochilinha)) {
        sections.push({
          label: 'Valor Unitário',
          value: formatCurrency(parseCurrencyValue(valorUnitarioMochilinha)),
          variant: 'accent',
        });
        omitKeys.add('valor_unitario');
      }

      const quantidadeProducao = (item as any).quantity || (item as any).quantidade_mochilinha;
      if (hasQuantityValue(quantidadeProducao)) {
        sections.push({
          label: 'Quantidade',
          value: quantidadeProducao,
          variant: 'accent',
        });
        omitKeys.add('quantidade_mochilinha');
        omitKeys.add('quantity');
      }

      const valAdicionais = (item as any).valores_adicionais;
      if (hasPositiveNumber(valAdicionais)) {
        sections.push({
          label: 'Valores Adicionais',
          value: formatCurrency(parseCurrencyValue(valAdicionais)),
          variant: 'warning',
        });
        omitKeys.add('valores_adicionais');
      }
    }

    // Campos específicos para IMPRESSÃO 3D
    if (isImpressao3D) {
      const materialGasto = (item as any).material_gasto;
      if (materialGasto) {
        sections.push({
          label: 'Peso (Gramas)',
          value: materialGasto.includes('g') ? materialGasto : `${materialGasto} g`,
          variant: 'accent',
        });
        omitKeys.add('material_gasto');
      }

      if (item.tecido) {
        sections.push({
          label: 'Material (Filamento)',
          value: item.tecido,
          variant: 'accent',
        });
        omitKeys.add('tecido');
      }

      const qtd3D = (item as any).quantidade_impressao_3d;
      if (qtd3D && qtd3D !== '1') {
        sections.push({
          label: 'Qtd Impressão 3D',
          value: qtd3D,
          variant: 'accent',
        });
        omitKeys.add('quantidade_impressao_3d');
      }

      const valor3D = (item as any).valor_impressao_3d;
      if (hasPositiveNumber(valor3D)) {
        sections.push({
          label: 'Valor Unitário (3D)',
          value: formatCurrency(parseCurrencyValue(valor3D)),
          variant: 'accent',
        });
        omitKeys.add('valor_impressao_3d');
      }

      const vAdicionais = (item as any).valores_adicionais;
      if (hasPositiveNumber(vAdicionais)) {
        sections.push({
          label: 'Outros Valores',
          value: formatCurrency(parseCurrencyValue(vAdicionais)),
          variant: 'warning',
        });
        omitKeys.add('valores_adicionais');
      }
    }

    const emendaTipoRaw = normalizeText((item as any).emenda);
    const emendaTipo = emendaTipoRaw
      ? emendaTipoRaw
        .split(/[-_]/)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ')
      : '';

    if (fieldAllowedForTipo('emenda') && emendaTipoRaw && emendaTipoRaw !== "sem-emenda") {
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
      if (fieldAllowedForTipo(key) && (item as any)[key]) {
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
    const hasImage = !!(item.imagem && (typeof item.imagem === 'string' && item.imagem.trim().length > 0));
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
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
        {entries.map((entry, index) => (
          <div
            key={`${entry.label}-${index}`}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 sm:px-3 py-1.5 sm:py-2"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {entry.label}
            </div>
            <div className={`text-xs sm:text-sm ${getVariantClasses(entry.variant)}`}>
              {entry.value}
            </div>
          </div>
        ))}
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
    const hasImage = !!(item.imagem && (typeof item.imagem === 'string' && item.imagem.trim().length > 0));
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
    const quantidadeImpressao3D = normalizeText((item as any).quantidade_impressao_3d);
    const itemQuantidade = item.quantity && item.quantity > 0 ? String(item.quantity) : '';

    // Para painel, priorizar quantidade_paineis mesmo se for 1
    const isPainelType = tipoLower === 'painel' || tipoLower === 'generica';
    const quantidadeDisplay = isPainelType && painelQuantidade
      ? painelQuantidade
      : painelQuantidade || quantidadeTotem || quantidadeAdesivo || quantidadeLona || quantidadeImpressao3D || itemQuantidade;

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
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* TOP SECTION: GRID ORIGINAL (INFO + IMAGEM) */}
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
                    const isBase64 = imagePath && imagePath.startsWith('data:image/');
                    const isValid = isBase64 || isValidImagePath(imagePath || '');
                    const itemKey = String(item.id ?? item.item_name);
                    const hasError = itemImageErrors[itemKey] || false;
                    const isLoading = !isBase64 && loadingImages.has(imagePath || '');
                    const blobUrl = itemImageUrls.get(itemKey);

                    if (!isValid || !imagePath) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
                          <span className="text-sm">Imagem não disponível</span>
                        </div>
                      );
                    }

                    if (hasError) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
                          <span className="text-sm">Erro ao carregar imagem</span>
                        </div>
                      );
                    }

                    if (isLoading && !blobUrl) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
                          <span className="text-sm">Carregando imagem...</span>
                        </div>
                      );
                    }

                    if (!blobUrl && !isBase64) return null;

                    return (
                      <img
                        src={isBase64 ? imagePath : blobUrl}
                        alt={`Imagem do item ${item.item_name}`}
                        className="h-full w-full object-contain"
                      />
                    );
                  })()}
                </div>
                {(isValidImagePath(item.imagem!) || (item.imagem && item.imagem.startsWith('data:image/'))) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImageClick(item.imagem!, legendaImagem, item.id ?? item.item_name)}
                    className="w-full"
                  >
                    Abrir imagem em destaque
                  </Button>
                )}
                {legendaImagem && (
                  <p
                    className="w-full rounded-md bg-white px-3 py-2 text-center text-slate-600 shadow-sm"
                    style={{ fontSize: '14pt', lineHeight: 1.2 }}
                  >
                    {legendaImagem}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: PRODUÇÃO (FULL WIDTH) */}
        <div className="mt-4 pt-4 border-t-2 border-slate-100">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden">
            <div className="bg-white px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Monitor className="w-3 h-3" />
                Dados de Produção
              </h4>

              <div className="flex items-center gap-2">
                {saveSuccess[String(item.id)] && (
                  <span className="text-[10px] font-bold text-emerald-600 animate-in fade-in slide-in-from-right-2 mr-2">
                    Cópia técnica salva ✅
                  </span>
                )}

                {!editingItems[String(item.id)] ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-3 text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-[10px] font-bold uppercase tracking-wide gap-1.5"
                    onClick={() => handleEditProductionData(item.id!)}
                  >
                    <Edit2 className="w-3 h-3" />
                    Editar
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => handleCancelEdit(item.id!)}
                      title="Cancelar edição"
                    >
                      <X className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      className="h-7 px-4 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wide"
                      disabled={isSaving[String(item.id)]}
                      onClick={() => handleSaveProductionData(item.id!)}
                    >
                      {isSaving[String(item.id)] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Save className="mr-1.5 h-3 w-3" />
                          Salvar
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-white/50">
              <FormProducaoFields
                data={{
                  data_impressao: localProductionData[String(item.id)]?.data_impressao ?? item.data_impressao,
                  rip_maquina: localProductionData[String(item.id)]?.rip_maquina ?? item.rip_maquina,
                  machine_id: localProductionData[String(item.id)]?.machine_id ?? item.machine_id,
                  perfil_cor: localProductionData[String(item.id)]?.perfil_cor ?? item.perfil_cor,
                  tecido_fornecedor: localProductionData[String(item.id)]?.tecido_fornecedor ?? item.tecido_fornecedor,
                }}
                onDataChange={(field, value) => handleProductionDataChange(item.id!, field, value)}
                disabled={!editingItems[String(item.id)]}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none overflow-hidden flex flex-col" size="full">
          <DialogHeader className="flex-shrink-0 border-b px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
            <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-base sm:text-lg">Pedido #{order.numero || order.id}</span>
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-end w-full sm:w-auto">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Ficha
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-6 pb-6">
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

            {/* Observações do Pedido */}
            {order.observacao && order.observacao.trim() && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3">
                <div className="text-sm">
                  <span className="font-semibold text-slate-700">Observações:</span>
                  <p className="mt-1 text-slate-600 whitespace-pre-wrap">{order.observacao}</p>
                </div>
              </div>
            )}

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
                                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''
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
                </DialogTitle>
              </DialogHeader>
              <div className="p-6 pt-4 overflow-y-auto">
                <div className="flex flex-col items-center gap-4">
                  {!imageError && selectedImage ? (
                    <img
                      src={selectedImage}
                      alt="Imagem do item"
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                      onLoad={() => {
                        logger.debug('[OrderViewModal] ✅ Imagem do modal carregada com sucesso:', selectedImage);
                        setImageError(false);
                      }}
                      onError={(e) => {
                        logger.error('[OrderViewModal] ❌ Erro ao carregar imagem no modal:', {
                          src: selectedImage,
                          error: e
                        });
                        setImageError(true);
                      }}
                    />
                  ) : (
                    <div className="flex h-[70vh] w-full items-center justify-center rounded-lg bg-slate-100">
                      <div className="text-center">
                        <p className="text-slate-500 mb-2">Imagem não encontrada</p>
                        <p className="text-sm text-slate-400">O arquivo pode ter sido movido ou excluído</p>
                        {selectedImage && (
                          <p className="text-xs text-slate-400 mt-2">URL: {selectedImage.substring(0, 50)}...</p>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedImageCaption && !imageError && selectedImage && (
                    <p
                      className="max-w-3xl text-center text-slate-600"
                      style={{ fontSize: '14pt', lineHeight: 1.2 }}
                    >
                      {selectedImageCaption}
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </Dialog>
      <OrderPrintManager
        isOpen={isPrintManagerOpen}
        onClose={() => setIsPrintManagerOpen(false)}
        order={order}
      />
    </>
  );
};
