import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardInsightsProps {
    insights: string[];
    loading: boolean;
}

export function DashboardInsights({ insights, loading }: DashboardInsightsProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-4 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (insights.length === 0) return null;

    return (
        <Card className="border-amber-100 bg-amber-50/30">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-900">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Insights e Recomendações
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-amber-800">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                            <span>{insight}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
