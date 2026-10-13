import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { MaterialStatsResponse } from '@/api/types';

interface NarrativeSummaryProps {
  stats: MaterialStatsResponse | null;
}

export const NarrativeSummary: React.FC<NarrativeSummaryProps> = ({ stats }) => {
  if (!stats) return null;
  return (
    <Card className="border-none shadow-premium bg-white dark:bg-zinc-900 mt-8">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Análise Qualitativa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed italic border-l-4 border-primary pl-4 py-2 bg-primary/5 rounded-r-lg">
          "A análise de dados sugere que a operação mantém um fluxo estável, com foco principal em materiais de ampla cobertura."
        </p>
        <div>
          <h2 className="text-lg font-bold">Resumo Executivo</h2>
          <p className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Neste período, processamos um total de{' '}
            <span className="font-extrabold text-primary">
              {stats?.kpis?.total_area_m2?.toLocaleString() || '0'} m²
            </span>{' '}
            de materiais. O principal destaque operacional foi o material{' '}
            <span className="font-bold">{stats?.kpis?.material_mais_usado || '---'}</span>, que liderou o consumo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
