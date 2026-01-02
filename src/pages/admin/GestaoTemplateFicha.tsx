import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Save, ArrowLeft, GripVertical, ZoomIn, ZoomOut, Maximize2, RotateCcw, Image as ImageIcon, Grid, Trash2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import {
  TemplateFieldConfig as TemplateField,
  FichaTemplateConfig as FichaTemplate,
  FichaTemplatesConfig as TemplatesConfig,
  TemplateType,
} from '@/types';
import { generateResumoHTMLStructured } from '@/utils/generateResumoHTML';

const AVAILABLE_FIELDS: Omit<TemplateField, 'x' | 'y' | 'width' | 'height'>[] = [
  { id: 'numero_os', type: 'text', label: 'Nro. OS', key: 'numero' },
  { id: 'cliente', type: 'text', label: 'Cliente', key: 'cliente' },
  { id: 'telefone', type: 'text', label: 'Telefone', key: 'telefone_cliente' },
  { id: 'cidade_estado', type: 'text', label: 'Cidade/Estado', key: 'cidade_estado' },
  { id: 'data_entrada', type: 'date', label: 'Data Entrada', key: 'data_entrada' },
  { id: 'data_entrega', type: 'date', label: 'Data Entrega', key: 'data_entrega' },
  { id: 'forma_envio', type: 'text', label: 'Forma de Envio', key: 'forma_envio' },
  { id: 'descricao', type: 'text', label: 'Descrição', key: 'item_name' },
  { id: 'tipo_producao', type: 'text', label: 'Tipo de Produção', key: 'tipo_producao' },
  { id: 'tamanho', type: 'text', label: 'Tamanho', key: 'dimensoes' },
  { id: 'largura', type: 'text', label: 'Largura', key: 'largura' },
  { id: 'altura', type: 'text', label: 'Altura', key: 'altura' },
  { id: 'metro_quadrado', type: 'text', label: 'Área (m²)', key: 'metro_quadrado' },
  { id: 'designer', type: 'text', label: 'Designer', key: 'designer' },
  { id: 'vendedor', type: 'text', label: 'Vendedor', key: 'vendedor' },
  { id: 'tecido', type: 'text', label: 'Tecido', key: 'tecido' },
  { id: 'quantidade', type: 'number', label: 'Quantidade', key: 'quantity' },
  { id: 'observacao', type: 'text', label: 'Observações', key: 'observacao_item' },
  { id: 'legenda_imagem', type: 'text', label: 'Legenda da Imagem', key: 'legenda_imagem' },
  { id: 'imagem', type: 'image', label: 'Imagem', key: 'imagem' },
  { id: 'tipo_acabamento', type: 'text', label: 'Tipo de Acabamento', key: 'tipo_acabamento' },
  { id: 'quantidade_ilhos', type: 'text', label: 'Quantidade de Ilhós', key: 'quantidade_ilhos' },
  { id: 'espaco_ilhos', type: 'text', label: 'Espaçamento dos Ilhós', key: 'espaco_ilhos' },
  { id: 'quantidade_cordinha', type: 'text', label: 'Quantidade de Cordinhas', key: 'quantidade_cordinha' },
  { id: 'espaco_cordinha', type: 'text', label: 'Espaçamento das Cordinhas', key: 'espaco_cordinha' },
  { id: 'emenda', type: 'text', label: 'Emenda', key: 'emenda' },
  { id: 'emenda_qtd', type: 'text', label: 'Quantidade de Emendas', key: 'emenda_qtd' },
  { id: 'overloque', type: 'text', label: 'Overloque', key: 'overloque' },
  { id: 'elastico', type: 'text', label: 'Elástico', key: 'elastico' },
  { id: 'ziper', type: 'text', label: 'Zíper', key: 'ziper' },
  { id: 'cordinha_extra', type: 'text', label: 'Cordinha Extra', key: 'cordinha_extra' },
  { id: 'alcinha', type: 'text', label: 'Alcinha', key: 'alcinha' },
  { id: 'toalha_pronta', type: 'text', label: 'Toalha Pronta', key: 'toalha_pronta' },
  { id: 'quantidade_paineis', type: 'text', label: 'Quantidade de Painéis', key: 'quantidade_paineis' },
  { id: 'terceirizado', type: 'text', label: 'Terceirizado', key: 'terceirizado' },
  { id: 'acabamento_lona', type: 'text', label: 'Acabamento (Lona)', key: 'acabamento_lona' },
  { id: 'quantidade_lona', type: 'text', label: 'Quantidade de Lonas', key: 'quantidade_lona' },
  { id: 'acabamento_totem', type: 'text', label: 'Acabamento (Totem)', key: 'acabamento_totem' },
  { id: 'acabamento_totem_outro', type: 'text', label: 'Acabamento Extra (Totem)', key: 'acabamento_totem_outro' },
  { id: 'quantidade_totem', type: 'text', label: 'Quantidade de Totens', key: 'quantidade_totem' },
  { id: 'tipo_adesivo', type: 'text', label: 'Tipo de Adesivo', key: 'tipo_adesivo' },
  { id: 'quantidade_adesivo', type: 'text', label: 'Quantidade de Adesivos', key: 'quantidade_adesivo' },
  { id: 'valor_unitario', type: 'currency', label: 'Valor Unitário', key: 'unit_price' },
  { id: 'subtotal', type: 'currency', label: 'Subtotal', key: 'subtotal' },
  { id: 'valor_frete', type: 'currency', label: 'Valor Frete', key: 'valor_frete' },
  { id: 'total', type: 'currency', label: 'Total', key: 'total_value' },
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
  width: 187, // Largura do template resumo
  height: 92, // Altura do template resumo
  marginTop: 1,
  marginBottom: 1,
  marginLeft: 2,
  marginRight: 2,
  fields: [
    // FAIXA HORIZONTAL - Linha 1 (y: 2-6mm)
    // Coluna 1: ID e Cliente
    { id: 'numero_resumo', type: 'text', label: '#', key: 'numero', x: 2, y: 2, width: 12, height: 5, fontSize: 9, bold: true, visible: true, editable: true },
    { id: 'cliente_resumo', type: 'text', label: 'Cliente:', key: 'cliente', x: 15, y: 2, width: 50, height: 5, fontSize: 8, bold: true, visible: true, editable: true },
    
    // Coluna 2: Tipo e Descrição
    { id: 'tipo_item', type: 'text', label: 'Tipo:', key: 'tipo_producao', x: 67, y: 2, width: 35, height: 5, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'descricao_item', type: 'text', label: 'Desc:', key: 'item_name', x: 104, y: 2, width: 50, height: 5, fontSize: 7, bold: false, visible: true, editable: true },
    
    // Coluna 3: Quantidade
    { id: 'quantidade_item', type: 'number', label: 'Qtd:', key: 'quantity', x: 156, y: 2, width: 15, height: 5, fontSize: 8, bold: false, visible: true, editable: true },
    
    // Coluna 4: Imagem (pequena, fixa - lado direito)
    { id: 'imagem_item', type: 'image', label: '', key: 'imagem', x: 173, y: 2, width: 12, height: 34, fontSize: 7, bold: false, visible: true, editable: true },
    
    // FAIXA HORIZONTAL - Linha 2 (y: 8-12mm)
    // Coluna 1: Telefone e Cidade
    { id: 'telefone_resumo', type: 'text', label: 'Tel:', key: 'telefone_cliente', x: 2, y: 8, width: 35, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'cidade_resumo', type: 'text', label: 'Cidade:', key: 'cidade_estado', x: 39, y: 8, width: 35, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // Coluna 2: Vendedor e Designer
    { id: 'vendedor_resumo', type: 'text', label: 'Vend:', key: 'vendedor', x: 76, y: 8, width: 30, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'designer_resumo', type: 'text', label: 'Des:', key: 'designer', x: 108, y: 8, width: 30, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // Coluna 3: Tecido
    { id: 'tecido_resumo', type: 'text', label: 'Tecido:', key: 'tecido', x: 140, y: 8, width: 45, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // FAIXA HORIZONTAL - Linha 3 (y: 13-17mm)
    // Dimensões
    { id: 'dimensoes_resumo', type: 'text', label: 'Dimensões:', key: 'dimensoes', x: 2, y: 13, width: 40, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'metro_quadrado_resumo', type: 'text', label: 'm²:', key: 'metro_quadrado', x: 44, y: 13, width: 20, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // Acabamentos
    { id: 'tipo_acabamento_resumo', type: 'text', label: 'Acab:', key: 'tipo_acabamento', x: 66, y: 13, width: 30, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'overloque_resumo', type: 'text', label: 'Overloque:', key: 'overloque', x: 98, y: 13, width: 25, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'elastico_resumo', type: 'text', label: 'Elástico:', key: 'elastico', x: 125, y: 13, width: 25, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'emenda_resumo', type: 'text', label: 'Emenda:', key: 'emenda', x: 152, y: 13, width: 20, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'emenda_qtd_resumo', type: 'text', label: 'Qtd:', key: 'emenda_qtd', x: 174, y: 13, width: 11, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // FAIXA HORIZONTAL - Linha 4 (y: 18-22mm)
    // Ilhós
    { id: 'quantidade_ilhos_resumo', type: 'text', label: 'Ilhós Qtd:', key: 'quantidade_ilhos', x: 2, y: 18, width: 25, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'espaco_ilhos_resumo', type: 'text', label: 'Esp:', key: 'espaco_ilhos', x: 29, y: 18, width: 20, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // Cordinha
    { id: 'quantidade_cordinha_resumo', type: 'text', label: 'Cord Qtd:', key: 'quantidade_cordinha', x: 51, y: 18, width: 25, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'espaco_cordinha_resumo', type: 'text', label: 'Esp:', key: 'espaco_cordinha', x: 78, y: 18, width: 20, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // Campos booleanos
    { id: 'ziper_resumo', type: 'text', label: 'Zíper:', key: 'ziper', x: 100, y: 18, width: 20, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'cordinha_extra_resumo', type: 'text', label: 'Cord Extra:', key: 'cordinha_extra', x: 122, y: 18, width: 25, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'alcinha_resumo', type: 'text', label: 'Alcinha:', key: 'alcinha', x: 149, y: 18, width: 20, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'toalha_pronta_resumo', type: 'text', label: 'Toalha:', key: 'toalha_pronta', x: 171, y: 18, width: 14, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // FAIXA HORIZONTAL - Linha 5 (y: 23-27mm)
    // Painéis
    { id: 'quantidade_paineis_resumo', type: 'text', label: 'Painéis Qtd:', key: 'quantidade_paineis', x: 2, y: 23, width: 30, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // Lona
    { id: 'terceirizado_resumo', type: 'text', label: 'Terceirizado:', key: 'terceirizado', x: 34, y: 23, width: 30, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'acabamento_lona_resumo', type: 'text', label: 'Acab Lona:', key: 'acabamento_lona', x: 66, y: 23, width: 30, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'quantidade_lona_resumo', type: 'text', label: 'Lona Qtd:', key: 'quantidade_lona', x: 98, y: 23, width: 25, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // Totem
    { id: 'acabamento_totem_resumo', type: 'text', label: 'Acab Totem:', key: 'acabamento_totem', x: 125, y: 23, width: 30, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'acabamento_totem_outro_resumo', type: 'text', label: 'Totem Outro:', key: 'acabamento_totem_outro', x: 157, y: 23, width: 28, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // FAIXA HORIZONTAL - Linha 6 (y: 28-32mm)
    // Totem e Adesivo
    { id: 'quantidade_totem_resumo', type: 'text', label: 'Totem Qtd:', key: 'quantidade_totem', x: 2, y: 28, width: 25, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'tipo_adesivo_resumo', type: 'text', label: 'Tipo Adesivo:', key: 'tipo_adesivo', x: 29, y: 28, width: 35, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'quantidade_adesivo_resumo', type: 'text', label: 'Adesivo Qtd:', key: 'quantidade_adesivo', x: 66, y: 28, width: 30, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // Entrega e Observações
    { id: 'entrega_resumo', type: 'text', label: 'Entrega:', key: 'forma_envio', x: 98, y: 28, width: 40, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    { id: 'observacao_resumo', type: 'text', label: 'Obs:', key: 'observacao_item', x: 140, y: 28, width: 45, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
    
    // FAIXA HORIZONTAL - Linha 7 (y: 33-37mm) - Legenda da imagem
    { id: 'legenda_imagem_resumo', type: 'text', label: 'Legenda:', key: 'legenda_imagem', x: 2, y: 33, width: 183, height: 4, fontSize: 7, bold: false, visible: true, editable: true },
  ],
};

const applyFieldDefaults = (field: TemplateField): TemplateField => ({
  ...field,
  fontSize: field.fontSize ?? 11,
  visible: field.visible !== false,
  editable: field.editable !== false,
});

const applyTemplateDefaults = (
  template: Partial<FichaTemplate> | undefined,
  fallback: FichaTemplate
): FichaTemplate => {
  const merged = {
    ...fallback,
    ...(template || {}),
  };

  const fieldsSource =
    template?.fields && template.fields.length > 0 ? template.fields : fallback.fields;

  return {
    ...merged,
    fields: fieldsSource.map((field) => applyFieldDefaults({ ...field })),
  };
};

const TEMPLATES_DEFAULT: TemplatesConfig = {
  geral: applyTemplateDefaults(TEMPLATE_GERAL_DEFAULT, TEMPLATE_GERAL_DEFAULT),
  resumo: applyTemplateDefaults(TEMPLATE_RESUMO_DEFAULT, TEMPLATE_RESUMO_DEFAULT),
};

const STORAGE_KEY = 'ficha_templates_config';
const GRID_SIZE = 5; // mm

const mmToPx = (mm: number) => mm * 3.779527559;
const pxToMm = (px: number) => px / 3.779527559;

const snapToGrid = (value: number, gridSize: number = GRID_SIZE): number => {
  return Math.round(value / gridSize) * gridSize;
};
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export default function GestaoTemplateFicha() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentTemplateType, setCurrentTemplateType] = useState<TemplateType>('geral');
  const [templates, setTemplates] = useState<TemplatesConfig>(TEMPLATES_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(50);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(true);

  const template = templates[currentTemplateType];

  // Template já está na orientação correta (horizontal para resumo)
  const canvasWidth = template.width;
  const canvasHeight = template.height;

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    let loadedFromServer = false;
    try {
      const remote = await api.getFichaTemplates();
      const normalized = {
        geral: applyTemplateDefaults(remote.geral, TEMPLATE_GERAL_DEFAULT),
        resumo: applyTemplateDefaults(remote.resumo, TEMPLATE_RESUMO_DEFAULT),
      };
      setTemplates(normalized);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      setHasChanges(false);
      loadedFromServer = true;
    } catch (error) {
      console.error('Erro ao carregar templates do servidor:', error);
      toast({
        title: 'Aviso',
        description: 'Não foi possível carregar os templates do servidor. Tentando versão local.',
        variant: 'default',
      });
    } finally {
      setLoading(false);
    }

    if (loadedFromServer) {
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TemplatesConfig;
        setTemplates({
          geral: applyTemplateDefaults(parsed?.geral, TEMPLATE_GERAL_DEFAULT),
          resumo: applyTemplateDefaults(parsed?.resumo, TEMPLATE_RESUMO_DEFAULT),
        });
        return;
      }
    } catch (error) {
      console.error('Erro ao carregar templates locais:', error);
    }

    setTemplates({
      geral: applyTemplateDefaults(TEMPLATE_GERAL_DEFAULT, TEMPLATE_GERAL_DEFAULT),
      resumo: applyTemplateDefaults(TEMPLATE_RESUMO_DEFAULT, TEMPLATE_RESUMO_DEFAULT),
    });
  }, [toast]);

  const saveTemplates = useCallback(async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const response = await api.saveFichaTemplates(templates);
      const normalized = {
        geral: applyTemplateDefaults(response.geral, TEMPLATE_GERAL_DEFAULT),
        resumo: applyTemplateDefaults(response.resumo, TEMPLATE_RESUMO_DEFAULT),
      };
      setTemplates(normalized);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
      setHasChanges(false);
      
      // Gerar HTML estruturado para resumo (com seções organizadas) e salvar
      try {
        // Para resumo, usar HTML estruturado com seções
        const resumoHTML = generateResumoHTMLStructured();
        
        // Para geral, usar o HTML gerado do JSON (ou manter vazio se não houver)
        const { generateTemplatesHTML } = await import('@/utils/generateTemplateHTML');
        const geralHTML = generateTemplatesHTML(normalized.geral, normalized.resumo).geral;
        
        await api.saveFichaTemplatesHTML({ 
          geral: geralHTML, 
          resumo: resumoHTML 
        });
        
        console.log('[saveTemplates] ✅ HTML estruturado gerado e salvo para resumo');
        
        toast({
          title: 'Sucesso',
          description: 'Templates salvos! HTML estruturado gerado para resumo com todas as seções e campos disponíveis.',
          variant: 'default',
        });
      } catch (htmlError) {
        console.error('Erro ao salvar HTML estruturado:', htmlError);
        toast({
          title: 'Aviso',
          description: 'Templates JSON salvos, mas houve erro ao gerar HTML estruturado.',
          variant: 'default',
        });
      }
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
  }, [templates, toast, loading]);

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
    void loadTemplates();
  }, [loadTemplates]);

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

      // Esc - deselecionar
      if (e.key === 'Escape') {
        setSelectedField(null);
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
  }, [selectedField, template, templates, currentTemplateType, toast, hasChanges, saveTemplates, handleDeleteField]);

  const resetCurrentTemplate = () => {
    const defaultTemplate = currentTemplateType === 'geral' 
      ? TEMPLATE_GERAL_DEFAULT 
      : TEMPLATE_RESUMO_DEFAULT;
    
    setTemplates({
      ...templates,
      [currentTemplateType]: applyTemplateDefaults(defaultTemplate, defaultTemplate),
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

    const normalizedField = applyFieldDefaults(newField);

    setTemplates({
      ...templates,
      [currentTemplateType]: {
        ...template,
        fields: [...template.fields, normalizedField],
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
    // Coordenadas já vêm transformadas de volta, então usar diretamente
    let finalX = Math.max(0, newX);
    let finalY = Math.max(0, newY);

    // Verificar limites (usar template.width/height originais, não canvasWidth/Height)
    const maxX = template.width - 10;
    const maxY = template.height - 5;
    finalX = Math.min(finalX, maxX);
    finalY = Math.min(finalY, maxY);

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
  }, [currentTemplateType, snapToGridEnabled, template.width, template.height]);

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

  const updateFieldProperty = (fieldId: string, property: keyof TemplateField, value: unknown) => {
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

  const updateTemplateProperty = (property: keyof FichaTemplate, value: unknown) => {
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
        const pageWidth = mmToPx(canvasWidth);
        const pageHeight = mmToPx(canvasHeight);
        
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
              width: `${mmToPx(canvasWidth) * currentScale}px`,
              height: `${mmToPx(canvasHeight) * currentScale}px`,
              minWidth: `${mmToPx(canvasWidth) * currentScale}px`,
              minHeight: `${mmToPx(canvasHeight) * currentScale}px`,
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
            {template.fields.map((field) => {
              // Template já está na orientação correta (horizontal), sem transformações
              return (
                <FieldEditor
                  key={field.id}
                  field={field}
                  scale={currentScale}
                  isSelected={selectedField === field.id}
                  onSelect={(e) => handleFieldClick(field.id, e)}
                  onMove={(x, y) => {
                    handleFieldMove(field.id, x, y);
                  }}
                  onResize={(handle, w, h, dx, dy) => {
                    handleFieldResize(field.id, handle, w, h, dx, dy);
                  }}
                  onDelete={() => handleDeleteField(field.id)}
                  onImageUpload={(file) => handleImageUpload(field.id, file)}
                  onUpdate={(prop, value) => {
                    updateFieldProperty(field.id, prop, value);
                  }}
                />
              );
            })}
            
            {/* Popup de Propriedades Flutuante */}
            {selectedField && (() => {
              const selectedFieldData = template.fields.find((f) => f.id === selectedField);
              if (!selectedFieldData) return null;
              
              // Coordenadas diretas (template já está na orientação correta)
              const fieldX = mmToPx(selectedFieldData.x) * currentScale;
              const fieldY = mmToPx(selectedFieldData.y) * currentScale;
              const fieldWidth = mmToPx(selectedFieldData.width) * currentScale;
              const fieldHeight = mmToPx(selectedFieldData.height) * currentScale;
              
              // Posicionar popup acima do campo se houver espaço, senão abaixo
              const popupX = fieldX + fieldWidth / 2;
              const spaceAbove = fieldY;
              const spaceBelow = (mmToPx(canvasHeight) * currentScale) - (fieldY + fieldHeight);
              const showAbove = spaceAbove > 80 || spaceAbove > spaceBelow;
              const popupY = showAbove ? fieldY - 8 : fieldY + fieldHeight + 8;
              
              return (
                <div
                  className="absolute z-50 bg-white border border-gray-300 rounded-md shadow-2xl p-2 pointer-events-auto"
                  style={{
                    left: `${popupX}px`,
                    top: `${popupY}px`,
                    transform: showAbove ? 'translate(-50%, -100%)' : 'translateX(-50%)',
                    width: '160px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold text-gray-700 mb-1 pb-1 border-b border-gray-200 truncate">
                      {selectedFieldData.label}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <Label htmlFor="popup-x" className="text-[9px] text-gray-600 mb-0.5 block">X</Label>
                        <Input
                          id="popup-x"
                          type="number"
                          step="0.1"
                          value={selectedFieldData.x.toFixed(1)}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            updateFieldProperty(selectedField, 'x', newValue);
                          }}
                          className="h-6 text-[11px] bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="popup-y" className="text-[9px] text-gray-600 mb-0.5 block">Y</Label>
                        <Input
                          id="popup-y"
                          type="number"
                          step="0.1"
                          value={selectedFieldData.y.toFixed(1)}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            updateFieldProperty(selectedField, 'y', newValue);
                          }}
                          className="h-6 text-[11px] bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-1.5"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <Label htmlFor="popup-w" className="text-[9px] text-gray-600 mb-0.5 block">Larg</Label>
                        <Input
                          id="popup-w"
                          type="number"
                          step="0.1"
                          value={selectedFieldData.width.toFixed(1)}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            updateFieldProperty(selectedField, 'width', value);
                          }}
                          className="h-6 text-[11px] bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="popup-h" className="text-[9px] text-gray-600 mb-0.5 block">Alt</Label>
                        <Input
                          id="popup-h"
                          type="number"
                          step="0.1"
                          value={selectedFieldData.height.toFixed(1)}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            updateFieldProperty(selectedField, 'height', value);
                          }}
                          className="h-6 text-[11px] bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-1.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}

interface FieldEditorProps {
  field: TemplateField;
  scale: number;
  isSelected: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onMove: (x: number, y: number) => void;
  onResize: (handle: ResizeHandle, width: number, height: number, deltaX: number, deltaY: number) => void;
  onDelete: () => void;
  onImageUpload?: (file: File) => void;
  onUpdate?: (property: keyof TemplateField, value: unknown) => void;
}

function FieldEditor({
  field,
  scale,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
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
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
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
        >
          <span 
            className="whitespace-nowrap select-none text-gray-900"
            style={{
              fontSize: `${(field.fontSize || 11) * scale}px`,
              fontWeight: field.bold ? 'bold' : 'normal',
            }}
          >
            {field.label}
          </span>
        </div>
      )}
    </div>
  );
}
