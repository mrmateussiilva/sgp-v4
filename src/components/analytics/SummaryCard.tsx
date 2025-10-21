import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}

export function SummaryCard({ title, value, subtitle, icon, className }: SummaryCardProps) {
  return (
    <Card className={cn('h-full border-slate-200 bg-white', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        {icon ? <div className="text-primary">{icon}</div> : null}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
        {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}
