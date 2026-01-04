import { useMemo, useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { MedidasCalculator } from '@/components/MedidasCalculator';
import SelectVendedor from '@/components/SelectVendedor';
import SelectDesigner from '@/components/SelectDesigner';
import { processAndSaveImage } from '@/utils/localImageManager';
import { getImagePreviewUrl } from '@/utils/imagePreview';
import { isTauri } from '@/utils/isTauri';
import { useToast } from '@/hooks/use-toast';

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

interface FormLonaProducaoProps {
  tabId: string;
  tabData: any;
  vendedores: string[];
  designers: string[];
  tiposLona: string[];
  onDataChange: (field: string, value: any) => void;
  onSaveItem?: () => void;
  onCancelItem?: () => void;
  hasUnsavedChanges?: boolean;
}

export function FormLonaProducao({
  tabId,
  tabData,
  vendedores,
  designers,
  tiposLona,
  onDataChange,
  onSaveItem,
  onCancelItem,
  hasUnsavedChanges = false,
}: FormLonaProducaoProps) {
  const { toast } = useToast();
  
  // Estado para preview da imagem (temporário, apenas para exibição)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Carregar preview quando imagem mudar
  useEffect(() => {
    if (!tabData?.imagem) {
      setImagePreviewUrl(null);
      return;
    }

    setImageLoading(true);
    getImagePreviewUrl(tabData.imagem)
      .then((url) => {
        setImagePreviewUrl(url);
      })
      .catch((error) => {
        console.error('Erro ao carregar preview de imagem:', error);
        setImagePreviewUrl(null);
      })
      .finally(() => {
        setImageLoading(false);
      });
  }, [tabData?.imagem]);
  const parseBR = (value: string | number): number => {
    if (!value) return 0;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    const normalized = normalizeDecimal(value);
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatBR = (value: number): string => {
    if (!value) return '0,00';
    return value.toFixed(2).replace('.', ',');
  };

  const valorIlhosTotal = useMemo(() => {
    if (tabData?.tipo_acabamento !== 'ilhos') return 0;
    const quantidade = parseInt(tabData?.quantidade_ilhos || '0', 10);
    const valorUnitario = parseBR(tabData?.valor_ilhos || '0,00');
    if (Number.isNaN(quantidade) || quantidade <= 0) return 0;
    return quantidade * valorUnitario;
  }, [tabData?.tipo_acabamento, tabData?.quantidade_ilhos, tabData?.valor_ilhos]);

  const valorUnitario = useMemo(() => {
    const base = parseBR(tabData?.valor_lona || '0,00');
    const extras = parseBR(tabData?.outros_valores_lona || '0,00');
    return base + extras + valorIlhosTotal;
  }, [tabData?.valor_lona, tabData?.outros_valores_lona, valorIlhosTotal]);

  const quantidadeLona = useMemo(() => {
    const quantidade = parseInt(tabData?.quantidade_lona || '1', 10);
    if (Number.isNaN(quantidade) || quantidade <= 0) {
      return 0;
    }
    return quantidade;
  }, [tabData?.quantidade_lona]);

  const valorTotal = useMemo(() => {
    if (quantidadeLona <= 0) return 0;
    return valorUnitario * quantidadeLona;
  }, [valorUnitario, quantidadeLona]);

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label className="text-base font-medium">Descrição da lona *</Label>
          <Input
            value={tabData?.descricao || ''}
            onChange={(event) => onDataChange('descricao', event.target.value)}
            placeholder="Ex: Lona frontlight 3x2m"
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
          <Label className="text-base font-medium">Tipo de lona</Label>
          <Select
            value={tabData?.tecido || ''}
            onValueChange={(value) => onDataChange('tecido', value)}
          >
            <SelectTrigger className="bg-white h-12 text-base">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {tiposLona.map((tipo) => (
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

      <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
        <Checkbox
          id={`terceirizado-${tabId}`}
          checked={tabData?.terceirizado || false}
          onCheckedChange={(checked) => onDataChange('terceirizado', Boolean(checked))}
        />
        <label htmlFor={`terceirizado-${tabId}`} className="text-base cursor-pointer">
          Vai ser terceirizado?
        </label>
      </div>

      <div className="grid grid-cols-2 gap-6 items-stretch">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold">Acabamento</Label>
            <Select
              value={tabData?.acabamento_lona || 'refilar'}
              onValueChange={(value) => onDataChange('acabamento_lona', value)}
            >
              <SelectTrigger className="bg-white h-12 text-base">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="refilar">Refilar</SelectItem>
                <SelectItem value="nao_refilar">Não refilar</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                <SelectItem value="sem-emenda">Não</SelectItem>
                <SelectItem value="com-emenda">Sim</SelectItem>
              </SelectContent>
            </Select>

            {tabData?.emenda === 'com-emenda' && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Label className="text-sm font-medium text-amber-800">
                  Quantidade de emendas
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={tabData?.emendaQtd || ''}
                  onChange={(event) => onDataChange('emendaQtd', event.target.value)}
                  placeholder="Ex: 2"
                  className="mt-1 h-10"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`ilhos-${tabId}`}
                checked={tabData?.tipo_acabamento === 'ilhos'}
                onCheckedChange={(checked) => onDataChange('tipo_acabamento', checked ? 'ilhos' : 'nenhum')}
              />
              <label htmlFor={`ilhos-${tabId}`} className="text-base cursor-pointer">
                Ilhós
              </label>
            </div>

            {tabData?.tipo_acabamento === 'ilhos' && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={tabData?.quantidade_ilhos || ''}
                      onChange={(event) => onDataChange('quantidade_ilhos', event.target.value)}
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
                      onChange={(event) => onDataChange('espaco_ilhos', event.target.value)}
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
        </div>

        <div className="space-y-2 flex flex-col">
          <Label className="text-base font-semibold">Imagem da lona</Label>
          <div className="relative flex-1 min-h-[320px]">
            <Input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                // Se estiver em Tauri, salvar localmente
                if (isTauri()) {
                  try {
                    setImageLoading(true);
                    
                    // Converter File para Uint8Array
                    const arrayBuffer = await file.arrayBuffer();
                    const imageData = new Uint8Array(arrayBuffer);
                    
                    // Processar e salvar localmente
                    const metadata = await processAndSaveImage(
                      imageData,
                      1200, // maxWidth
                      1200, // maxHeight
                      85    // quality
                    );
                    
                    // Armazenar local_path no estado (NÃO base64!)
                    onDataChange('imagem', metadata.local_path);
                    onDataChange('_image_metadata', metadata);
                    
                    // Carregar preview temporário
                    const preview = await getImagePreviewUrl(metadata.local_path);
                    setImagePreviewUrl(preview);
                    
                    toast({
                      title: 'Imagem salva',
                      description: 'Imagem salva localmente com sucesso.',
                    });
                  } catch (error) {
                    console.error('Erro ao salvar imagem localmente:', error);
                    toast({
                      title: 'Erro',
                      description: 'Não foi possível salvar a imagem localmente.',
                      variant: 'destructive',
                    });
                  } finally {
                    setImageLoading(false);
                  }
                } else {
                  // Fallback para ambiente web
                  try {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      onDataChange('imagem', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  } catch (error) {
                    console.error('Erro ao ler arquivo:', error);
                    toast({
                      title: 'Erro',
                      description: 'Não foi possível ler o arquivo.',
                      variant: 'destructive',
                    });
                  }
                }
              }}
              className="hidden"
              id={`upload-imagem-lona-${tabId}`}
            />
            <label
              htmlFor={`upload-imagem-lona-${tabId}`}
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
                if (!file || !file.type.startsWith('image/')) return;

                // Se estiver em Tauri, salvar localmente
                if (isTauri()) {
                  try {
                    setImageLoading(true);
                    
                    // Converter File para Uint8Array
                    const arrayBuffer = await file.arrayBuffer();
                    const imageData = new Uint8Array(arrayBuffer);
                    
                    // Processar e salvar localmente
                    const metadata = await processAndSaveImage(
                      imageData,
                      1200, // maxWidth
                      1200, // maxHeight
                      85    // quality
                    );
                    
                    // Armazenar local_path no estado
                    onDataChange('imagem', metadata.local_path);
                    onDataChange('_image_metadata', metadata);
                    
                    // Carregar preview temporário
                    const preview = await getImagePreviewUrl(metadata.local_path);
                    setImagePreviewUrl(preview);
                    
                    toast({
                      title: 'Imagem salva',
                      description: 'Imagem salva localmente com sucesso.',
                    });
                  } catch (error) {
                    console.error('Erro ao salvar imagem localmente:', error);
                    toast({
                      title: 'Erro',
                      description: 'Não foi possível salvar a imagem localmente.',
                      variant: 'destructive',
                    });
                  } finally {
                    setImageLoading(false);
                  }
                } else {
                  // Fallback para ambiente web
                  try {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      onDataChange('imagem', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  } catch (error) {
                    console.error('Erro ao ler arquivo:', error);
                    toast({
                      title: 'Erro',
                      description: 'Não foi possível ler o arquivo.',
                      variant: 'destructive',
                    });
                  }
                }
              }}
              className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              {imageLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <span className="text-sm text-gray-600">Carregando imagem...</span>
                  </div>
                </div>
              ) : imagePreviewUrl ? (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview lona"
                    className="max-w-full max-h-full object-contain p-2"
                    style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      onDataChange('imagem', '');
                      onDataChange('legenda_imagem', '');
                      onDataChange('_image_metadata', null);
                      setImagePreviewUrl(null);
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
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Legenda da imagem</Label>
            <Input
              value={tabData?.legenda_imagem || ''}
              onChange={(event) => onDataChange('legenda_imagem', event.target.value)}
              placeholder="Digite a legenda exibida abaixo da imagem"
              className="h-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Valor da lona</Label>
            <CurrencyInput
              value={tabData?.valor_lona ?? '0,00'}
              onValueChange={(formatted) => onDataChange('valor_lona', formatted)}
              placeholder="150,00"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Quantidade de lonas</Label>
            <Input
              type="number"
              min="1"
              value={tabData?.quantidade_lona || '1'}
              onChange={(event) => onDataChange('quantidade_lona', event.target.value)}
              placeholder="1"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Outros valores</Label>
            <CurrencyInput
              value={tabData?.outros_valores_lona ?? '0,00'}
              onValueChange={(formatted) => onDataChange('outros_valores_lona', formatted)}
              placeholder="10,00"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Valor total</Label>
            <div className="h-12 flex items-center justify-center bg-gradient-to-r from-cyan-100 to-cyan-200 border-2 border-cyan-500 rounded-md font-bold text-lg text-cyan-800">
              R$ {formatBR(valorTotal)}
            </div>
          </div>
        </div>

        {valorUnitario > 0 && (
          <div className="p-4 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl text-white space-y-2">
            <div className="text-lg font-semibold">Resumo dos valores</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Valor base da lona:</span>
                <strong>R$ {formatBR(parseBR(tabData?.valor_lona || '0,00'))}</strong>
              </div>
              {valorIlhosTotal > 0 && (
                <div className="flex justify-between bg-white bg-opacity-10 px-2 py-1 rounded">
                  <span>+ Ilhós ({tabData?.quantidade_ilhos || 0} un.):</span>
                  <strong className="text-blue-200">R$ {formatBR(valorIlhosTotal)}</strong>
                </div>
              )}
              {parseBR(tabData?.outros_valores_lona || '0,00') > 0 && (
                <div className="flex justify-between">
                  <span>+ Outros valores:</span>
                  <strong>R$ {formatBR(parseBR(tabData?.outros_valores_lona || '0,00'))}</strong>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold bg-white bg-opacity-20 px-3 py-2 rounded-lg mt-2">
                <span>Total ({quantidadeLona || 1} lonas):</span>
                <span className="text-yellow-300">R$ {formatBR(valorTotal)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-base font-medium">Observações</Label>
          <Textarea
            value={tabData?.observacao || ''}
            onChange={(event) => onDataChange('observacao', event.target.value)}
            placeholder="Observações adicionais para a produção da lona"
            rows={3}
            className="text-sm"
          />
        </div>

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
