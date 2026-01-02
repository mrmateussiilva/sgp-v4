import { useMemo } from 'react';
import { Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MedidasCalculator } from '@/components/MedidasCalculator';
import SelectVendedor from '@/components/SelectVendedor';
import SelectDesigner from '@/components/SelectDesigner';
import { CurrencyInput } from '@/components/ui/currency-input';
import { resizeImage } from '@/utils/imageResizer';

interface FormPainelCompletoProps {
  tabId: string;
  tabData: any;
  vendedores: string[];
  designers: string[];
  tecidos: string[];
  onDataChange: (field: string, value: any) => void;
  onSaveItem?: () => void;
  onCancelItem?: () => void;
  hasUnsavedChanges?: boolean;
  mode?: 'painel' | 'generica';
}

const normalizeDecimal = (value: string | number): string => {
  const str = String(value ?? '').trim();
  if (!str) return '0';
  if (str.includes(',') && str.includes('.')) {
    return str.replace(/\./g, '').replace(',', '.');
  }
  if (str.includes(',')) {
    return str.replace(',', '.');
  }
  return str;
};

export function FormPainelCompleto({
  tabId,
  tabData,
  vendedores,
  designers,
  tecidos,
  onDataChange,
  onSaveItem,
  onCancelItem,
  hasUnsavedChanges = false,
  mode = 'painel'
}: FormPainelCompletoProps) {
  const isGenerica = mode === 'generica';
  
  // Funções de parsing e formatação
  const parseBR = (v: string | number): number => {
    if (!v) return 0;
    if (typeof v === 'number') {
      return Number.isFinite(v) ? v : 0;
    }
    const normalized = normalizeDecimal(v);
    const num = Number.parseFloat(normalized);
    return Number.isNaN(num) ? 0 : num;
  };

  const formatBR = (v: number): string => {
    if (!v) return '0,00';
    return v.toFixed(2).replace('.', ',');
  };

  // Cálculo de valores
  const valorTotalIlhos = useMemo(() => {
    if (tabData?.tipo_acabamento !== 'ilhos') return 0;
    const qtd = parseInt(tabData?.quantidade_ilhos || '0');
    const valorUnit = parseBR(tabData?.valor_ilhos || '0,00');
    return qtd * valorUnit;
  }, [tabData?.tipo_acabamento, tabData?.quantidade_ilhos, tabData?.valor_ilhos]);

  const valorTotalCordinha = useMemo(() => {
    if (tabData?.tipo_acabamento !== 'cordinha') return 0;
    const qtd = parseInt(tabData?.quantidade_cordinha || '0');
    const valorUnit = parseBR(tabData?.valor_cordinha || '0,00');
    return qtd * valorUnit;
  }, [tabData?.tipo_acabamento, tabData?.quantidade_cordinha, tabData?.valor_cordinha]);

  const valorTotalGeral = useMemo(() => {
    const valorPainel = parseBR(tabData?.valor_painel || '0,00');
    const valorAdicionais = parseBR(tabData?.valores_adicionais || '0,00');
    const quantidade = parseInt(tabData?.quantidade_paineis || '1');
    return (valorPainel + valorAdicionais + valorTotalIlhos + valorTotalCordinha) * quantidade;
  }, [tabData?.valor_painel, tabData?.valores_adicionais, tabData?.quantidade_paineis, valorTotalIlhos, valorTotalCordinha]);

  return (
    <div className="space-y-6">
      {/* === TOPO: DESCRIÇÃO + MEDIDAS === */}
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label className="text-base font-medium">Descrição do tecido *</Label>
          <Input
            value={tabData?.descricao || ''}
            onChange={(e) => onDataChange('descricao', e.target.value)}
            placeholder="Ex: Tecido promocional para evento"
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

      {/* === LINHA DOS SELECTS === */}
      <div className="grid grid-cols-3 gap-4">
        {/* Tecido */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Tecido</Label>
          <Select
            value={tabData?.tecido || ''}
            onValueChange={(value) => onDataChange('tecido', value)}
          >
            <SelectTrigger className="bg-white h-12 text-base">
              <SelectValue placeholder="Selecione o tecido" />
            </SelectTrigger>
            <SelectContent>
              {tecidos.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Vendedor (reutilizável) */}
        <SelectVendedor
          label="Vendedor"
          vendedores={vendedores}
          value={tabData?.vendedor || ''}
          onChange={(value) => onDataChange('vendedor', value)}
        />

        {/* Designer (reutilizável) */}
        <SelectDesigner
          label="Designer"
          designers={designers}
          value={tabData?.designer || ''}
          onChange={(value) => onDataChange('designer', value)}
        />
      </div>

      {/* === ACABAMENTOS + CONTAINER IMAGEM === */}
      <div className="grid grid-cols-2 gap-6 items-stretch">
        {/* COLUNA ESQUERDA - ACABAMENTOS */}
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Acabamento:</Label>
            
            {/* Overloque */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`overloque-${tabId}`}
                  checked={tabData?.overloque || false}
                  onCheckedChange={(checked) => onDataChange('overloque', checked)}
                />
                <label htmlFor={`overloque-${tabId}`} className="text-base cursor-pointer">
                  Overloque
                </label>
              </div>
            </div>

            {/* Elástico */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`elastico-${tabId}`}
                  checked={tabData?.elastico || false}
                  onCheckedChange={(checked) => onDataChange('elastico', checked)}
                />
                <label htmlFor={`elastico-${tabId}`} className="text-base cursor-pointer">
                  Elástico
                </label>
              </div>
            </div>

            {/* Emenda */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Emenda</Label>
              <Select
                value={tabData?.emenda || 'sem-emenda'}
                onValueChange={(value) => onDataChange('emenda', value)}
              >
                <SelectTrigger className="bg-white h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem-emenda">Sem emenda</SelectItem>
                  <SelectItem value="vertical">Vertical</SelectItem>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Campo condicional para quantidade de emendas */}
              {tabData?.emenda !== 'sem-emenda' && (
                <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-300">
                  <Label className="text-sm font-medium text-yellow-800">
                    Quantidade de emendas:
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={tabData?.emendaQtd || ''}
                    onChange={(e) => onDataChange('emendaQtd', e.target.value)}
                    placeholder="Ex: 2"
                    className="h-10 mt-1"
                  />
                </div>
              )}
            </div>

            {/* Ilhós */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`ilhos-${tabId}`}
                  checked={tabData?.tipo_acabamento === 'ilhos'}
                  onCheckedChange={(checked) => {
                    onDataChange('tipo_acabamento', checked ? 'ilhos' : 'nenhum');
                  }}
                />
                <label htmlFor={`ilhos-${tabId}`} className="text-base cursor-pointer">
                  Ilhós
                </label>
              </div>
              
              {/* Campos condicionais para ilhós */}
              {tabData?.tipo_acabamento === 'ilhos' && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-300 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tabData?.quantidade_ilhos || ''}
                        onChange={(e) => onDataChange('quantidade_ilhos', e.target.value)}
                        placeholder="4"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Distância (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={tabData?.espaco_ilhos || ''}
                        onChange={(e) => onDataChange('espaco_ilhos', e.target.value)}
                        placeholder="20"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Unit.</Label>
                      <CurrencyInput
                        value={tabData?.valor_ilhos ?? '0,00'}
                        onValueChange={(formatted) => onDataChange('valor_ilhos', formatted)}
                        placeholder="0,50"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cordinha */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`cordinha-${tabId}`}
                  checked={tabData?.tipo_acabamento === 'cordinha'}
                  onCheckedChange={(checked) => {
                    onDataChange('tipo_acabamento', checked ? 'cordinha' : 'nenhum');
                  }}
                />
                <label htmlFor={`cordinha-${tabId}`} className="text-base cursor-pointer">
                  Cordinha
                </label>
              </div>
              
              {/* Campos condicionais para cordinha */}
              {tabData?.tipo_acabamento === 'cordinha' && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-300 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tabData?.quantidade_cordinha || ''}
                        onChange={(e) => onDataChange('quantidade_cordinha', e.target.value)}
                        placeholder="2"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Distância (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={tabData?.espaco_cordinha || ''}
                        onChange={(e) => onDataChange('espaco_cordinha', e.target.value)}
                        placeholder="30"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Unit.</Label>
                      <CurrencyInput
                        value={tabData?.valor_cordinha ?? '0,00'}
                        onValueChange={(formatted) => onDataChange('valor_cordinha', formatted)}
                        placeholder="1,50"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isGenerica && (
              <div className="space-y-3 pt-2 border-t border-dashed border-gray-200">
                <Label className="text-base font-semibold">Extras da produção</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`ziper-${tabId}`}
                      checked={tabData?.ziper || false}
                      onCheckedChange={(checked) => onDataChange('ziper', Boolean(checked))}
                    />
                    <label htmlFor={`ziper-${tabId}`} className="text-base cursor-pointer">
                      Zíper
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`cordinha-extra-${tabId}`}
                      checked={tabData?.cordinha_extra || false}
                      onCheckedChange={(checked) => onDataChange('cordinha_extra', Boolean(checked))}
                    />
                    <label htmlFor={`cordinha-extra-${tabId}`} className="text-base cursor-pointer">
                      Cordinha
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`alcinha-${tabId}`}
                      checked={tabData?.alcinha || false}
                      onCheckedChange={(checked) => onDataChange('alcinha', Boolean(checked))}
                    />
                    <label htmlFor={`alcinha-${tabId}`} className="text-base cursor-pointer">
                      Alcinha
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`toalha-pronta-${tabId}`}
                      checked={tabData?.toalha_pronta || false}
                      onCheckedChange={(checked) => onDataChange('toalha_pronta', Boolean(checked))}
                    />
                    <label htmlFor={`toalha-pronta-${tabId}`} className="text-base cursor-pointer">
                      Toalha pronta
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA - CONTAINER IMAGEM */}
        <div className="space-y-2 flex flex-col">
          <Label className="text-base font-semibold">Container Imagem</Label>
          <div className="relative flex-1 min-h-[320px]">
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const resizedImage = await resizeImage(file);
                    onDataChange('imagem', resizedImage);
                  } catch (error) {
                    console.error('Erro ao redimensionar imagem:', error);
                    // Fallback: usar imagem original se redimensionamento falhar
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      onDataChange('imagem', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }
              }}
              className="hidden"
              id={`upload-imagem-${tabId}`}
            />
            <label
              htmlFor={`upload-imagem-${tabId}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) {
                  try {
                    const resizedImage = await resizeImage(file);
                    onDataChange('imagem', resizedImage);
                  } catch (error) {
                    console.error('Erro ao redimensionar imagem:', error);
                    // Fallback: usar imagem original se redimensionamento falhar
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      onDataChange('imagem', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }
              }}
              className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              {tabData?.imagem ? (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <img
                    src={tabData?.imagem}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain p-2"
                    style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onDataChange('imagem', '');
                      onDataChange('legenda_imagem', '');
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
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Legenda da imagem</Label>
            <Input
              value={tabData?.legenda_imagem || ''}
              onChange={(e) => onDataChange('legenda_imagem', e.target.value)}
              placeholder="Digite a legenda exibida abaixo da imagem"
              className="h-10"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Data de Impressão</Label>
              <Input
                type="date"
                value={tabData?.data_impressao || ''}
                onChange={(e) => onDataChange('data_impressao', e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">RIP Máquina</Label>
              <Input
                value={tabData?.rip_maquina || ''}
                onChange={(e) => onDataChange('rip_maquina', e.target.value)}
                placeholder="Ex: RIP-001"
                className="h-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* === RODAPÉ: VALORES + BOTÕES === */}
      <div className="space-y-4">
        {/* Valores */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Valor tecido</Label>
            <CurrencyInput
              value={tabData?.valor_painel ?? '0,00'}
              onValueChange={(formatted) => onDataChange('valor_painel', formatted)}
              placeholder="150,00"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Quantidade de tecidos?</Label>
            <Input
              type="number"
              min="1"
              value={tabData?.quantidade_paineis || '1'}
              onChange={(e) => onDataChange('quantidade_paineis', e.target.value)}
              placeholder="1"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Outros Valores</Label>
            <CurrencyInput
              value={tabData?.valores_adicionais ?? '0,00'}
              onValueChange={(formatted) => onDataChange('valores_adicionais', formatted)}
              placeholder="10,00"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Valor total</Label>
            <div className="h-12 flex items-center justify-center bg-gradient-to-r from-emerald-100 to-emerald-200 border-2 border-emerald-500 rounded-md font-bold text-lg text-emerald-800">
              R$ {formatBR(valorTotalGeral)}
            </div>
          </div>
        </div>

        {/* Resumo dos valores */}
        {(parseBR(tabData?.valor_painel) > 0 || valorTotalIlhos > 0 || valorTotalCordinha > 0) && (
          <div className="p-4 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl text-white">
            <div className="mb-2">
              <strong className="text-lg">Resumo dos valores de forma fácil</strong>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Valor Base do Tecido:</span>
                <strong>R$ {formatBR(parseBR(tabData?.valor_painel))}</strong>
              </div>
              {valorTotalIlhos > 0 && (
                <div className="flex justify-between bg-white bg-opacity-10 px-2 py-1 rounded">
                  <span>+ Ilhós ({tabData?.quantidade_ilhos} un. × R$ {tabData?.valor_ilhos}):</span>
                  <strong className="text-blue-200">R$ {formatBR(valorTotalIlhos)}</strong>
                </div>
              )}
              {valorTotalCordinha > 0 && (
                <div className="flex justify-between bg-white bg-opacity-10 px-2 py-1 rounded">
                  <span>+ Cordinha ({tabData?.quantidade_cordinha} un. × R$ {tabData?.valor_cordinha}):</span>
                  <strong className="text-green-200">R$ {formatBR(valorTotalCordinha)}</strong>
                </div>
              )}
              {parseBR(tabData?.valores_adicionais) > 0 && (
                <div className="flex justify-between">
                  <span>+ Outros Valores:</span>
                  <strong>R$ {formatBR(parseBR(tabData?.valores_adicionais))}</strong>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold bg-white bg-opacity-20 px-3 py-2 rounded-lg mt-2">
                <span>TOTAL ({tabData?.quantidade_paineis || 1} painéis):</span>
                <span className="text-yellow-300">R$ {formatBR(valorTotalGeral)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Botões de ação */}
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
