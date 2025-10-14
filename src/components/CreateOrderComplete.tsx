import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Save, Calendar, User, Phone, MapPin, Truck, CreditCard, Package, Scissors, Clock, Eye } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
  ilhos: boolean;
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
      ilhos: false,
      emenda: 'sem-emenda',
      observacao: '',
      valor_unitario: '0,00',
    }
  });

  const [showResumoModal, setShowResumoModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [vendedores] = useState(['Vendedor 1', 'Vendedor 2', 'Vendedor 3']);
  const [designers] = useState(['Designer 1', 'Designer 2', 'Designer 3']);
  const [tecidos] = useState(['Oxford', 'Cetim', 'Blackout', 'Lona']);
  const [formasPagamento] = useState(['Dinheiro', 'PIX', 'Cartão Crédito', 'Cartão Débito', 'Boleto']);
  const [formasEnvio] = useState([
    { id: 1, name: 'Retirada', value: 0 },
    { id: 2, name: 'Entrega Local', value: 15 },
    { id: 3, name: 'Sedex', value: 25 },
    { id: 4, name: 'PAC', value: 20 },
  ]);
  const [descontos] = useState([
    { id: 1, name: 'Sem Desconto', type: 'none', value: 0 },
    { id: 2, name: '5%', type: 'percentual', value: 5 },
    { id: 3, name: '10%', type: 'percentual', value: 10 },
    { id: 4, name: 'R$ 50,00', type: 'valor_fixo', value: 50 },
  ]);

  useEffect(() => {
    const numero = `PED-${Date.now()}`;
    setFormData(prev => ({ ...prev, numero }));
  }, []);

  useEffect(() => {
    const currentData = tabsData[activeTab];
    if (currentData && currentData.largura && currentData.altura) {
      const largura = parseFloat(currentData.largura.replace(',', '.')) || 0;
      const altura = parseFloat(currentData.altura.replace(',', '.')) || 0;
      const area = (largura * altura).toFixed(2).replace('.', ',');
      handleTabDataChange(activeTab, 'metro_quadrado', area);
    }
  }, [tabsData[activeTab]?.largura, tabsData[activeTab]?.altura, activeTab]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTabDataChange = (tabId: string, field: string, value: any) => {
    setTabsData(prev => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        [field]: value
      }
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
        ilhos: false,
        emenda: 'sem-emenda',
        observacao: '',
        valor_unitario: '0,00',
      }
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
    
    if (activeTab === tabId) {
      setActiveTab(newTabs[0]);
    }
  };

  const calcularValorItens = () => {
    const totalBruto = tabs.reduce((sum, tabId) => {
      const item = tabsData[tabId];
      if (!item || !item.tipo_producao) return sum;
      const valor = parseFloat(item.valor_unitario.replace(/\./g, '').replace(',', '.')) || 0;
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
    if (!formData.cliente || !formData.data_entrega) {
      toast({
        title: "Erro",
        description: "Preencha nome do cliente e data de entrega.",
        variant: "destructive",
      });
      return;
    }

    const itensPreenchidos = tabs.filter(tabId => {
      const item = tabsData[tabId];
      return item && item.tipo_producao && item.descricao;
    });

    if (itensPreenchidos.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um item ao pedido.",
        variant: "destructive",
      });
      return;
    }

    setShowResumoModal(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);

    try {
      toast({
        title: "Pedido criado!",
        description: `Pedido ${formData.numero} criado com sucesso!`,
      });

      setShowResumoModal(false);
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
    <div className="space-y-2 max-w-7xl mx-auto pb-8">
      {/* Header Compacto */}
      <div className="flex items-center justify-between p-2 bg-slate-100 rounded border">
        <h1 className="text-xl font-bold">Novo Pedido</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Nº</span>
          <span className="text-xl font-mono font-bold text-primary">#{formData.numero}</span>
        </div>
      </div>

      {/* 1. DADOS DO PEDIDO - Roxo */}
      <Card className="border-l-4 border-l-purple-500 bg-purple-50/30">
        <CardContent className="p-2 space-y-2">
          {/* Linha 1 */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">ID</Label>
              <Input
                value={formData.numero}
                disabled
                className="bg-white/50 font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nome do Cliente *</Label>
              <Input
                value={formData.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
                placeholder="Digite o nome"
                className="bg-white h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input
                value={formData.telefone_cliente}
                onChange={(e) => handleChange('telefone_cliente', e.target.value)}
                placeholder="(11) 99999-9999"
                className="bg-white h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Cidade</Label>
              <Input
                value={formData.cidade_cliente}
                onChange={(e) => handleChange('cidade_cliente', e.target.value)}
                placeholder="São Paulo"
                className="bg-white h-9"
              />
            </div>
          </div>

          {/* Linha 2 */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Data Entrada</Label>
              <Input
                type="date"
                value={formData.data_entrada}
                onChange={(e) => handleChange('data_entrada', e.target.value)}
                className="bg-white h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Data Entrega *</Label>
              <Input
                type="date"
                value={formData.data_entrega}
                onChange={(e) => handleChange('data_entrega', e.target.value)}
                className="bg-white h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Prioridade</Label>
              <Select value={formData.prioridade} onValueChange={(value) => handleChange('prioridade', value)}>
                <SelectTrigger className="bg-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="ALTA">⚡ Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Input
                value={formData.observacao}
                onChange={(e) => handleChange('observacao', e.target.value)}
                placeholder="Obs..."
                className="bg-white h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. ITENS - Verde */}
      <Card className="border-l-4 border-l-green-500 bg-green-50/30">
        <CardContent className="p-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Itens do Pedido</Label>
            <Button 
              onClick={handleAddTab}
              size="sm"
              className="h-8 gap-1 bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-green-100 h-8">
              {tabs.map((tabId, index) => (
                <div key={tabId} className="flex items-center">
                  <TabsTrigger value={tabId} className="text-xs h-7 px-2">
                    Item {index + 1}
                    {tabs.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTab(tabId);
                        }}
                        className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                      >
                        <X className="h-2 w-2 text-red-600" />
                      </button>
                    )}
                  </TabsTrigger>
                </div>
              ))}
            </TabsList>

            {tabs.map((tabId) => (
              <TabsContent key={tabId} value={tabId} className="space-y-2 mt-2">
                {/* Tipo de Produção */}
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Produção *</Label>
                  <Select 
                    value={tabsData[tabId]?.tipo_producao || ''} 
                    onValueChange={(value) => handleTabDataChange(tabId, 'tipo_producao', value)}
                  >
                    <SelectTrigger className="bg-white h-9">
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

                {tabsData[tabId]?.tipo_producao && (
                  <div className="space-y-2 border border-green-200 rounded p-2 bg-white">
                    {/* Descrição */}
                    <div className="space-y-1">
                      <Label className="text-xs">Descrição *</Label>
                      <Input
                        value={tabsData[tabId]?.descricao || ''}
                        onChange={(e) => handleTabDataChange(tabId, 'descricao', e.target.value)}
                        placeholder="Ex: Banner 3x2m"
                        className="h-9"
                      />
                    </div>

                    {/* Medidas */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Largura (m)</Label>
                        <Input
                          value={tabsData[tabId]?.largura || ''}
                          onChange={(e) => handleTabDataChange(tabId, 'largura', e.target.value)}
                          placeholder="3,00"
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Altura (m)</Label>
                        <Input
                          value={tabsData[tabId]?.altura || ''}
                          onChange={(e) => handleTabDataChange(tabId, 'altura', e.target.value)}
                          placeholder="2,00"
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Área (m²)</Label>
                        <Input
                          value={tabsData[tabId]?.metro_quadrado || '0,00'}
                          disabled
                          className="bg-green-100 font-bold text-green-800 h-9"
                        />
                      </div>
                    </div>

                    {/* Vendedor, Designer, Tecido */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Vendedor</Label>
                        <Select 
                          value={tabsData[tabId]?.vendedor || ''} 
                          onValueChange={(value) => handleTabDataChange(tabId, 'vendedor', value)}
                        >
                          <SelectTrigger className="bg-white h-9">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendedores.map(v => (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Designer</Label>
                        <Select 
                          value={tabsData[tabId]?.designer || ''} 
                          onValueChange={(value) => handleTabDataChange(tabId, 'designer', value)}
                        >
                          <SelectTrigger className="bg-white h-9">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {designers.map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Tecido</Label>
                        <Select 
                          value={tabsData[tabId]?.tecido || ''} 
                          onValueChange={(value) => handleTabDataChange(tabId, 'tecido', value)}
                        >
                          <SelectTrigger className="bg-white h-9">
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
                    <div className="flex items-center gap-4 p-2 bg-green-50 rounded border border-green-200">
                      <Label className="text-xs font-medium">Acabamentos:</Label>
                      <div className="flex gap-3">
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            id={`overloque-${tabId}`}
                            checked={tabsData[tabId]?.overloque || false}
                            onCheckedChange={(checked) => handleTabDataChange(tabId, 'overloque', checked)}
                          />
                          <label htmlFor={`overloque-${tabId}`} className="text-xs cursor-pointer">
                            Overloque
                          </label>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Checkbox
                            id={`elastico-${tabId}`}
                            checked={tabsData[tabId]?.elastico || false}
                            onCheckedChange={(checked) => handleTabDataChange(tabId, 'elastico', checked)}
                          />
                          <label htmlFor={`elastico-${tabId}`} className="text-xs cursor-pointer">
                            Elástico
                          </label>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Checkbox
                            id={`ilhos-${tabId}`}
                            checked={tabsData[tabId]?.ilhos || false}
                            onCheckedChange={(checked) => handleTabDataChange(tabId, 'ilhos', checked)}
                          />
                          <label htmlFor={`ilhos-${tabId}`} className="text-xs cursor-pointer">
                            Ilhós
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Emenda e Valor */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Emenda</Label>
                        <Select 
                          value={tabsData[tabId]?.emenda || 'sem-emenda'} 
                          onValueChange={(value) => handleTabDataChange(tabId, 'emenda', value)}
                        >
                          <SelectTrigger className="bg-white h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem-emenda">Sem Emenda</SelectItem>
                            <SelectItem value="com-emenda">Com Emenda</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Valor Unitário (R$)</Label>
                        <Input
                          value={tabsData[tabId]?.valor_unitario || '0,00'}
                          onChange={(e) => handleTabDataChange(tabId, 'valor_unitario', e.target.value)}
                          placeholder="0,00"
                          className="bg-white h-9 font-semibold"
                        />
                      </div>
                    </div>

                    {/* Observações */}
                    <div className="space-y-1">
                      <Label className="text-xs">Observações</Label>
                      <Textarea
                        value={tabsData[tabId]?.observacao || ''}
                        onChange={(e) => handleTabDataChange(tabId, 'observacao', e.target.value)}
                        placeholder="Obs do item..."
                        rows={2}
                        className="bg-white text-sm"
                      />
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
        <CardContent className="p-2 space-y-2">
          {/* Linha 1 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Forma de Envio</Label>
              <Select 
                value={formData.forma_envio} 
                onValueChange={(value) => {
                  handleChange('forma_envio', value);
                  const forma = formasEnvio.find(f => f.name === value);
                  if (forma) {
                    handleChange('valor_frete', forma.value.toFixed(2).replace('.', ','));
                  }
                }}
              >
                <SelectTrigger className="bg-white h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {formasEnvio.map(fe => (
                    <SelectItem key={fe.id} value={fe.name}>
                      {fe.name} {fe.value > 0 && `- R$ ${fe.value.toFixed(2)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select 
                value={formData.tipo_pagamento} 
                onValueChange={(value) => handleChange('tipo_pagamento', value)}
              >
                <SelectTrigger className="bg-white h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(fp => (
                    <SelectItem key={fp} value={fp}>{fp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Desconto</Label>
              <Select 
                value={formData.desconto_tipo} 
                onValueChange={(value) => handleChange('desconto_tipo', value)}
              >
                <SelectTrigger className="bg-white h-9">
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
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Valor Frete (R$)</Label>
              <Input
                value={formData.valor_frete}
                onChange={(e) => handleChange('valor_frete', e.target.value)}
                className="bg-white h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Valor Itens (R$)</Label>
              <Input
                value={calcularValorItens().toFixed(2).replace('.', ',')}
                disabled
                className="bg-orange-100 font-bold text-orange-900 h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Valor Total (R$)</Label>
              <Input
                value={calcularTotal()}
                disabled
                className="bg-emerald-100 font-bold text-emerald-900 h-9 text-base"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-2">
        <Button 
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => toast({ title: "Em espera" })}
        >
          <Clock className="h-3 w-3" />
          Em Espera
        </Button>

        <Button 
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard/orders')}
        >
          Cancelar
        </Button>

        <Button 
          variant="secondary"
          size="sm"
          className="gap-1"
          onClick={handleSalvar}
        >
          <Eye className="h-3 w-3" />
          Resumo
        </Button>

        <Button 
          size="sm"
          onClick={handleSalvar}
          className="gap-1 bg-emerald-600 hover:bg-emerald-700 ml-auto"
        >
          <Save className="h-3 w-3" />
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
