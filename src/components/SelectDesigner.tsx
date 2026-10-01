import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SelectDesignerProps {
  id?: string;
  label?: string;
  designers: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SelectDesigner({
  id,
  label = 'Select Designer',
  designers,
  value,
  onChange,
  placeholder = 'Selecione o designer'
}: SelectDesignerProps) {
  const triggerId = id ?? 'select-designer';

  const uniqueDesigners = Array.from(
    new Set((designers || []).map((d) => (typeof d === 'string' ? d.trim() : '')).filter(Boolean))
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={triggerId} className="text-base font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={triggerId} aria-label={label} className="bg-white h-12 text-base">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {uniqueDesigners.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
          {value && !uniqueDesigners.includes(value) && (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}



