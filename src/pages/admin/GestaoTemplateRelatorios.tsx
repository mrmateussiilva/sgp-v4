import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import {
  RelatorioTemplateConfig,
  RelatorioTemplatesConfig,
  RelatorioTemplateType,
} from '@/types';

const STORAGE_KEY = 'relatorio_templates_config';

const DEFAULT_ENVIOS_TEMPLATE: RelatorioTemplateConfig = {
  title: 'Relatório de Envios',
  headerFields: {
    title: 'Relatório de Envios',
    subtitle: '',
    periodoLabel: 'Período:',
    dataGeracaoLabel: 'Gerado em:',
    totalPedidosLabel: 'Total de pedidos:',
  },
  styles: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
    titleSize: 20,
    subtitleSize: 14,
    textColor: '#0f172a',
    headerColor: '#1e293b',
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  tableConfig: {
    showHeader: true,
    headerStyle: {
      backgroundColor: '#2563eb',
      textColor: '#ffffff',
      bold: true,
    },
    alternatingRows: true,
    cellPadding: 6,
  },
  pageConfig: {
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 14,
    marginRight: 14,
  },
};

const DEFAULT_FECHAMENTOS_TEMPLATE: RelatorioTemplateConfig = {
  title: 'Relatório de Fechamentos',
  headerFields: {
    title: 'Relatório de Fechamentos',
    subtitle: '',
    periodoLabel: 'Período:',
    dataGeracaoLabel: 'Emitido em:',
    statusLabel: 'Status:',
  },
  styles: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 11,
    titleSize: 18,
    subtitleSize: 13,
    textColor: '#0f172a',
    headerColor: '#1e293b',
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  tableConfig: {
    showHeader: true,
    headerStyle: {
      backgroundColor: '#e2e8f0',
      textColor: '#1e293b',
      bold: true,
    },
    alternatingRows: true,
    cellPadding: 4,
  },
  pageConfig: {
    marginTop: 22,
    marginBottom: 22,
    marginLeft: 14,
    marginRight: 14,
  },
};

const DEFAULT_TEMPLATES: RelatorioTemplatesConfig = {
  envios: DEFAULT_ENVIOS_TEMPLATE,
  fechamentos: DEFAULT_FECHAMENTOS_TEMPLATE,
};

