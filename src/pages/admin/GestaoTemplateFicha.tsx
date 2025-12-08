import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Save, ArrowLeft, GripVertical, X, ZoomIn, ZoomOut, Maximize2, RotateCcw, Image as ImageIcon, Grid, Copy, Trash2, Move, Layers, Eye, EyeOff, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface TemplateField {
  id: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'table' | 'custom' | 'image';
  label: string;
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  bold?: boolean;
  visible: boolean;
  editable: boolean;
  imageUrl?: string;
}

interface FichaTemplate {
  title: string;
  fields: TemplateField[];
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

interface TemplatesConfig {
  geral: FichaTemplate;
  resumo: FichaTemplate;
}

const AVAILABLE_FIELDS: Omit<TemplateField, 'x' | 'y' | 'width' | 'height' | 'visible' | 'editable'>[] = [
  { id: 'numero_os', type: 'text', label: 'Nro. OS', key: 'numero' },
  { id: 'cliente', type: 'text', label: 'Cliente', key: 'cliente' },
  { id: 'telefone', type: 'text', label: 'Telefone', key: 'telefone_cliente' },
  { id: 'data_entrada', type: 'date', label: 'Data Entrada', key: 'data_entrada' },
  { id: 'data_entrega', type: 'date', label: 'Data Entrega', key: 'data_entrega' },
  { id: 'descricao', type: 'text', label: 'Descrição', key: 'item_name' },
  { id: 'tamanho', type: 'text', label: 'Tamanho', key: 'dimensoes' },
  { id: 'designer', type: 'text', label: 'Designer', key: 'designer' },
  { id: 'vendedor', type: 'text', label: 'Vendedor', key: 'vendedor' },
  { id: 'tecido', type: 'text', label: 'Tecido', key: 'tecido' },
  { id: 'quantidade', type: 'number', label: 'Quantidade', key: 'quantity' },
  { id: 'valor_unitario', type: 'currency', label: 'Valor Unitário', key: 'unit_price' },
  { id: 'subtotal', type: 'currency', label: 'Subtotal', key: 'subtotal' },
  { id: 'valor_frete', type: 'currency', label: 'Valor Frete', key: 'valor_frete' },
  { id: 'total', type: 'currency', label: 'Total', key: 'total_value' },
  { id: 'observacao', type: 'text', label: 'Observações', key: 'observacao' },
  { id: 'imagem', type: 'image', label: 'Imagem', key: 'imagem' },
];

const TEMPLATE_GERAL_DEFAULT: FichaTemplate = {
  title: 'FICHA DE SERVIÇO - GERAL',
  width: 210,
  height: 297,
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 15,
  marginRight: 15,
  fields: [
    { id: 'title_field', type: 'text', label: 'FICHA DE SERVIÇO', key: 'title', x: 70, y: 10, width: 70, height: 10, fontSize: 16, bold: true, visible: true, editable: true },
    { id: 'numero_os_field', type: 'text', label: 'OS:', key: 'numero', x: 10, y: 25, width: 30, height: 6, fontSize: 11, bold: false, visible: true, editable: true },
    { id: 'cliente_field', type: 'text', label: 'Cliente:', key: 'cliente', x: 10, y: 35, width: 80, height: 6, fontSize: 11, bold: false, visible: true, editable: true },
    { id: 'descricao_field', type: 'text', label: 'Descrição:', key: 'item_name', x: 10, y: 50, width: 90, height: 8, fontSize: 11, bold: false, visible: true, editable: true },
  ],
};

const TEMPLATE_RESUMO_DEFAULT: FichaTemplate = {
  title: 'FICHA DE SERVIÇO - RESUMO PRODUÇÃO',
  width: 70,
  height: 99,
  marginTop: 3,
  marginBottom: 3,
  marginLeft: 5,
  marginRight: 5,
  fields: [
    { id: 'numero_os_resumo', type: 'text', label: 'OS:', key: 'numero', x: 5, y: 5, width: 15, height: 5, fontSize: 10, bold: true, visible: true, editable: true },
    { id: 'descricao_resumo', type: 'text', label: 'Desc:', key: 'item_name', x: 5, y: 12, width: 60, height: 8, fontSize: 9, bold: false, visible: true, editable: true },
    { id: 'tamanho_resumo', type: 'text', label: 'Tam:', key: 'dimensoes', x: 5, y: 22, width: 30, height: 5, fontSize: 8, bold: false, visible: true, editable: true },
    { id: 'quantidade_resumo', type: 'number', label: 'Qtd:', key: 'quantity', x: 5, y: 30, width: 15, height: 5, fontSize: 9, bold: false, visible: true, editable: true },
    { id: 'tecido_resumo', type: 'text', label: 'Tecido:', key: 'tecido', x: 5, y: 38, width: 30, height: 5, fontSize: 8, bold: false, visible: true, editable: true },
  ],
};

const TEMPLATES_DEFAULT: TemplatesConfig = {
  geral: TEMPLATE_GERAL_DEFAULT,
  resumo: TEMPLATE_RESUMO_DEFAULT,
};

const STORAGE_KEY = 'ficha_templates_config';
const GRID_SIZE = 5; // mm
const SNAP_THRESHOLD = 2; // mm

const mmToPx = (mm: number) => mm * 3.779527559;
const pxToMm = (px: number) => px / 3.779527559;

const snapToGrid = (value: number, gridSize: number = GRID_SIZE): number => {
  return Math.round(value / gridSize) * gridSize;
};

type TemplateType = 'geral' | 'resumo';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export default function GestaoTemplateFicha() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentTemplateType, setCurrentTemplateType] = useState<TemplateType>('geral');
  const [templates, setTemplates] = useState<TemplatesConfig>(TEMPLATES_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(50);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(true);
  const [copiedField, setCopiedField] = useState<TemplateField | null>(null);

  const template = templates[currentTemplateType];

  const loadTemplates = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TemplatesConfig;
        if (parsed.geral && parsed.resumo) {
          setTemplates(parsed);
        } else {
          setTemplates({
            geral: parsed.geral || TEMPLATE_GERAL_DEFAULT,
            resumo: parsed.resumo || TEMPLATE_RESUMO_DEFAULT,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast({
        title: 'Aviso',
        description: 'Usando templates padrão. Erro ao carregar configurações salvas.',
        variant: 'default',
      });
    }
  };

  const saveTemplates = useCallback(async () => {
    setLoading(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      setHasChanges(false);
      toast({
        title: 'Sucesso',
        description: 'Templates salvos com sucesso!',
        variant: 'default',
      });
    } catch (error) {
      console.error('Erro ao salvar templates:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar os templates.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [templates, toast]);

  const handleDeleteField = useCallback((fieldId: string) => {
    setTemplates(prev => ({
      ...prev,
      [currentTemplateType]: {
        ...prev[currentTemplateType],
        fields: prev[currentTemplateType].fields.filter((f) => f.id !== fieldId),
      },
    }));
    setSelectedField(null);
    setHasChanges(true);
    toast({
      title: 'Campo removido',
      description: 'O campo foi removido do template.',
    });
  }, [currentTemplateType, toast]);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Listener global para melhorar o drag and drop
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('text/plain') || e.dataTransfer?.types.includes('application/x-field-type')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      // Se o drop aconteceu fora do canvas, limpar o estado
      if (!canvasRef.current?.contains(e.target as Node)) {
        setIsDraggingOver(false);
        setDragPosition(null);
      }
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete - remover campo selecionado
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedField) {
        handleDeleteField(selectedField);
        return;
      }

      // Ctrl+C - copiar campo
      if (e.ctrlKey && e.key === 'c' && selectedField) {
        const field = template.fields.find(f => f.id === selectedField);
        if (field) {
          setCopiedField(field);
          toast({
            title: 'Campo copiado',
            description: `${field.label} copiado para área de transferência.`,
          });
        }
        return;
      }

      // Ctrl+V - colar campo
      if (e.ctrlKey && e.key === 'v' && copiedField) {
        const newField: TemplateField = {
          ...copiedField,
          id: `${copiedField.id}_${Date.now()}`,
          x: copiedField.x + 10,
          y: copiedField.y + 10,
        };
        setTemplates({
          ...templates,
          [currentTemplateType]: {
            ...template,
            fields: [...template.fields, newField],
          },
        });
        setSelectedField(newField.id);
        setHasChanges(true);
        toast({
          title: 'Campo colado',
          description: `${newField.label} colado.`,
        });
        return;
      }

      // Esc - deselecionar
      if (e.key === 'Escape') {
        setSelectedField(null);
        setEditingField(null);
      }

      // Ctrl+S - salvar
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (hasChanges) {
          saveTemplates();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedField, copiedField, template, templates, currentTemplateType, toast, hasChanges, saveTemplates, handleDeleteField]);

  const resetCurrentTemplate = () => {
    const defaultTemplate = currentTemplateType === 'geral' 
      ? TEMPLATE_GERAL_DEFAULT 
      : TEMPLATE_RESUMO_DEFAULT;
    
    setTemplates({
      ...templates,
      [currentTemplateType]: defaultTemplate,
    });
    setHasChanges(true);
    setSelectedField(null);
    toast({
      title: 'Template Resetado',
      description: `Template ${currentTemplateType === 'geral' ? 'Geral' : 'Resumo'} restaurado para os valores padrão.`,
      variant: 'default',
    });
  };

  const handleTemplateTypeChange = (type: TemplateType) => {
    if (hasChanges) {
      const confirmChange = window.confirm(
        'Você tem alterações não salvas. Deseja descartá-las e trocar de template?'
      );
      if (!confirmChange) {
        return;
      }
    }
    setCurrentTemplateType(type);
    setSelectedField(null);
    setHasChanges(false);
  };

  const handleDragStart = (e: React.DragEvent, fieldType: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', fieldType);
    e.dataTransfer.setData('application/x-field-type', fieldType);
    
    // Criar uma imagem de preview personalizada
    const fieldLabel = AVAILABLE_FIELDS.find(f => f.id === fieldType)?.label || 'Campo';
    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.padding = '6px 10px';
    dragImage.style.background = 'rgba(59, 130, 246, 0.95)';
    dragImage.style.color = 'white';
    dragImage.style.borderRadius = '4px';
    dragImage.style.fontSize = '11px';
    dragImage.style.fontWeight = '500';
    dragImage.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    dragImage.textContent = fieldLabel;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2);
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDragPosition({ x, y });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const relatedTarget = e.relatedTarget as Node;
    // Só desativar se realmente saiu do canvas
    if (!canvasRef.current?.contains(relatedTarget)) {
      setIsDraggingOver(false);
      setDragPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Tentar obter o dado de múltiplas formas para garantir compatibilidade
    const fieldId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-field-type');
    if (!fieldId || !canvasRef.current) {
      setIsDraggingOver(false);
      setDragPosition(null);
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const currentScale = zoomLevel / 100;
    
    const xPx = e.clientX - canvasRect.left;
    const yPx = e.clientY - canvasRect.top;
    
    let xMm = pxToMm(xPx / currentScale);
    let yMm = pxToMm(yPx / currentScale);

    // Garantir que está dentro dos limites da página
    xMm = Math.max(0, Math.min(xMm, template.width - 10));
    yMm = Math.max(0, Math.min(yMm, template.height - 5));

    if (snapToGridEnabled) {
      xMm = snapToGrid(xMm);
      yMm = snapToGrid(yMm);
    }

    const fieldTemplate = AVAILABLE_FIELDS.find((f) => f.id === fieldId);
    if (!fieldTemplate) {
      setIsDraggingOver(false);
      setDragPosition(null);
      return;
    }

    const timestamp = Date.now();
    const uniqueId = `${fieldId}_${timestamp}`;

    const newField: TemplateField = {
      ...fieldTemplate,
      id: uniqueId,
      x: xMm,
      y: yMm,
      width: fieldTemplate.type === 'image' ? 40 : 40,
      height: fieldTemplate.type === 'image' ? 30 : 5,
      visible: true,
      editable: true,
    };

    setTemplates({
      ...templates,
      [currentTemplateType]: {
        ...template,
        fields: [...template.fields, newField],
      },
    });
    setHasChanges(true);
    setSelectedField(uniqueId);
    setIsDraggingOver(false);
    setDragPosition(null);
    
    toast({
      title: 'Campo Adicionado',
      description: `${fieldTemplate.label} foi adicionado à ficha.`,
    });
  };

  const handleFieldClick = (fieldId: string, e?: React.MouseEvent) => {
    if (e?.target instanceof HTMLElement && (e.target.closest('button') || e.target.closest('input'))) {
      return;
    }
    setSelectedField(fieldId);
  };

  const handleFieldMove = useCallback((fieldId: string, newX: number, newY: number) => {
    let finalX = Math.max(0, newX);
    let finalY = Math.max(0, newY);

    if (snapToGridEnabled) {
      finalX = snapToGrid(finalX);
      finalY = snapToGrid(finalY);
    }

    setTemplates(prev => ({
      ...prev,
      [currentTemplateType]: {
        ...prev[currentTemplateType],
        fields: prev[currentTemplateType].fields.map((f) =>
          f.id === fieldId ? { ...f, x: finalX, y: finalY } : f
        ),
      },
    }));
    setHasChanges(true);
  }, [currentTemplateType, snapToGridEnabled]);

  const handleFieldResize = useCallback((
    fieldId: string,
    handle: ResizeHandle,
    newWidth: number,
    newHeight: number,
    deltaX: number,
    deltaY: number
  ) => {
    const field = template.fields.find(f => f.id === fieldId);
    if (!field) return;

    let finalWidth = Math.max(10, newWidth);
    let finalHeight = Math.max(5, newHeight);
    let finalX = field.x;
    let finalY = field.y;

    // Ajustar posição para handles que movem a origem
    if (handle === 'nw' || handle === 'w') {
      finalX = field.x + deltaX;
    }
    if (handle === 'nw' || handle === 'n') {
      finalY = field.y + deltaY;
    }

    if (snapToGridEnabled) {
      finalWidth = snapToGrid(finalWidth);
      finalHeight = snapToGrid(finalHeight);
      finalX = snapToGrid(finalX);
      finalY = snapToGrid(finalY);
    }

    setTemplates(prev => ({
      ...prev,
      [currentTemplateType]: {
        ...prev[currentTemplateType],
        fields: prev[currentTemplateType].fields.map((f) =>
          f.id === fieldId 
            ? { ...f, width: finalWidth, height: finalHeight, x: Math.max(0, finalX), y: Math.max(0, finalY) }
            : f
        ),
      },
    }));
    setHasChanges(true);
  }, [currentTemplateType, template.fields, snapToGridEnabled]);

  const updateFieldProperty = (fieldId: string, property: keyof TemplateField, value: any) => {
    setTemplates({
      ...templates,
      [currentTemplateType]: {
        ...template,
        fields: template.fields.map((f) =>
          f.id === fieldId ? { ...f, [property]: value } : f
        ),
      },
    });
    setHasChanges(true);
  };

  const updateTemplateProperty = (property: keyof FichaTemplate, value: any) => {
    setTemplates({
      ...templates,
      [currentTemplateType]: {
        ...template,
        [property]: value,
      },
    });
    setHasChanges(true);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 25));
  const handleZoomReset = () => setZoomLevel(50);

  const handleZoomFit = () => {
    if (canvasRef.current) {
      const container = canvasRef.current.parentElement;
      if (container) {
        const containerWidth = container.clientWidth - 32;
        const containerHeight = container.clientHeight - 32;
        const pageWidth = mmToPx(template.width);
        const pageHeight = mmToPx(template.height);
        
        const scaleX = containerWidth / pageWidth;
        const scaleY = containerHeight / pageHeight;
        const fitScale = Math.min(scaleX, scaleY, 0.95) * 100; // 95% para dar um pouco de margem
        
        setZoomLevel(Math.max(25, Math.min(200, fitScale)));
      }
    }
  };

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      setZoomLevel((prev) => Math.max(25, Math.min(200, prev + delta)));
    }
  };

  const handleImageUpload = (fieldId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      updateFieldProperty(fieldId, 'imageUrl', imageUrl);
      toast({
        title: 'Sucesso',
        description: 'Imagem adicionada com sucesso!',
      });
    };
    reader.readAsDataURL(file);
  };

  const currentScale = zoomLevel / 100;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Paleta Lateral Esquerda - Ferramentas */}
      <div className="w-14 border-r border-gray-200 bg-white flex flex-col items-center py-2 flex-shrink-0 shadow-sm">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            onClick={() => navigate('/dashboard/admin')}
            title="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            onClick={saveTemplates}
            disabled={loading || !hasChanges}
            title="Salvar (Ctrl+S)"
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
        <Separator className="my-2 bg-gray-200" />
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              showGrid && "bg-blue-50 text-blue-600"
            )}
            onClick={() => setShowGrid(!showGrid)}
            title="Mostrar/Ocultar Grid"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              snapToGridEnabled && "bg-blue-50 text-blue-600"
            )}
            onClick={() => setSnapToGridEnabled(!snapToGridEnabled)}
            title="Snap to Grid"
          >
            <Move className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Paleta Lateral - Campos e Propriedades */}
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col flex-shrink-0 shadow-sm">
        {/* Header do Painel */}
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Painel de Campos</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Seleção de Template */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Template</Label>
            <Tabs value={currentTemplateType} onValueChange={(v) => handleTemplateTypeChange(v as TemplateType)}>
              <TabsList className="grid w-full grid-cols-2 h-8 bg-gray-100 border border-gray-200">
                <TabsTrigger 
                  value="geral" 
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm text-gray-600"
                >
                  Geral
                </TabsTrigger>
                <TabsTrigger 
                  value="resumo" 
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm text-gray-600"
                >
                  Resumo
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Campos Disponíveis */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Campos Disponíveis</Label>
            <p className="text-xs text-gray-500 mb-2">
              Arraste para adicionar ao canvas
            </p>
            <div className="space-y-1.5">
              {AVAILABLE_FIELDS.map((field) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, field.id)}
                  className={cn(
                    "p-2 bg-white border border-gray-200 rounded cursor-grab active:cursor-grabbing",
                    "hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all",
                    "flex items-center gap-2 text-xs group"
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-gray-900 text-xs">{field.label}</div>
                    <div className="text-[10px] text-gray-500">{field.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Propriedades da Página */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Dimensões da Página</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="page-width" className="text-xs text-gray-600">Largura (mm)</Label>
                <Input
                  id="page-width"
                  type="number"
                  value={template.width}
                  onChange={(e) => updateTemplateProperty('width', Number(e.target.value))}
                  className="h-8 text-xs bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="page-height" className="text-xs text-gray-600">Altura (mm)</Label>
                <Input
                  id="page-height"
                  type="number"
                  value={template.height}
                  onChange={(e) => updateTemplateProperty('height', Number(e.target.value))}
                  className="h-8 text-xs bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
        {/* Barra Superior - Menu e Controles */}
        <div className="border-b border-gray-200 bg-white flex items-center justify-between px-3 py-1.5 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">
                {currentTemplateType === 'geral' ? 'Template Geral (A4)' : 'Template Resumo (1/3 A4)'}
              </span>
            </div>
            {hasChanges && (
              <span className="text-xs text-amber-600 font-medium">● Não salvo</span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Controles de Zoom */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-gray-600 hover:bg-gray-100 hover:text-gray-900" 
                onClick={handleZoomOut} 
                title="Diminuir zoom (Ctrl + Scroll)"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <div className="min-w-[50px] text-center text-xs font-medium text-gray-700">
                {zoomLevel}%
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-gray-600 hover:bg-gray-100 hover:text-gray-900" 
                onClick={handleZoomIn} 
                title="Aumentar zoom (Ctrl + Scroll)"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-gray-600 hover:bg-gray-100 hover:text-gray-900" 
                onClick={handleZoomReset} 
                title="Resetar zoom (50%)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-gray-600 hover:bg-gray-100 hover:text-gray-900" 
                onClick={handleZoomFit} 
                title="Ajustar à tela"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={resetCurrentTemplate} 
              size="sm" 
              className="h-7 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              Restaurar
            </Button>
          </div>
        </div>

        {/* Área de Edição Visual - Canvas */}
        <div 
          className="flex-1 overflow-auto p-4 bg-gray-200 flex items-center justify-center"
          onWheel={handleWheelZoom}
        >
          <div
            ref={canvasRef}
            className={cn(
              "bg-white shadow-2xl relative transition-all",
              isDraggingOver && "ring-2 ring-blue-500 ring-offset-4 ring-offset-gray-200 ring-opacity-75"
            )}
            style={{
              width: `${mmToPx(template.width) * currentScale}px`,
              height: `${mmToPx(template.height) * currentScale}px`,
              minWidth: `${mmToPx(template.width) * currentScale}px`,
              minHeight: `${mmToPx(template.height) * currentScale}px`,
              backgroundImage: showGrid 
                ? `linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)` 
                : 'none',
              backgroundSize: `${mmToPx(GRID_SIZE) * currentScale}px ${mmToPx(GRID_SIZE) * currentScale}px`,
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedField(null);
              }
            }}
          >
            {/* Indicador de posição durante drag - Estilo Photoshop */}
            {isDraggingOver && dragPosition && (
              <div
                className="absolute pointer-events-none z-50"
                style={{
                  left: `${dragPosition.x}px`,
                  top: `${dragPosition.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="relative">
                  <div className="w-4 h-4 bg-blue-500 rounded-full ring-2 ring-white shadow-lg animate-pulse" />
                  {snapToGridEnabled && (
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{
                        width: `${mmToPx(GRID_SIZE) * currentScale}px`,
                        height: `${mmToPx(GRID_SIZE) * currentScale}px`,
                        border: '1px dashed rgba(59, 130, 246, 0.5)',
                        borderRadius: '2px',
                        background: 'rgba(59, 130, 246, 0.15)',
                      }}
                    />
                  )}
                </div>
              </div>
            )}
            {template.fields
              .filter((f) => f.visible)
              .map((field) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  scale={currentScale}
                  isSelected={selectedField === field.id}
                  isEditing={editingField === field.id}
                  onSelect={(e) => handleFieldClick(field.id, e)}
                  onMove={(x, y) => handleFieldMove(field.id, x, y)}
                  onResize={(handle, w, h, dx, dy) => handleFieldResize(field.id, handle, w, h, dx, dy)}
                  onDelete={() => handleDeleteField(field.id)}
                  onUpdate={(prop, value) => updateFieldProperty(field.id, prop, value)}
                  onStartEdit={() => setEditingField(field.id)}
                  onEndEdit={() => setEditingField(null)}
                  onImageUpload={(file) => handleImageUpload(field.id, file)}
                />
              ))}
          </div>
        </div>

        {/* Painel de Propriedades - Estilo Photoshop */}
        {selectedField && (
          <div className="w-72 border-l border-gray-200 bg-white flex flex-col flex-shrink-0 shadow-lg">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Propriedades</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {template.fields.find((f) => f.id === selectedField)?.label}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <FieldPropertiesPanel
                field={template.fields.find((f) => f.id === selectedField)!}
                onUpdate={(prop, value) => updateFieldProperty(selectedField, prop, value)}
                onImageUpload={(file) => handleImageUpload(selectedField, file)}
              />
            </div>
          </div>
        )}

        {/* Painel de Camadas - Estilo Photoshop */}
        {!selectedField && (
          <div className="w-64 border-l border-gray-200 bg-white flex flex-col flex-shrink-0 shadow-lg">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Camadas</h3>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {template.fields.length} campos
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                {template.fields
                  .map((field) => (
                    <div
                      key={field.id}
                      className={cn(
                        "p-2 rounded cursor-pointer transition-colors flex items-center gap-2 group",
                        selectedField === field.id
                          ? "bg-blue-50 border border-blue-300 shadow-sm"
                          : "bg-white border border-transparent hover:bg-gray-50 hover:border-gray-200"
                      )}
                      onClick={() => handleFieldClick(field.id)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFieldProperty(field.id, 'visible', !field.visible);
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {field.visible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {field.label}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {field.type} • {field.x.toFixed(1)}, {field.y.toFixed(1)}
                        </div>
                      </div>
                      {selectedField === field.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FieldEditorProps {
  field: TemplateField;
  scale: number;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onMove: (x: number, y: number) => void;
  onResize: (handle: ResizeHandle, width: number, height: number, deltaX: number, deltaY: number) => void;
  onDelete: () => void;
  onUpdate: (property: keyof TemplateField, value: any) => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onImageUpload?: (file: File) => void;
}

function FieldEditor({
  field,
  scale,
  isSelected,
  isEditing,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onUpdate,
  onStartEdit,
  onEndEdit,
  onImageUpload,
}: FieldEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, fieldX: 0, fieldY: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, fieldX: 0, fieldY: 0 });
  const fieldRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);

  useEffect(() => {
    if (!isDragging && !isResizing) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      // Throttle updates to ~60fps for smooth animation
      if (now - lastUpdateTime.current < 16) return;
      lastUpdateTime.current = now;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        if (isDragging) {
          const deltaX = pxToMm((e.clientX - dragStart.x) / scale);
          const deltaY = pxToMm((e.clientY - dragStart.y) / scale);
          const newX = Math.max(0, dragStart.fieldX + deltaX);
          const newY = Math.max(0, dragStart.fieldY + deltaY);
          onMove(newX, newY);
        } else if (isResizing) {
          const deltaX = pxToMm((e.clientX - resizeStart.x) / scale);
          const deltaY = pxToMm((e.clientY - resizeStart.y) / scale);
          
          let newWidth = resizeStart.width;
          let newHeight = resizeStart.height;
          let deltaWidth = 0;
          let deltaHeight = 0;

          if (isResizing === 'e' || isResizing === 'ne' || isResizing === 'se') {
            newWidth = resizeStart.width + deltaX;
            deltaWidth = deltaX;
          }
          if (isResizing === 'w' || isResizing === 'nw' || isResizing === 'sw') {
            newWidth = resizeStart.width - deltaX;
            deltaWidth = -deltaX;
          }
          if (isResizing === 's' || isResizing === 'se' || isResizing === 'sw') {
            newHeight = resizeStart.height + deltaY;
            deltaHeight = deltaY;
          }
          if (isResizing === 'n' || isResizing === 'ne' || isResizing === 'nw') {
            newHeight = resizeStart.height - deltaY;
            deltaHeight = -deltaY;
          }

          onResize(isResizing, newWidth, newHeight, deltaWidth, deltaHeight);
        }
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging, isResizing, dragStart, resizeStart, scale, onMove, onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      isEditing || 
      target.tagName === 'INPUT' || 
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('input') ||
      target.classList.contains('resize-handle')
    ) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX, 
      y: e.clientY,
      fieldX: field.x,
      fieldY: field.y,
    });
    onSelect();
  };

  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: field.width,
      height: field.height,
      fieldX: field.x,
      fieldY: field.y,
    });
  };

  const handleImageClick = () => {
    if (field.type === 'image' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  const resizeHandles: ResizeHandle[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];

  return (
    <div
      className={cn(
        "absolute border-2 cursor-move transition-all group",
        isSelected 
          ? "border-blue-500 bg-blue-50/50 z-10 shadow-lg shadow-blue-500/20" 
          : "border-gray-300 hover:border-blue-400/70 z-0",
        !field.visible && "opacity-30",
        isDragging && "shadow-xl shadow-blue-500/30 scale-[1.02]"
      )}
      style={{
        left: `${mmToPx(field.x) * scale}px`,
        top: `${mmToPx(field.y) * scale}px`,
        width: `${mmToPx(field.width) * scale}px`,
        height: `${mmToPx(field.height) * scale}px`,
        minWidth: `${mmToPx(10) * scale}px`,
        minHeight: `${mmToPx(5) * scale}px`,
        transition: isDragging || isResizing ? 'none' : 'all 0.15s ease-out',
      }}
      ref={fieldRef}
      onMouseDown={handleMouseDown}
      onClick={onSelect}
    >
      {isSelected && (
        <>
          <div className="absolute -top-8 left-0 flex gap-1 z-20">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 bg-red-500 hover:bg-red-600 text-white border-0 shadow-md hover:shadow-lg transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Deletar (Delete)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* Resize handles - Estilo Photoshop */}
          {resizeHandles.map((handle) => (
            <div
              key={handle}
              className={cn(
                "absolute resize-handle bg-blue-500 border-2 border-white rounded-sm shadow-md",
                "opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110",
                handle === 'nw' && 'top-0 left-0 w-3 h-3 cursor-nw-resize -translate-x-1/2 -translate-y-1/2',
                handle === 'ne' && 'top-0 right-0 w-3 h-3 cursor-ne-resize translate-x-1/2 -translate-y-1/2',
                handle === 'sw' && 'bottom-0 left-0 w-3 h-3 cursor-sw-resize -translate-x-1/2 translate-y-1/2',
                handle === 'se' && 'bottom-0 right-0 w-3 h-3 cursor-se-resize translate-x-1/2 translate-y-1/2',
                handle === 'n' && 'top-0 left-1/2 w-3 h-3 cursor-n-resize -translate-x-1/2 -translate-y-1/2',
                handle === 's' && 'bottom-0 left-1/2 w-3 h-3 cursor-s-resize -translate-x-1/2 translate-y-1/2',
                handle === 'e' && 'right-0 top-1/2 w-3 h-3 cursor-e-resize translate-x-1/2 -translate-y-1/2',
                handle === 'w' && 'left-0 top-1/2 w-3 h-3 cursor-w-resize -translate-x-1/2 -translate-y-1/2',
              )}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}
        </>
      )}
      
      {field.type === 'image' ? (
        <div 
          className="w-full h-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleImageClick();
          }}
        >
          {field.imageUrl ? (
            <img 
              src={field.imageUrl} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center p-2">
              <ImageIcon className="h-6 w-6 mx-auto text-gray-400 mb-1" />
              <div className="text-xs text-gray-500">Clique para adicionar</div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div
          className="w-full h-full p-1 flex items-center text-xs overflow-hidden bg-white"
          style={{
            minHeight: '20px',
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
        >
          {isEditing ? (
            <Input
              value={field.label}
              onChange={(e) => onUpdate('label', e.target.value)}
              onBlur={onEndEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onEndEdit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onEndEdit();
                }
              }}
              autoFocus
              className="h-full text-xs p-1.5 border-2 border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 bg-white shadow-sm rounded-sm"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: `${(field.fontSize || 11) * scale}px`,
                fontWeight: field.bold ? 'bold' : 'normal',
              }}
            />
          ) : (
            <span 
              className="whitespace-nowrap select-none text-gray-900"
              style={{
                fontSize: `${(field.fontSize || 11) * scale}px`,
                fontWeight: field.bold ? 'bold' : 'normal',
              }}
            >
              {field.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface FieldPropertiesPanelProps {
  field: TemplateField;
  onUpdate: (property: keyof TemplateField, value: any) => void;
  onImageUpload?: (file: File) => void;
}

function FieldPropertiesPanel({ field, onUpdate, onImageUpload }: FieldPropertiesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor="field-label" className="text-xs font-medium text-gray-700 mb-2 block">Rótulo</Label>
          <Input
            id="field-label"
            value={field.label}
            onChange={(e) => onUpdate('label', e.target.value)}
            className="h-9 text-sm bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700 mb-2 block">Posição</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="field-x" className="text-[11px] text-gray-600 mb-1 block">X (mm)</Label>
              <Input
                id="field-x"
                type="number"
                step="0.1"
                value={field.x.toFixed(1)}
                onChange={(e) => onUpdate('x', Number(e.target.value))}
                className="h-8 text-xs bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="field-y" className="text-[11px] text-gray-600 mb-1 block">Y (mm)</Label>
              <Input
                id="field-y"
                type="number"
                step="0.1"
                value={field.y.toFixed(1)}
                onChange={(e) => onUpdate('y', Number(e.target.value))}
                className="h-8 text-xs bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700 mb-2 block">Tamanho</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="field-width" className="text-[11px] text-gray-600 mb-1 block">Largura (mm)</Label>
              <Input
                id="field-width"
                type="number"
                step="0.1"
                value={field.width.toFixed(1)}
                onChange={(e) => onUpdate('width', Number(e.target.value))}
                className="h-8 text-xs bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="field-height" className="text-[11px] text-gray-600 mb-1 block">Altura (mm)</Label>
              <Input
                id="field-height"
                type="number"
                step="0.1"
                value={field.height.toFixed(1)}
                onChange={(e) => onUpdate('height', Number(e.target.value))}
                className="h-8 text-xs bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {field.type !== 'image' && (
          <>
            <div>
              <Label htmlFor="field-font-size" className="text-xs font-medium text-gray-700 mb-2 block">Tamanho da Fonte (pt)</Label>
              <Input
                id="field-font-size"
                type="number"
                value={field.fontSize || 11}
                onChange={(e) => onUpdate('fontSize', Number(e.target.value))}
                className="h-9 text-sm bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md border border-gray-200">
              <Checkbox
                id="field-bold"
                checked={field.bold || false}
                onCheckedChange={(checked) => onUpdate('bold', checked === true)}
                className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="field-bold" className="text-sm text-gray-700 cursor-pointer font-medium">Negrito</Label>
            </div>
          </>
        )}

        {field.type === 'image' && (
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-2 block">Imagem</Label>
            <div className="space-y-2">
              {field.imageUrl && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <img 
                    src={field.imageUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-32 object-contain mx-auto rounded"
                  />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {field.imageUrl ? 'Alterar Imagem' : 'Adicionar Imagem'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
