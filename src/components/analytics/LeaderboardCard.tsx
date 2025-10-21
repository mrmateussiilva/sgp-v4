import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsLeaderboardEntry } from '@/types';

interface LeaderboardCardProps {
  title: string;
  data: AnalyticsLeaderboardEntry[];
  emptyMessage?: string;
}

export function LeaderboardCard({ title, data, emptyMessage }: LeaderboardCardProps) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {emptyMessage ?? 'Nenhum dado disponível para os filtros selecionados.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {data.map((entry, index) => (
              <li key={entry.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    {entry.name}
                  </span>
                  <span className="text-slate-900">{entry.value.toLocaleString('pt-BR')}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{
                      width: `${Math.min(100, (entry.value / (data[0]?.value || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
