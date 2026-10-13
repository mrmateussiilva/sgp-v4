import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  tooltip: string;
  colorClass?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, tooltip, colorClass }) => (
  <Card className={cn("border-none shadow-premium bg-white dark:bg-zinc-900 border-l-4 transition-all hover:translate-y-[-2px]", colorClass)}>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{title}</span>
              <Info className="w-3 h-3 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-900 text-white border-zinc-800 text-[10px] max-w-[200px]">
            {tooltip}
          </TooltipContent>
        </UITooltip>
        <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-primary">
          {icon}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">{value}</div>
    </CardContent>
  </Card>
);
