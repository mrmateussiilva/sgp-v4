import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Save, Clock, Eye } from 'lucide-react';
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
import { Cliente, OrderStatus } from '@/types';
import { api } from '@/services/api';
import { FormPainelCompleto } from '@/components/FormPainelCompleto';

const TIPOS_PRODUCAO = [
  { value: 'painel', label: 'Painel' },
  { value: 'totem', label: 'Totem' },
  { value: 'lona', label: 'Lona' },
  { value: 'almofada', label: 'Almofada' },
  { value: 'bolsinha', label: 'Bolsinha' },
];

interface TabItem {
  id: string;
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
  valor_painel: string;
  valores_adicionais: string;
  emenda: string;
  observacao: string;
  valor_unitario: string;
}

export default function CreateOrderComplete() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    numero: '',
    cliente: '',
    telefone_cliente: '',
    cidade_cliente: '',
    data_entrada: new Date().toISOString().split('T')[0],
    data_entrega: '',
    prioridade: 'NORMAL',
    observacao: '',
    forma_envio: '',
    tipo_pagamento: '',
    desconto_tipo: '',
    valor_frete: '0,00',
  });

  // Gerar próximo ID automaticamente
  useEffect(() => {
    const generateNextId = async () => {
      try {
        const orders = await api.getOrders();
        const maxId = orders.length > 0 ? Math.max(...orders.map(order => order.id)) : 0;
        const nextId = (maxId + 1).toString().padStart(10, '0');
        setFormData(prev => ({ ...prev, numero: nextId }));
      } catch (error) {
        console.error('Erro ao gerar próximo ID:', error);
        // Fallback: usar timestamp como ID com 10 caracteres
        const fallbackId = Date.now().toString().slice(-10).padStart(10, '0');
        setFormData(prev => ({ ...prev, numero: fallbackId }));
      }
    };

    generateNextId();
  }, []);

  const [tabs, setTabs] = useState<string[]>(['tab-1']);
  const [activeTab, setActiveTab] = useState('tab-1');
  const [tabsData, setTabsData] = useState<Record<string, TabItem>>({
    'tab-1': {
      id: 'tab-1',
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
      valor_painel: '0,00',
      valores_adicionais: '0,00',
      emenda: 'sem-emenda',
      observacao: '',
      valor_unitario: '0,00',
    }
  });

  // Estado para gerenciar mudanças não salvas de cada item
  const [itemHasUnsavedChanges, setItemHasUnsavedChanges] = useState<Record<string, boolean>>({});

  const [showResumoModal, setShowResumoModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [vendedores, setVendedores] = useState<string[]>([]);
  const [designers, setDesigners] = useState<string[]>([]);
  const [tecidos, setTecidos] = useState<string[]>([]);
  const [formasEnvio, setFormasEnvio] = useState<any[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [descontos] = useState([
    { id: 1, name: 'Sem Desconto', type: 'none', value: 0 },
    { id: 2, name: '5%', type: 'percentual', value: 5 },
    { id: 3, name: '10%', type: 'percentual', value: 10 },
    { id: 4, name: 'R$ 50,00', type: 'valor_fixo', value: 50 },
  ]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // Gerar novo ID para o pedido
    const numero = `PED-${Date.now()}`;
    setFormData(prev => ({ ...prev, numero }));
  }, []);

  // Carregar catálogos do banco (ativos)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [vend, des, tec] = await Promise.all([
          api.getVendedoresAtivos(),
          api.getDesignersAtivos(),
          api.getTecidosAtivos(),
        ]);
        if (!isMounted) return;
        setVendedores(vend.map(v => v.nome));
        setDesigners(des.map(d => d.nome));
        setTecidos(tec);
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
      const largura = parseFloat(String(currentData.largura).replace(',', '.')) || 0;
      const altura = parseFloat(String(currentData.altura).replace(',', '.')) || 0;
      const area = (largura * altura).toFixed(2).replace('.', ',');
      
      // Atualizar área apenas se mudou
      if (currentData.metro_quadrado !== area) {
        handleTabDataChange(activeTab, 'metro_quadrado', area);
      }
    }
  }, [tabsData[activeTab]?.largura, tabsData[activeTab]?.altura, activeTab]);


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
          if (!item.largura || parseFloat(item.largura.replace(',', '.')) <= 0) {
            errors[`item_${tabId}_largura`] = 'Largura deve ser maior que zero';
          }
          if (!item.altura || parseFloat(item.altura.replace(',', '.')) <= 0) {
            errors[`item_${tabId}_altura`] = 'Altura deve ser maior que zero';
          }
        }

        // Validar valor unitário
        const valorUnitario = parseFloat(String(item.valor_unitario || '0,00').replace(/\./g, '').replace(',', '.')) || 0;
        if (valorUnitario <= 0) {
          errors[`item_${tabId}_valor`] = 'Valor unitário deve ser maior que zero';
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
    const valorFrete = parseFloat(formData.valor_frete.replace(/\./g, '').replace(',', '.')) || 0;
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
    const valorTotal = parseFloat(calcularTotal().replace('.', '').replace(',', '.'));
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
        const valorFrete = parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
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
      [newTabId]: {
        id: newTabId,
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
        valor_painel: '0,00',
        valores_adicionais: '0,00',
        emenda: 'sem-emenda',
        observacao: '',
        valor_unitario: '0,00',
      }
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

  const handleSaveItem = (tabId: string) => {
    const currentItemData = tabsData[tabId];
    if (!currentItemData) return;

    // Validar se o item tem dados mínimos
    if (!currentItemData.tipo_producao || !currentItemData.descricao) {
      toast({
        title: "Erro",
        description: "Preencha pelo menos o tipo de produção e descrição.",
        variant: "destructive",
      });
      return;
    }

    // Validar valor unitário
    const valorUnitario = parseFloat(String(currentItemData.valor_unitario || '0,00').replace(/\./g, '').replace(',', '.')) || 0;
    if (valorUnitario <= 0) {
      toast({
        title: "Erro",
        description: "O valor unitário deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

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
    const emptyItem: TabItem = {
      id: tabId,
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
      valor_painel: '0,00',
      valores_adicionais: '0,00',
      emenda: 'sem-emenda',
      observacao: '',
      valor_unitario: '0,00',
    };

    setTabsData(prev => ({
      ...prev,
      [tabId]: emptyItem
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
      const valorUnitario = String(item.valor_unitario || '0,00');
      const valor = parseFloat(valorUnitario.replace(/\./g, '').replace(',', '.')) || 0;
      
      return sum + valor;
    }, 0);

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

  const calcularTotal = () => {
    const valorItens = calcularValorItens();
    const frete = parseFloat(formData.valor_frete.replace(/\./g, '').replace(',', '.')) || 0;
    return (valorItens + frete).toFixed(2).replace('.', ',');
  };

  const handleSalvar = () => {
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
      data_entrada: new Date().toISOString().split('T')[0],
      data_entrega: '',
      prioridade: 'NORMAL',
      observacao: '',
      forma_envio: '',
      tipo_pagamento: '',
      desconto_tipo: '',
      valor_frete: '0,00',
    });

    // Limpar dados dos itens
    const emptyItem: TabItem = {
      id: 'tab-1',
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
      valor_painel: '0,00',
      valores_adicionais: '0,00',
      emenda: 'sem-emenda',
      observacao: '',
      valor_unitario: '0,00',
    };

    setTabs(['tab-1']);
    setTabsData({ 'tab-1': emptyItem });
    setItemHasUnsavedChanges({});
    setActiveTab('tab-1');
    setErrors({});

    // Gerar novo ID após limpar tudo
    setTimeout(() => {
      const numero = `PED-${Date.now()}`;
      setFormData(prev => ({ ...prev, numero }));
    }, 100);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);

    try {
      // Converter dados do formulário para o formato esperado pelo backend
      const items = tabs
        .filter(tabId => {
          const item = tabsData[tabId];
          return item && item.tipo_producao && item.descricao;
        })
        .map(tabId => {
          const item = tabsData[tabId];
          const valorUnitario = parseFloat(String(item.valor_unitario || '0,00').replace(/\./g, '').replace(',', '.')) || 0;
          
          return {
            item_name: `${item.tipo_producao.toUpperCase()}: ${item.descricao}`,
            quantity: 1,
            unit_price: valorUnitario,
          };
        });

      if (items.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um item ao pedido.",
          variant: "destructive",
        });
        return;
      }

      const createOrderRequest = {
        customer_name: formData.cliente,
        address: `${formData.cidade_cliente}, ${formData.telefone_cliente}`, // Usando cidade e telefone como endereço temporário
        status: OrderStatus.Pendente,
        items: items
      };

      // Criar o pedido via API
      await api.createOrder(createOrderRequest);

      // Limpar rascunho após salvamento bem-sucedido

      toast({
        title: "Pedido criado!",
        description: `Pedido ${formData.numero} criado com sucesso!`,
      });

      setShowResumoModal(false);
      
      // Limpar formulário após salvamento bem-sucedido
      clearForm();
      
      // Navegar para a lista de pedidos
      navigate('/dashboard/orders');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o pedido.",
        variant: "destructive",
      });
      console.error('Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-full mx-auto pb-8 px-4">

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
            <div className="space-y-2 col-span-2">
              <Label className="text-base font-medium">ID</Label>
              <Input
                value={formData.numero}
                readOnly
                className="bg-gray-100 font-mono h-12 text-base cursor-not-allowed w-32"
              />
            </div>

            <div className="space-y-2 col-span-6">
              <Label className="text-base font-medium">Nome do Cliente *</Label>
              <ClienteAutocomplete
                value={formData.cliente}
                onSelect={(cliente: Cliente | null) => {
                  if (cliente) {
                    setFormData(prev => ({
                      ...prev,
                      cliente: cliente.nome,
                      telefone_cliente: cliente.telefone,
                      cidade_cliente: cliente.cidade,
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
                      {TIPOS_PRODUCAO.map(tipo => (
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
                      tecidos={tecidos}
                      onDataChange={(field, value) => handleTabDataChange(tabId, field, value)}
                      onSaveItem={() => handleSaveItem(tabId)}
                      onCancelItem={() => handleCancelItem(tabId)}
                      hasUnsavedChanges={itemHasUnsavedChanges[tabId] || false}
                    />
                  </div>
                )}

                {tabsData[tabId]?.tipo_producao && tabsData[tabId]?.tipo_producao !== 'painel' && (
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
                            {tecidos.map(t => (
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
                        <Input
                          value={tabsData[tabId]?.valor_unitario || '0,00'}
                          onChange={(e) => handleTabDataChange(tabId, 'valor_unitario', e.target.value)}
                          placeholder="0,00"
                          className={`bg-white h-12 text-base font-semibold ${errors[`item_${tabId}_valor`] ? 'border-red-500 focus:border-red-500' : ''}`}
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
          <div className="grid grid-cols-3 gap-4">
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
                    <SelectItem key={fp.id} value={fp.nome}>{fp.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* Linha 2 - Valores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Valor Frete (R$)</Label>
              <Input
                value={formData.valor_frete}
                onChange={(e) => handleChange('valor_frete', e.target.value)}
                className={`bg-white h-12 text-base ${errors.valor_frete ? 'border-red-500 focus:border-red-500' : ''}`}
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
                value={calcularTotal()}
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
      <div className="flex gap-4 flex-wrap">
        <Button
          variant="outline"
          className="gap-2 h-11 text-base"
          onClick={() => toast({ title: "Em espera" })}
        >
          <Clock className="h-5 w-5" />
          Em Espera
        </Button>

        <Button
          variant="outline"
          className="h-11 text-base"
          onClick={() => navigate('/dashboard/orders')}
        >
          Cancelar
        </Button>

        <Button
          variant="outline"
          className="gap-2 h-11 text-base"
          onClick={clearForm}
        >
          <Plus className="h-5 w-5" />
          Novo Pedido
        </Button>


        <Button
          variant="secondary"
          className="gap-2 h-11 text-base"
          onClick={handleSalvar}
        >
          <Eye className="h-5 w-5" />
          Resumo
        </Button>

        <Button
          onClick={handleSalvar}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 ml-auto h-11 text-base"
        >
          <Save className="h-5 w-5" />
          Salvar Pedido
        </Button>
      </div>

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
                <p><strong>Número:</strong> {formData.numero}</p>
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
                return (
                  <div key={tabId} className="text-sm mb-2">
                    <strong>{index + 1}.</strong> {item.descricao} - {TIPOS_PRODUCAO.find(t => t.value === item.tipo_producao)?.label} - R$ {item.valor_unitario}
                  </div>
                );
              })}
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold mb-2 text-orange-900">Valores</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Valor Itens:</span>
                  <span className="font-semibold">R$ {calcularValorItens().toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frete:</span>
                  <span className="font-semibold">R$ {formData.valor_frete}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-emerald-700">R$ {calcularTotal()}</span>
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
