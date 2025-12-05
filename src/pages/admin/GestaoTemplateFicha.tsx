import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Save, ArrowLeft, GripVertical, X, ZoomIn, ZoomOut, Maximize2, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface TemplateField {
  id: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'table' | 'custom' | 'image';
  label: string;
  key: string; // Chave do dado
  x: number; // em mm
  y: number; // em mm
  width: number; // em mm
  height: number; // em mm
  fontSize?: number;
  bold?: boolean;
  visible: boolean;
  editable: boolean;
  imageUrl?: string; // Para campos de imagem
}

interface FichaTemplate {
  title: string;
  fields: TemplateField[];
  width: number; // em mm
  height: number; // em mm
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
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

const TEMPLATE_DEFAULT: FichaTemplate = {
  title: 'EMISSÃO FICHA DE SERVIÇO',
  width: 190, // mm
  height: 130, // mm
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 15,
  marginRight: 15,
  fields: [
    { id: 'title_field', type: 'text', label: 'EMISSÃO FICHA DE SERVIÇO', key: 'title', x: 50, y: 5, width: 90, height: 8, fontSize: 14, bold: true, visible: true, editable: true },
  ],
};

const STORAGE_KEY = 'ficha_template_visual_config';

const mmToPx = (mm: number) => mm * 3.779527559; // 1mm = 3.779527559px
const pxToMm = (px: number) => px / 3.779527559;

export default function GestaoTemplateFicha() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<FichaTemplate>(TEMPLATE_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(50); // Porcentagem de zoom (50% = 0.5)
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTemplate(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      toast({
        title: 'Aviso',
        description: 'Usando template padrão. Erro ao carregar configurações salvas.',
        variant: 'default',
      });
    }
  };

