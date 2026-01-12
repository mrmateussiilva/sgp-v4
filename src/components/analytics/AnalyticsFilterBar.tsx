import { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const QUICK_RANGES = [
  {
    value: 'today',
    label: 'Hoje',
    getDates: (today: Date) => ({
      start: new Date(today),
      end: new Date(today),
    }),
  },
  {
    value: 'last_7_days',
    label: 'Últimos 7 dias',
    getDates: (today: Date) => {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start, end: new Date(today) };
    },
  },
  {
    value: 'this_week',
    label: 'Esta semana',
    getDates: (today: Date) => {
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const start = new Date(today.setDate(diff));
      start.setHours(0, 0, 0, 0);
      return { start, end: new Date() };
    },
  },
  {
    value: 'last_week',
    label: 'Semana anterior',
    getDates: (today: Date) => {
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const lastWeekEnd = new Date(today.setDate(diff - 1));
      lastWeekEnd.setHours(23, 59, 59, 999);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      lastWeekStart.setHours(0, 0, 0, 0);
      return { start: lastWeekStart, end: lastWeekEnd };
    },
  },
  {
    value: 'this_month',
    label: 'Este mês',
    getDates: (today: Date) => ({
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today),
    }),
  },
  {
    value: 'last_month',
    label: 'Mês anterior',
    getDates: (today: Date) => ({
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    }),
  },
] as const;

export interface FilterOption {
  label: string;
  value: string;
}

export interface AnalyticsFilterState {
  date_from: string;
  date_to: string;
  vendedor_id: string;
  designer_id: string;
  product_type: string;
}

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilterState;
  vendedores: FilterOption[];
  designers: FilterOption[];
  productTypes: FilterOption[];
  onChange: (filters: Partial<AnalyticsFilterState>) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
}

export function AnalyticsFilterBar({
  filters,
  vendedores,
  designers,
  productTypes,
  onChange,
  onApply,
  onReset,
  loading,
}: AnalyticsFilterBarProps) {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    onChange({ [name]: value === '' ? '' : value });
  };

  const handleSelectChange = (name: keyof AnalyticsFilterState, value: string) => {
    onChange({
      [name]: value === 'all' ? '' : value,
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="date_from">Data inicial</Label>
          <Input
            id="date_from"
            name="date_from"
            type="date"
            value={filters.date_from}
            onChange={handleInputChange}
            className="bg-white"
            max={filters.date_to || undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_to">Data final</Label>
          <Input
            id="date_to"
            name="date_to"
            type="date"
            value={filters.date_to}
            onChange={handleInputChange}
            className="bg-white"
            min={filters.date_from || undefined}
          />
        </div>

        <div className="space-y-2">
          <Label>Vendedor</Label>
          <Select value={filters.vendedor_id || 'all'} onValueChange={(value) => handleSelectChange('vendedor_id', value)}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {vendedores.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Designer</Label>
          <Select value={filters.designer_id || 'all'} onValueChange={(value) => handleSelectChange('designer_id', value)}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {designers.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tipo de produto</Label>
          <Select value={filters.product_type || 'all'} onValueChange={(value) => handleSelectChange('product_type', value)}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {productTypes.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtros rápidos de período */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-sm font-medium text-slate-600 self-center">Períodos rápidos:</span>
        {QUICK_RANGES.map((range) => (
          <Button
            key={range.value}
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
            onClick={() => {
              const today = new Date();
              const { start, end } = range.getDates(today);
              onChange({
                date_from: start.toISOString().split('T')[0],
                date_to: end.toISOString().split('T')[0],
              });
            }}
            type="button"
            disabled={loading}
          >
            {range.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onReset} disabled={loading}>
          Limpar filtros
        </Button>
        <Button onClick={onApply} className="gap-2" disabled={loading}>
          {loading ? 'Carregando...' : 'Aplicar filtros'}
        </Button>
      </div>
    </div>
  );
}
