import { useMemo } from 'react';
import { Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { MedidasCalculator } from '@/components/MedidasCalculator';
import SelectVendedor from '@/components/SelectVendedor';
import SelectDesigner from '@/components/SelectDesigner';

interface FormAdesivoProducaoProps {
  tabId: string;
  tabData: any;
  vendedores: string[];
  designers: string[];
  tiposAdesivo: string[];
  onDataChange: (field: string, value: any) => void;
  onSaveItem?: () => void;
  onCancelItem?: () => void;
  hasUnsavedChanges?: boolean;
}

const parseBR = (value: string | number): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const normalized = String(value).replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatBR = (value: number): string => {
  if (!value) return '0,00';
  return value.toFixed(2).replace('.', ',');
};

export function FormAdesivoProducao({
  tabId,
  tabData,
  vendedores,
  designers,
  tiposAdesivo,
  onDataChange,
  onSaveItem,
  onCancelItem,
  hasUnsavedChanges = false,
}: FormAdesivoProducaoProps) {
  const valorAdesivo = useMemo(() => parseBR(tabData?.valor_adesivo || '0,00'), [tabData?.valor_adesivo]);
  const outrosValores = useMemo(
    () => parseBR(tabData?.outros_valores_adesivo || '0,00'),
    [tabData?.outros_valores_adesivo]
  );

  const quantidade = useMemo(() => {
    const quantidadeRaw = parseInt(tabData?.quantidade_adesivo || '1', 10);
    return Number.isNaN(quantidadeRaw) || quantidadeRaw <= 0 ? 0 : quantidadeRaw;
  }, [tabData?.quantidade_adesivo]);

  const valorUnitarioSugerido = valorAdesivo + outrosValores;
  const valorTotal = quantidade > 0 ? valorUnitarioSugerido * quantidade : valorUnitarioSugerido;

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label className="text-base font-medium">Descrição do adesivo *</Label>
          <Input
            value={tabData?.descricao || ''}
            onChange={(event) => onDataChange('descricao', event.target.value)}
            placeholder="Ex: Adesivo vinil 2x1m"
            className="h-10 text-sm"
          />
        </div>

        <div className="w-2/5">
          <MedidasCalculator
            largura={tabData?.largura || ''}
            altura={tabData?.altura || ''}
            area={tabData?.metro_quadrado || '0,00'}
            onLarguraChange={(value) => onDataChange('largura', value)}
            onAlturaChange={(value) => onDataChange('altura', value)}
            onAreaChange={(value) => onDataChange('metro_quadrado', value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-base font-medium">Tipo de adesivo</Label>
          <Select
            value={tabData?.tipo_adesivo || ''}
            onValueChange={(value) => {
              onDataChange('tipo_adesivo', value);
              onDataChange('tecido', value);
            }}
          >
            <SelectTrigger className="bg-white h-12 text-base">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {tiposAdesivo.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SelectVendedor
          label="Vendedor"
          vendedores={vendedores}
          value={tabData?.vendedor || ''}
          onChange={(value) => onDataChange('vendedor', value)}
        />

        <SelectDesigner
          label="Designer"
          designers={designers}
          value={tabData?.designer || ''}
          onChange={(value) => onDataChange('designer', value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 items-stretch">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Observações</Label>
            <Textarea
              value={tabData?.observacao || ''}
              onChange={(event) => onDataChange('observacao', event.target.value)}
              placeholder="Detalhes adicionais sobre o adesivo"
              rows={5}
              className="text-sm"
            />
          </div>
        </div>

        <div className="space-y-2 flex flex-col">
          <Label className="text-base font-semibold">Imagem do adesivo</Label>
          <div className="relative flex-1 min-h-[320px]">
            <Input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => {
                  onDataChange('imagem', reader.result as string);
                };
                reader.readAsDataURL(file);
              }}
              className="hidden"
              id={`upload-imagem-adesivo-${tabId}`}
            />
            <label
              htmlFor={`upload-imagem-adesivo-${tabId}`}
              className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              {tabData?.imagem ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={tabData?.imagem}
                    alt="Preview adesivo"
                    className="max-w-full max-h-full object-contain p-2"
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      onDataChange('imagem', '');
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <span className="text-base text-gray-600">Clique para selecionar</span>
                  <span className="text-sm text-gray-400 block mt-1">PNG ou JPG até 5MB</span>
                </div>
              )}
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Valor do adesivo (R$)</Label>
            <CurrencyInput
              value={tabData?.valor_adesivo ?? '0,00'}
              onValueChange={(formatted) => onDataChange('valor_adesivo', formatted)}
              placeholder="75,00"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Quantidade</Label>
            <Input
              type="number"
              min="1"
              value={tabData?.quantidade_adesivo || '1'}
              onChange={(event) => onDataChange('quantidade_adesivo', event.target.value)}
              placeholder="1"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Outros valores (R$)</Label>
            <CurrencyInput
              value={tabData?.outros_valores_adesivo ?? '0,00'}
              onValueChange={(formatted) => onDataChange('outros_valores_adesivo', formatted)}
              placeholder="15,00"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Valor total</Label>
            <div className="h-12 flex items-center justify-center bg-gradient-to-r from-emerald-100 to-emerald-200 border-2 border-emerald-500 rounded-md font-bold text-lg text-emerald-800">
              R$ {formatBR(valorTotal)}
            </div>
          </div>
        </div>

        {(valorAdesivo > 0 || outrosValores > 0) && (
          <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl text-white space-y-2">
            <div className="text-lg font-semibold">Resumo dos valores</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Valor base do adesivo:</span>
                <strong>R$ {formatBR(valorAdesivo)}</strong>
              </div>
              {outrosValores > 0 && (
                <div className="flex justify-between bg-white bg-opacity-10 px-2 py-1 rounded">
                  <span>+ Outros valores:</span>
                  <strong className="text-emerald-200">R$ {formatBR(outrosValores)}</strong>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold bg-white bg-opacity-20 px-3 py-2 rounded-lg mt-2">
                <span>Total ({tabData?.quantidade_adesivo || 1} adesivo(s)):</span>
                <span className="text-yellow-300">R$ {formatBR(valorTotal)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-orange-600 text-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span>Mudanças não salvas</span>
            </div>
          )}

          <div className="flex gap-4 ml-auto">
            <Button
              variant="outline"
              type="button"
              onClick={onCancelItem}
              className="h-12 px-6 text-red-600 border-red-300 hover:bg-red-50"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={onSaveItem}
              className="h-12 px-6 bg-green-600 hover:bg-green-700"
            >
              Salvar Item
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
