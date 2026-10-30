import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderWithItems } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { formatDateForDisplay } from '@/utils/date';
import {
  printEnvioReport,
  previewEnvioReport,
  consolidateEnvioGroupOrders,
  formatEnvioReportWhatsAppText,
  EnvioReportOptions,
} from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  Settings,
  Printer,
  Eye,
  Copy,
  Check,
  Truck,
  Users,
  Package,
  Layers,
  MapPin,
  AlertTriangle,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';

interface RelatorioEnvio {
  forma_envio: string;
  pedidos: OrderWithItems[];
}

const getLocalDateString = (d = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Cache em memória da sessão para não perder o relatório ao trocar de aba
let cachedRelatorioState: {
  dataInicio: string;
  dataFim: string;
  relatorio: RelatorioEnvio[];
  apenasProntos: boolean;
  consolidarPorCliente: boolean;
  ocultarObsCopia: boolean;
  incluirColunaCheck: boolean;
} | null = null;

export default function RelatoriosEnvios() {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const { toast } = useToast();

  const hojeStr = useMemo(() => getLocalDateString(), []);

  const [dataInicio, setDataInicio] = useState(
    () => cachedRelatorioState?.dataInicio ?? hojeStr
  );
  const [dataFim, setDataFim] = useState(
    () => cachedRelatorioState?.dataFim ?? hojeStr
  );
  const [relatorio, setRelatorio] = useState<RelatorioEnvio[]>(
    () => cachedRelatorioState?.relatorio ?? []
  );
  const [apenasProntos, setApenasProntos] = useState(
    () => cachedRelatorioState?.apenasProntos ?? true
  );
  const [consolidarPorCliente, setConsolidarPorCliente] = useState(
    () => cachedRelatorioState?.consolidarPorCliente ?? true
  );
  const [ocultarObsCopia, setOcultarObsCopia] = useState(
    () => cachedRelatorioState?.ocultarObsCopia ?? true
  );
  const [incluirColunaCheck, setIncluirColunaCheck] = useState(
    () => cachedRelatorioState?.incluirColunaCheck ?? true
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Salvar alterações no cache de sessão
  useEffect(() => {
    cachedRelatorioState = {
      dataInicio,
      dataFim,
      relatorio,
      apenasProntos,
      consolidarPorCliente,
      ocultarObsCopia,
      incluirColunaCheck,
    };
  }, [
    dataInicio,
    dataFim,
    relatorio,
    apenasProntos,
    consolidarPorCliente,
    ocultarObsCopia,
    incluirColunaCheck,
  ]);

  const reportOptions = useMemo<EnvioReportOptions>(
    () => ({
      consolidarPorCliente,
      ocultarObsCopia,
      incluirColunaCheck,
    }),
    [consolidarPorCliente, ocultarObsCopia, incluirColunaCheck]
  );

  const aplicarAtalhoData = (tipo: 'hoje' | 'ontem' | 'amanha' | 'semana') => {
    const base = new Date();
    if (tipo === 'hoje') {
      const str = getLocalDateString(base);
      setDataInicio(str);
      setDataFim(str);
    } else if (tipo === 'ontem') {
      base.setDate(base.getDate() - 1);
      const str = getLocalDateString(base);
      setDataInicio(str);
      setDataFim(str);
    } else if (tipo === 'amanha') {
      base.setDate(base.getDate() + 1);
      const str = getLocalDateString(base);
      setDataInicio(str);
      setDataFim(str);
    } else if (tipo === 'semana') {
      const day = base.getDay();
      const diffMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(base);
      monday.setDate(base.getDate() + diffMonday);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 5);
      setDataInicio(getLocalDateString(monday));
      setDataFim(getLocalDateString(friday));
    }
  };

  const gerarRelatorio = useCallback(async () => {
    if (!dataInicio) {
      setError('Por favor, selecione a data inicial');
      return;
    }

    if (dataFim && dataFim < dataInicio) {
      setError('A data final não pode ser anterior à data inicial');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dataCriacaoInicio = new Date(dataInicio);
      dataCriacaoInicio.setDate(dataCriacaoInicio.getDate() - 90);
      const dataCriacaoInicioStr = dataCriacaoInicio.toISOString().split('T')[0];

      const pedidosResponse = await api.getRelatorioEnviosPedidos(
        dataCriacaoInicioStr,
        undefined,
        { pageSize: 1000 }
      );

      const pedidos = pedidosResponse.filter((pedido) => {
        if (apenasProntos && !pedido.pronto) return false;
        if (!pedido.data_entrega) return false;

        const entrega = pedido.data_entrega.split('T')[0].split(' ')[0];
        const fim = dataFim || dataInicio;

        return entrega >= dataInicio && entrega <= fim;
      });

      const gruposMap = new Map<string, OrderWithItems[]>();
      pedidos.forEach((pedido) => {
        const key = (pedido.forma_envio ?? 'SEM FORMA DE ENVIO').trim() || 'SEM FORMA DE ENVIO';
        if (!gruposMap.has(key)) {
          gruposMap.set(key, []);
        }
        gruposMap.get(key)!.push(pedido);
      });

      const relatorioArray = Array.from(gruposMap.entries())
        .map(([forma_envio, lista]) => ({
          forma_envio,
          pedidos: lista.sort((a, b) => {
            const clienteA = (a.cliente ?? a.customer_name ?? '').toLowerCase();
            const clienteB = (b.cliente ?? b.customer_name ?? '').toLowerCase();
            return clienteA.localeCompare(clienteB, 'pt-BR');
          }),
        }))
        .sort((a, b) => a.forma_envio.localeCompare(b.forma_envio, 'pt-BR'));

      setRelatorio(relatorioArray);
      if (!relatorioArray.length) {
        toast({
          title: 'Nenhum pedido encontrado',
          description: 'Não há envios no intervalo selecionado.',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao gerar o relatório.';
      setError(`Erro ao gerar relatório: ${message}`);
      toast({
        title: 'Falha ao gerar relatório',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim, apenasProntos, toast]);

  const formatarIntervalo = (inicio: string, fim: string) => {
    if (!inicio) return '-';
    const inicioFormatado = formatDateForDisplay(inicio, '-');
    if (!fim || fim === inicio) {
      return inicioFormatado;
    }
    return `${inicioFormatado} - ${formatDateForDisplay(fim, '-')}`;
  };

  // Métricas executivas consolidadas
  const metrics = useMemo(() => {
    let totalPedidos = 0;
    let totalItens = 0;
    const clientesUnicos = new Set<string>();
    const cidadesMap = new Map<string, number>();

    relatorio.forEach((grupo) => {
      totalPedidos += grupo.pedidos.length;
      grupo.pedidos.forEach((p) => {
        const nomeCliente = (p.cliente || p.customer_name || '').trim().toUpperCase();
        if (nomeCliente) clientesUnicos.add(nomeCliente);
        totalItens += p.items?.length || 0;

        const cidade = (p.cidade_cliente ?? '').trim();
        const estado = (p.estado_cliente ?? '').trim();
        const cidUf = cidade && estado ? `${cidade}/${estado}` : cidade || estado;
        if (cidUf) {
          cidadesMap.set(cidUf, (cidadesMap.get(cidUf) || 0) + 1);
        }
      });
    });

    const topCidades = Array.from(cidadesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      totalPedidos,
      totalItens,
      totalClientes: clientesUnicos.size,
      totalModalidades: relatorio.length,
      topCidades,
    };
  }, [relatorio]);

  const handleExportPDF = async () => {
    if (!relatorio.length || !dataInicio) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Gere o relatório antes de tentar exportar o PDF.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setExporting(true);
      printEnvioReport(relatorio, dataInicio, dataFim || null, reportOptions);
      toast({
        title: 'Impressão Executiva iniciada',
        description: 'O diálogo de impressão / salvar PDF foi aberto.',
      });
    } catch {
      setError('Não foi possível exportar o PDF. Tente novamente.');
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o PDF.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePreviewReport = () => {
    if (!relatorio.length || !dataInicio) return;
    previewEnvioReport(relatorio, dataInicio, dataFim || null, reportOptions);
  };

  const handleCopyWhatsApp = async () => {
    if (!relatorio.length || !dataInicio) return;
    try {
      const text = formatEnvioReportWhatsAppText(
        relatorio,
        dataInicio,
        dataFim || null,
        reportOptions
      );
      await navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      toast({
        title: 'Resumo copiado para o WhatsApp!',
        description: 'Basta colar (Ctrl+V) na conversa com a diretoria ou expedição.',
      });
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o texto automaticamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Relatório Executivo de Envios
            </h1>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold">
              Romaneio Diretoria
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base mt-0.5">
            Consolide saídas por modalidade e cliente com layout executivo pronto para impressão, PDF e WhatsApp
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/admin/template-relatorios')}
            className="gap-2 min-h-[40px] shrink-0"
          >
            <Settings className="h-4 w-4" />
            Editar Template
          </Button>
        )}
      </div>

      {/* Card de Filtros & Opções Inteligentes */}
      <Card className="pwa-card border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b bg-slate-50/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              <Calendar className="h-4 w-4 text-blue-600" />
              Período e Opções de Consolidação
            </CardTitle>
            {/* Atalhos rápidos de data */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 mr-1 font-medium">Atalhos:</span>
              <Button
                type="button"
                variant={dataInicio === hojeStr && dataFim === hojeStr ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => aplicarAtalhoData('hoje')}
              >
                Hoje
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => aplicarAtalhoData('ontem')}
              >
                Ontem
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => aplicarAtalhoData('amanha')}
              >
                Amanhã
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => aplicarAtalhoData('semana')}
              >
                Esta Semana
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-5 space-y-1.5">
              <Label htmlFor="dataInicio" className="text-xs font-semibold uppercase text-slate-600">
                Intervalo de Entrega
              </Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full h-10"
                />
                <span className="text-xs font-medium text-muted-foreground text-center">até</span>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full h-10"
                  min={dataInicio || undefined}
                />
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-wrap gap-2.5">
              <Button
                onClick={gerarRelatorio}
                disabled={loading}
                className="h-10 px-5 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                {loading ? 'Gerando Relatório...' : 'Gerar Relatório'}
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={handleExportPDF}
                disabled={exporting || loading || !relatorio.length || !dataInicio}
                className="h-10 px-4 font-semibold bg-slate-900 hover:bg-slate-800 text-white gap-2"
              >
                <Printer className="h-4 w-4" />
                {exporting ? 'Preparando...' : 'Imprimir / Salvar PDF'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handlePreviewReport}
                disabled={loading || !relatorio.length || !dataInicio}
                className="h-10 px-3.5 font-semibold gap-1.5"
              >
                <Eye className="h-4 w-4 text-blue-600" />
                Visualizar Folha A4
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyWhatsApp}
                disabled={loading || !relatorio.length || !dataInicio}
                className="h-10 px-3.5 font-semibold gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                {copiedWhatsApp ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 text-emerald-600" />
                )}
                {copiedWhatsApp ? 'Copiado!' : 'Copiar p/ WhatsApp'}
              </Button>
            </div>
          </div>

          {/* Checkboxes de Inteligência do Relatório */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 px-3 py-2 rounded-lg border border-slate-200/70 transition-colors">
              <Checkbox
                id="apenasProntos"
                checked={apenasProntos}
                onCheckedChange={(checked) => setApenasProntos(checked === true)}
              />
              <span className="text-xs font-medium text-slate-700 leading-tight">
                Apenas pedidos prontos
              </span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer bg-blue-50/50 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-200/60 transition-colors">
              <Checkbox
                id="consolidarPorCliente"
                checked={consolidarPorCliente}
                onCheckedChange={(checked) => setConsolidarPorCliente(checked === true)}
              />
              <span className="text-xs font-semibold text-blue-900 leading-tight">
                Agrupar pedidos do mesmo cliente
              </span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 px-3 py-2 rounded-lg border border-slate-200/70 transition-colors">
              <Checkbox
                id="ocultarObsCopia"
                checked={ocultarObsCopia}
                onCheckedChange={(checked) => setOcultarObsCopia(checked === true)}
              />
              <span className="text-xs font-medium text-slate-700 leading-tight">
                Ocultar texto "Cópia do pedido #..."
              </span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 px-3 py-2 rounded-lg border border-slate-200/70 transition-colors">
              <Checkbox
                id="incluirColunaCheck"
                checked={incluirColunaCheck}
                onCheckedChange={(checked) => setIncluirColunaCheck(checked === true)}
              />
              <span className="text-xs font-medium text-slate-700 leading-tight">
                Coluna de conferência [ ] no PDF
              </span>
            </label>
          </div>

          {error && (
            <div className="text-red-600 text-xs font-semibold bg-red-50 border border-red-200 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Painel de Resultados Executivos */}
      {relatorio.length > 0 && (
        <div className="space-y-5">
          {/* 4 Cards de KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-l-4 border-l-blue-600 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Clientes Atendidos
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {metrics.totalClientes}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Destinatários únicos</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-600 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Total de Pedidos
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {metrics.totalPedidos}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Período: {formatarIntervalo(dataInicio, dataFim)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Package className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Total de Itens
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {metrics.totalItens}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Peças / volumes expedidos</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Layers className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Modalidades
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {metrics.totalModalidades}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Formas de envio no dia</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Truck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra Resumo de Destinos */}
          {metrics.topCidades.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 border border-slate-200 px-3.5 py-2.5 rounded-lg text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                Destinos do Período:
              </span>
              {metrics.topCidades.map(([cidade, count]) => (
                <Badge
                  key={cidade}
                  variant="outline"
                  className="bg-white text-slate-700 border-slate-300 font-medium"
                >
                  {cidade}: <strong className="ml-1 text-slate-900">{count}</strong>
                </Badge>
              ))}
            </div>
          )}

          {/* Tabelas Executivas por Forma de Envio */}
          <div className="space-y-6">
            {relatorio.map((grupo, index) => {
              const consolidatedRows = consolidateEnvioGroupOrders(grupo.pedidos, reportOptions);
              const groupItemsCount = grupo.pedidos.reduce(
                (acc, p) => acc + (p.items?.length || 0),
                0
              );

              return (
                <Card key={index} className="overflow-hidden border-slate-300 shadow-xs">
                  <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                        Modalidade
                      </span>
                      <h3 className="text-base font-extrabold tracking-wide">
                        {grupo.forma_envio.toUpperCase()}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-300">
                      <span>
                        <strong className="text-white">{consolidatedRows.length}</strong> cliente(s)
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-white">{grupo.pedidos.length}</strong> pedido(s)
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-white">{groupItemsCount}</strong> item(ns)
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-left text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          <th className="py-2.5 px-3.5 w-[24%]">Cliente / Ficha</th>
                          <th className="py-2.5 px-3.5 w-[40%]">Itens Expedidos</th>
                          <th className="py-2.5 px-3.5 w-[13%]">Cidade/UF</th>
                          <th className="py-2.5 px-3.5 w-[15%]">Instruções / Obs.</th>
                          <th className="py-2.5 px-3.5 w-[8%] text-center">Entrega</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {consolidatedRows.map((row, rIdx) => (
                          <tr
                            key={`${row.cliente}-${rIdx}`}
                            className={rIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}
                          >
                            <td className="py-3 px-3.5 align-top">
                              <div className="font-bold text-slate-900 leading-snug">
                                {row.cliente}
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                {row.numerosPedidos.map((num) => (
                                  <span
                                    key={num}
                                    className="inline-block text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.2"
                                  >
                                    {num}
                                  </span>
                                ))}
                                {row.pedidosCount > 1 && (
                                  <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.2">
                                    {row.pedidosCount} fichas juntas
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3.5 align-top">
                              {row.itens.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-slate-800 font-medium">
                                  {row.itens.map((item, iIdx) => (
                                    <li key={iIdx} className="leading-snug">
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-3 px-3.5 align-top text-xs sm:text-sm font-semibold text-slate-700">
                              {row.cidadeEstado}
                            </td>

                            <td className="py-3 px-3.5 align-top">
                              {row.observacoes.length > 0 ? (
                                <div className="space-y-1.5">
                                  {row.observacoes.map((obs, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className="flex items-start gap-1.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-md px-2.5 py-1.5 text-xs font-bold leading-snug"
                                    >
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                      <span>{obs}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>

                            <td className="py-3 px-3.5 align-top text-center text-xs font-semibold text-slate-700 whitespace-nowrap">
                              {row.datasEntrega.join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {relatorio.length === 0 && !loading && dataInicio && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Truck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-semibold">
              Nenhum envio listado para o período selecionado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione a data desejada acima e clique em "Gerar Relatório"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
