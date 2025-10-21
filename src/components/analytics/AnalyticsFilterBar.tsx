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
