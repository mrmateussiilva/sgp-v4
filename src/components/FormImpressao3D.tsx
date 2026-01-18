import { useMemo, useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface FormImpressao3DProps {
  tabId: string;
  tabData: any;
  vendedores: string[];
  designers: string[];
  onDataChange: (field: string, value: any) => void;
  onSaveItem?: () => void;
  onCancelItem?: () => void;
  hasUnsavedChanges?: boolean;
}

const parseBR = (value: string | number): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const normalized = normalizeDecimal(value);
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatBR = (value: number): string => {
  if (!value) return '0,00';
  return value.toFixed(2).replace('.', ',');
};

export function FormImpressao3D({
  tabId,
  tabData,
  vendedores,
  designers,
  onDataChange,
  onSaveItem,
  onCancelItem,
  hasUnsavedChanges = false,
}: FormImpressao3DProps) {
  const { toast } = useToast();

  // Estado para preview da imagem (temporário, apenas para exibição)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Material sempre será "plastico" - definir ao montar o componente
  useEffect(() => {
    if (tabData?.tecido !== 'plastico') {
      onDataChange('tecido', 'plastico');
    }
  }, [tabData?.tecido, onDataChange]);

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

  const valorImpressao3D = useMemo(() => parseBR(tabData?.valor_impressao_3d || '0,00'), [tabData?.valor_impressao_3d]);
  const outrosValores = useMemo(
    () => parseBR(tabData?.valores_adicionais || '0,00'),
    [tabData?.valores_adicionais]
  );

  const quantidade = useMemo(() => {
    const quantidadeRaw = parseInt(tabData?.quantidade_impressao_3d || '1', 10);
    return Number.isNaN(quantidadeRaw) || quantidadeRaw <= 0 ? 0 : quantidadeRaw;
  }, [tabData?.quantidade_impressao_3d]);

  const valorUnitario = valorImpressao3D + outrosValores;
  const valorTotal = quantidade > 0 ? valorUnitario * quantidade : valorUnitario;

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label className="text-base font-medium">Descrição da impressão 3D *</Label>
          <Input
            value={tabData?.descricao || ''}
            onChange={(event) => onDataChange('descricao', event.target.value)}
            placeholder="Ex: Peça impressa 3D 10x5cm"
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
          <Label className="text-base font-medium">Material</Label>
          <Input
            value="Plástico"
            disabled
            className="bg-gray-100 h-12 text-base cursor-not-allowed"
          />
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

      <div className="space-y-2">
        <Label className="text-base font-medium">Material gasto</Label>
        <Input
          value={tabData?.material_gasto || ''}
          onChange={(event) => onDataChange('material_gasto', event.target.value)}
          placeholder="Ex: 50g de PLA"
          className="h-10 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-6 items-stretch">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Observações</Label>
            <Textarea
              value={tabData?.observacao || ''}
              onChange={(event) => onDataChange('observacao', event.target.value)}
              placeholder="Detalhes adicionais sobre a impressão 3D"
              rows={5}
              className="text-sm"
            />
          </div>
        </div>

        <div className="space-y-2 flex flex-col">
          <Label className="text-base font-semibold">Imagem da impressão 3D</Label>
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
                      5000, // maxWidth
                      400, // maxHeight
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
              id={`upload-imagem-impressao3d-${tabId}`}
            />
            <label
              htmlFor={`upload-imagem-impressao3d-${tabId}`}
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
                      5000, // maxWidth
                      400, // maxHeight
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
              className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
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
                    alt="Preview impressão 3D"
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
            <Label className="text-base font-medium">Valor da impressão 3D (R$)</Label>
            <CurrencyInput
              value={tabData?.valor_impressao_3d ?? '0,00'}
              onValueChange={(formatted) => onDataChange('valor_impressao_3d', formatted)}
              placeholder="75,00"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Quantidade</Label>
            <Input
              type="number"
              min="1"
              value={tabData?.quantidade_impressao_3d || '1'}
              onChange={(event) => onDataChange('quantidade_impressao_3d', event.target.value)}
              placeholder="1"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Valores adicionais (R$)</Label>
            <CurrencyInput
              value={tabData?.valores_adicionais ?? '0,00'}
              onValueChange={(formatted) => onDataChange('valores_adicionais', formatted)}
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

        {(valorImpressao3D > 0 || outrosValores > 0) && (
          <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl text-white space-y-2">
            <div className="text-lg font-semibold">Resumo dos valores</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Valor base da impressão 3D:</span>
                <strong>R$ {formatBR(valorImpressao3D)}</strong>
              </div>
              {outrosValores > 0 && (
                <div className="flex justify-between bg-white bg-opacity-10 px-2 py-1 rounded">
                  <span>+ Valores adicionais:</span>
                  <strong className="text-emerald-200">R$ {formatBR(outrosValores)}</strong>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold bg-white bg-opacity-20 px-3 py-2 rounded-lg mt-2">
                <span>Total ({tabData?.quantidade_impressao_3d || 1} peça(s)):</span>
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