  const saveTemplate = async () => {
    setLoading(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
      setHasChanges(false);
      toast({
        title: 'Sucesso',
        description: 'Template da ficha salvo com sucesso! As alterações serão aplicadas em todas as fichas geradas.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o template.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetTemplate = () => {
    setTemplate(TEMPLATE_DEFAULT);
    setHasChanges(true);
    toast({
      title: 'Template Resetado',
      description: 'Template restaurado para os valores padrão. Clique em Salvar para aplicar.',
      variant: 'default',
    });
  };

  const handleDragStart = (e: React.DragEvent, fieldType: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fieldType);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const fieldId = e.dataTransfer.getData('text/plain');
    if (!fieldId || !canvasRef.current) {
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const currentScale = zoomLevel / 100;
    
    // Calcular posição em pixels relativos ao canvas
    const xPx = e.clientX - canvasRect.left;
    const yPx = e.clientY - canvasRect.top;
    
    // Converter pixels para mm, considerando o scale
    const xMm = pxToMm(xPx / currentScale);
    const yMm = pxToMm(yPx / currentScale);

    const fieldTemplate = AVAILABLE_FIELDS.find((f) => f.id === fieldId);
    if (!fieldTemplate) {
      return;
    }

    // Gerar ID único para o campo
    const timestamp = Date.now();
    const uniqueId = `${fieldId}_${timestamp}`;

    const newField: TemplateField = {
      ...fieldTemplate,
      id: uniqueId,
      x: Math.max(0, xMm),
      y: Math.max(0, yMm),
      width: fieldTemplate.type === 'image' ? 40 : 40,
      height: fieldTemplate.type === 'image' ? 30 : 5,
      visible: true,
      editable: true,
    };

    setTemplate({
      ...template,
      fields: [...template.fields, newField],
    });
    setHasChanges(true);
    setSelectedField(uniqueId);
    setIsDraggingOver(false);
    
    toast({
      title: 'Campo Adicionado',
      description: `${fieldTemplate.label} foi adicionado à ficha.`,
    });
  };

  const handleFieldClick = (fieldId: string) => {
    setSelectedField(fieldId);
  };

  const handleFieldMove = (fieldId: string, newX: number, newY: number) => {
    setTemplate({
      ...template,
      fields: template.fields.map((f) =>
        f.id === fieldId ? { ...f, x: Math.max(0, newX), y: Math.max(0, newY) } : f
      ),
    });
    setHasChanges(true);
  };

  const handleDeleteField = (fieldId: string) => {
    setTemplate({
      ...template,
      fields: template.fields.filter((f) => f.id !== fieldId),
    });
    setSelectedField(null);
    setHasChanges(true);
  };

  const updateFieldProperty = (fieldId: string, property: keyof TemplateField, value: any) => {
    setTemplate({
      ...template,
      fields: template.fields.map((f) =>
        f.id === fieldId ? { ...f, [property]: value } : f
      ),
    });
    setHasChanges(true);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 10, 200)); // Máximo 200%
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 10, 25)); // Mínimo 25%
  };

  const handleZoomReset = () => {
    setZoomLevel(50); // Reset para 50%
  };

  const handleZoomFit = () => {
    if (canvasRef.current) {
      const container = canvasRef.current.parentElement;
      if (container) {
        const containerWidth = container.clientWidth - 64;
        const containerHeight = container.clientHeight - 64;
        const pageWidth = mmToPx(template.width);
        const pageHeight = mmToPx(template.height);
        
        const scaleX = containerWidth / pageWidth;
        const scaleY = containerHeight / pageHeight;
        const fitScale = Math.min(scaleX, scaleY, 1) * 100;
        
        setZoomLevel(Math.max(25, Math.min(100, fitScale)));
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
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Paleta Lateral */}
      <div className="w-64 border-r bg-muted/50 p-4 overflow-y-auto">
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Campos Disponíveis</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Arraste os campos para a área de edição
          </p>
        </div>
        
        <div className="space-y-2">
          {AVAILABLE_FIELDS.map((field) => (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => handleDragStart(e, field.id)}
              className={cn(
                "p-3 bg-background border rounded-lg cursor-move hover:bg-accent transition-colors",
                "flex items-center gap-2"
              )}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium text-sm">{field.label}</div>
                <div className="text-xs text-muted-foreground">{field.type}</div>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Propriedades da Página</Label>
          <div className="space-y-2">
            <div>
              <Label htmlFor="page-width" className="text-xs">Largura (mm)</Label>
              <Input
                id="page-width"
                type="number"
                value={template.width}
                onChange={(e) => {
                  setTemplate({ ...template, width: Number(e.target.value) });
                  setHasChanges(true);
                }}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="page-height" className="text-xs">Altura (mm)</Label>
              <Input
                id="page-height"
                type="number"
                value={template.height}
                onChange={(e) => {
                  setTemplate({ ...template, height: Number(e.target.value) });
                  setHasChanges(true);
                }}
                className="h-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col">
        {/* Barra de Ferramentas */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/admin')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Editor de Template da Ficha</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Controles de Zoom */}
            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                title="Diminuir zoom (Ctrl + Scroll)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="min-w-[60px] text-center text-sm font-medium">
                {zoomLevel}%
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                title="Aumentar zoom (Ctrl + Scroll)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomReset}
                title="Resetar zoom (50%)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomFit}
                title="Ajustar à tela"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={resetTemplate}>
              Restaurar Padrão
            </Button>
            <Button onClick={saveTemplate} disabled={loading || !hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Template'}
            </Button>
          </div>
        </div>

        {/* Área de Edição Visual */}
        <div 
          className="flex-1 overflow-auto p-8 bg-gray-100 flex items-center justify-center"
          onWheel={handleWheelZoom}
        >
          <div
            ref={canvasRef}
            className={cn(
              "bg-white shadow-2xl relative transition-all",
              isDraggingOver && "ring-2 ring-blue-500 ring-offset-2"
            )}
            style={{
              width: `${mmToPx(template.width) * currentScale}px`,
              height: `${mmToPx(template.height) * currentScale}px`,
              minWidth: `${mmToPx(template.width) * currentScale}px`,
              minHeight: `${mmToPx(template.height) * currentScale}px`,
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Campos */}
            {template.fields
              .filter((f) => f.visible)
              .map((field) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  scale={currentScale}
                  isSelected={selectedField === field.id}
                  isEditing={editingField === field.id}
                  onSelect={() => handleFieldClick(field.id)}
                  onMove={(x, y) => handleFieldMove(field.id, x, y)}
                  onDelete={() => handleDeleteField(field.id)}
                  onUpdate={(prop, value) => updateFieldProperty(field.id, prop, value)}
                  onStartEdit={() => setEditingField(field.id)}
                  onEndEdit={() => setEditingField(null)}
                  onImageUpload={(file) => handleImageUpload(field.id, file)}
                />
              ))}
          </div>
        </div>

        {/* Painel de Propriedades */}
        {selectedField && (
          <div className="w-80 border-l bg-background p-4 overflow-y-auto">
            <FieldPropertiesPanel
              field={template.fields.find((f) => f.id === selectedField)!}
              onUpdate={(prop, value) => updateFieldProperty(selectedField, prop, value)}
              onImageUpload={(file) => handleImageUpload(selectedField, file)}
            />
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
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
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
  onDelete,
  onUpdate,
  onStartEdit,
  onEndEdit,
  onImageUpload,
}: FieldEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, fieldX: 0, fieldY: 0 });
  const fieldRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = pxToMm((e.clientX - dragStart.x) / scale);
      const deltaY = pxToMm((e.clientY - dragStart.y) / scale);
      const newX = Math.max(0, dragStart.fieldX + deltaX);
      const newY = Math.max(0, dragStart.fieldY + deltaY);
      onMove(newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, scale, onMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Não permitir drag se estiver editando ou clicando em input/button
    const target = e.target as HTMLElement;
    if (
      isEditing || 
      target.tagName === 'INPUT' || 
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('input')
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

  return (
    <>
      <div
        className={cn(
          "absolute border-2 cursor-move transition-all",
          isSelected 
            ? "border-blue-500 bg-blue-50/50 z-10 shadow-md" 
            : "border-gray-300 hover:border-blue-400 z-0",
          !field.visible && "opacity-50"
        )}
        style={{
          left: `${mmToPx(field.x) * scale}px`,
          top: `${mmToPx(field.y) * scale}px`,
          width: `${mmToPx(field.width) * scale}px`,
          height: `${mmToPx(field.height) * scale}px`,
          minWidth: `${mmToPx(10) * scale}px`,
          minHeight: `${mmToPx(5) * scale}px`,
        }}
        ref={fieldRef}
        onMouseDown={handleMouseDown}
        onClick={onSelect}
      >
        {isSelected && (
          <div className="absolute -top-8 left-0 flex gap-1 z-20">
            <Button
              size="icon"
              variant="destructive"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {field.type === 'image' ? (
          <div 
            className="w-full h-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100"
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
                <div className="text-xs text-gray-500">Clique para adicionar imagem</div>
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
            className="w-full h-full p-1 flex items-center text-xs overflow-hidden bg-white/80"
            style={{
              fontSize: `${(field.fontSize || 11) * scale}px`,
              fontWeight: field.bold ? 'bold' : 'normal',
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
                    onEndEdit();
                  }
                }}
                autoFocus
                className="h-full text-xs p-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="whitespace-nowrap select-none">{field.label}</span>
            )}
          </div>
        )}
      </div>
    </>
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
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-4">Propriedades do Campo</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="field-label" className="text-xs">Rótulo</Label>
          <Input
            id="field-label"
            value={field.label}
            onChange={(e) => onUpdate('label', e.target.value)}
            className="h-8"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="field-x" className="text-xs">X (mm)</Label>
            <Input
              id="field-x"
              type="number"
              step="0.1"
              value={field.x.toFixed(1)}
              onChange={(e) => onUpdate('x', Number(e.target.value))}
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="field-y" className="text-xs">Y (mm)</Label>
            <Input
              id="field-y"
              type="number"
              step="0.1"
              value={field.y.toFixed(1)}
              onChange={(e) => onUpdate('y', Number(e.target.value))}
              className="h-8"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="field-width" className="text-xs">Largura (mm)</Label>
            <Input
              id="field-width"
              type="number"
              step="0.1"
              value={field.width.toFixed(1)}
              onChange={(e) => onUpdate('width', Number(e.target.value))}
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="field-height" className="text-xs">Altura (mm)</Label>
            <Input
              id="field-height"
              type="number"
              step="0.1"
              value={field.height.toFixed(1)}
              onChange={(e) => onUpdate('height', Number(e.target.value))}
              className="h-8"
            />
          </div>
        </div>

        {field.type !== 'image' && (
          <div>
            <Label htmlFor="field-font-size" className="text-xs">Tamanho da Fonte (pt)</Label>
            <Input
              id="field-font-size"
              type="number"
              value={field.fontSize || 11}
              onChange={(e) => onUpdate('fontSize', Number(e.target.value))}
              className="h-8"
            />
          </div>
        )}

        {field.type === 'image' && (
          <div>
            <Label className="text-xs">Imagem</Label>
            <div className="mt-2">
              {field.imageUrl && (
                <img 
                  src={field.imageUrl} 
                  alt="Preview" 
                  className="max-w-full max-h-32 object-contain border rounded mb-2"
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
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
