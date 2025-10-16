import { useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MedidasCalculatorProps {
  largura: string;
  altura: string;
  area: string;
  onLarguraChange: (value: string) => void;
  onAlturaChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  className?: string;
}

export function MedidasCalculator({
  largura,
  altura,
  area,
  onLarguraChange,
  onAlturaChange,
  onAreaChange,
  className = ""
}: MedidasCalculatorProps) {
  
  // Função para formatar número com vírgula
  const formatNumber = (value: string): string => {
    // Remove tudo que não é número ou vírgula
    const cleaned = value.replace(/[^\d,]/g, '');
    
    // Se tem vírgula, permite apenas uma
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      return parts[0] + ',' + parts.slice(1).join('');
    }
    
    return cleaned;
  };

  // Função para validar entrada (apenas números e vírgula)
  const handleInputChange = (value: string, onChange: (value: string) => void) => {
    const formatted = formatNumber(value);
    onChange(formatted);
  };

  // Calcular área automaticamente quando largura ou altura mudam
  useEffect(() => {
    const larguraNum = parseFloat(String(largura).replace(',', '.')) || 0;
    const alturaNum = parseFloat(String(altura).replace(',', '.')) || 0;
    const areaCalculada = (larguraNum * alturaNum).toFixed(2).replace('.', ',');
    
    // Atualizar área apenas se mudou
    if (area !== areaCalculada) {
      onAreaChange(areaCalculada);
    }
  }, [largura, altura, area, onAreaChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-base font-medium flex items-center">
        <Calculator className="h-4 w-4 mr-1" />
        Medidas (Largura × Altura = Área)
      </Label>
      
      {/* Button Group Style - Usa toda a largura do container pai */}
      <div className="flex w-full">
        {/* Largura */}
        <div className="flex-1">
          <Input
            type="text"
            value={largura}
            onChange={(e) => handleInputChange(e.target.value, onLarguraChange)}
            placeholder="3,00"
            className="h-10 text-sm rounded-r-none border-r-0 focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        
        {/* Separador visual */}
        <div className="flex items-center justify-center px-1 bg-gray-100 border-y border-gray-300">
          <span className="text-gray-500 font-medium text-sm">×</span>
        </div>
        
        {/* Altura */}
        <div className="flex-1">
          <Input
            type="text"
            value={altura}
            onChange={(e) => handleInputChange(e.target.value, onAlturaChange)}
            placeholder="2,00"
            className="h-10 text-sm rounded-none border-r-0 focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        
        {/* Separador visual */}
        <div className="flex items-center justify-center px-1 bg-gray-100 border-y border-gray-300">
          <span className="text-gray-500 font-medium text-sm">=</span>
        </div>
        
        {/* Área */}
        <div className="flex-1">
          <Input
            value={area}
            disabled
            className="h-10 text-sm bg-purple-100 font-bold text-purple-800 rounded-l-none focus:z-10"
          />
        </div>
      </div>
      
      {/* Sem legendas inferiores */}
    </div>
  );
}
