import React from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ProductionTypeData } from '@/services/dashboardService';
import {
    DollarSign,
    Layers,
    Award,
    Package,
    PieChart,
    Info,
    Download,
} from 'lucide-react';

interface ProductionMixChartProps {
    data: ProductionTypeData[];
    loading: boolean;
    totalGeral: number;
}

const PALETTE = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#14b8a6', // teal
    '#6366f1', // indigo
    '#64748b', // slate
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

const formatCurrencyCompact = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        notation: 'compact',
        compactDisplay: 'short',
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

interface TooltipPayloadEntry {
    payload: ProductionTypeData;
    color?: string;
    value: number;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
}

const CustomMixTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        const color = payload[0].color || '#3b82f6';
        const precoMedio = item.quantidade > 0 ? item.totalVendido / item.quantidade : 0;

        return (
            <div className="bg-white/95 backdrop-blur-sm p-3.5 border border-slate-200/80 shadow-xl rounded-xl outline-none min-w-[210px] text-xs space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                    <span className="font-bold text-slate-800 text-sm">{item.label}</span>
                </div>
                <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500">Faturamento:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(item.totalVendido)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500">Participação:</span>
                        <span className="font-bold text-blue-600">{item.percentual.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500">Qtd. Peças:</span>
                        <span className="font-bold text-slate-800">{item.quantidade.toLocaleString('pt-BR')} un</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500">Pedidos com tipo:</span>
                        <span className="font-bold text-slate-800">{item.nPedidos}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-1.5">
                        <span className="text-slate-500">Preço Médio / Un:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(precoMedio)}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export function ProductionMixChart({ data, loading, totalGeral }: ProductionMixChartProps) {
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="border-slate-200">
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-28" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-36 mb-2" />
                                <Skeleton className="h-3 w-20" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card className="border-slate-200">
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="h-[360px]">
                        <Skeleton className="h-full w-full rounded-lg" />
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader>
                        <Skeleton className="h-5 w-40" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-48 w-full rounded-lg" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card className="border-slate-200 border-dashed shadow-sm">
                <CardContent className="flex flex-col items-center justify-center h-72 text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-inner">
                        <PieChart className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-base">Nenhum item de produção encontrado</p>
                        <p className="text-xs text-slate-500 max-w-sm">
                            Não encontramos itens com tipos de produção para os filtros e período selecionados. Experimente ampliar as datas de pesquisa.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Cálculos de resumo
    const totalMixFaturado = data.reduce((sum, item) => sum + item.totalVendido, 0);
    const totalPecas = data.reduce((sum, item) => sum + item.quantidade, 0);
    const totalCategorias = data.length;
    const carroChefe = data[0] || null;

    // Altura dinâmica baseada na quantidade de tipos para legibilidade do gráfico
    const chartHeight = Math.max(300, data.length * 48);

    const handleExportCsv = () => {
        if (!data || data.length === 0) return;

        const headers = ['Tipo de Produção', 'Faturamento (R$)', 'Participação (%)', 'Qtd Peças', 'Nº Pedidos', 'Preço Médio (R$)'];
        const rows = data.map((item) => {
            const precoMedio = item.quantidade > 0 ? (item.totalVendido / item.quantidade) : 0;
            return [
                `"${item.label.replace(/"/g, '""')}"`,
                item.totalVendido.toFixed(2).replace('.', ','),
                item.percentual.toFixed(1).replace('.', ','),
                item.quantidade.toString(),
                item.nPedidos.toString(),
                precoMedio.toFixed(2).replace('.', ','),
            ];
        });

        const totalFaturado = data.reduce((sum, item) => sum + item.totalVendido, 0);
        const totalPecas = data.reduce((sum, item) => sum + item.quantidade, 0);
        const precoMedioGeral = totalPecas > 0 ? (totalFaturado / totalPecas) : 0;

        const totalRow = [
            '"TOTAL GERAL"',
            totalFaturado.toFixed(2).replace('.', ','),
            '100,0',
            totalPecas.toString(),
            '-',
            precoMedioGeral.toFixed(2).replace('.', ','),
        ];

        const csvContent = '\uFEFF' + [
            headers.join(';'),
            ...rows.map(r => r.join(';')),
            totalRow.join(';'),
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `mix-de-producao-${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* KPI Cards do Mix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Mix */}
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                    <CardHeader className="pb-1 flex flex-row items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Faturamento do Mix
                        </span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-1">
                        <div className="text-2xl font-black text-slate-900 tracking-tight">
                            {formatCurrency(totalMixFaturado)}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            Itens produzidos no período
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Total de Peças */}
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-1 flex flex-row items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Volume de Peças
                        </span>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Layers className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-1">
                        <div className="text-2xl font-black text-slate-900 tracking-tight">
                            {totalPecas.toLocaleString('pt-BR')} <span className="text-base font-semibold text-slate-500">peças</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            Média de {totalCategorias > 0 ? (totalPecas / totalCategorias).toFixed(0) : 0} pçs / categoria
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Tipos Ativos */}
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-purple-500">
                    <CardHeader className="pb-1 flex flex-row items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Linhas de Produção
                        </span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <Package className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-1">
                        <div className="text-2xl font-black text-slate-900 tracking-tight">
                            {totalCategorias} <span className="text-base font-semibold text-slate-500">tipos</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            Com vendas registradas
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Carro-Chefe */}
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-amber-500">
                    <CardHeader className="pb-1 flex flex-row items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Carro-Chefe
                        </span>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Award className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-1">
                        <div className="text-lg font-black text-slate-900 truncate">
                            {carroChefe ? carroChefe.label : '-'}
                        </div>
                        <p className="text-[11px] text-amber-700 font-bold mt-1">
                            {carroChefe ? `${carroChefe.percentual.toFixed(1)}% do total (${formatCurrency(carroChefe.totalVendido)})` : '-'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico de Barras Horizontais */}
            <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-3.5 px-6">
                    <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-blue-600" />
                            Comparativo de Faturamento por Tipo
                        </CardTitle>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Valores consolidados em R$ no intervalo selecionado
                        </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-600 bg-white">
                        {data.length} {data.length === 1 ? 'categoria' : 'categorias'}
                    </Badge>
                </CardHeader>
                <CardContent className="p-6">
                    <div style={{ height: chartHeight }} className="w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={data}
                                margin={{ top: 8, right: 30, left: 16, bottom: 8 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis
                                    type="number"
                                    tickFormatter={formatCurrencyCompact}
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="label"
                                    stroke="#64748b"
                                    fontSize={12}
                                    fontWeight={600}
                                    width={125}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc', opacity: 0.8 }}
                                    content={<CustomMixTooltip />}
                                />
                                <Bar
                                    dataKey="totalVendido"
                                    radius={[0, 6, 6, 0]}
                                    maxBarSize={28}
                                    animationDuration={600}
                                >
                                    {data.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={PALETTE[index % PALETTE.length]}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela Resumo Detalhada */}
            <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 px-6 gap-3">
                    <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Detalhamento por Categoria de Produção
                        </CardTitle>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Volume de faturamento, peças produzidas, pedidos e ticket unitário
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {totalGeral > 0 && totalMixFaturado !== totalGeral && (
                            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                                <Info className="h-3 w-3 text-blue-500" />
                                <span>Itens somam {formatCurrency(totalMixFaturado)}</span>
                            </div>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCsv}
                            className="h-8 gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 border-slate-200 hover:border-blue-200 hover:bg-blue-50/60 shadow-xs"
                            type="button"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Exportar CSV</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-100">
                                <TableHead className="font-bold text-slate-700 h-11">Tipo de Produção</TableHead>
                                <TableHead className="text-right font-bold text-slate-700 h-11">Faturamento (R$)</TableHead>
                                <TableHead className="text-left font-bold text-slate-700 h-11 w-44">Participação</TableHead>
                                <TableHead className="text-right font-bold text-slate-700 h-11">Qtd. Peças</TableHead>
                                <TableHead className="text-right font-bold text-slate-700 h-11">Nº Pedidos</TableHead>
                                <TableHead className="text-right font-bold text-slate-700 h-11">Preço Médio / Peça</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item, index) => {
                                const color = PALETTE[index % PALETTE.length];
                                const precoMedio = item.quantidade > 0 ? item.totalVendido / item.quantidade : 0;

                                return (
                                    <TableRow
                                        key={item.tipo}
                                        className="hover:bg-slate-50/60 transition-colors border-b border-slate-50"
                                    >
                                        {/* Tipo com badge visual colorido */}
                                        <TableCell className="font-bold text-slate-800">
                                            <div className="flex items-center gap-2.5">
                                                <span
                                                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                                            </div>
                                        </TableCell>

                                        {/* Faturamento */}
                                        <TableCell className="text-right font-black text-slate-900 text-sm">
                                            {formatCurrency(item.totalVendido)}
                                        </TableCell>

                                        {/* Barra de Progresso de Participação */}
                                        <TableCell className="text-left">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${Math.min(100, Math.max(2, item.percentual))}%`,
                                                            backgroundColor: color,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 min-w-[40px]">
                                                    {item.percentual.toFixed(1)}%
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Qtd Peças */}
                                        <TableCell className="text-right font-semibold text-slate-700">
                                            {item.quantidade.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-normal">un</span>
                                        </TableCell>

                                        {/* Nº Pedidos */}
                                        <TableCell className="text-right font-medium text-slate-600">
                                            {item.nPedidos}
                                        </TableCell>

                                        {/* Preço Médio */}
                                        <TableCell className="text-right font-semibold text-emerald-600">
                                            {formatCurrency(precoMedio)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter className="bg-slate-100/70 border-t-2 border-slate-200">
                            <TableRow className="hover:bg-slate-100/80 font-bold">
                                <TableCell className="font-extrabold text-slate-900 uppercase text-xs tracking-wider">
                                    Total Geral ({totalCategorias} {totalCategorias === 1 ? 'tipo' : 'tipos'})
                                </TableCell>
                                <TableCell className="text-right font-extrabold text-slate-900 text-sm">
                                    {formatCurrency(totalMixFaturado)}
                                </TableCell>
                                <TableCell className="text-left font-extrabold text-slate-800 text-xs">
                                    100,0%
                                </TableCell>
                                <TableCell className="text-right font-extrabold text-slate-900">
                                    {totalPecas.toLocaleString('pt-BR')} <span className="text-xs text-slate-500 font-normal">un</span>
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-600">
                                    -
                                </TableCell>
                                <TableCell className="text-right font-extrabold text-emerald-700">
                                    {formatCurrency(totalPecas > 0 ? totalMixFaturado / totalPecas : 0)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
