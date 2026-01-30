import { useMemo, useState, useEffect } from 'react';
import { Upload, X, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MedidasCalculator } from '@/components/MedidasCalculator';
import SelectVendedor from '@/components/SelectVendedor';
import SelectDesigner from '@/components/SelectDesigner';
import { CurrencyInput } from '@/components/ui/currency-input';
import { processAndSaveImage } from '@/utils/localImageManager';
import { getImagePreviewUrl } from '@/utils/imagePreview';
import { isTauri } from '@/utils/isTauri';
import { useToast } from '@/hooks/use-toast';
import { FormProducaoFields } from './FormProducaoFields';

interface FabricComposition {
    label: string;
    tecido: string;
}

interface FormMesaBabadoProps {
    tabId: string;
    tabData: any;
    vendedores: string[];
    designers: string[];
    tecidos: string[];
    onDataChange: (field: string, value: any) => void;
    onSaveItem?: () => void;
    onCancelItem?: () => void;
    hasUnsavedChanges?: boolean;
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

export function FormMesaBabado({
    tabId,
    tabData,
    vendedores,
    designers,
    tecidos,
    onDataChange,
    onSaveItem,
    onCancelItem,
    hasUnsavedChanges = false,
}: FormMesaBabadoProps) {
    const { toast } = useToast();

    // Estado para preview da imagem
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(false);

    // Estado para composição de tecidos
    const [fabrics, setFabrics] = useState<FabricComposition[]>(() => {
        try {
            if (tabData?.composicao_tecidos) {
                return JSON.parse(tabData.composicao_tecidos);
            }
        } catch (e) {
            console.error('Erro ao fazer parse da composição de tecidos:', e);
        }
        return [{ label: 'Corpo', tecido: '' }, { label: 'Babado', tecido: '' }];
    });

    // Resetar composição quando o tabId mudar (troca de item)
    useEffect(() => {
        try {
            if (tabData?.composicao_tecidos) {
                const parsed = JSON.parse(tabData.composicao_tecidos);
                if (JSON.stringify(parsed) !== JSON.stringify(fabrics)) {
                    setFabrics(parsed);
                }
            } else {
                setFabrics([{ label: 'Corpo', tecido: '' }, { label: 'Babado', tecido: '' }]);
            }
        } catch (e) {
            console.error('Erro ao resetar composição de tecidos:', e);
            setFabrics([{ label: 'Corpo', tecido: '' }, { label: 'Babado', tecido: '' }]);
        }
    }, [tabId]);

    // Atualizar composição de tecidos quando o estado local mudar
    useEffect(() => {
        onDataChange('composicao_tecidos', JSON.stringify(fabrics));
        // Também atualizamos o campo 'tecido' principal com um resumo para visualização rápida
        const tecidosResumo = fabrics
            .filter(f => f.tecido)
            .map(f => `${f.label}: ${f.tecido}`)
            .join(', ');
        onDataChange('tecido', tecidosResumo);
    }, [fabrics]);

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

    const parseBR = (v: string | number): number => {
        if (!v) return 0;
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        const normalized = normalizeDecimal(v);
        const num = Number.parseFloat(normalized);
        return Number.isNaN(num) ? 0 : num;
    };

    const formatBR = (v: number): string => {
        if (!v) return '0,00';
        return v.toFixed(2).replace('.', ',');
    };

    // Cálculo de valores
    const valorTotalGeral = useMemo(() => {
        const valorBase = parseBR(tabData?.valor_painel || '0,00');
        const valorAdicionais = parseBR(tabData?.valores_adicionais || '0,00');
        const quantidade = parseInt(tabData?.quantidade_paineis || '1');
        return (valorBase + valorAdicionais) * quantidade;
    }, [tabData?.valor_painel, tabData?.valores_adicionais, tabData?.quantidade_paineis]);

    const addFabric = () => {
        setFabrics([...fabrics, { label: '', tecido: '' }]);
    };

    const removeFabric = (index: number) => {
        setFabrics(fabrics.filter((_, i) => i !== index));
    };

    const updateFabric = (index: number, field: keyof FabricComposition, value: string) => {
        const newFabrics = [...fabrics];
        newFabrics[index][field] = value;
        setFabrics(newFabrics);
    };

    return (
        <div className="space-y-6">
            {/* === TOPO: DESCRIÇÃO + MEDIDAS === */}
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label className="text-base font-medium">Descrição do Item *</Label>
                    <Input
                        value={tabData?.descricao || ''}
                        onChange={(e) => onDataChange('descricao', e.target.value)}
                        placeholder="Ex: Mesa de Babado - Tema Circo"
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

            {/* === VENDEDOR E DESIGNER === */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* === COMPOSIÇÃO DE TECIDOS === */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold text-slate-800">Composição de Tecidos (Mesa de Babado)</Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFabric}
                        className="flex gap-2 items-center text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                        <Plus className="h-4 w-4" />
                        Adicionar Parte
                    </Button>
                </div>

                <div className="grid gap-3">
                    {fabrics.map((fabric, index) => (
                        <div key={index} className="flex gap-3 items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                            <div className="flex-1">
                                <Input
                                    value={fabric.label}
                                    onChange={(e) => updateFabric(index, 'label', e.target.value)}
                                    placeholder="Ex: Corpo, Babado, Tampo"
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="flex-[2]">
                                <Select
                                    value={fabric.tecido}
                                    onValueChange={(value) => updateFabric(index, 'tecido', value)}
                                >
                                    <SelectTrigger className="bg-white h-9 text-sm">
                                        <SelectValue placeholder="Selecione o tecido" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tecidos.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {fabrics.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFabric(index)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* === ESTRUTURA E IMAGEM === */}
            <div className="grid grid-cols-2 gap-6">
                {/* COLUNA ESQUERDA - OPÇÕES ADICIONAIS */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold">Observações Técnicas</Label>
                    <textarea
                        className="w-full h-32 p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        value={tabData?.observacao || ''}
                        onChange={(e) => onDataChange('observacao', e.target.value)}
                        placeholder="Detalhes sobre a confecção da mesa..."
                    />

                    <div className="space-y-4 pt-2">
                        <Label className="text-base font-semibold">Opções de Acabamento</Label>
                        <div className="flex gap-6">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`overloque-${tabId}`}
                                    checked={tabData?.overloque || false}
                                    onCheckedChange={(checked) => onDataChange('overloque', checked)}
                                />
                                <label htmlFor={`overloque-${tabId}`} className="text-sm font-medium cursor-pointer">
                                    Overloque
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`elastico-${tabId}`}
                                    checked={tabData?.elastico || false}
                                    onCheckedChange={(checked) => onDataChange('elastico', checked)}
                                />
                                <label htmlFor={`elastico-${tabId}`} className="text-sm font-medium cursor-pointer">
                                    Elástico
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Tipo de Acabamento</Label>
                            <Select
                                value={tabData?.tipo_acabamento || 'nenhum'}
                                onValueChange={(value) => onDataChange('tipo_acabamento', value)}
                            >
                                <SelectTrigger className="bg-white h-10 text-sm">
                                    <SelectValue placeholder="Selecione o acabamento" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="nenhum">Nenhum</SelectItem>
                                    <SelectItem value="bolsor">Bolsor</SelectItem>
                                    <SelectItem value="ziper">Zíper</SelectItem>
                                    <SelectItem value="velcro">Velcro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* COLUNA DIREITA - IMAGEM */}
                <div className="space-y-2 flex flex-col">
                    <Label className="text-base font-semibold">Referência Visual</Label>
                    <div className="relative flex-1 min-h-[200px]">
                        <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`upload-imagem-${tabId}`}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (isTauri()) {
                                    try {
                                        setImageLoading(true);
                                        const arrayBuffer = await file.arrayBuffer();
                                        const metadata = await processAndSaveImage(new Uint8Array(arrayBuffer), 5000, 400, 85);
                                        onDataChange('imagem', metadata.local_path);
                                        const preview = await getImagePreviewUrl(metadata.local_path);
                                        setImagePreviewUrl(preview);
                                    } catch (error) {
                                        toast({ title: 'Erro', description: 'Falha ao salvar imagem', variant: 'destructive' });
                                    } finally {
                                        setImageLoading(false);
                                    }
                                }
                            }}
                        />
                        <label
                            htmlFor={`upload-imagem-${tabId}`}
                            className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors bg-white"
                        >
                            {imageLoading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                            ) : imagePreviewUrl ? (
                                <div className="relative w-full h-full flex items-center justify-center p-2">
                                    <img src={imagePreviewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 rounded-full"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onDataChange('imagem', '');
                                            setImagePreviewUrl(null);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center p-4">
                                    <Upload className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">Clique para carregar</p>
                                </div>
                            )}
                        </label>
                    </div>
                </div>
            </div>

            {/* === DADOS DE PRODUÇÃO === */}
            <FormProducaoFields
                data={{
                    data_impressao: tabData.data_impressao,
                    rip_maquina: tabData.rip_maquina,
                    perfil_cor: tabData.perfil_cor,
                    tecido_fornecedor: tabData.tecido_fornecedor
                }}
                onDataChange={onDataChange}
            />

            {/* === VALORES === */}
            <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label className="text-base font-medium">Valor Unitário</Label>
                        <CurrencyInput
                            value={tabData?.valor_painel ?? '0,00'}
                            onValueChange={(formatted) => onDataChange('valor_painel', formatted)}
                            placeholder="0,00"
                            className="h-12 text-base bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-base font-medium">Quantidade</Label>
                        <Input
                            type="number"
                            min="1"
                            value={tabData?.quantidade_paineis || '1'}
                            onChange={(e) => onDataChange('quantidade_paineis', e.target.value)}
                            placeholder="1"
                            className="h-12 text-base bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-base font-medium">Outros Valores</Label>
                        <CurrencyInput
                            value={tabData?.valores_adicionais ?? '0,00'}
                            onValueChange={(formatted) => onDataChange('valores_adicionais', formatted)}
                            placeholder="0,00"
                            className="h-12 text-base bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-base font-medium">Valor Total</Label>
                        <div className="h-12 flex items-center justify-center bg-gradient-to-r from-emerald-100 to-emerald-200 border-2 border-emerald-500 rounded-md font-bold text-lg text-emerald-800">
                            R$ {formatBR(valorTotalGeral)}
                        </div>
                    </div>
                </div>

                {/* Resumo dos valores */}
                {(parseBR(tabData?.valor_painel) > 0 || parseBR(tabData?.valores_adicionais) > 0) && (
                    <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl text-white space-y-2 shadow-md">
                        <div className="text-lg font-semibold">Resumo dos valores</div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span>Valor base do item:</span>
                                <strong>R$ {formatBR(parseBR(tabData?.valor_painel))}</strong>
                            </div>
                            {parseBR(tabData?.valores_adicionais) > 0 && (
                                <div className="flex justify-between bg-white bg-opacity-10 px-2 py-1 rounded">
                                    <span>+ Valores adicionais:</span>
                                    <strong className="text-emerald-200">R$ {formatBR(parseBR(tabData?.valores_adicionais))}</strong>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold bg-white bg-opacity-20 px-3 py-2 rounded-lg mt-2">
                                <span>Total ({tabData?.quantidade_paineis || 1} unidade(s)):</span>
                                <span className="text-yellow-300">R$ {formatBR(valorTotalGeral)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center pt-4">
                {hasUnsavedChanges && (
                    <div className="flex items-center gap-2 text-orange-600 text-sm">
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        <span>Mudanças não salvas</span>
                    </div>
                )}
                <div className="flex gap-3 ml-auto">
                    {onCancelItem && (
                        <Button variant="outline" onClick={onCancelItem} className="h-11 px-6">Cancelar</Button>
                    )}
                    <Button onClick={onSaveItem} className="h-11 px-6 bg-green-600 hover:bg-green-700 min-w-[120px]">
                        Salvar Item
                    </Button>
                </div>
            </div>
        </div>
    );
}