export default function GestaoTemplateRelatorios() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentTemplateType, setCurrentTemplateType] = useState<RelatorioTemplateType>('envios');
  const [templates, setTemplates] = useState<RelatorioTemplatesConfig>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const template = templates[currentTemplateType];

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const remote = await api.getRelatorioTemplates();
        setTemplates(remote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        setHasChanges(false);
      } catch (error) {
        console.warn('Erro ao carregar templates do servidor, usando local:', error);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as RelatorioTemplatesConfig;
          setTemplates(parsed);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTemplates = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      try {
        const response = await api.saveRelatorioTemplates(templates);
        setTemplates(response);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
        setHasChanges(false);
        toast({
          title: 'Sucesso',
          description: 'Templates de relatórios salvos com sucesso!',
        });
      } catch (error) {
        // Fallback para localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
        setHasChanges(false);
        toast({
          title: 'Aviso',
          description: 'Templates salvos localmente. A API não está disponível.',
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

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const updateHeaderField = (key: string, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [currentTemplateType]: {
        ...prev[currentTemplateType],
        headerFields: {
          ...prev[currentTemplateType].headerFields,
          [key]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const updateStyle = (key: string, value: string | number) => {
    setTemplates((prev) => ({
      ...prev,
      [currentTemplateType]: {
        ...prev[currentTemplateType],
        styles: {
          ...prev[currentTemplateType].styles,
          [key]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const updateTableConfig = (key: string, value: any) => {
    setTemplates((prev) => ({
      ...prev,
      [currentTemplateType]: {
        ...prev[currentTemplateType],
        tableConfig: {
          ...prev[currentTemplateType].tableConfig,
          [key]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const updatePageConfig = (key: string, value: number) => {
    setTemplates((prev) => ({
      ...prev,
      [currentTemplateType]: {
        ...prev[currentTemplateType],
        pageConfig: {
          ...prev[currentTemplateType].pageConfig,
          [key]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const resetTemplate = () => {
    const defaultTemplate = currentTemplateType === 'envios' 
      ? DEFAULT_ENVIOS_TEMPLATE 
      : DEFAULT_FECHAMENTOS_TEMPLATE;
    
    setTemplates((prev) => ({
      ...prev,
      [currentTemplateType]: defaultTemplate,
    }));
    setHasChanges(true);
    toast({
      title: 'Template Resetado',
      description: `Template de ${currentTemplateType === 'envios' ? 'Envios' : 'Fechamentos'} restaurado para valores padrão.`,
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-14 border-r border-gray-200 bg-white flex flex-col items-center py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => navigate('/dashboard/admin')}
          title="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 mt-2"
          onClick={saveTemplates}
          disabled={loading || !hasChanges}
          title="Salvar (Ctrl+S)"
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <h1 className="text-2xl font-bold">Edição de Templates de Relatórios</h1>
            </div>
            {hasChanges && (
              <span className="text-sm text-amber-600 font-medium">● Alterações não salvas</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Selecione o Template</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={currentTemplateType} onValueChange={(v) => setCurrentTemplateType(v as RelatorioTemplateType)}>
                <TabsList>
                  <TabsTrigger value="envios">Relatório de Envios</TabsTrigger>
                  <TabsTrigger value="fechamentos">Relatório de Fechamentos</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-6 space-y-6">
            {/* Cabeçalho */}
            <Card>
              <CardHeader>
                <CardTitle>Campos do Cabeçalho</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Título Principal</Label>
                    <Input
                      id="title"
                      value={template.headerFields.title || ''}
                      onChange={(e) => updateHeaderField('title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="subtitle">Subtítulo</Label>
                    <Input
                      id="subtitle"
                      value={template.headerFields.subtitle || ''}
                      onChange={(e) => updateHeaderField('subtitle', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="periodoLabel">Label do Período</Label>
                    <Input
                      id="periodoLabel"
                      value={template.headerFields.periodoLabel || ''}
                      onChange={(e) => updateHeaderField('periodoLabel', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataGeracaoLabel">Label da Data de Geração</Label>
                    <Input
                      id="dataGeracaoLabel"
                      value={template.headerFields.dataGeracaoLabel || ''}
                      onChange={(e) => updateHeaderField('dataGeracaoLabel', e.target.value)}
                    />
                  </div>
                  {currentTemplateType === 'envios' && (
                    <div>
                      <Label htmlFor="totalPedidosLabel">Label do Total de Pedidos</Label>
                      <Input
                        id="totalPedidosLabel"
                        value={template.headerFields.totalPedidosLabel || ''}
                        onChange={(e) => updateHeaderField('totalPedidosLabel', e.target.value)}
                      />
                    </div>
                  )}
                  {currentTemplateType === 'fechamentos' && (
                    <div>
                      <Label htmlFor="statusLabel">Label do Status</Label>
                      <Input
                        id="statusLabel"
                        value={template.headerFields.statusLabel || ''}
                        onChange={(e) => updateHeaderField('statusLabel', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Estilos */}
            <Card>
              <CardHeader>
                <CardTitle>Estilos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fontFamily">Fonte</Label>
                    <Input
                      id="fontFamily"
                      value={template.styles.fontFamily || ''}
                      onChange={(e) => updateStyle('fontFamily', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fontSize">Tamanho da Fonte (pt)</Label>
                    <Input
                      id="fontSize"
                      type="number"
                      value={template.styles.fontSize || 12}
                      onChange={(e) => updateStyle('fontSize', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="titleSize">Tamanho do Título (pt)</Label>
                    <Input
                      id="titleSize"
                      type="number"
                      value={template.styles.titleSize || 20}
                      onChange={(e) => updateStyle('titleSize', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="textColor">Cor do Texto</Label>
                    <Input
                      id="textColor"
                      type="color"
                      value={template.styles.textColor || '#0f172a'}
                      onChange={(e) => updateStyle('textColor', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="headerColor">Cor do Cabeçalho</Label>
                    <Input
                      id="headerColor"
                      type="color"
                      value={template.styles.headerColor || '#1e293b'}
                      onChange={(e) => updateStyle('headerColor', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="borderColor">Cor da Borda</Label>
                    <Input
                      id="borderColor"
                      type="color"
                      value={template.styles.borderColor || '#cbd5e1'}
                      onChange={(e) => updateStyle('borderColor', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurações de Tabela */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Tabela</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showHeader"
                      checked={template.tableConfig?.showHeader ?? true}
                      onChange={(e) => updateTableConfig('showHeader', e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="showHeader">Mostrar Cabeçalho da Tabela</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="alternatingRows"
                      checked={template.tableConfig?.alternatingRows ?? true}
                      onChange={(e) => updateTableConfig('alternatingRows', e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="alternatingRows">Linhas Alternadas</Label>
                  </div>
                  <div>
                    <Label htmlFor="cellPadding">Padding das Células (px)</Label>
                    <Input
                      id="cellPadding"
                      type="number"
                      value={template.tableConfig?.cellPadding || 6}
                      onChange={(e) => updateTableConfig('cellPadding', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="headerBgColor">Cor de Fundo do Cabeçalho</Label>
                    <Input
                      id="headerBgColor"
                      type="color"
                      value={template.tableConfig?.headerStyle?.backgroundColor || '#2563eb'}
                      onChange={(e) => updateTableConfig('headerStyle', {
                        ...template.tableConfig?.headerStyle,
                        backgroundColor: e.target.value,
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurações de Página */}
            <Card>
              <CardHeader>
                <CardTitle>Margens da Página (mm)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="marginTop">Margem Superior</Label>
                    <Input
                      id="marginTop"
                      type="number"
                      value={template.pageConfig?.marginTop || 20}
                      onChange={(e) => updatePageConfig('marginTop', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="marginBottom">Margem Inferior</Label>
                    <Input
                      id="marginBottom"
                      type="number"
                      value={template.pageConfig?.marginBottom || 20}
                      onChange={(e) => updatePageConfig('marginBottom', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="marginLeft">Margem Esquerda</Label>
                    <Input
                      id="marginLeft"
                      type="number"
                      value={template.pageConfig?.marginLeft || 14}
                      onChange={(e) => updatePageConfig('marginLeft', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="marginRight">Margem Direita</Label>
                    <Input
                      id="marginRight"
                      type="number"
                      value={template.pageConfig?.marginRight || 14}
                      onChange={(e) => updatePageConfig('marginRight', Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={saveTemplates} disabled={loading || !hasChanges}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={resetTemplate}>
                Restaurar Padrão
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

