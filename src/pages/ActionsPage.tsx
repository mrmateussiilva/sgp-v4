import { useState, useMemo } from 'react';
import {
  Zap,
  Plus,
  Play,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Bell,
  PackageSearch,
  Flame,
  Globe,
  History,
  RotateCcw,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import { useActionStore } from '@/store/actionStore';
import {
  evaluateOrderEvent,
  simulateSingleRule,
} from '@/services/actionEngine';
import {
  ActionCondition,
  ActionConditionField,
  ActionConditionOperator,
  ActionEffectConfig,
  ActionEffectType,
  ActionTriggerType,
  AutomationRule,
  ProductionStageKey,
} from '@/types/actions';
import { OrderStatus, OrderWithItems } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const TRIGGER_LABELS: Record<ActionTriggerType, string> = {
  order_created: 'Pedido Criado',
  stage_changed: 'Etapa de Produção Marcada',
  status_changed: 'Status do Pedido Alterado',
  order_updated: 'Pedido Editado',
  order_deleted: 'Pedido Excluído',
};

const STAGE_LABELS: Record<ProductionStageKey | 'any', string> = {
  any: 'Qualquer Etapa',
  financeiro: 'Financeiro Liberado',
  conferencia: 'Conferência Concluída',
  sublimacao: 'Sublimação Concluída',
  costura: 'Costura Concluída',
  expedicao: 'Expedição Concluída',
  pronto: 'Pronto (Finalizado)',
};

const FIELD_LABELS: Record<ActionConditionField, string> = {
  forma_envio: 'Forma de Envio',
  prioridade: 'Prioridade',
  tipo_producao: 'Tipo de Produção',
  tecido: 'Tecido / Material',
  valor_total: 'Valor Total (R$)',
  cliente: 'Nome do Cliente',
  entrega_mesmo_dia: 'Entrega no Mesmo Dia',
  status: 'Status do Pedido',
};

const OPERATOR_LABELS: Record<ActionConditionOperator, string> = {
  equals: 'é igual a',
  not_equals: 'é diferente de',
  contains: 'contém',
  gt: 'maior que (>)',
  lt: 'menor que (<)',
};

const EFFECT_LABELS: Record<ActionEffectType, string> = {
  notify_bell: 'Notificação Interna (Sino + Toast)',
  check_stock: 'Verificar Estoque de Material',
  deduct_stock: 'Verificar e Abater do Estoque',
  set_priority_high: 'Mudar Prioridade para ALTA',
  prompt_print_ficha: 'Sugerir / Abrir Impressão da Ficha (PDF)',
  webhook: 'Disparar Webhook HTTP (POST)',
};

const TEMPLATE_VARIABLES = [
  '{numero}',
  '{cliente}',
  '{forma_envio}',
  '{valor_total}',
  '{prioridade}',
  '{tecidos}',
  '{cidade}',
  '{data_entrega}',
];

export default function ActionsPage() {
  const rules = useActionStore((s) => s.rules);
  const logs = useActionStore((s) => s.logs);
  const addRule = useActionStore((s) => s.addRule);
  const updateRule = useActionStore((s) => s.updateRule);
  const deleteRule = useActionStore((s) => s.deleteRule);
  const toggleRule = useActionStore((s) => s.toggleRule);
  const clearLogs = useActionStore((s) => s.clearLogs);
  const resetDefaultRules = useActionStore((s) => s.resetDefaultRules);
  const { toast } = useToast();

  // Estado do Modal de Criação / Edição
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [trigger, setTrigger] = useState<ActionTriggerType>('order_created');
  const [triggerStage, setTriggerStage] = useState<ProductionStageKey | 'any'>('pronto');
  const [delaySeconds, setDelaySeconds] = useState<number>(6);
  const [conditions, setConditions] = useState<ActionCondition[]>([]);
  const [effects, setEffects] = useState<ActionEffectConfig[]>([
    {
      id: 'eff-default',
      type: 'notify_bell',
      notificationTitle: '⚡ Pedido #{numero} — {cliente}',
      notificationMessage: 'Envio: {forma_envio} | Valor: R$ {valor_total}',
      stockMinThreshold: 20,
      targetMaterialName: '',
      webhookUrl: '',
    },
  ]);

  // Estado do Simulador Interativo
  const [simTrigger, setSimTrigger] = useState<ActionTriggerType>('order_created');
  const [simStage, setSimStage] = useState<ProductionStageKey>('pronto');
  const [simNumero, setSimNumero] = useState('9501');
  const [simCliente, setSimCliente] = useState('Visual Eventos & Festas');
  const [simFormaEnvio, setSimFormaEnvio] = useState('RETIRADA NO BALCÃO');
  const [simValorTotal, setSimValorTotal] = useState('1250');
  const [simTecido, setSimTecido] = useState('Malha Sublimática');
  const [simLargura, setSimLargura] = useState('4,00');
  const [simAltura, setSimAltura] = useState('2,50');
  const [simQuantidade, setSimQuantidade] = useState('3');
  const [simSameDay, setSimSameDay] = useState(true);

  const stats = useMemo(() => {
    const activeCount = rules.filter((r) => r.enabled).length;
    const totalExecutions = logs.length;
    const warningsCount = logs.filter((l) => l.status === 'warning').length;
    return {
      totalRules: rules.length,
      activeCount,
      totalExecutions,
      warningsCount,
    };
  }, [rules, logs]);

  const openCreateModal = () => {
    setEditingRuleId(null);
    setRuleName('');
    setRuleDescription('');
    setTrigger('order_created');
    setTriggerStage('pronto');
    setDelaySeconds(6);
    setConditions([]);
    setEffects([
      {
        id: `eff-${Date.now()}`,
        type: 'notify_bell',
        notificationTitle: '🔔 Alerta Pedido #{numero}',
        notificationMessage: 'Cliente {cliente} | Envio: {forma_envio} | R$ {valor_total}',
        stockMinThreshold: 20,
        targetMaterialName: '',
        webhookUrl: '',
      },
    ]);
    setDialogOpen(true);
  };

  const openEditModal = (rule: AutomationRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleDescription(rule.description);
    setTrigger(rule.trigger);
    setTriggerStage(rule.triggerStage || 'pronto');
    setDelaySeconds(rule.delaySeconds ?? 6);
    setConditions(rule.conditions.map((c) => ({ ...c })));
    setEffects(rule.effects.map((e) => ({ ...e })));
    setDialogOpen(true);
  };

  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        field: 'forma_envio',
        operator: 'contains',
        value: 'RETIRADA',
      },
    ]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateCondition = (id: string, patch: Partial<ActionCondition>) => {
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...patch };
        if (patch.field && patch.field !== c.field) {
          if (patch.field === 'entrega_mesmo_dia') {
            updated.operator = 'equals';
            updated.value = 'true';
          } else if (patch.field === 'prioridade') {
            updated.operator = 'equals';
            updated.value = 'ALTA';
          } else if (patch.field === 'status') {
            updated.operator = 'equals';
            updated.value = OrderStatus.Concluido;
          } else if (patch.field === 'valor_total') {
            updated.operator = 'gt';
            updated.value = '1000';
          } else if (patch.field === 'forma_envio') {
            updated.operator = 'contains';
            updated.value = 'RETIRADA';
          }
        }
        return updated;
      })
    );
  };

  const handleAddEffect = () => {
    setEffects((prev) => [
      ...prev,
      {
        id: `eff-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        type: 'check_stock',
        stockMinThreshold: 20,
        notifyOnlyOnLowStock: true,
        targetMaterialName: '',
        notificationTitle: '📦 Verificação de Estoque — Pedido #{numero}',
        notificationMessage: 'Estoque conferido para {cliente}.',
        webhookUrl: '',
      },
    ]);
  };

  const handleRemoveEffect = (id: string) => {
    if (effects.length <= 1) return;
    setEffects((prev) => prev.filter((e) => e.id !== id));
  };

  const handleUpdateEffect = (id: string, patch: Partial<ActionEffectConfig>) => {
    setEffects((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  };

  const handleSaveRule = () => {
    if (!ruleName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome descritivo para a regra de automação.',
        variant: 'destructive',
      });
      return;
    }

    if (effects.length === 0) {
      toast({
        title: 'Ação obrigatória',
        description: 'Adicione pelo menos uma ação (ENTÃO) para a regra.',
        variant: 'destructive',
      });
      return;
    }

    if (editingRuleId) {
      updateRule(editingRuleId, {
        name: ruleName.trim(),
        description: ruleDescription.trim() || 'Regra personalizada pelo usuário.',
        trigger,
        triggerStage: trigger === 'stage_changed' ? triggerStage : undefined,
        delaySeconds: Math.max(0, Number(delaySeconds) || 0),
        conditions,
        effects,
      });
      toast({
        title: 'Regra atualizada!',
        description: `A action "${ruleName}" foi salva com sucesso.`,
      });
    } else {
      addRule({
        name: ruleName.trim(),
        description: ruleDescription.trim() || 'Regra personalizada pelo usuário.',
        enabled: true,
        trigger,
        triggerStage: trigger === 'stage_changed' ? triggerStage : undefined,
        delaySeconds: Math.max(0, Number(delaySeconds) || 0),
        conditions,
        effects,
      });
      toast({
        title: 'Nova Action criada!',
        description: `A regra "${ruleName}" já está ativa e monitorando eventos.`,
      });
    }

    setDialogOpen(false);
  };

  const handleTestRuleNow = async (rule: AutomationRule) => {
    if (testingRuleId === rule.id) return;
    setTestingRuleId(rule.id);
    try {
      await simulateSingleRule(rule.id);
    } finally {
      setTimeout(() => {
        setTestingRuleId((prev) => (prev === rule.id ? null : prev));
      }, 1500);
    }
  };

  const handleDuplicateRule = (rule: AutomationRule) => {
    addRule({
      name: `${rule.name} (Cópia)`,
      description: rule.description,
      enabled: false,
      trigger: rule.trigger,
      triggerStage: rule.triggerStage,
      delaySeconds: rule.delaySeconds ?? 6,
      conditions: rule.conditions.map((c) => ({
        ...c,
        id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      })),
      effects: rule.effects.map((e) => ({
        ...e,
        id: `eff-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      })),
    });
    toast({
      title: 'Regra duplicada!',
      description: `Cópia de "${rule.name}" criada como inativa para você editar.`,
    });
  };

  const handleRunCustomSimulation = async () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const val = parseFloat(simValorTotal.replace(',', '.')) || 0;
    const qty = Math.max(1, parseInt(simQuantidade, 10) || 1);

    const mockOrder: OrderWithItems = {
      id: parseInt(simNumero, 10) || 9501,
      numero: simNumero || '9501',
      customer_name: simCliente || 'Cliente Simulação',
      cliente: simCliente || 'Cliente Simulação',
      address: 'Uberlândia - MG',
      cidade_cliente: 'Uberlândia',
      estado_cliente: 'MG',
      data_entrada: today,
      data_entrega: simSameDay ? today : tomorrow,
      total_value: val,
      valor_total: val,
      status: OrderStatus.EmProcessamento,
      prioridade: 'NORMAL',
      forma_envio: simFormaEnvio,
      financeiro: simStage === 'financeiro',
      conferencia: simStage === 'conferencia',
      sublimacao: simStage === 'sublimacao',
      costura: simStage === 'costura',
      expedicao: simStage === 'expedicao',
      pronto: simStage === 'pronto',
      items: [
        {
          id: 1,
          order_id: parseInt(simNumero, 10) || 9501,
          item_name: `Item Simulado (${simTecido})`,
          tipo_producao: 'painel',
          tecido: simTecido,
          largura: simLargura,
          altura: simAltura,
          quantity: qty,
          quantidade_paineis: String(qty),
          unit_price: val / qty,
          subtotal: val,
          vendedor: 'Simulador',
        },
      ],
    };

    const logsTriggered = await evaluateOrderEvent({
      trigger: simTrigger,
      order: mockOrder,
      changedStages: simTrigger === 'stage_changed' ? [simStage] : [],
      simulated: true,
    });

    if (logsTriggered.length === 0) {
      toast({
        title: 'Nenhuma regra ativa correspondeu',
        description:
          'Nenhuma regra habilitada tinha o gatilho e as condições compatíveis com este cenário.',
      });
    }
  };

  const renderEffectIcon = (type: ActionEffectType) => {
    switch (type) {
      case 'notify_bell':
        return <Bell className="h-3.5 w-3.5 text-blue-500" />;
      case 'check_stock':
      case 'deduct_stock':
        return <PackageSearch className="h-3.5 w-3.5 text-amber-500" />;
      case 'set_priority_high':
        return <Flame className="h-3.5 w-3.5 text-red-500" />;
      case 'prompt_print_ficha':
        return <Printer className="h-3.5 w-3.5 text-emerald-500" />;
      case 'webhook':
        return <Globe className="h-3.5 w-3.5 text-purple-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Actions (Beta)
              </h1>
              <p className="text-sm text-muted-foreground">
                Programe reações automáticas para quando pedidos forem criados, mudarem de etapa ou atingirem condições específicas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetDefaultRules();
              toast({
                title: 'Regras padrão restauradas',
                description: 'Os modelos de exemplo foram recarregados.',
              });
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Restaurar Exemplos
          </Button>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Action
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Regras Criadas
              </p>
              <p className="text-2xl font-bold mt-1">{stats.totalRules}</p>
            </div>
            <Zap className="h-8 w-8 text-muted-foreground/30" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Actions Ativas
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.activeCount}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500/30" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Execuções no Histórico
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {stats.totalExecutions}
              </p>
            </div>
            <History className="h-8 w-8 text-blue-500/30" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Alertas de Estoque
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {stats.warningsCount}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500/30" />
          </CardContent>
        </Card>
      </div>

      {/* Abas Principais */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="gap-1.5">
            <Zap className="h-4 w-4" />
            Regras de Automação ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            Simulador de Cenários
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <History className="h-4 w-4" />
            Histórico de Execuções ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: REGRAS */}
        <TabsContent value="rules" className="space-y-4">
          {rules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-3">
                <Zap className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
                <p className="text-base font-medium">Nenhuma regra configurada</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Crie sua primeira Action para verificar estoque automaticamente, alertar a expedição ou elevar prioridade de pedidos urgentes.
                </p>
                <Button onClick={openCreateModal} size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Criar Primeira Action
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {rules.map((rule) => (
                <Card
                  key={rule.id}
                  className={
                    rule.enabled
                      ? 'border-l-4 border-l-primary transition-all'
                      : 'opacity-70 bg-muted/20 transition-all'
                  }
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-semibold text-base text-foreground">
                            {rule.name}
                          </h3>
                          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                            {rule.enabled ? 'Ativa' : 'Inativa'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            ⏱️ Delay: {rule.delaySeconds ?? 6}s
                          </Badge>
                          {rule.executionCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {rule.executionCount}x executada
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-2 mr-2">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => toggleRule(rule.id)}
                            aria-label={`Ativar regra ${rule.name}`}
                          />
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={testingRuleId === rule.id}
                          onClick={() => handleTestRuleNow(rule)}
                          title="Simula um pedido compatível e executa a ação agora mesmo"
                        >
                          {testingRuleId === rule.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                              Executado
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 mr-1.5 text-primary fill-primary" />
                              Testar Agora
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicateRule(rule)}
                          title="Duplicar regra"
                          aria-label="Duplicar regra"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(rule)}
                          title="Editar regra"
                          aria-label="Editar regra"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteRule(rule.id)}
                          aria-label="Excluir regra"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Fluxo visual QUANDO -> SE -> ENTÃO */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
                      {/* QUANDO */}
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1.5 rounded-md font-medium">
                        <span className="uppercase text-[10px] font-bold opacity-75">
                          QUANDO:
                        </span>
                        <span>
                          {TRIGGER_LABELS[rule.trigger]}
                          {rule.trigger === 'stage_changed' && rule.triggerStage
                            ? ` (${STAGE_LABELS[rule.triggerStage]})`
                            : ''}
                        </span>
                      </div>

                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />

                      {/* SE (Condições) */}
                      <div className="flex flex-wrap items-center gap-1.5 bg-muted px-2.5 py-1.5 rounded-md">
                        <span className="uppercase text-[10px] font-bold text-muted-foreground">
                          SE:
                        </span>
                        {rule.conditions.length === 0 ? (
                          <span className="text-foreground">Qualquer pedido</span>
                        ) : (
                          rule.conditions.map((c, idx) => (
                            <span key={c.id} className="font-medium text-foreground">
                              {idx > 0 && <span className="text-muted-foreground"> E </span>}
                              {FIELD_LABELS[c.field]} {OPERATOR_LABELS[c.operator]}{' '}
                              <code className="bg-background px-1 py-0.5 rounded border">
                                {c.value}
                              </code>
                            </span>
                          ))
                        )}
                      </div>

                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />

                      {/* ENTÃO (Efeitos) */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rule.effects.map((eff) => (
                          <div
                            key={eff.id}
                            className="flex items-center gap-1.5 bg-secondary/70 px-2.5 py-1.5 rounded-md font-medium"
                          >
                            {renderEffectIcon(eff.type)}
                            <span>
                              {EFFECT_LABELS[eff.type]}
                              {(eff.type === 'check_stock' || eff.type === 'deduct_stock') &&
                                eff.stockMinThreshold !== undefined &&
                                ` (Mín: ${eff.stockMinThreshold}m)`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ABA 2: SIMULADOR PERSONALIZADO */}
        <TabsContent value="simulator">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Playground de Teste de Eventos
              </CardTitle>
              <CardDescription>
                Simule a criação ou mudança de etapa de um pedido com os dados abaixo para ver quais regras ativas são disparadas e como o estoque e o sino de notificações reagem.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Evento Disparado (Gatilho)</Label>
                  <Select
                    value={simTrigger}
                    onValueChange={(v) => setSimTrigger(v as ActionTriggerType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order_created">Pedido Criado</SelectItem>
                      <SelectItem value="stage_changed">Etapa de Produção Marcada</SelectItem>
                      <SelectItem value="status_changed">Status Alterado</SelectItem>
                      <SelectItem value="order_updated">Pedido Editado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {simTrigger === 'stage_changed' && (
                  <div className="space-y-2">
                    <Label>Qual Etapa foi Marcada?</Label>
                    <Select
                      value={simStage}
                      onValueChange={(v) => setSimStage(v as ProductionStageKey)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="conferencia">Conferência</SelectItem>
                        <SelectItem value="sublimacao">Sublimação</SelectItem>
                        <SelectItem value="costura">Costura</SelectItem>
                        <SelectItem value="expedicao">Expedição</SelectItem>
                        <SelectItem value="pronto">Pronto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Número do Pedido</Label>
                  <Input
                    value={simNumero}
                    onChange={(e) => setSimNumero(e.target.value)}
                    placeholder="Ex: 9501"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <Input
                    value={simCliente}
                    onChange={(e) => setSimCliente(e.target.value)}
                    placeholder="Ex: Gráfica Express"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Forma de Envio</Label>
                  <Input
                    value={simFormaEnvio}
                    onChange={(e) => setSimFormaEnvio(e.target.value)}
                    placeholder="Ex: RETIRADA, SEDEX, MOTOBOY"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor Total do Pedido (R$)</Label>
                  <Input
                    value={simValorTotal}
                    onChange={(e) => setSimValorTotal(e.target.value)}
                    placeholder="Ex: 1250"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/40 border space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Item do Pedido (Para Cálculo de Consumo de Estoque)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tecido / Material</Label>
                    <Input
                      value={simTecido}
                      onChange={(e) => setSimTecido(e.target.value)}
                      placeholder="Nome cadastrado em Materiais"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Largura (m)</Label>
                    <Input
                      value={simLargura}
                      onChange={(e) => setSimLargura(e.target.value)}
                      placeholder="4,00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Altura (m)</Label>
                    <Input
                      value={simAltura}
                      onChange={(e) => setSimAltura(e.target.value)}
                      placeholder="2,50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantidade de Peças</Label>
                    <Input
                      value={simQuantidade}
                      onChange={(e) => setSimQuantidade(e.target.value)}
                      placeholder="3"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="sim-sameday"
                      checked={simSameDay}
                      onCheckedChange={setSimSameDay}
                    />
                    <Label htmlFor="sim-sameday" className="text-sm cursor-pointer">
                      Simular entrega para o mesmo dia (Hoje)
                    </Label>
                  </div>

                  <Button onClick={handleRunCustomSimulation}>
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Disparar Evento de Teste
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: HISTÓRICO DE EXECUÇÕES */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Registro das últimas {logs.length} execuções de Actions neste navegador.
            </p>
            {logs.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearLogs}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Limpar Histórico
              </Button>
            )}
          </div>

          {logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                <History className="h-8 w-8 mx-auto opacity-40" />
                <p className="text-sm">
                  Nenhuma execução registrada ainda. Clique em <strong>"Testar Agora"</strong> em qualquer regra para ver o resultado aqui!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.status === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        )}
                        {log.status === 'warning' && (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        {log.status === 'error' && (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        <span className="font-semibold text-sm">{log.ruleName}</span>
                        <Badge variant="outline" className="text-xs">
                          Pedido #{log.orderNumero} ({log.customerName})
                        </Badge>
                        {log.simulated && (
                          <Badge variant="secondary" className="text-[10px]">
                            Simulação
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-0.5 pl-6">
                        {log.details.map((detail, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            {detail}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground shrink-0 self-end sm:self-center">
                      {new Date(log.executedAt).toLocaleString('pt-BR')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL CRIAR / EDITAR REGRA */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRuleId ? 'Editar Action' : 'Nova Regra de Automação (Action)'}
            </DialogTitle>
            <DialogDescription>
              Defina o gatilho (QUANDO), os filtros opcionais (SE) e o que o sistema deve executar (ENTÃO).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Nome e Descrição */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rule-name">Nome da Regra</Label>
                <Input
                  id="rule-name"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="Ex: Pedido Criado → Verificar Estoque de Lona"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rule-desc">Descrição</Label>
                <Input
                  id="rule-desc"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="Ex: Alerta quando o pedido consumir material acima do estoque mínimo"
                />
              </div>
            </div>

            {/* 1. QUANDO (Trigger) */}
            <div className="p-4 rounded-lg border bg-primary/5 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-primary">
                1. QUANDO (Gatilho)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Evento do Pedido</Label>
                  <Select
                    value={trigger}
                    onValueChange={(v) => setTrigger(v as ActionTriggerType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order_created">Pedido for Criado</SelectItem>
                      <SelectItem value="stage_changed">
                        Etapa de Produção for Marcada
                      </SelectItem>
                      <SelectItem value="status_changed">
                        Status do Pedido Mudar
                      </SelectItem>
                      <SelectItem value="order_updated">Pedido for Editado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {trigger === 'stage_changed' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Etapa Específica</Label>
                    <Select
                      value={triggerStage}
                      onValueChange={(v) =>
                        setTriggerStage(v as ProductionStageKey | 'any')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pronto">Pronto (Finalizado)</SelectItem>
                        <SelectItem value="financeiro">Financeiro Liberado</SelectItem>
                        <SelectItem value="conferencia">Conferência</SelectItem>
                        <SelectItem value="sublimacao">Sublimação</SelectItem>
                        <SelectItem value="costura">Costura</SelectItem>
                        <SelectItem value="expedicao">Expedição</SelectItem>
                        <SelectItem value="any">Qualquer Etapa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Delay antes da notificação (segundos)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Padrão: 6 segundos (entre 5 e 7s)"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Evita que a notificação conflite com o fechamento de modais na tela (recomendado: 5 a 7s).
                  </p>
                </div>
              </div>
            </div>

            {/* 2. SE (Condições) */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  2. SE (Condições Opcionais)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCondition}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar Condição
                </Button>
              </div>

              {conditions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma condição definida — a regra será executada para <strong>todos os pedidos</strong> que acionarem o gatilho.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {conditions.map((cond) => (
                    <div
                      key={cond.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-muted/40 p-2 rounded-md"
                    >
                      <div className="sm:col-span-4">
                        <Select
                          value={cond.field}
                          onValueChange={(v) =>
                            handleUpdateCondition(cond.id, {
                              field: v as ActionConditionField,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(FIELD_LABELS).map(([k, label]) => (
                              <SelectItem key={k} value={k}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-4">
                        <Select
                          value={cond.operator}
                          onValueChange={(v) =>
                            handleUpdateCondition(cond.id, {
                              operator: v as ActionConditionOperator,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(OPERATOR_LABELS).map(([k, label]) => (
                              <SelectItem key={k} value={k}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-3">
                        {cond.field === 'entrega_mesmo_dia' ? (
                          <Select
                            value={cond.value || 'true'}
                            onValueChange={(v) =>
                              handleUpdateCondition(cond.id, { value: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Sim (Entrega Hoje)</SelectItem>
                              <SelectItem value="false">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : cond.field === 'prioridade' ? (
                          <Select
                            value={cond.value || 'ALTA'}
                            onValueChange={(v) =>
                              handleUpdateCondition(cond.id, { value: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALTA">ALTA</SelectItem>
                              <SelectItem value="NORMAL">NORMAL</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : cond.field === 'status' ? (
                          <Select
                            value={cond.value || OrderStatus.Concluido}
                            onValueChange={(v) =>
                              handleUpdateCondition(cond.id, { value: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={OrderStatus.Pendente}>
                                Pendente
                              </SelectItem>
                              <SelectItem value={OrderStatus.EmProcessamento}>
                                Em Processamento
                              </SelectItem>
                              <SelectItem value={OrderStatus.Concluido}>
                                Concluído
                              </SelectItem>
                              <SelectItem value={OrderStatus.Cancelado}>
                                Cancelado
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="h-8 text-xs"
                            value={cond.value}
                            onChange={(e) =>
                              handleUpdateCondition(cond.id, { value: e.target.value })
                            }
                            placeholder="Valor..."
                          />
                        )}
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleRemoveCondition(cond.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. ENTÃO (Ações) */}
            <div className="p-4 rounded-lg border bg-secondary/20 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  3. ENTÃO (Ações a Executar)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEffect}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar Ação
                </Button>
              </div>

              <div className="space-y-4">
                {effects.map((eff) => (
                  <div
                    key={eff.id}
                    className="p-3 rounded-md border bg-background space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Select
                        value={eff.type}
                        onValueChange={(v) =>
                          handleUpdateEffect(eff.id, {
                            type: v as ActionEffectType,
                          })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EFFECT_LABELS).map(([k, label]) => (
                            <SelectItem key={k} value={k}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {effects.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive shrink-0"
                          onClick={() => handleRemoveEffect(eff.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {(eff.type === 'check_stock' || eff.type === 'deduct_stock') && (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Limite Mínimo de Alerta (Metros)
                            </Label>
                            <Input
                              type="number"
                              value={eff.stockMinThreshold ?? 20}
                              onChange={(e) =>
                                handleUpdateEffect(eff.id, {
                                  stockMinThreshold: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Filtrar Material Específico (Opcional)
                            </Label>
                            <Input
                              value={eff.targetMaterialName || ''}
                              onChange={(e) =>
                                handleUpdateEffect(eff.id, {
                                  targetMaterialName: e.target.value,
                                })
                              }
                              placeholder="Vazio = todos os materiais do pedido"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                          <div className="space-y-0.5 pr-3">
                            <Label className="text-xs font-semibold text-foreground">
                              Notificar apenas se atingir estoque crítico
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                              Se ativado, pedidos com estoque saudável são registrados silenciosamente no histórico sem abrir aviso na tela.
                            </p>
                          </div>
                          <Switch
                            checked={eff.notifyOnlyOnLowStock ?? true}
                            onCheckedChange={(checked) =>
                              handleUpdateEffect(eff.id, {
                                notifyOnlyOnLowStock: checked,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}

                    {(eff.type === 'notify_bell' ||
                      eff.type === 'check_stock' ||
                      eff.type === 'deduct_stock' ||
                      eff.type === 'prompt_print_ficha') && (
                      <div className="space-y-2 pt-1">
                        {eff.type === 'prompt_print_ficha' && (
                          <div className="flex items-center justify-between p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 mb-2">
                            <div className="space-y-0.5 pr-3">
                              <Label className="text-xs font-semibold text-foreground">
                                Abrir janela de impressão automaticamente
                              </Label>
                              <p className="text-[11px] text-muted-foreground">
                                Se ativado, abre o modal da Ficha PDF imediatamente na tela. Se desativado, mostra um botão &quot;🖨️ Imprimir Ficha&quot; no aviso.
                              </p>
                            </div>
                            <Switch
                              checked={Boolean(eff.autoOpenPrintModal)}
                              onCheckedChange={(checked) =>
                                handleUpdateEffect(eff.id, {
                                  autoOpenPrintModal: checked,
                                })
                              }
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs">Título da Notificação</Label>
                          <Input
                            value={eff.notificationTitle || ''}
                            onChange={(e) =>
                              handleUpdateEffect(eff.id, {
                                notificationTitle: e.target.value,
                              })
                            }
                            placeholder="Ex: 🔔 Pedido #{numero} ({cliente})"
                          />
                        </div>
                        {(eff.type === 'notify_bell' ||
                          eff.type === 'prompt_print_ficha') && (
                          <div className="space-y-1">
                            <Label className="text-xs">Mensagem da Notificação</Label>
                            <Textarea
                              rows={2}
                              value={eff.notificationMessage || ''}
                              onChange={(e) =>
                                handleUpdateEffect(eff.id, {
                                  notificationMessage: e.target.value,
                                })
                              }
                              placeholder="Ex: O pedido #{numero} do cliente {cliente} foi atualizado."
                            />
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[11px] text-muted-foreground mr-1">
                            Variáveis disponíveis:
                          </span>
                          {TEMPLATE_VARIABLES.map((v) => (
                            <Badge
                              key={v}
                              variant="outline"
                              className="text-[10px] cursor-pointer hover:bg-primary/10"
                              onClick={() =>
                                handleUpdateEffect(eff.id, {
                                  notificationMessage: `${eff.notificationMessage || ''} ${v}`.trim(),
                                })
                              }
                            >
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {eff.type === 'webhook' && (
                      <div className="space-y-1 pt-1">
                        <Label className="text-xs">URL do Webhook (POST JSON)</Label>
                        <Input
                          value={eff.webhookUrl || ''}
                          onChange={(e) =>
                            handleUpdateEffect(eff.id, {
                              webhookUrl: e.target.value,
                            })
                          }
                          placeholder="https://seu-n8n-ou-webhook.com/webhook/sgp"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRule}>Salvar Regra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

