import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SelectDesignerProps {
  label?: string;
  designers: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SelectDesigner({
  label = 'Select Designer',
  designers,
  value,
  onChange,
  placeholder = 'Selecione o designer'
}: SelectDesignerProps) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white h-12 text-base">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {designers.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}



