import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Save, ArrowLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface FichaTemplate {
  // Cabeçalho
  titulo: string;
  mostrar_data_entrada: boolean;
  mostrar_data_entrega: boolean;
  
  // Campos do Pedido
  campos: {
    numero_os: { label: string; visivel: boolean };
    descricao: { label: string; visivel: boolean };
    tamanho: { label: string; visivel: boolean };
    arte_designer: { label: string; visivel: boolean };
    rip_maquina: { label: string; visivel: boolean };
    tecido_ilhos: { label: string; visivel: boolean };
    revisao_expedicao: { label: string; visivel: boolean };
    forma_envio_pagamento: { label: string; visivel: boolean };
    valores: { label: string; visivel: boolean };
  };
  
  // Rodapé
  mostrar_observacoes: boolean;
  mostrar_assinatura: boolean;
  
  // Estilo
  fonte_titulo: string;
  fonte_corpo: string;
  mostrar_detalhes_extras: boolean;
}

const TEMPLATE_DEFAULT: FichaTemplate = {
  titulo: 'EMISSÃO FICHA DE SERVIÇO',
  mostrar_data_entrada: true,
  mostrar_data_entrega: true,
  campos: {
    numero_os: { label: 'Nro. OS:', visivel: true },
    descricao: { label: 'Descrição:', visivel: true },
    tamanho: { label: 'Tamanho:', visivel: true },
    arte_designer: { label: 'Arte / Designer / Exclusiva / Vr. Arte:', visivel: true },
    rip_maquina: { label: 'RIP / Máquina / Impressão / Data Impressão:', visivel: true },
    tecido_ilhos: { label: 'Tecido / Ilhós / Emendas / Overloque / Elástico:', visivel: true },
    revisao_expedicao: { label: 'Revisão / Expedição:', visivel: true },
    forma_envio_pagamento: { label: 'Forma de Envio / Pagamento:', visivel: true },
    valores: { label: 'Valores:', visivel: true },
  },
  mostrar_observacoes: true,
  mostrar_assinatura: true,
  fonte_titulo: '14pt',
  fonte_corpo: '11pt',
  mostrar_detalhes_extras: true,
};

const STORAGE_KEY = 'ficha_template_config';

export default function GestaoTemplateFicha() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<FichaTemplate>(TEMPLATE_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTemplate({ ...TEMPLATE_DEFAULT, ...parsed });
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

  const updateTemplate = (path: string, value: any) => {
    const keys = path.split('.');
    const newTemplate = { ...template };
    let current: any = newTemplate;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setTemplate(newTemplate);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/admin')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Template da Ficha de Serviço</h1>
          </div>
          <p className="text-muted-foreground">
            Configure o template global que será usado em todas as fichas de serviço geradas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetTemplate}>
            Restaurar Padrão
          </Button>
          <Button onClick={saveTemplate} disabled={loading || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Template'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="campos" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campos">Campos</TabsTrigger>
          <TabsTrigger value="cabecalho">Cabeçalho</TabsTrigger>
          <TabsTrigger value="rodape">Rodapé</TabsTrigger>
          <TabsTrigger value="visualizacao">Visualização</TabsTrigger>
        </TabsList>

        {/* Aba: Campos */}
        <TabsContent value="campos" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Campos da Ficha</CardTitle>
              <CardDescription>
                Configure quais campos aparecem na ficha e seus rótulos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(template.campos).map(([key, campo]) => (
                <div key={key} className="flex items-center justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor={`label_${key}`} className="text-sm font-medium">
                      Rótulo do Campo
                    </Label>
                    <Input
                      id={`label_${key}`}
                      value={campo.label}
                      onChange={(e) =>
                        updateTemplate(`campos.${key}.label`, e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id={`visivel_${key}`}
                      checked={campo.visivel}
                      onCheckedChange={(checked) =>
                        updateTemplate(`campos.${key}.visivel`, checked)
                      }
                    />
                    <Label
                      htmlFor={`visivel_${key}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Visível
                    </Label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Cabeçalho */}
        <TabsContent value="cabecalho" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Cabeçalho</CardTitle>
              <CardDescription>
                Personalize o título e as informações do cabeçalho
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título da Ficha</Label>
                <Input
                  id="titulo"
                  value={template.titulo}
                  onChange={(e) => updateTemplate('titulo', e.target.value)}
                  placeholder="EMISSÃO FICHA DE SERVIÇO"
                />
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mostrar_data_entrada"
                    checked={template.mostrar_data_entrada}
                    onCheckedChange={(checked) =>
                      updateTemplate('mostrar_data_entrada', checked)
                    }
                  />
                  <Label
                    htmlFor="mostrar_data_entrada"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Mostrar Data de Entrada
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mostrar_data_entrega"
                    checked={template.mostrar_data_entrega}
                    onCheckedChange={(checked) =>
                      updateTemplate('mostrar_data_entrega', checked)
                    }
                  />
                  <Label
                    htmlFor="mostrar_data_entrega"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Mostrar Data de Entrega
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Rodapé */}
        <TabsContent value="rodape" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Rodapé</CardTitle>
              <CardDescription>
                Configure o que aparece no rodapé da ficha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mostrar_observacoes"
                  checked={template.mostrar_observacoes}
                  onCheckedChange={(checked) =>
                    updateTemplate('mostrar_observacoes', checked)
                  }
                />
                <Label
                  htmlFor="mostrar_observacoes"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mostrar Campo de Observações
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mostrar_assinatura"
                  checked={template.mostrar_assinatura}
                  onCheckedChange={(checked) =>
                    updateTemplate('mostrar_assinatura', checked)
                  }
                />
                <Label
                  htmlFor="mostrar_assinatura"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mostrar Campo de Assinatura
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mostrar_detalhes_extras"
                  checked={template.mostrar_detalhes_extras}
                  onCheckedChange={(checked) =>
                    updateTemplate('mostrar_detalhes_extras', checked)
                  }
                />
                <Label
                  htmlFor="mostrar_detalhes_extras"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mostrar Detalhes Extras (informações adicionais do item)
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Visualização */}
        <TabsContent value="visualizacao" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Visuais</CardTitle>
              <CardDescription>
                Personalize o tamanho das fontes e aparência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fonte_titulo">Tamanho da Fonte do Título</Label>
                  <Input
                    id="fonte_titulo"
                    value={template.fonte_titulo}
                    onChange={(e) => updateTemplate('fonte_titulo', e.target.value)}
                    placeholder="14pt"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 14pt, 16px, 1.2rem
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="fonte_corpo">Tamanho da Fonte do Corpo</Label>
                  <Input
                    id="fonte_corpo"
                    value={template.fonte_corpo}
                    onChange={(e) => updateTemplate('fonte_corpo', e.target.value)}
                    placeholder="11pt"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 11pt, 12px, 1rem
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Preview do Template</CardTitle>
              <CardDescription>
                Visualize como o template está configurado atualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(template, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

