import { Plug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function IntegracaoEstoque() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
          Integração com sistema de estoque de terceiros
        </h1>
        <p className="text-sm text-muted-foreground">
          Conecte o SGP a um sistema de estoque externo para sincronizar materiais e consumo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-sky-600" />
            <CardTitle className="text-base">Integração em desenvolvimento</CardTitle>
          </div>
          <CardDescription>
            Esta funcionalidade permitirá configurar API, credenciais e mapeamento de materiais com sistemas de estoque de terceiros. Em breve você poderá sincronizar estoque (metros, entradas e saídas) automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate('/dashboard/admin')}>
            Voltar ao Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
