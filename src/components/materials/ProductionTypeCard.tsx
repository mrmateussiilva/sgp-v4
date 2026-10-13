import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MaterialConfigMap } from '@/types/materialAnalysis';
import { getConsumo, materialPalette } from '@/utils/materialAnalysisUtils';

interface ProductionTypeCardProps {
  tipo: string;
  itens: any[];
  colorIndex: number;
  onViewDetails: () => void;
  configs?: MaterialConfigMap;
}

export const ProductionTypeCard: React.FC<ProductionTypeCardProps> = ({
  tipo,
  itens,
  colorIndex,
  onViewDetails,
  configs
}) => {
  const totalArea = itens.reduce((acc: number, curr: any) => acc + curr.area_total_m2, 0);
  const color = materialPalette[colorIndex % materialPalette.length];
  // Pegamos os 3 materiais com mais área para o resumo do card
  const topItens = [...itens].sort((a: any, b: any) => b.area_total_m2 - a.area_total_m2).slice(0, 3);
  const othersCount = itens.length - 3;
  const dominantPercent = itens.length > 0 ? ((topItens[0].area_total_m2 / totalArea) * 100).toFixed(1) : '0';

  return (
    <Card
      className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group bg-white dark:bg-zinc-900 overflow-hidden border-t-2"
      style={{ borderTopColor: color.hex }}
      onClick={onViewDetails}
    >
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-zinc-500">{tipo}</h3>
            <p className="text-xl font-black text-primary leading-none mt-1">
              {totalArea.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground uppercase">m²</span>
            </p>
          </div>
          <Badge variant="secondary" className={cn("text-[9px] font-bold px-1.5 py-0", color.bg, "text-white border-none")}>
            {itens.length} MATERIAIS
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0 space-y-4">
        <div className="space-y-3">
          {topItens.map((item: any) => {
            const percent = ((item.area_total_m2 / totalArea) * 100);
            return (
              <div key={item.nome} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-zinc-600 truncate max-w-[150px]">{item.nome}</span>
                  <span className="font-black text-zinc-900 dark:text-zinc-100">
                    {getConsumo(item.nome, item.area_total_m2, item.quantidade_itens || 0, configs).text}
                  </span>
                </div>
                <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-500", color.bg)}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {othersCount > 0 && (
          <p className="text-[10px] text-muted-foreground font-medium italic text-center">
            + {othersCount} materiais nesta categoria
          </p>
        )}

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full", color.bg)} />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Dominância</span>
            </div>
            <span className="text-xs font-black text-primary">{dominantPercent}%</span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
            Percentual do material líder em relação ao total desta categoria.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
