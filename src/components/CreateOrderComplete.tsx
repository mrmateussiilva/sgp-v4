import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete';
import {
  Cliente,
  OrderStatus,
  CreateOrderRequest,
  CreateOrderItemRequest,
  OrderItem,
  OrderWithItems,
  UpdateOrderRequest,
  UpdateOrderItemRequest,
  UpdateOrderMetadataRequest,
} from '@/types';
import { api, getTiposProducaoAtivos } from '@/services/api';
import { subscribeToOrderEvents, fetchOrderAfterEvent } from '@/services/orderEvents';
import { FormPainelCompleto } from '@/components/FormPainelCompleto';
import { FormLonaProducao } from '@/components/FormLonaProducao';
import { FormTotemProducao } from '@/components/FormTotemProducao';
import { FormAdesivoProducao } from '@/components/FormAdesivoProducao';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useOrderStore } from '@/store/orderStore';
import { uploadImageToServer, needsUpload } from '@/utils/imageUploader';

// Tipos de produção padrão como fallback caso a API não esteja disponível
const TIPOS_PRODUCAO_FALLBACK = [
  { value: 'painel', label: 'Tecido' },
  { value: 'generica', label: 'Produção Genérica' },
  { value: 'totem', label: 'Totem' },
  { value: 'lona', label: 'Lona' },
  { value: 'adesivo', label: 'Adesivo' },
  { value: 'almofada', label: 'Almofada' },
  { value: 'bolsinha', label: 'Bolsinha' },
];

interface TabItem {
  id: string;
  orderItemId?: number;
  tipo_producao: string;
  descricao: string;
  largura: string;
  altura: string;
  metro_quadrado: string;
  vendedor: string;
  designer: string;
  tecido: string;
  overloque: boolean;
  elastico: boolean;
  tipo_acabamento: 'ilhos' | 'cordinha' | 'nenhum';
  // Campos para ilhós
  quantidade_ilhos: string;
  espaco_ilhos: string;
  valor_ilhos: string;
  // Campos para cordinha
  quantidade_cordinha: string;
  espaco_cordinha: string;
  valor_cordinha: string;
  // Campos extras
  imagem: string;
  legenda_imagem: string;
  valor_painel: string;
  valores_adicionais: string;
  quantidade_paineis: string;
  emenda: string;
  observacao: string;
  valor_unitario: string;
  terceirizado: boolean;
  acabamento_lona: 'refilar' | 'nao_refilar';
  valor_lona: string;
  quantidade_lona: string;
  outros_valores_lona: string;
  // Campos específicos do totem
  acabamento_totem: 'com_pe' | 'sem_pe' | 'outro';
  acabamento_totem_outro: string;
  valor_totem: string;
  quantidade_totem: string;
  outros_valores_totem: string;
  emendaQtd?: string;
  tipo_adesivo: string;
  valor_adesivo: string;
  quantidade_adesivo: string;
  outros_valores_adesivo: string;
  ziper: boolean;
  cordinha_extra: boolean;
  alcinha: boolean;
  toalha_pronta: boolean;
}

interface CreateOrderCompleteProps {
  mode?: 'create' | 'edit';
}

type NormalizedItem = CreateOrderItemRequest & { orderItemId?: number };

