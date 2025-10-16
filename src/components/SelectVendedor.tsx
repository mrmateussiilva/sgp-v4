import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SelectVendedorProps {
  label?: string;
  vendedores: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SelectVendedor({
  label = 'Select Vendedor',
  vendedores,
  value,
  onChange,
  placeholder = 'Selecione o vendedor'
}: SelectVendedorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white h-12 text-base">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {vendedores.map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}



