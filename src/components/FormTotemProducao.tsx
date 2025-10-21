import { useMemo } from 'react';
import { Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MedidasCalculator } from '@/components/MedidasCalculator';
import SelectVendedor from '@/components/SelectVendedor';
import SelectDesigner from '@/components/SelectDesigner';
import { CurrencyInput } from '@/components/ui/currency-input';

interface FormTotemProducaoProps {
  tabId: string;
  tabData: any;
  vendedores: string[];
  designers: string[];
  materiais: string[];
  onDataChange: (field: string, value: any) => void;
  onSaveItem?: () => void;
  onCancelItem?: () => void;
  hasUnsavedChanges?: boolean;
}

export function FormTotemProducao({
  tabId,
  tabData,
  vendedores,
  designers,
  materiais,
  onDataChange,
  onSaveItem,
  onCancelItem,
  hasUnsavedChanges = false
}: FormTotemProducaoProps) {
  const parseBR = (v: string | number): number => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const normalized = String(v).replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const formatBR = (v: number): string => {
    if (!v) return '0,00';
    return v.toFixed(2).replace('.', ',');
  };

  const valorUnitarioTotem = useMemo(() => {
    const base = parseBR(tabData?.valor_totem || '0,00');
    const extras = parseBR(tabData?.outros_valores_totem || '0,00');
    return base + extras;
  }, [tabData?.valor_totem, tabData?.outros_valores_totem]);

  const quantidadeTotem = useMemo(() => {
    const qtd = parseInt(tabData?.quantidade_totem || '1', 10);
    return Number.isNaN(qtd) ? 0 : qtd;
  }, [tabData?.quantidade_totem]);

  const valorTotal = useMemo(() => {
    return valorUnitarioTotem * (quantidadeTotem || 0);
  }, [valorUnitarioTotem, quantidadeTotem]);

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label className="text-base font-medium">Descrição do totem *</Label>
          <Input
            value={tabData?.descricao || ''}
            onChange={(e) => onDataChange('descricao', e.target.value)}
            placeholder="Ex: Totem promocional"
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
          <Label className="text-base font-medium">Tipo de material</Label>
          <Select
            value={tabData?.tecido || ''}
            onValueChange={(value) => onDataChange('tecido', value)}
          >
            <SelectTrigger className="bg-white h-12 text-base">
              <SelectValue placeholder="Selecione o material" />
            </SelectTrigger>
            <SelectContent>
              {materiais.map((material) => (
                <SelectItem key={material} value={material}>
                  {material}
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
            <Label className="text-base font-semibold">Acabamento</Label>
            <Select
              value={tabData?.acabamento_totem || 'com_pe'}
              onValueChange={(value) => onDataChange('acabamento_totem', value)}
            >
              <SelectTrigger className="bg-white h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="com_pe">Com pé</SelectItem>
                <SelectItem value="sem_pe">Sem pé</SelectItem>
                <SelectItem value="outro">Outro acabamento</SelectItem>
              </SelectContent>
            </Select>

            {tabData?.acabamento_totem === 'outro' && (
              <Input
                className="h-10"
                placeholder="Descreva o acabamento"
                value={tabData?.acabamento_totem_outro || ''}
                onChange={(e) => onDataChange('acabamento_totem_outro', e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Observações</Label>
            <Textarea
              value={tabData?.observacao || ''}
              onChange={(e) => onDataChange('observacao', e.target.value)}
              placeholder="Detalhes adicionais sobre o totem"
              rows={4}
              className="text-sm"
            />
          </div>
        </div>

        <div className="space-y-2 flex flex-col">
          <Label className="text-base font-semibold">Container Imagem</Label>
          <div className="relative flex-1 min-h-[320px]">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    onDataChange('imagem', reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
              id={`upload-imagem-totem-${tabId}`}
            />
            <label
              htmlFor={`upload-imagem-totem-${tabId}`}
              className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              {tabData?.imagem ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={tabData?.imagem}
                    alt="Preview totem"
                    className="max-w-full max-h-full object-contain p-2"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onDataChange('imagem', '');
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <span className="text-base text-gray-600">Clique para selecionar</span>
                  <span className="text-sm text-gray-400 block mt-1">PNG, JPG até 5MB</span>
                </div>
              )}
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Valor totem (R$)</Label>
            <CurrencyInput
              value={tabData?.valor_totem ?? '0,00'}
              onValueChange={(formatted) => onDataChange('valor_totem', formatted)}
              placeholder="150,00"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Quantidade de totens</Label>
            <Input
              type="number"
              min="1"
              value={tabData?.quantidade_totem || '1'}
              onChange={(e) => onDataChange('quantidade_totem', e.target.value)}
              placeholder="1"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Outros valores (R$)</Label>
            <CurrencyInput
              value={tabData?.outros_valores_totem ?? '0,00'}
              onValueChange={(formatted) => onDataChange('outros_valores_totem', formatted)}
              placeholder="20,00"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Valor total</Label>
            <div className="h-12 flex items-center justify-center bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-500 rounded-md font-bold text-lg text-blue-800">
              R$ {formatBR(valorTotal)}
            </div>
          </div>
        </div>

        {(parseBR(tabData?.valor_totem) > 0 || parseBR(tabData?.outros_valores_totem) > 0) && (
          <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
            <div className="mb-2">
              <strong className="text-lg">Resumo de valores</strong>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Valor base do totem:</span>
                <strong>R$ {formatBR(parseBR(tabData?.valor_totem))}</strong>
              </div>
              {parseBR(tabData?.outros_valores_totem) > 0 && (
                <div className="flex justify-between bg-white bg-opacity-10 px-2 py-1 rounded">
                  <span>+ Outros valores:</span>
                  <strong className="text-blue-200">R$ {formatBR(parseBR(tabData?.outros_valores_totem))}</strong>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold bg-white bg-opacity-20 px-3 py-2 rounded-lg mt-2">
                <span>Total ({tabData?.quantidade_totem || 1} totem(s)):</span>
                <span className="text-yellow-300">R$ {formatBR(valorTotal)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-orange-600 text-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
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