export default function CreateOrderComplete({ mode }: CreateOrderCompleteProps) {
  const navigate = useNavigate();
  const { id: routeOrderId } = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { updateOrder: updateOrderInStore } = useOrderStore();

  console.log('[CreateOrderComplete] Renderizando. Mode:', mode, 'RouteOrderId:', routeOrderId);

  // Detectar automaticamente se está em modo edição baseado na rota
  // Se routeOrderId existir, está em modo edição
  const isEditMode = mode === 'edit' || Boolean(routeOrderId);
  
  // Calcular ID inicial de forma segura
  const getInitialId = () => {
    if (routeOrderId) {
      const parsed = Number.parseInt(routeOrderId, 10);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  };
  
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(getInitialId());
  const [currentOrder, setCurrentOrder] = useState<OrderWithItems | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [tiposProducao, setTiposProducao] = useState<Array<{ value: string; label: string }>>(TIPOS_PRODUCAO_FALLBACK);

  console.log('[CreateOrderComplete] Estado inicial:', { 
    mode, 
    routeOrderId, 
    isEditMode, 
    selectedOrderId, 
    isLoadingOrder, 
    hasCurrentOrder: !!currentOrder 
  });

  function createEmptyTab(tabId: string): TabItem {
    return {
      id: tabId,
      orderItemId: undefined,
      tipo_producao: '',
      descricao: '',
      largura: '',
      altura: '',
      metro_quadrado: '',
      vendedor: '',
      designer: '',
      tecido: '',
      overloque: false,
      elastico: false,
      tipo_acabamento: 'nenhum',
      quantidade_ilhos: '',
      espaco_ilhos: '',
      valor_ilhos: '0,00',
      quantidade_cordinha: '',
      espaco_cordinha: '',
      valor_cordinha: '0,00',
      imagem: '',
      legenda_imagem: '',
      valor_painel: '0,00',
      valores_adicionais: '0,00',
      quantidade_paineis: '1',
      emenda: 'sem-emenda',
      observacao: '',
      valor_unitario: '0,00',
      terceirizado: false,
      acabamento_lona: 'refilar',
      valor_lona: '0,00',
      quantidade_lona: '1',
      outros_valores_lona: '0,00',
      acabamento_totem: 'com_pe',
      acabamento_totem_outro: '',
      valor_totem: '0,00',
      quantidade_totem: '1',
      outros_valores_totem: '0,00',
      emendaQtd: '',
      tipo_adesivo: '',
      valor_adesivo: '0,00',
      quantidade_adesivo: '1',
      outros_valores_adesivo: '0,00',
      ziper: false,
      cordinha_extra: false,
      alcinha: false,
      toalha_pronta: false,
    };
  }

  function formatCurrencyValue(value?: string | number | null): string {
    if (value === null || value === undefined) {
      return '0,00';
    }

    if (typeof value === 'number') {
      return value.toFixed(2).replace('.', ',');
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
      return '0,00';
    }

    const cleaned = trimmed.replace(/[^0-9.,-]/g, '');
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    let normalized = cleaned;
    if (hasComma && hasDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      normalized = normalized.replace(',', '.');
    }

    const parsed = Number.parseFloat(normalized);
    if (Number.isNaN(parsed)) {
      return '0,00';
  }

  return parsed.toFixed(2).replace('.', ',');
}

  function formatCurrencyBR(value: number): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function parseLocaleNumber(value?: string | number | null): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }
    const compact = trimmed.replace(/\s+/g, '');
    
    // Remove caracteres não numéricos exceto vírgula e ponto
    const cleaned = compact.replace(/[^\d,.-]/g, '');
    
    // Encontra a posição da última vírgula e do último ponto
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    let normalized = cleaned;
    
    // Se tem vírgula e ponto, determinar qual é o separador decimal
    if (lastComma > -1 && lastDot > -1) {
      // O separador decimal é o que aparece por último
      if (lastComma > lastDot) {
        // Formato pt-BR: vírgula é decimal, ponto é milhar (ex: 70.000,00)
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // Formato en-US: ponto é decimal, vírgula é milhar (ex: 70,000.00)
        normalized = cleaned.replace(/,/g, '');
      }
    } else if (lastComma > -1) {
      // Só tem vírgula: tratar como separador decimal
      normalized = cleaned.replace(',', '.');
    } else if (lastDot > -1) {
      // Só tem ponto: tratar como separador decimal
      normalized = cleaned;
    }
    
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function toDateInputValue(value?: string | null): string {
    if (!value) {
      return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    if (trimmed.includes('T')) {
      return trimmed.split('T')[0];
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return trimmed;
  }

  function mapItemToTab(item: OrderItem, tabId: string): TabItem {
    const anyItem = item as Record<string, any>;
    const tipoAcabamento =
      (anyItem.tipo_acabamento as TabItem['tipo_acabamento'] | undefined) ?? 'nenhum';
    const acabamentoLona =
      (anyItem.acabamento_lona as TabItem['acabamento_lona'] | undefined) ?? 'refilar';
    const acabamentoTotem =
      (anyItem.acabamento_totem as TabItem['acabamento_totem'] | undefined) ?? 'com_pe';

    return {
      id: tabId,
      orderItemId: item.id,
      tipo_producao: item.tipo_producao ?? '',
      descricao: item.descricao ?? item.item_name ?? '',
      largura: item.largura ?? '',
      altura: item.altura ?? '',
      metro_quadrado: item.metro_quadrado ?? '',
      vendedor: item.vendedor ?? '',
      designer: item.designer ?? '',
      tecido: item.tecido ?? '',
      overloque: item.overloque ?? false,
      elastico: item.elastico ?? false,
      tipo_acabamento: tipoAcabamento,
      quantidade_ilhos: anyItem.quantidade_ilhos ?? '',
      espaco_ilhos: anyItem.espaco_ilhos ?? '',
      valor_ilhos: formatCurrencyValue(anyItem.valor_ilhos),
      quantidade_cordinha: anyItem.quantidade_cordinha ?? '',
      espaco_cordinha: anyItem.espaco_cordinha ?? '',
      valor_cordinha: formatCurrencyValue(anyItem.valor_cordinha),
      imagem: anyItem.imagem ?? '',
      legenda_imagem: anyItem.legenda_imagem ?? '',
      valor_painel: formatCurrencyValue(
        anyItem.valor_painel ?? anyItem.valor_unitario ?? item.unit_price
      ),
      valores_adicionais: formatCurrencyValue(anyItem.valores_adicionais ?? '0,00'),
      quantidade_paineis:
        anyItem.quantidade_paineis ?? (item.quantity ? item.quantity.toString() : '1'),
      emenda: anyItem.emenda ?? 'sem-emenda',
      observacao: anyItem.observacao ?? '',
      valor_unitario: formatCurrencyValue(anyItem.valor_unitario ?? item.unit_price),
      terceirizado: Boolean(anyItem.terceirizado),
      acabamento_lona: acabamentoLona,
      valor_lona: formatCurrencyValue(anyItem.valor_lona ?? '0,00'),
      quantidade_lona: anyItem.quantidade_lona ?? '1',
      outros_valores_lona: formatCurrencyValue(anyItem.outros_valores_lona ?? '0,00'),
      acabamento_totem: acabamentoTotem,
      acabamento_totem_outro: anyItem.acabamento_totem_outro ?? '',
      valor_totem: formatCurrencyValue(anyItem.valor_totem ?? '0,00'),
      quantidade_totem: anyItem.quantidade_totem ?? '1',
      outros_valores_totem: formatCurrencyValue(anyItem.outros_valores_totem ?? '0,00'),
      emendaQtd: anyItem.emenda_qtd ?? anyItem.emendaQtd ?? '',
      tipo_adesivo: anyItem.tipo_adesivo ?? '',
      valor_adesivo: formatCurrencyValue(anyItem.valor_adesivo ?? '0,00'),
      quantidade_adesivo: anyItem.quantidade_adesivo ?? '1',
      outros_valores_adesivo: formatCurrencyValue(anyItem.outros_valores_adesivo ?? '0,00'),
      ziper: Boolean(anyItem.ziper),
      cordinha_extra: Boolean(anyItem.cordinha_extra),
      alcinha: Boolean(anyItem.alcinha),
      toalha_pronta: Boolean(anyItem.toalha_pronta),
    };
  }

  function populateFormFromOrder(order: OrderWithItems) {
    try {
      const orderStatus = order.status ?? OrderStatus.Pendente;
      const isConcluido = orderStatus === OrderStatus.Concluido;
      
      setIsLocked(isConcluido);
      setLocalStatus(orderStatus);
      
      setFormData((prev) => ({
        ...prev,
        numero: order.numero ?? '',
        cliente: order.cliente ?? order.customer_name ?? '',
        telefone_cliente: order.telefone_cliente ?? '',
        cidade_cliente: order.cidade_cliente ?? '',
        estado_cliente: order.estado_cliente ?? '',
        data_entrada: toDateInputValue(order.data_entrada) || prev.data_entrada,
        data_entrega: toDateInputValue(order.data_entrega),
        prioridade: order.prioridade ?? 'NORMAL',
        status: isConcluido ? OrderStatus.EmProcessamento : orderStatus, // Permite edição mudando para EmProcessamento
        observacao: order.observacao ?? '',
        forma_envio: order.forma_envio ?? '',
        tipo_pagamento: order.forma_pagamento_id
          ? order.forma_pagamento_id.toString()
          : '',
        valor_frete: formatCurrencyValue(order.valor_frete ?? '0'),
      }));

      const items = order.items ?? [];
      if (items.length === 0) {
        setTabs(['tab-1']);
        setTabsData({ 'tab-1': createEmptyTab('tab-1') });
        setActiveTab('tab-1');
        setItemHasUnsavedChanges({});
        return;
      }

      const generatedTabs = items.map((_, index) => `tab-${index + 1}`);
      const data: Record<string, TabItem> = {};
      generatedTabs.forEach((tabId, index) => {
        try {
          data[tabId] = mapItemToTab(items[index], tabId);
        } catch (itemError) {
          console.error(`Erro ao mapear item ${index} para tab ${tabId}:`, itemError);
          // Criar tab vazia em caso de erro
          data[tabId] = createEmptyTab(tabId);
        }
      });
      setTabs(generatedTabs);
      setTabsData(data);
      setActiveTab(generatedTabs[0]);
      setItemHasUnsavedChanges(
        generatedTabs.reduce<Record<string, boolean>>((acc, tabId) => {
          acc[tabId] = false;
          return acc;
        }, {})
      );
    } catch (error) {
      console.error('Erro ao popular formulário com dados do pedido:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Ocorreu um erro ao preencher o formulário. Alguns dados podem estar incompletos.',
        variant: 'destructive',
      });
    }
  }

  const [formData, setFormData] = useState({
    numero: '',
    cliente: '',
    telefone_cliente: '',
    cidade_cliente: '',
    estado_cliente: '',
    data_entrada: new Date().toISOString().split('T')[0],
    data_entrega: '',
    prioridade: 'NORMAL',
    status: OrderStatus.Pendente,
    observacao: '',
    forma_envio: '',
    tipo_pagamento: '',
    desconto_tipo: '',
    valor_frete: '0,00',
  });

  const [tabs, setTabs] = useState<string[]>(['tab-1']);
  const [activeTab, setActiveTab] = useState('tab-1');
  const [tabsData, setTabsData] = useState<Record<string, TabItem>>({
    'tab-1': createEmptyTab('tab-1'),
  });

  // Estado para gerenciar mudanças não salvas de cada item
  const [itemHasUnsavedChanges, setItemHasUnsavedChanges] = useState<Record<string, boolean>>({});

  const [showResumoModal, setShowResumoModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para validação de item
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [optionalWarnings, setOptionalWarnings] = useState<string[]>([]);
  
  // Estado para controlar se a ficha está bloqueada (concluída)
  const [isLocked, setIsLocked] = useState(false);
  const [_localStatus, setLocalStatus] = useState<OrderStatus>(OrderStatus.Pendente);

  const [vendedores, setVendedores] = useState<string[]>([]);
  const [designers, setDesigners] = useState<string[]>([]);
  const [materiaisTecido, setMateriaisTecido] = useState<string[]>([]);
  const [materiaisLona, setMateriaisLona] = useState<string[]>([]);
  const [materiaisTotem, setMateriaisTotem] = useState<string[]>([]);
  const [tiposAdesivo, setTiposAdesivo] = useState<string[]>([]);
  const [formasEnvio, setFormasEnvio] = useState<any[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  // Campo de desconto desativado por padrão
  const descontoAtivo = false;
  
  const [descontos] = useState([
    { id: 1, name: 'Sem Desconto', type: 'none', value: 0 },
    { id: 2, name: '5%', type: 'percentual', value: 5 },
    { id: 3, name: '10%', type: 'percentual', value: 10 },
    { id: 4, name: 'R$ 50,00', type: 'valor_fixo', value: 50 },
  ]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const normalizeNomeList = (entries: Array<{ nome: string }>) => {
    const unique = new Set<string>();
    entries.forEach((entry) => {
      const trimmed = entry.nome.trim();
      if (trimmed.length > 0) {
        unique.add(trimmed);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  };


  // Carregar tipos de produção ativos da API
  useEffect(() => {
    const loadTiposProducao = async () => {
      try {
        const tipos = await getTiposProducaoAtivos();
        console.log('Tipos de produção carregados da API:', tipos);
        // Sempre atualizar, mesmo que vazio (usará fallback se necessário)
        if (tipos.length > 0) {
          setTiposProducao(tipos);
          console.log('Tipos de produção atualizados:', tipos);
        } else {
          console.warn('Nenhum tipo de produção encontrado na API, usando fallback');
          // Manter fallback se API não retornar dados
        }
      } catch (error) {
        console.error('Erro ao carregar tipos de produção da API, usando fallback:', error);
        // Manter tipos padrão como fallback
      }
    };
    loadTiposProducao();
  }, []);

  // Integração com eventos de pedidos em tempo real
  // Quando o pedido sendo editado é atualizado em outra máquina, avisar o usuário
  useEffect(() => {
    if (!isEditMode || !selectedOrderId) {
      return;
    }

    const unsubscribe = subscribeToOrderEvents({
      onOrderUpdated: async (orderId) => {
        // Se o pedido sendo editado foi atualizado, recarregar dados
        if (orderId === selectedOrderId) {
          toast({
            title: 'Pedido Atualizado',
            description: 'Este pedido foi atualizado em outra máquina. Recarregando dados...',
            variant: 'default',
          });
          
          // Recarregar o pedido
          try {
            const updatedOrder = await fetchOrderAfterEvent(orderId);
            if (updatedOrder) {
              setCurrentOrder(updatedOrder);
              // Recarregar formulário com dados atualizados
              populateFormFromOrder(updatedOrder);
            }
          } catch (error) {
            console.error('Erro ao recarregar pedido após evento:', error);
          }
        }
      },
      onOrderCanceled: async (orderId) => {
        // Se o pedido sendo editado foi cancelado, avisar
        if (orderId === selectedOrderId) {
          toast({
            title: 'Pedido Cancelado',
            description: 'Este pedido foi cancelado em outra máquina.',
            variant: 'destructive',
          });
        }
      },
    }, false); // Não mostrar toast automático, vamos mostrar mensagens customizadas
    
    return unsubscribe;
  }, [isEditMode, selectedOrderId, toast]);

  // Efeito para detectar ID da rota e entrar em modo edição automaticamente
  useEffect(() => {
    if (routeOrderId) {
      try {
        const parsed = Number.parseInt(routeOrderId, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          console.log('[CreateOrderComplete] Definindo selectedOrderId para:', parsed);
          setSelectedOrderId(parsed);
        } else {
          console.error('[CreateOrderComplete] ID inválido na rota:', routeOrderId);
          toast({
            title: 'ID inválido',
            description: 'O ID do pedido na URL é inválido.',
            variant: 'destructive',
          });
          navigate('/dashboard/orders');
        }
      } catch (error) {
        console.error('[CreateOrderComplete] Erro ao processar ID da rota:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao processar o ID do pedido.',
          variant: 'destructive',
        });
        navigate('/dashboard/orders');
      }
    } else {
      // Se não tem routeOrderId e está em modo edição, pode ser problema
      if (mode === 'edit') {
        console.warn('[CreateOrderComplete] Modo edição mas sem ID na rota');
      }
    }
  }, [routeOrderId, navigate, toast, mode]);

  // Removido: não precisamos mais carregar lista de pedidos quando temos ID na rota
  // O pedido será carregado diretamente pelo ID

  // Carregar pedido quando tiver ID selecionado
  useEffect(() => {
    // Só carregar se tiver um ID válido
    if (!selectedOrderId || selectedOrderId <= 0) {
      console.log('[CreateOrderComplete] Sem ID válido, não carregando pedido');
      return;
    }

    let active = true;

    // Carregar pedido pelo ID
    console.log('[CreateOrderComplete] Iniciando carregamento do pedido ID:', selectedOrderId);
    setIsLoadingOrder(true);
    
    (async () => {
      try {
        const order = await api.getOrderById(selectedOrderId);
        console.log('[CreateOrderComplete] Pedido carregado da API:', order);
        
        if (!active) {
          console.log('[CreateOrderComplete] Componente desmontado, cancelando...');
          return;
        }
        
        if (!order) {
          throw new Error('Pedido não encontrado');
        }
        
        setCurrentOrder(order);
        console.log('[CreateOrderComplete] Populando formulário...');
        populateFormFromOrder(order);
        console.log('[CreateOrderComplete] Formulário populado com sucesso');
      } catch (error) {
        if (!active) {
          return;
        }
        console.error('[CreateOrderComplete] Erro ao carregar pedido para edição:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({
          title: 'Erro ao carregar pedido',
          description: `Não foi possível carregar os dados completos do pedido: ${errorMessage}`,
          variant: 'destructive',
        });
        // Redirecionar após 2 segundos
        setTimeout(() => {
          if (active) {
            navigate('/dashboard/orders');
          }
        }, 2000);
      } finally {
        if (active) {
          setIsLoadingOrder(false);
          console.log('[CreateOrderComplete] Loading finalizado');
        }
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderId, navigate, toast]);

  // Carregar catálogos do banco (ativos)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [vend, des, tecidos, totens, lonas, adesivos] = await Promise.all([
          api.getVendedoresAtivos(),
          api.getDesignersAtivos(),
          api.getMateriaisAtivosPorTipo('tecido'),
          api.getMateriaisAtivosPorTipo('totem'),
          api.getMateriaisAtivosPorTipo('lona'),
          api.getMateriaisAtivosPorTipo('adesivo'),
        ]);
        if (!isMounted) return;
        setVendedores(normalizeNomeList(vend));
        setDesigners(normalizeNomeList(des));
        setMateriaisTecido(tecidos);
        setMateriaisTotem(totens);
        setMateriaisLona(lonas);
        setTiposAdesivo(adesivos);
      } catch (e) {
        console.error('Erro ao carregar catálogos:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Carregar formas de envio e pagamento
  useEffect(() => {
    const fetchFormasEnvio = async () => {
      try {
        const formas = await api.getFormasEnvioAtivas();
        setFormasEnvio(formas);
      } catch (error) {
        console.error("Erro ao carregar formas de envio:", error);
      }
    };
    fetchFormasEnvio();
  }, []);

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

  useEffect(() => {
    const currentData = tabsData[activeTab];
    if (currentData && currentData.largura && currentData.altura) {
      const largura = parseLocaleNumber(currentData.largura);
      const altura = parseLocaleNumber(currentData.altura);
      const area = (largura * altura).toFixed(2).replace('.', ',');
      
      // Atualizar área apenas se mudou
      if (currentData.metro_quadrado !== area) {
        handleTabDataChange(activeTab, 'metro_quadrado', area);
      }
    }
  }, [tabsData[activeTab]?.largura, tabsData[activeTab]?.altura, activeTab]);

  // Calcular valor unitário automaticamente para painéis
  useEffect(() => {
    Object.keys(tabsData).forEach(tabId => {
      const item = tabsData[tabId];
      if (item && (item.tipo_producao === 'painel' || item.tipo_producao === 'generica')) {
        // Calcular valor total do painel baseado nos campos específicos
        const valorPainel = parseLocaleNumber(item.valor_painel || '0,00');
        const valoresAdicionais = parseLocaleNumber(item.valores_adicionais || '0,00');
        
        // Calcular valor dos ilhós se aplicável
        let valorIlhos = 0;
        if (item.tipo_acabamento === 'ilhos') {
          const qtdIlhos = parseInt(item.quantidade_ilhos || '0');
          const valorUnitIlhos = parseLocaleNumber(item.valor_ilhos || '0,00');
          valorIlhos = qtdIlhos * valorUnitIlhos;
        }
        
        // Calcular valor da cordinha se aplicável
        let valorCordinha = 0;
        if (item.tipo_acabamento === 'cordinha') {
          const qtdCordinha = parseInt(item.quantidade_cordinha || '0');
          const valorUnitCordinha = parseLocaleNumber(item.valor_cordinha || '0,00');
          valorCordinha = qtdCordinha * valorUnitCordinha;
        }
        
        // Calcular valor total
        const valorTotal = valorPainel + valoresAdicionais + valorIlhos + valorCordinha;
        
        // Converter para formato brasileiro (sem multiplicar pela quantidade aqui)
        const valorFormatado = valorTotal.toFixed(2).replace('.', ',');
        
        // Atualizar valor unitário apenas se mudou
        if (item.valor_unitario !== valorFormatado) {
          handleTabDataChange(tabId, 'valor_unitario', valorFormatado);
        }
      }
    });
  }, [
    tabsData,
    // Dependências específicas para painéis
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.valor_painel),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.valores_adicionais),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.tipo_acabamento),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.quantidade_ilhos),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.valor_ilhos),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.quantidade_cordinha),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.valor_cordinha),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.quantidade_paineis),
  ]);

  // Calcular valor unitário automaticamente para totems
  useEffect(() => {
    Object.keys(tabsData).forEach(tabId => {
      const item = tabsData[tabId];
      if (item && item.tipo_producao === 'totem') {
        const valorTotem = parseLocaleNumber(item.valor_totem || '0,00');
        const outrosValores = parseLocaleNumber(item.outros_valores_totem || '0,00');
        const valorTotalUnitario = valorTotem + outrosValores;
        const valorFormatado = valorTotalUnitario.toFixed(2).replace('.', ',');

        if (item.valor_unitario !== valorFormatado) {
          handleTabDataChange(tabId, 'valor_unitario', valorFormatado);
        }
      }
    });
  }, [
    tabsData,
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.valor_totem),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.outros_valores_totem),
  ]);

  // Calcular valor unitário automaticamente para lonas
  useEffect(() => {
    Object.keys(tabsData).forEach(tabId => {
      const item = tabsData[tabId];
      if (item && item.tipo_producao === 'lona') {
        const valorLona = parseLocaleNumber(item.valor_lona || '0,00');
        const outrosValores = parseLocaleNumber(item.outros_valores_lona || '0,00');
        let valorIlhos = 0;
        if (item.tipo_acabamento === 'ilhos') {
          const qtdIlhos = parseInt(item.quantidade_ilhos || '0');
          const valorUnitIlhos = parseLocaleNumber(item.valor_ilhos || '0,00');
          valorIlhos = qtdIlhos * valorUnitIlhos;
        }
        const valorTotalUnitario = valorLona + outrosValores + valorIlhos;
        const valorFormatado = valorTotalUnitario.toFixed(2).replace('.', ',');

        if (item.valor_unitario !== valorFormatado) {
          handleTabDataChange(tabId, 'valor_unitario', valorFormatado);
        }
      }
    });
  }, [
    tabsData,
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.valor_lona),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.outros_valores_lona),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.tipo_acabamento),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.quantidade_ilhos),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.valor_ilhos),
  ]);

  // Calcular valor unitário automaticamente para adesivos
  useEffect(() => {
    Object.keys(tabsData).forEach(tabId => {
      const item = tabsData[tabId];
      if (item && item.tipo_producao === 'adesivo') {
        const valorAdesivo = parseLocaleNumber(item.valor_adesivo || '0,00');
        const outrosValores = parseLocaleNumber(item.outros_valores_adesivo || '0,00');
        const valorTotalUnitario = valorAdesivo + outrosValores;
        const valorFormatado = valorTotalUnitario.toFixed(2).replace('.', ',');

        if (item.valor_unitario !== valorFormatado) {
          handleTabDataChange(tabId, 'valor_unitario', valorFormatado);
        }
      }
    });
  }, [
    tabsData,
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.valor_adesivo),
    ...Object.keys(tabsData).map(tabId => tabsData[tabId]?.outros_valores_adesivo),
  ]);


  // Funções de validação completas
  const validateClientData = () => {
    const errors: {[key: string]: string} = {};

    // Validar nome do cliente
    if (!formData.cliente || formData.cliente.trim().length < 2) {
      errors.cliente = 'Nome do cliente é obrigatório (mínimo 2 caracteres)';
    }

    // Validar telefone
    if (!formData.telefone_cliente || formData.telefone_cliente.trim().length < 10) {
      errors.telefone_cliente = 'Telefone é obrigatório (mínimo 10 dígitos)';
    }

    // Validar cidade
    if (!formData.cidade_cliente || formData.cidade_cliente.trim().length < 2) {
      errors.cidade_cliente = 'Cidade é obrigatória (mínimo 2 caracteres)';
    }

    return errors;
  };

  const validateDates = (dataEntrada: string, dataSaida: string): string | null => {
    if (!dataEntrada || !dataSaida) return null; // Campos opcionais
    
    const entrada = new Date(dataEntrada);
    const saida = new Date(dataSaida);
    
    if (entrada > saida) {
      return 'Data de entrada não pode ser maior que data de entrega';
    }
    
    return null;
  };

  const validateItems = () => {
    const errors: {[key: string]: string} = {};

    // Verificar se há pelo menos um item preenchido
    const itensPreenchidos = tabs.filter(tabId => {
      const item = tabsData[tabId];
      return item && item.tipo_producao && item.descricao;
    });

    if (itensPreenchidos.length === 0) {
      errors.items = 'Adicione pelo menos um item ao pedido';
      return errors;
    }

    // Validar cada item preenchido
    tabs.forEach(tabId => {
      const item = tabsData[tabId];
      if (item && item.tipo_producao && item.descricao) {
        // Validar descrição
        if (!item.descricao || item.descricao.trim().length < 3) {
          errors[`item_${tabId}_descricao`] = 'Descrição do item deve ter pelo menos 3 caracteres';
        }

        // Validar tipo de produção
        if (!item.tipo_producao) {
          errors[`item_${tabId}_tipo`] = 'Tipo de produção é obrigatório';
        }

        // Validar medidas para tipos que precisam
        if (item.tipo_producao !== 'painel') {
          if (!item.largura || parseLocaleNumber(item.largura) <= 0) {
            errors[`item_${tabId}_largura`] = 'Largura deve ser maior que zero';
          }
          if (!item.altura || parseLocaleNumber(item.altura) <= 0) {
            errors[`item_${tabId}_altura`] = 'Altura deve ser maior que zero';
          }
        }

        // Validar valor unitário
        const valorUnitario = parseLocaleNumber(item.valor_unitario || '0,00');
        
        // Para painéis, verificar se pelo menos um campo de valor foi preenchido
        if (item.tipo_producao === 'painel' || item.tipo_producao === 'generica') {
          const valorPainel = parseLocaleNumber(item.valor_painel || '0,00');
          const valoresAdicionais = parseLocaleNumber(item.valores_adicionais || '0,00');
          
          if (valorPainel <= 0 && valoresAdicionais <= 0) {
            errors[`item_${tabId}_valor`] = 'Preencha pelo menos o valor do painel ou valores adicionais';
          }
        } else if (item.tipo_producao === 'totem') {
          if (valorUnitario <= 0) {
            errors[`item_${tabId}_valor`] = 'Valor do totem deve ser maior que zero';
          }
          const quantidadeTotem = parseInt(item.quantidade_totem || '0');
          if (quantidadeTotem <= 0) {
            errors[`item_${tabId}_quantidade`] = 'Quantidade de totens deve ser maior que zero';
          }
          if (item.acabamento_totem === 'outro' && (!item.acabamento_totem_outro || item.acabamento_totem_outro.trim().length === 0)) {
            errors[`item_${tabId}_acabamento_outro`] = 'Descreva o acabamento do totem';
          }
        } else if (item.tipo_producao === 'lona') {
          if (valorUnitario <= 0) {
            errors[`item_${tabId}_valor`] = 'Valor da lona deve ser maior que zero';
          }
          const quantidadeLona = parseInt(item.quantidade_lona || '0');
          if (quantidadeLona <= 0) {
            errors[`item_${tabId}_quantidade`] = 'Quantidade de lonas deve ser maior que zero';
          }
          if (item.emenda === 'com-emenda') {
            const qtdEmenda = parseInt(item.emendaQtd || '0');
            if (qtdEmenda <= 0) {
              errors[`item_${tabId}_emenda`] = 'Informe a quantidade de emendas';
            }
          }
        } else if (item.tipo_producao === 'adesivo') {
          if (!item.tipo_adesivo || item.tipo_adesivo.trim().length === 0) {
            errors[`item_${tabId}_tipo_adesivo`] = 'Tipo de adesivo é obrigatório';
          }
          if (valorUnitario <= 0) {
            errors[`item_${tabId}_valor`] = 'Valor do adesivo deve ser maior que zero';
          }
          const quantidadeAdesivo = parseInt(item.quantidade_adesivo || '0');
          if (quantidadeAdesivo <= 0) {
            errors[`item_${tabId}_quantidade`] = 'Quantidade de adesivos deve ser maior que zero';
          }
        } else {
          // Para outros tipos, validar valor unitário diretamente
          if (valorUnitario <= 0) {
            errors[`item_${tabId}_valor`] = 'Valor unitário deve ser maior que zero';
          }
        }
      }
    });

    return errors;
  };

  const validateShippingAndPayment = () => {
    const errors: {[key: string]: string} = {};

    // Validar forma de envio
    if (!formData.forma_envio || formData.forma_envio.trim().length === 0) {
      errors.forma_envio = 'Forma de envio é obrigatória';
    }

    // Validar valor do frete (deve ser um número válido)
    const valorFrete = parseLocaleNumber(formData.valor_frete);
    if (valorFrete < 0) {
      errors.valor_frete = 'Valor do frete não pode ser negativo';
    }

    return errors;
  };

  const validateTotals = () => {
    const errors: {[key: string]: string} = {};

    // Calcular valor total dos itens
    const valorItens = calcularValorItens();
    if (valorItens <= 0) {
      errors.valor_itens = 'Valor total dos itens deve ser maior que zero';
    }

    // Calcular valor total do pedido
    const valorTotal = calcularTotal();
    if (valorTotal <= 0) {
      errors.valor_total = 'Valor total do pedido deve ser maior que zero';
    }

    return errors;
  };

  const validateAll = () => {
    const clientErrors = validateClientData();
    const itemErrors = validateItems();
    const shippingErrors = validateShippingAndPayment();
    const totalErrors = validateTotals();

    // Validar datas
    const dateErrors: {[key: string]: string} = {};
    if (formData.data_entrada && formData.data_entrega) {
      const dateError = validateDates(formData.data_entrada, formData.data_entrega);
      if (dateError) {
        dateErrors.data_entrada = dateError;
        dateErrors.data_entrega = dateError;
      }
    }

    // Validar prioridade
    if (!formData.prioridade || formData.prioridade.trim().length === 0) {
      dateErrors.prioridade = 'Prioridade é obrigatória';
    }

    const allErrors = {
      ...clientErrors,
      ...itemErrors,
      ...shippingErrors,
      ...totalErrors,
      ...dateErrors
    };

    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const validateField = (field: string, value: any) => {
    let error: string | null = null;

    switch (field) {
      case 'data_entrada':
        error = validateDates(value, formData.data_entrega);
        break;
      case 'data_entrega':
        error = validateDates(formData.data_entrada, value);
        break;
      case 'cliente':
        if (!value || value.trim().length < 2) {
          error = 'Nome do cliente é obrigatório (mínimo 2 caracteres)';
        }
        break;
      case 'telefone_cliente':
        if (!value || value.trim().length < 10) {
          error = 'Telefone é obrigatório (mínimo 10 dígitos)';
        }
        break;
      case 'cidade_cliente':
        if (!value || value.trim().length < 2) {
          error = 'Cidade é obrigatória (mínimo 2 caracteres)';
        }
        break;
      case 'forma_envio':
        if (!value || value.trim().length === 0) {
          error = 'Forma de envio é obrigatória';
        }
        break;
      case 'valor_frete':
        const valorFrete = parseLocaleNumber(value);
        if (valorFrete < 0) {
          error = 'Valor do frete não pode ser negativo';
        }
        break;
    }

    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validar campo em tempo real
    validateField(field, value);
  };

  const handleTabDataChange = (tabId: string, field: string, value: any) => {
    setTabsData(prev => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        [field]: value
      }
    }));

    // Marcar que o item tem mudanças não salvas
    setItemHasUnsavedChanges(prev => ({
      ...prev,
      [tabId]: true
    }));
  };

  const handleAddTab = () => {
    const newTabId = `tab-${tabs.length + 1}`;
    setTabs([...tabs, newTabId]);
    setTabsData(prev => ({
      ...prev,
      [newTabId]: createEmptyTab(newTabId)
    }));

    // Inicializar estados para o novo item
    setItemHasUnsavedChanges(prev => ({
      ...prev,
      [newTabId]: false
    }));

    setActiveTab(newTabId);
  };

  const handleRemoveTab = (tabId: string) => {
    if (tabs.length === 1) {
      toast({
        title: "Erro",
        description: "Deve haver pelo menos uma aba.",
        variant: "destructive",
      });
      return;
    }

    const newTabs = tabs.filter(t => t !== tabId);
    setTabs(newTabs);

    const newTabsData = { ...tabsData };
    delete newTabsData[tabId];
    setTabsData(newTabsData);

    // Limpar mudanças não salvas
    const newItemHasUnsavedChanges = { ...itemHasUnsavedChanges };
    delete newItemHasUnsavedChanges[tabId];
    setItemHasUnsavedChanges(newItemHasUnsavedChanges);

    if (activeTab === tabId) {
      setActiveTab(newTabs[0]);
    }
  };

  const validateItemComplete = (tabId: string) => {
    const item = tabsData[tabId];
    if (!item) return { errors: [], warnings: [] };

    const errors: string[] = [];
    const warnings: string[] = [];

    // Campos obrigatórios
    if (!item.descricao || item.descricao.trim().length < 3) {
      errors.push("Descrição é obrigatória (mínimo 3 caracteres)");
    }

    if (!item.largura || parseLocaleNumber(item.largura) <= 0) {
      errors.push("Largura é obrigatória e deve ser maior que zero");
    }

    if (!item.altura || parseLocaleNumber(item.altura) <= 0) {
      errors.push("Altura é obrigatória e deve ser maior que zero");
    }

    if (!item.tecido || item.tecido.trim().length === 0) {
      errors.push("Material/Tecido é obrigatório");
    }

    if (!item.designer || item.designer.trim().length === 0) {
      errors.push("Designer é obrigatório");
    }

    if (!item.vendedor || item.vendedor.trim().length === 0) {
      errors.push("Vendedor é obrigatório");
    }

    if (!item.imagem || item.imagem.trim().length === 0) {
      errors.push("Imagem é obrigatória");
    }

    // Validar valor
    if (item.tipo_producao === 'painel' || item.tipo_producao === 'generica') {
      const valorPainel = parseLocaleNumber(item.valor_painel || '0,00');
      const valoresAdicionais = parseLocaleNumber(item.valores_adicionais || '0,00');
      
      if (valorPainel <= 0 && valoresAdicionais <= 0) {
        errors.push("Valor é obrigatório (preencha pelo menos o valor do painel ou valores adicionais)");
      }
    } else if (item.tipo_producao === 'totem') {
      const valorTotem = parseLocaleNumber(item.valor_totem || '0,00');
      const outrosTotem = parseLocaleNumber(item.outros_valores_totem || '0,00');
      const valorUnitarioTotem = parseLocaleNumber(item.valor_unitario || '0,00');

      if (valorTotem <= 0 && outrosTotem <= 0) {
        errors.push("Informe o valor do totem ou outros valores adicionais");
      }

      if (valorUnitarioTotem <= 0) {
        errors.push("Valor total por totem deve ser maior que zero");
      }

      if (item.acabamento_totem === 'outro' && (!item.acabamento_totem_outro || item.acabamento_totem_outro.trim().length === 0)) {
        errors.push("Descreva o outro acabamento do totem");
      }
    } else if (item.tipo_producao === 'lona') {
      const valorLona = parseLocaleNumber(item.valor_lona || '0,00');
      const outrosValoresLona = parseLocaleNumber(item.outros_valores_lona || '0,00');
      let valorIlhos = 0;
      if (item.tipo_acabamento === 'ilhos') {
        const qtdIlhos = parseInt(item.quantidade_ilhos || '0');
        const valorUnitIlhos = parseLocaleNumber(item.valor_ilhos || '0,00');
        valorIlhos = qtdIlhos * valorUnitIlhos;
      }
      const valorUnitarioLona = parseLocaleNumber(item.valor_unitario || '0,00');

      if (valorLona <= 0 && outrosValoresLona <= 0 && valorIlhos <= 0) {
        errors.push("Informe o valor da lona ou valores adicionais");
      }

      if (valorUnitarioLona <= 0) {
        errors.push("Valor total por lona deve ser maior que zero");
      }

      if (item.emenda === 'com-emenda') {
        const qtdEmenda = parseInt(item.emendaQtd || '0');
        if (Number.isNaN(qtdEmenda) || qtdEmenda <= 0) {
          errors.push("Informe a quantidade de emendas");
        }
      }
    } else {
      const valorUnitario = parseLocaleNumber(item.valor_unitario || '0,00');
      if (valorUnitario <= 0) {
        errors.push("Valor unitário é obrigatório e deve ser maior que zero");
      }
    }

    // Validar quantidade
    if (item.tipo_producao === 'painel' || item.tipo_producao === 'generica') {
      const quantidade = parseInt(item.quantidade_paineis || '0');
      if (quantidade <= 0) {
        errors.push("Quantidade de painéis é obrigatória e deve ser maior que zero");
      }
    }

    if (item.tipo_producao === 'totem') {
      const quantidadeTotem = parseInt(item.quantidade_totem || '0');
      if (quantidadeTotem <= 0) {
        errors.push("Quantidade de totens é obrigatória e deve ser maior que zero");
      }

      if (!item.acabamento_totem || item.acabamento_totem.trim().length === 0) {
        errors.push("Selecione o acabamento do totem");
      }
    }

    if (item.tipo_producao === 'lona') {
      const quantidadeLona = parseInt(item.quantidade_lona || '0', 10);
      if (Number.isNaN(quantidadeLona) || quantidadeLona <= 0) {
        errors.push("Quantidade de lonas é obrigatória e deve ser maior que zero");
      }

      if (!item.acabamento_lona || item.acabamento_lona.trim().length === 0) {
        errors.push("Selecione o acabamento da lona");
      }
    }

    if (item.tipo_producao === 'adesivo') {
      const quantidadeAdesivo = parseInt(item.quantidade_adesivo || '0', 10);
      if (Number.isNaN(quantidadeAdesivo) || quantidadeAdesivo <= 0) {
        errors.push("Quantidade de adesivos é obrigatória e deve ser maior que zero");
      }
    }

    // Campos opcionais - gerar avisos
    if (item.tipo_producao === 'painel' || item.tipo_producao === 'generica') {
      if (!item.overloque) {
        warnings.push("Overloque não será aplicado");
      }

      if (!item.elastico) {
        warnings.push("Elástico não será aplicado");
      }

      if (item.emenda === 'sem-emenda') {
        warnings.push("Emenda não será aplicada");
      }

      if (item.tipo_acabamento === 'nenhum') {
        warnings.push("Nenhum acabamento especial será aplicado");
      }
    }

    if (item.tipo_producao === 'lona') {
      if (item.acabamento_lona === 'nao_refilar') {
        warnings.push("Lona será entregue sem refilar");
      }

      if (item.terceirizado) {
        warnings.push("Item será produzido por terceiros");
      }
    }

    if (item.tipo_producao === 'adesivo') {
      // Espaço reservado para avisos específicos de adesivo, se necessário
    }

    return { errors, warnings };
  };

  const handleSaveItem = (tabId: string) => {
    const validation = validateItemComplete(tabId);
    
    if (!validation) return;
    
    if (validation.errors.length > 0) {
      // Mostrar modal de erros obrigatórios
      setValidationErrors(validation.errors);
      setOptionalWarnings(validation.warnings);
      setShowValidationModal(true);
      return;
    }

    if (validation.warnings.length > 0) {
      // Mostrar confirmação com avisos opcionais
      const confirmMessage = `Tem certeza que deseja salvar este item?\n\nAvisos:\n${validation.warnings.map(w => `• ${w}`).join('\n')}`;
      
      if (window.confirm(confirmMessage)) {
        saveItemConfirmed(tabId);
      }
      return;
    }

    // Salvar diretamente se não há erros nem avisos
    saveItemConfirmed(tabId);
  };

  const saveItemConfirmed = (tabId: string) => {
    // Marcar que não há mudanças não salvas
    setItemHasUnsavedChanges(prev => ({
      ...prev,
      [tabId]: false
    }));

    toast({
      title: "Item validado!",
      description: `Item ${tabs.indexOf(tabId) + 1} está pronto para o pedido.`,
    });
  };

  const handleCancelItem = (tabId: string) => {
    // Limpar o item
    setTabsData(prev => ({
      ...prev,
      [tabId]: createEmptyTab(tabId)
    }));

    // Marcar que não há mudanças não salvas
    setItemHasUnsavedChanges(prev => ({
      ...prev,
      [tabId]: false
    }));

    toast({
      title: "Item limpo",
      description: `Dados do item ${tabs.indexOf(tabId) + 1} foram removidos.`,
    });
  };

  const calcularValorItens = () => {
    // Calcular com todos os itens preenchidos
    const totalBruto = tabs.reduce((sum, tabId) => {
      const item = tabsData[tabId];
      if (!item || !item.tipo_producao || !item.descricao) return sum;
      
      // Converter valor unitário corretamente
      const valor = parseLocaleNumber(item.valor_unitario || '0,00');
      
      // Para painéis, considerar a quantidade
      if (item.tipo_producao === 'painel' || item.tipo_producao === 'generica') {
        const quantidade = parseInt(item.quantidade_paineis || '1');
        return sum + (valor * quantidade);
      }

      if (item.tipo_producao === 'totem') {
        const quantidadeTotem = parseInt(item.quantidade_totem || '1');
        return sum + (valor * quantidadeTotem);
      }

      if (item.tipo_producao === 'lona') {
        const quantidadeLonaParse = parseInt(item.quantidade_lona || '1');
        const quantidadeValida = Number.isNaN(quantidadeLonaParse) || quantidadeLonaParse <= 0 ? 1 : quantidadeLonaParse;
        return sum + (valor * quantidadeValida);
      }

      if (item.tipo_producao === 'adesivo') {
        const quantidadeAdesivoParse = parseInt(item.quantidade_adesivo || '1');
        const quantidadeValida = Number.isNaN(quantidadeAdesivoParse) || quantidadeAdesivoParse <= 0 ? 1 : quantidadeAdesivoParse;
        return sum + (valor * quantidadeValida);
      }
      
      return sum + valor;
    }, 0);

    // Se desconto estiver desativado, não aplicar desconto
    if (!descontoAtivo) {
      return totalBruto;
    }
    
    const desconto = descontos.find(d => d.name === formData.desconto_tipo);
    if (desconto && desconto.type !== 'none') {
      if (desconto.type === 'percentual') {
        return totalBruto * (1 - desconto.value / 100);
      } else {
        return totalBruto - desconto.value;
      }
    }

    return totalBruto;
  };

  const calcularTotal = (): number => {
    const valorItens = calcularValorItens();
    const frete = parseLocaleNumber(formData.valor_frete);
    return valorItens + frete;
  };

  const calcularTotalFormatado = (): string => {
    return formatCurrencyBR(calcularTotal());
  };

  const handleSalvar = () => {
    if (isEditMode && !selectedOrderId) {
      toast({
        variant: 'destructive',
        title: 'Selecione um pedido',
        description: 'Escolha um pedido para editar antes de salvar.',
      });
      return;
    }

    // Executar validação completa
    const isValid = validateAll();

    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "Corrija todos os erros antes de salvar o pedido.",
      });
      return;
    }

    // Se chegou até aqui, todos os dados estão válidos
    setShowResumoModal(true);
  };


  const clearForm = () => {
    // Limpar dados do formulário
    setFormData({
      numero: '',
      cliente: '',
      telefone_cliente: '',
      cidade_cliente: '',
      estado_cliente: '',
      data_entrada: new Date().toISOString().split('T')[0],
      data_entrega: '',
      prioridade: 'NORMAL',
      status: OrderStatus.Pendente,
      observacao: '',
      forma_envio: '',
      tipo_pagamento: '',
      desconto_tipo: '',
      valor_frete: '0,00',
    });

    // Limpar dados dos itens
    setTabs(['tab-1']);
    setTabsData({ 'tab-1': createEmptyTab('tab-1') });
    setItemHasUnsavedChanges({});
    setActiveTab('tab-1');
    setErrors({});

  };

  /**
   * Faz upload obrigatório de imagens ANTES de salvar pedido
   * Atualiza normalizedItems com referências do servidor
   * Se algum upload falhar, lança erro para impedir salvamento
   */
  const uploadImagesBeforeSave = async (
    items: NormalizedItem[]
  ): Promise<void> => {
    // Coletar todas as imagens que precisam upload
    const itemsWithLocalImages = items.filter(
      (item) => item.imagem && needsUpload(item.imagem)
    );
    
    if (itemsWithLocalImages.length === 0) {
      return; // Nenhuma imagem para upload
    }
    
    console.log(`[uploadImagesBeforeSave] Fazendo upload obrigatório de ${itemsWithLocalImages.length} imagens antes de salvar pedido`);
    
    // Fazer uploads em paralelo - usar Promise.all para falhar rápido se algum falhar
    const uploadPromises = itemsWithLocalImages.map((item) => {
      if (!item.imagem) {
        return Promise.reject(new Error('Dados de imagem ausentes para upload local'));
      }
      // Usar orderItemId se disponível (edição), senão undefined (criação)
      return uploadImageToServer(item.imagem, item.orderItemId);
    });
    
    try {
      const uploadResults = await Promise.all(uploadPromises);
      
      // Atualizar referências nos items normalizados
      uploadResults.forEach((result, index) => {
        if (result.success && result.server_reference) {
          const itemIndex = items.findIndex(
            (item) => item === itemsWithLocalImages[index]
          );
          if (itemIndex >= 0) {
            items[itemIndex].imagem = result.server_reference;
            console.log(`[uploadImagesBeforeSave] ✅ Imagem ${index + 1} enviada: ${result.server_reference}`);
          }
        } else {
          const error = result.error || 'Erro desconhecido no upload';
          throw new Error(`Falha no upload da imagem ${index + 1}: ${error}`);
        }
      });
      
      console.log(`[uploadImagesBeforeSave] ✅ Todas as ${uploadResults.length} imagens foram enviadas com sucesso`);
    } catch (error) {
      console.error('[uploadImagesBeforeSave] ❌ Erro no upload obrigatório de imagens:', error);
      throw error; // Re-lançar para impedir salvamento
    }
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);

    try {
      const normalizedItems: NormalizedItem[] = tabs
        .filter((tabId) => {
          const item = tabsData[tabId];
          return item && item.tipo_producao && item.descricao;
        })
        .map((tabId) => {
          const item = tabsData[tabId]!;
          const valorUnitario = parseLocaleNumber(item.valor_unitario || '0,00');

          const quantidadeRaw =
            item.tipo_producao === 'painel' || item.tipo_producao === 'generica'
              ? parseInt(item.quantidade_paineis || '1', 10)
              : item.tipo_producao === 'totem'
                ? parseInt(item.quantidade_totem || '1', 10)
                : item.tipo_producao === 'lona'
                  ? parseInt(item.quantidade_lona || '1', 10)
                  : item.tipo_producao === 'adesivo'
                    ? parseInt(item.quantidade_adesivo || '1', 10)
                    : 1;

          const quantidade = Number.isNaN(quantidadeRaw) || quantidadeRaw <= 0 ? 1 : quantidadeRaw;

          const payload: NormalizedItem = {
            orderItemId: item.orderItemId,
            item_name: `${item.tipo_producao.toUpperCase()}: ${item.descricao}`,
            quantity: quantidade,
            unit_price: valorUnitario,
            tipo_producao: item.tipo_producao,
            descricao: item.descricao,
            largura: item.largura,
            altura: item.altura,
            metro_quadrado: item.metro_quadrado,
            vendedor: item.vendedor,
            designer: item.designer,
            tecido: item.tecido,
            overloque: item.overloque,
            elastico: item.elastico,
            tipo_acabamento: item.tipo_acabamento,
            quantidade_ilhos: item.quantidade_ilhos,
            espaco_ilhos: item.espaco_ilhos,
            valor_ilhos: item.valor_ilhos,
            quantidade_cordinha: item.quantidade_cordinha,
            espaco_cordinha: item.espaco_cordinha,
            valor_cordinha: item.valor_cordinha,
            observacao: item.observacao,
            // Não enviar local_path para API - será substituído por referência do servidor após upload
            imagem: item.imagem && needsUpload(item.imagem) ? undefined : item.imagem,
            legenda_imagem: item.legenda_imagem,
            quantidade_paineis: item.quantidade_paineis,
            valor_painel: item.valor_painel,
            valores_adicionais: item.valores_adicionais,
            valor_unitario: item.valor_unitario,
            emenda: item.emenda,
            emenda_qtd:
              item.emenda && item.emenda !== 'sem-emenda'
                ? item.emendaQtd && item.emendaQtd.trim().length > 0
                  ? item.emendaQtd
                  : undefined
                : undefined,
            terceirizado: item.terceirizado,
            acabamento_lona: item.acabamento_lona,
            valor_lona: item.valor_lona,
            quantidade_lona: item.quantidade_lona,
            outros_valores_lona: item.outros_valores_lona,
            acabamento_totem: item.acabamento_totem,
            acabamento_totem_outro: item.acabamento_totem_outro,
            valor_totem: item.valor_totem,
            quantidade_totem: item.quantidade_totem,
            outros_valores_totem: item.outros_valores_totem,
            tipo_adesivo: item.tipo_adesivo,
            valor_adesivo: item.valor_adesivo,
            quantidade_adesivo: item.quantidade_adesivo,
            outros_valores_adesivo: item.outros_valores_adesivo,
            ziper: item.ziper,
            cordinha_extra: item.cordinha_extra,
            alcinha: item.alcinha,
            toalha_pronta: item.toalha_pronta,
          };

          return payload;
        });

      if (!formData.cliente || formData.cliente.trim().length === 0) {
        toast({
          title: 'Erro',
          description: 'Nome do cliente é obrigatório.',
          variant: 'destructive',
        });
        return;
      }

      if (normalizedItems.length === 0) {
        toast({
          title: 'Erro',
          description: 'Adicione pelo menos um item ao pedido.',
          variant: 'destructive',
        });
        return;
      }

      const addressParts: string[] = [];
      if (formData.cidade_cliente) addressParts.push(formData.cidade_cliente);
      if (formData.telefone_cliente) addressParts.push(formData.telefone_cliente);
      const address = addressParts.length > 0 ? addressParts.join(', ') : 'Endereço não informado';

      let dataEntregaFormatted: string | null = null;
      if (formData.data_entrega) {
        try {
          if (formData.data_entrega.includes('/')) {
            const [day, month, year] = formData.data_entrega.split('/');
            dataEntregaFormatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            dataEntregaFormatted = formData.data_entrega;
          }
        } catch (error) {
          console.warn('Erro ao formatar data de entrega:', error);
        }
      }

      const valorFrete = parseLocaleNumber(formData.valor_frete || '0,00');

      if (isEditMode && selectedOrderId) {
        if (!currentOrder) {
          toast({
            title: 'Pedido não carregado',
            description: 'Carregue o pedido antes de salvar as alterações.',
            variant: 'destructive',
          });
          return;
        }

        // CRÍTICO: Fazer upload obrigatório de imagens ANTES de salvar pedido
        try {
          await uploadImagesBeforeSave(normalizedItems);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no upload de imagens';
          toast({
            title: 'Erro no upload de imagens',
            description: `${errorMessage}. O pedido não foi salvo.`,
            variant: 'destructive',
          });
          return; // NÃO SALVAR O PEDIDO se upload falhar
        }

        const updateItemsPayload: UpdateOrderItemRequest[] = normalizedItems.map(
          ({ orderItemId, ...rest }) => ({
            id: orderItemId,
            ...rest,
          })
        );

        const updateRequest: UpdateOrderRequest = {
          id: selectedOrderId,
          customer_name: formData.cliente,
          cliente: formData.cliente,
          address: address,
          cidade_cliente: formData.cidade_cliente || address,
          status: formData.status ?? OrderStatus.Pendente,
          items: updateItemsPayload,
          valor_frete: valorFrete,
          telefone_cliente: formData.telefone_cliente,
          estado_cliente: formData.estado_cliente,
          data_entrega: dataEntregaFormatted || undefined,
          prioridade: formData.prioridade,
          forma_envio: formData.forma_envio,
          forma_pagamento_id: formData.tipo_pagamento ? Number.parseInt(formData.tipo_pagamento, 10) : undefined,
          observacao: formData.observacao,
        };

        const updatedOrder = await api.updateOrder(updateRequest);

        const metadataPayload: UpdateOrderMetadataRequest = { id: selectedOrderId };
        let metadataChanged = false;
        const assignMetadataIfDiff = (
          key: keyof UpdateOrderMetadataRequest,
          newValue: any,
          currentValue: any,
          transform?: (value: any) => any,
        ) => {
          const normalize = (value: any) => {
            const transformed = transform ? transform(value) : value;
            if (transformed === null || transformed === undefined) {
              return null;
            }
            if (typeof transformed === 'string') {
              const trimmed = transformed.trim();
              return trimmed === '' ? null : trimmed;
            }
            return transformed;
          };

          if (normalize(newValue) !== normalize(currentValue)) {
            (metadataPayload as Record<string, any>)[key] = newValue;
            metadataChanged = true;
          }
        };

        assignMetadataIfDiff(
          'telefone_cliente',
          formData.telefone_cliente || '',
          updatedOrder.telefone_cliente ?? '',
        );
        assignMetadataIfDiff(
          'estado_cliente',
          formData.estado_cliente || '',
          updatedOrder.estado_cliente ?? '',
        );
        assignMetadataIfDiff(
          'prioridade',
          formData.prioridade || '',
          updatedOrder.prioridade ?? '',
        );
        assignMetadataIfDiff(
          'forma_envio',
          formData.forma_envio || '',
          updatedOrder.forma_envio ?? '',
        );
        assignMetadataIfDiff(
          'observacao',
          formData.observacao || '',
          updatedOrder.observacao ?? '',
        );
        assignMetadataIfDiff(
          'cidade_cliente',
          formData.cidade_cliente || '',
          updatedOrder.cidade_cliente ?? '',
        );
        assignMetadataIfDiff(
          'data_entrega',
          dataEntregaFormatted ?? '',
          toDateInputValue(updatedOrder.data_entrega ?? null),
        );
        const newFormaPagamentoId = formData.tipo_pagamento
          ? Number.parseInt(formData.tipo_pagamento, 10)
          : null;
        assignMetadataIfDiff(
          'forma_pagamento_id',
          newFormaPagamentoId,
          updatedOrder.forma_pagamento_id ?? null,
          (value) => (value === null || value === undefined ? null : Number(value)),
        );

        assignMetadataIfDiff(
          'estado_cliente',
          formData.estado_cliente || '',
          updatedOrder.estado_cliente ?? '',
        );

        let finalOrder = updatedOrder;
        if (metadataChanged) {
          try {
            finalOrder = await api.updateOrderMetadata(metadataPayload);
          } catch (metadataError) {
            const message =
              metadataError instanceof Error ? metadataError.message : String(metadataError);
            if (!message.toLowerCase().includes('nenhuma alteração')) {
              throw metadataError;
            }
          }
        }

        const orderIdentifier = finalOrder.numero ?? finalOrder.id.toString();
        toast({
          title: 'Pedido atualizado!',
          description: `Pedido ${orderIdentifier} atualizado com sucesso.`,
        });

        setShowResumoModal(false);
        setItemHasUnsavedChanges({});
        setCurrentOrder(finalOrder);
        populateFormFromOrder(finalOrder);
        updateOrderInStore(finalOrder);
        
        // Imagens já foram enviadas antes de salvar, então estão prontas
        console.log('[handleConfirmSave] ✅ Pedido atualizado com imagens já enviadas ao servidor');
        
        navigate('/dashboard/orders');
        return;
      }

      // CRÍTICO: Fazer upload obrigatório de imagens ANTES de criar pedido
      try {
        await uploadImagesBeforeSave(normalizedItems);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no upload de imagens';
        toast({
          title: 'Erro no upload de imagens',
          description: `${errorMessage}. O pedido não foi criado.`,
          variant: 'destructive',
        });
        return; // NÃO CRIAR O PEDIDO se upload falhar
      }

      const createItems: CreateOrderItemRequest[] = normalizedItems.map(
        ({ orderItemId, ...item }) => {
          // Remover orderItemId do objeto (não é necessário para criação)
          return item;
        }
      );

      const createOrderRequest: CreateOrderRequest = {
        cliente: formData.cliente,
        cidade_cliente: address,
        status: formData.status ?? OrderStatus.Pendente,
        items: createItems,
        data_entrada: formData.data_entrada,
        ...(dataEntregaFormatted && { data_entrega: dataEntregaFormatted }),
        ...(formData.forma_envio && { forma_envio: formData.forma_envio }),
        ...(formData.tipo_pagamento && {
          forma_pagamento_id: Number.parseInt(formData.tipo_pagamento, 10),
        }),
        ...(formData.prioridade && { prioridade: formData.prioridade }),
        ...(formData.observacao && { observacao: formData.observacao }),
        ...(formData.telefone_cliente && { telefone_cliente: formData.telefone_cliente }),
        ...(formData.cidade_cliente && { cidade_cliente: formData.cidade_cliente }),
        ...(formData.estado_cliente && { estado_cliente: formData.estado_cliente }),
        valor_frete: valorFrete,
      };

      const createdOrder = await api.createOrder(createOrderRequest);
      const orderIdentifier = createdOrder.numero ?? createdOrder.id.toString();

      // Imagens já foram enviadas antes de criar o pedido, então estão prontas
      console.log('[handleConfirmSave] ✅ Pedido criado com imagens já enviadas ao servidor');

      toast({
        title: 'Pedido criado!',
        description: `Pedido ${orderIdentifier} criado com sucesso!`,
      });

      setShowResumoModal(false);
      clearForm();
      navigate('/dashboard/orders');
    } catch (error) {
      console.error('Erro detalhado ao salvar pedido:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível salvar o pedido: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReabrirFicha = () => {
    setIsLocked(false);
    setLocalStatus(OrderStatus.EmProcessamento);
    setFormData((prev) => ({
      ...prev,
      status: OrderStatus.EmProcessamento,
    }));
    toast({
      title: 'Ficha reaberta',
      description: 'A ficha foi reaberta e agora pode ser editada.',
    });
  };

  // Mostrar loading quando estiver em modo edição
  // Se tem routeOrderId ou selectedOrderId, mostrar loading até carregar
  if (isEditMode) {
    // Se tem ID na rota mas ainda não foi setado no estado, aguardar
    if (routeOrderId && !selectedOrderId) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-lg font-medium">Preparando edição...</p>
            <p className="text-sm text-muted-foreground">ID: {routeOrderId}</p>
          </div>
        </div>
      );
    }
    
    // Se tem selectedOrderId mas está carregando ou não tem pedido ainda
    if (selectedOrderId) {
      if (isLoadingOrder || !currentOrder) {
        return (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-lg font-medium">Carregando pedido...</p>
              <p className="text-sm text-muted-foreground">ID: {selectedOrderId}</p>
            </div>
          </div>
        );
      }
    }
  }

  // Renderizar o formulário
  return (
    <div className="space-y-4 max-w-full mx-auto pb-8 px-4">

      {/* Alerta de Ficha Concluída */}
      {isLocked && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Esta ficha está concluída</h3>
                <p className="text-sm text-yellow-700 mt-1">Para editar, clique em "Reabrir ficha" abaixo.</p>
              </div>
            </div>
            <Button
              onClick={handleReabrirFicha}
              variant="outline"
              className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
            >
              Reabrir Ficha
            </Button>
          </div>
        </div>
      )}

      {/* Indicador de Validação */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-purple-800">Status da Validação</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${formData.cliente && formData.telefone_cliente && formData.cidade_cliente ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-600">Cliente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${formData.data_entrada && formData.data_entrega && formData.prioridade ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-600">Datas/Prioridade</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${tabs.some(tabId => {
                  const item = tabsData[tabId];
                  return item && item.tipo_producao && item.descricao;
                }) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-600">Itens</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${formData.forma_envio ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-600">Envio</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${calcularValorItens() > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-600">Valores</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {Object.keys(errors).length === 0 ? (
              <span className="text-green-600 font-medium">✓ Pedido válido</span>
            ) : (
              <span className="text-red-600 font-medium">⚠ {Object.keys(errors).length} erro(s)</span>
            )}
          </div>
        </div>
      </div>
      
      {/* 1. DADOS DO PEDIDO - Roxo */}
      <Card className="border-l-4 border-l-purple-500 bg-purple-50/30">
        <CardContent className="p-6 space-y-4">
          {/* Linha 1 - ID + Cliente + Telefone + Cidade */}
          <div className="grid grid-cols-12 gap-4">
            <div className="space-y-2 col-span-1">
              <Label className="text-base font-medium">ID</Label>
              <Input
                value={formData.numero}
                placeholder="Gerado automaticamente"
                readOnly
                className="bg-gray-100 font-mono h-12 text-base cursor-not-allowed w-32"
              />
            </div>

            <div className="space-y-2 col-span-7">
              <Label className="text-base font-medium">Nome do Cliente *</Label>
              <ClienteAutocomplete
                value={formData.cliente}
                onSelect={(cliente: Cliente | null) => {
                  if (cliente) {
                    setFormData(prev => ({
                      ...prev,
                      cliente: cliente.nome,
                      telefone_cliente: cliente.telefone ?? '',
                      cidade_cliente: cliente.cidade ?? '',
                    }));
                  }
                }}
                onInputChange={(value: string) => {
                  handleChange('cliente', value);
                }}
              />
              {errors.cliente && (
                <p className="text-red-500 text-sm">{errors.cliente}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-base font-medium">Telefone *</Label>
              <Input
                value={formData.telefone_cliente}
                onChange={(e) => handleChange('telefone_cliente', e.target.value)}
                placeholder="(11) 99999-9999"
                className={`bg-white h-12 text-base ${errors.telefone_cliente ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.telefone_cliente && (
                <p className="text-red-500 text-sm">{errors.telefone_cliente}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-base font-medium">Cidade *</Label>
              <Input
                value={formData.cidade_cliente}
                onChange={(e) => handleChange('cidade_cliente', e.target.value)}
                placeholder="São Paulo"
                className={`bg-white h-12 text-base ${errors.cidade_cliente ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.cidade_cliente && (
                <p className="text-red-500 text-sm">{errors.cidade_cliente}</p>
              )}
            </div>
          </div>

          {/* Linha 2 - Datas + Prioridade */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Data Entrada</Label>
              <Input
                type="date"
                value={formData.data_entrada}
                onChange={(e) => handleChange('data_entrada', e.target.value)}
                className={`bg-white h-12 text-base ${errors.data_entrada ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.data_entrada && (
                <p className="text-red-500 text-sm">{errors.data_entrada}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Data Entrega *</Label>
              <Input
                type="date"
                value={formData.data_entrega}
                onChange={(e) => handleChange('data_entrega', e.target.value)}
                className={`bg-white h-12 text-base ${errors.data_entrega ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.data_entrega && (
                <p className="text-red-500 text-sm">{errors.data_entrega}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Prioridade *</Label>
              <Select value={formData.prioridade} onValueChange={(value) => handleChange('prioridade', value)}>
                <SelectTrigger className={`bg-white h-12 text-base ${errors.prioridade ? 'border-red-500 focus:border-red-500' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="ALTA">⚡ Alta</SelectItem>
                </SelectContent>
              </Select>
              {errors.prioridade && (
                <p className="text-red-500 text-sm">{errors.prioridade}</p>
              )}
            </div>
          </div>

          {/* Linha 3 - Observações (largura total) */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Observações</Label>
            <Input
              value={formData.observacao}
              onChange={(e) => handleChange('observacao', e.target.value)}
              placeholder="Observações..."
              className="bg-white h-12 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. ITENS - Verde */}
      <Card className={`border-l-4 border-l-green-500 bg-green-50/30 ${errors.items ? 'border-l-red-500 bg-red-50/30' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-lg font-semibold">Itens do Pedido</Label>
            <Button
              onClick={handleAddTab}
              className="h-11 gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-5 w-5" />
              Adicionar
            </Button>
          </div>
          
          {errors.items && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{errors.items}</p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto">
              <TabsList className="bg-green-100 h-11 min-w-max">
                {tabs.map((tabId, index) => (
                  <div key={tabId} className="flex items-center">
                    <TabsTrigger value={tabId} className="text-base h-9 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>Item {index + 1}</span>
                        {itemHasUnsavedChanges[tabId] && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full" title="Mudanças não salvas"></div>
                        )}
                      </div>
                      {tabs.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTab(tabId);
                          }}
                          className="ml-2 hover:bg-red-100 rounded-full p-1"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      )}
                    </TabsTrigger>
                  </div>
                ))}
              </TabsList>
            </div>

            {tabs.map((tabId) => (
              <TabsContent key={tabId} value={tabId} className="space-y-4 mt-4">
                {/* Tipo de Produção */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Tipo de Produção *</Label>
                  <Select
                    value={tabsData[tabId]?.tipo_producao || ''}
                    onValueChange={(value) => handleTabDataChange(tabId, 'tipo_producao', value)}
                  >
                    <SelectTrigger className="bg-white h-12 text-base">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposProducao.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {tabsData[tabId]?.tipo_producao === 'painel' && (
                  <div className="border border-green-200 rounded-lg p-6 bg-white">
                    <FormPainelCompleto
                      tabId={tabId}
                      tabData={tabsData[tabId]}
                      vendedores={vendedores}
                      designers={designers}
                      tecidos={materiaisTecido}
                      onDataChange={(field, value) => handleTabDataChange(tabId, field, value)}
                      onSaveItem={() => handleSaveItem(tabId)}
                      onCancelItem={() => handleCancelItem(tabId)}
                      hasUnsavedChanges={itemHasUnsavedChanges[tabId] || false}
                      mode="painel"
                    />
                  </div>
                )}

                {tabsData[tabId]?.tipo_producao === 'generica' && (
                  <div className="border border-green-200 rounded-lg p-6 bg-white">
                    <FormPainelCompleto
                      tabId={tabId}
                      tabData={tabsData[tabId]}
                      vendedores={vendedores}
                      designers={designers}
                      tecidos={materiaisTecido}
                      onDataChange={(field, value) => handleTabDataChange(tabId, field, value)}
                      onSaveItem={() => handleSaveItem(tabId)}
                      onCancelItem={() => handleCancelItem(tabId)}
                      hasUnsavedChanges={itemHasUnsavedChanges[tabId] || false}
                      mode="generica"
                    />
                  </div>
                )}

                {tabsData[tabId]?.tipo_producao === 'lona' && (
                  <div className="border border-green-200 rounded-lg p-6 bg-white">
                    <FormLonaProducao
                      tabId={tabId}
                      tabData={tabsData[tabId]}
                      vendedores={vendedores}
                      designers={designers}
                      tiposLona={materiaisLona}
                      onDataChange={(field, value) => handleTabDataChange(tabId, field, value)}
                      onSaveItem={() => handleSaveItem(tabId)}
                      onCancelItem={() => handleCancelItem(tabId)}
                      hasUnsavedChanges={itemHasUnsavedChanges[tabId] || false}
                    />
                  </div>
                )}

                {tabsData[tabId]?.tipo_producao === 'adesivo' && (
                  <div className="border border-green-200 rounded-lg p-6 bg-white">
                    <FormAdesivoProducao
                      tabId={tabId}
                      tabData={tabsData[tabId]}
                      vendedores={vendedores}
                      designers={designers}
                      tiposAdesivo={tiposAdesivo}
                      onDataChange={(field, value) => handleTabDataChange(tabId, field, value)}
                      onSaveItem={() => handleSaveItem(tabId)}
                      onCancelItem={() => handleCancelItem(tabId)}
                      hasUnsavedChanges={itemHasUnsavedChanges[tabId] || false}
                    />
                  </div>
                )}

                {tabsData[tabId]?.tipo_producao === 'totem' && (
                  <div className="border border-green-200 rounded-lg p-6 bg-white">
                    <FormTotemProducao
                      tabId={tabId}
                      tabData={tabsData[tabId]}
                      vendedores={vendedores}
                      designers={designers}
                      materiais={materiaisTotem}
                      onDataChange={(field, value) => handleTabDataChange(tabId, field, value)}
                      onSaveItem={() => handleSaveItem(tabId)}
                      onCancelItem={() => handleCancelItem(tabId)}
                      hasUnsavedChanges={itemHasUnsavedChanges[tabId] || false}
                    />
                  </div>
                )}

                {tabsData[tabId]?.tipo_producao && !['painel', 'generica', 'totem', 'lona', 'adesivo'].includes(tabsData[tabId]?.tipo_producao) && (
                  <div className="space-y-4 border border-green-200 rounded-lg p-6 bg-white">
                    {/* Descrição */}
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Descrição *</Label>
                      <Input
                        value={tabsData[tabId]?.descricao || ''}
                        onChange={(e) => handleTabDataChange(tabId, 'descricao', e.target.value)}
                        placeholder="Ex: Banner 3x2m"
                        className={`h-12 text-base ${errors[`item_${tabId}_descricao`] ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {errors[`item_${tabId}_descricao`] && (
                        <p className="text-red-500 text-sm">{errors[`item_${tabId}_descricao`]}</p>
                      )}
                    </div>

                    {/* Medidas */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Largura (m)</Label>
                        <Input
                          value={tabsData[tabId]?.largura || ''}
                          onChange={(e) => handleTabDataChange(tabId, 'largura', e.target.value)}
                          placeholder="3,00"
                          className={`h-12 text-base ${errors[`item_${tabId}_largura`] ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        {errors[`item_${tabId}_largura`] && (
                          <p className="text-red-500 text-sm">{errors[`item_${tabId}_largura`]}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-medium">Altura (m)</Label>
                        <Input
                          value={tabsData[tabId]?.altura || ''}
                          onChange={(e) => handleTabDataChange(tabId, 'altura', e.target.value)}
                          placeholder="2,00"
                          className={`h-12 text-base ${errors[`item_${tabId}_altura`] ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        {errors[`item_${tabId}_altura`] && (
                          <p className="text-red-500 text-sm">{errors[`item_${tabId}_altura`]}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-medium">Área (m²)</Label>
                        <Input
                          value={tabsData[tabId]?.metro_quadrado || '0,00'}
                          disabled
                          className="bg-green-100 font-bold text-green-800 h-12 text-base"
                        />
                      </div>
                    </div>

                    {/* Vendedor, Designer, Tecido */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Vendedor</Label>
                        <Select
                          value={tabsData[tabId]?.vendedor || ''}
                          onValueChange={(value) => handleTabDataChange(tabId, 'vendedor', value)}
                        >
                          <SelectTrigger className="bg-white h-12 text-base">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendedores.map(v => (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-medium">Designer</Label>
                        <Select
                          value={tabsData[tabId]?.designer || ''}
                          onValueChange={(value) => handleTabDataChange(tabId, 'designer', value)}
                        >
                          <SelectTrigger className="bg-white h-12 text-base">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {designers.map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-medium">Tecido</Label>
                        <Select
                          value={tabsData[tabId]?.tecido || ''}
                          onValueChange={(value) => handleTabDataChange(tabId, 'tecido', value)}
                        >
                          <SelectTrigger className="bg-white h-12 text-base">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {materiaisTecido.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Acabamentos */}
                    <div className="flex items-center gap-6 p-4 bg-green-50 rounded border border-green-200">
                      <Label className="text-base font-medium">Acabamentos:</Label>
                      <div className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`overloque-${tabId}`}
                            checked={tabsData[tabId]?.overloque || false}
                            onCheckedChange={(checked) => handleTabDataChange(tabId, 'overloque', checked)}
                          />
                          <label htmlFor={`overloque-${tabId}`} className="text-base cursor-pointer">
                            Overloque
                          </label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`elastico-${tabId}`}
                            checked={tabsData[tabId]?.elastico || false}
                            onCheckedChange={(checked) => handleTabDataChange(tabId, 'elastico', checked)}
                          />
                          <label htmlFor={`elastico-${tabId}`} className="text-base cursor-pointer">
                            Elástico
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Emenda e Valor */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Emenda</Label>
                        <Select
                          value={tabsData[tabId]?.emenda || 'sem-emenda'}
                          onValueChange={(value) => handleTabDataChange(tabId, 'emenda', value)}
                        >
                          <SelectTrigger className="bg-white h-12 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem-emenda">Sem Emenda</SelectItem>
                            <SelectItem value="com-emenda">Com Emenda</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    <div className="space-y-2">
                      <Label className="text-base font-medium">Valor Unitário (R$)</Label>
                      <CurrencyInput
                        value={tabsData[tabId]?.valor_unitario || '0,00'}
                        onValueChange={(formatted) => handleTabDataChange(tabId, 'valor_unitario', formatted)}
                        placeholder="0,00"
                        className={`h-12 bg-white text-base font-semibold ${errors[`item_${tabId}_valor`] ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {errors[`item_${tabId}_valor`] && (
                        <p className="text-red-500 text-sm">{errors[`item_${tabId}_valor`]}</p>
                      )}
                    </div>
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Observações</Label>
                      <Textarea
                        value={tabsData[tabId]?.observacao || ''}
                        onChange={(e) => handleTabDataChange(tabId, 'observacao', e.target.value)}
                        placeholder="Obs do item..."
                        rows={3}
                        className="bg-white text-base"
                      />
                    </div>

                    {/* Botões de ação para outros tipos */}
                    <div className="flex justify-between items-center pt-4 border-t border-green-200">
                      {itemHasUnsavedChanges[tabId] && (
                        <div className="flex items-center gap-2 text-orange-600 text-sm">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>Mudanças não salvas</span>
                        </div>
                      )}
                      
                      <div className="flex gap-4 ml-auto">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => handleCancelItem(tabId)}
                          className="h-12 px-6 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleSaveItem(tabId)}
                          className="h-12 px-6 bg-green-600 hover:bg-green-700"
                        >
                          Salvar Item
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 3. PAGAMENTO - Laranja */}
      <Card className="border-l-4 border-l-orange-500 bg-orange-50/30">
        <CardContent className="p-6 space-y-4">
          {/* Linha 1 */}
          <div className={`grid gap-4 ${descontoAtivo ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="space-y-2">
              <Label className="text-base font-medium">Forma de Envio *</Label>
              <Select
                value={formData.forma_envio}
                onValueChange={(value) => {
                  handleChange('forma_envio', value);
                  const forma = formasEnvio.find(f => f.nome === value);
                  if (forma) {
                    handleChange('valor_frete', parseFloat(forma.valor).toFixed(2).replace('.', ','));
                  }
                }}
              >
                <SelectTrigger className={`bg-white h-12 text-base ${errors.forma_envio ? 'border-red-500 focus:border-red-500' : ''}`}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {formasEnvio.map(fe => (
                    <SelectItem key={fe.id} value={fe.nome}>
                      {fe.nome} {parseFloat(fe.valor) > 0 && `- R$ ${parseFloat(fe.valor).toFixed(2)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.forma_envio && (
                <p className="text-red-500 text-sm">{errors.forma_envio}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Forma de Pagamento</Label>
              <Select
                value={formData.tipo_pagamento}
                onValueChange={(value) => handleChange('tipo_pagamento', value)}
              >
                <SelectTrigger className="bg-white h-12 text-base">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(fp => (
                    <SelectItem key={fp.id} value={fp.id.toString()}>{fp.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {descontoAtivo && (
              <div className="space-y-2">
                <Label className="text-base font-medium">Desconto</Label>
                <Select
                  value={formData.desconto_tipo}
                  onValueChange={(value) => handleChange('desconto_tipo', value)}
                >
                  <SelectTrigger className="bg-white h-12 text-base">
                    <SelectValue placeholder="Sem desconto" />
                  </SelectTrigger>
                  <SelectContent>
                    {descontos.map(d => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Linha 2 - Valores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Valor Frete (R$)</Label>
              <CurrencyInput
                value={formData.valor_frete || '0,00'}
                onValueChange={(formatted) => handleChange('valor_frete', formatted)}
                className={`h-12 bg-white text-base ${errors.valor_frete ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.valor_frete && (
                <p className="text-red-500 text-sm">{errors.valor_frete}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Valor Itens (R$)</Label>
              <Input
                value={calcularValorItens().toFixed(2).replace('.', ',')}
                disabled
                className={`bg-orange-100 font-bold text-orange-900 h-12 text-base ${errors.valor_itens ? 'border-red-500' : ''}`}
              />
              {errors.valor_itens && (
                <p className="text-red-500 text-sm">{errors.valor_itens}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Valor Total (R$)</Label>
              <Input
                value={calcularTotalFormatado()}
                disabled
                className={`bg-emerald-100 font-bold text-emerald-900 h-12 text-xl ${errors.valor_total ? 'border-red-500' : ''}`}
              />
              {errors.valor_total && (
                <p className="text-red-500 text-sm">{errors.valor_total}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-4 flex-wrap justify-end">
        <Button
          variant="outline"
          className="h-11 text-base"
          onClick={() => navigate('/dashboard/orders')}
        >
          Cancelar
        </Button>

        <Button
          onClick={handleSalvar}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 h-11 text-base"
        >
          <Save className="h-5 w-5" />
          Salvar Pedido
        </Button>
      </div>

      {/* Modal de Validação de Item */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600">⚠️ Campos Obrigatórios</DialogTitle>
            <DialogDescription>
              Corrija os seguintes erros antes de salvar o item:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold mb-3 text-red-900">Erros encontrados:</h3>
              <ul className="space-y-2">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="text-red-500 font-bold">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>

            {optionalWarnings.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-semibold mb-3 text-yellow-900">Avisos opcionais:</h3>
                <ul className="space-y-1">
                  {optionalWarnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-yellow-700">
                      <span className="text-yellow-500 font-bold">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowValidationModal(false)}
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setShowValidationModal(false);
                // Focar no primeiro campo com erro (se possível)
                toast({
                  title: "Corrija os campos obrigatórios",
                  description: "Preencha todos os campos marcados como obrigatórios.",
                  variant: "destructive",
                });
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Resumo */}
      <Dialog open={showResumoModal} onOpenChange={setShowResumoModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Resumo do Pedido</DialogTitle>
            <DialogDescription>
              Confira os dados antes de salvar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold mb-2 text-purple-900">Dados do Pedido</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Número:</strong> {formData.numero || 'Gerado ao salvar'}</p>
                <p><strong>Cliente:</strong> {formData.cliente}</p>
                <p><strong>Data Entrega:</strong> {formData.data_entrega}</p>
                <p><strong>Prioridade:</strong> {formData.prioridade}</p>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold mb-2 text-green-900">Itens ({tabs.length})</h3>
              {tabs.map((tabId, index) => {
                const item = tabsData[tabId];
                if (!item?.tipo_producao) return null;
                
                // Calcular valor total do item considerando quantidade
                const valorUnitario = parseLocaleNumber(item.valor_unitario || '0,00');
                let valorTotalItem = valorUnitario;
                
                if (item.tipo_producao === 'painel' || item.tipo_producao === 'generica') {
                  const quantidade = parseInt(item.quantidade_paineis || '1');
                  valorTotalItem = valorUnitario * quantidade;
                } else if (item.tipo_producao === 'totem') {
                  const quantidadeTotem = parseInt(item.quantidade_totem || '1');
                  valorTotalItem = valorUnitario * quantidadeTotem;
                } else if (item.tipo_producao === 'lona') {
                  const quantidadeLona = parseInt(item.quantidade_lona || '1');
                  valorTotalItem = valorUnitario * (Number.isNaN(quantidadeLona) || quantidadeLona <= 0 ? 1 : quantidadeLona);
                } else if (item.tipo_producao === 'adesivo') {
                  const quantidadeAdesivo = parseInt(item.quantidade_adesivo || '1');
                  valorTotalItem = valorUnitario * (Number.isNaN(quantidadeAdesivo) || quantidadeAdesivo <= 0 ? 1 : quantidadeAdesivo);
                }
                
                const valorFormatado = formatCurrencyBR(valorTotalItem);
                
                return (
                  <div key={tabId} className="text-sm mb-2">
                    <strong>{index + 1}.</strong> {item.descricao} - {tiposProducao.find(t => t.value === item.tipo_producao)?.label}
                    {(item.tipo_producao === 'painel' || item.tipo_producao === 'generica') && parseInt(item.quantidade_paineis || '1') > 1 && (
                      <span> (Qtd: {item.quantidade_paineis})</span>
                    )}
                    {item.tipo_producao === 'totem' && parseInt(item.quantidade_totem || '1') > 1 && (
                      <span> (Qtd: {item.quantidade_totem})</span>
                    )}
                    {item.tipo_producao === 'lona' && parseInt(item.quantidade_lona || '1') > 1 && (
                      <span> (Qtd: {item.quantidade_lona})</span>
                    )}
                    {item.tipo_producao === 'adesivo' && parseInt(item.quantidade_adesivo || '1') > 1 && (
                      <span> (Qtd: {item.quantidade_adesivo})</span>
                    )}
                    <span> - R$ {valorFormatado}</span>
                  </div>
                );
              })}
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold mb-2 text-orange-900">Valores</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Valor Itens:</span>
                  <span className="font-semibold">R$ {formatCurrencyBR(calcularValorItens())}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frete:</span>
                  <span className="font-semibold">R$ {formatCurrencyBR(parseLocaleNumber(formData.valor_frete))}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-emerald-700">R$ {formatCurrencyBR(calcularTotal())}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResumoModal(false)}
              disabled={isSaving}
            >
              Voltar
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? 'Salvando...' : '✓ Confirmar e Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
