import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardInsightsProps {
    insights: string[];
    loading: boolean;
    periodMetadata: {
        start: string;
        end: string;
        mode: string;
    };
}

export function DashboardInsights({ insights, loading, periodMetadata }: DashboardInsightsProps) {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '--/--/----';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const getModeLabel = (mode: string) => {
        const modes: Record<string, string> = {
            entrada: 'Data de Entrada',
            entrega: 'Data de Entrega',
            criacao: 'Data de Criação',
            atualizacao: 'Última Atualização',
        };
        return modes[mode] || mode;
    };

    if (loading) {
        return (
            <Card className="border-slate-100 shadow-none bg-slate-50/50">
                <CardHeader className="py-3 px-4">
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (insights.length === 0) return null;

    return (
        <Card className="border-slate-100 shadow-none bg-slate-50/50">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-white/50">
                <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <Lightbulb className="h-3 w-3 text-amber-500" />
                    Insights Estratégicos
                </CardTitle>
                <div className="text-[10px] font-medium text-slate-400 italic">
                    {formatDate(periodMetadata.start)} → {formatDate(periodMetadata.end)} | Ref: {getModeLabel(periodMetadata.mode)}
                </div>
            </CardHeader>
            <CardContent className="px-4 py-3">
                <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2 text-[11px] font-medium leading-tight text-slate-600">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                            <span>{insight}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
