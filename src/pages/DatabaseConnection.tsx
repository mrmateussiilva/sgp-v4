import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Database, Loader2 } from "lucide-react";

interface DbConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

interface DatabaseConnectionProps {
  onConnectionRestored?: () => void;
}

export default function DatabaseConnection({ onConnectionRestored }: DatabaseConnectionProps) {
  const [form, setForm] = useState<DbConfig>({
    host: "localhost",
    port: "5432",
    user: "postgres",
    password: "",
    database: "sgp"
  });
  
  const [status, setStatus] = useState<{
    type: 'idle' | 'testing' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });
  
  const [isLoading, setIsLoading] = useState(false);

  // Carregar configuração salva ao montar o componente
  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const savedConfig = await invoke<DbConfig | null>("load_db_config");
      if (savedConfig) {
        setForm(savedConfig);
        setStatus({ 
          type: 'idle', 
          message: 'Configuração anterior carregada' 
        });
      }
    } catch (error) {
      console.log("Nenhuma configuração salva encontrada");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Limpar status quando usuário edita
    if (status.type !== 'idle') {
      setStatus({ type: 'idle', message: '' });
    }
  };

  const testConnection = async () => {
    const dbUrl = `postgresql://${form.user}:${form.password}@${form.host}:${form.port}/${form.database}`;
    
    setStatus({ type: 'testing', message: 'Testando conexão...' });
    setIsLoading(true);
    
    try {
      await invoke("test_db_connection", { dbUrl });
      setStatus({ 
        type: 'success', 
        message: '✅ Conexão bem-sucedida!' 
      });
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: `❌ Erro: ${error}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    
    try {
      await invoke("save_db_config", { config: form });
      setStatus({ 
        type: 'success', 
        message: '✅ Configuração salva! Reconectando...' 
      });
      
      // Aguardar um pouco antes de tentar reconectar
      setTimeout(async () => {
        try {
          // Tentar uma operação que requer banco de dados para verificar se a conexão foi restaurada
          const dbUrl = `postgresql://${form.user}:${form.password}@${form.host}:${form.port}/${form.database}`;
          await invoke('test_db_connection', { dbUrl });
          
          setStatus({ 
            type: 'success', 
            message: '✅ Conexão restaurada! Carregando aplicação...' 
          });
          
          // Chamar o callback para notificar o App.tsx
          if (onConnectionRestored) {
            onConnectionRestored();
          } else {
            // Fallback: recarregar a página
            window.location.reload();
          }
        } catch (error) {
          setStatus({ 
            type: 'error', 
            message: `❌ Erro ao reconectar: ${error}` 
          });
          setIsLoading(false);
        }
      }, 1000);
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: `❌ Erro ao salvar: ${error}` 
      });
      setIsLoading(false);
    }
  };

  const clearConfig = async () => {
    try {
      await invoke("delete_db_config");
      setForm({
        host: "localhost",
        port: "5432",
        user: "postgres",
        password: "",
        database: "sgp"
      });
      setStatus({ 
        type: 'idle', 
        message: 'Configuração removida' 
      });
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: `❌ Erro ao remover configuração: ${error}` 
      });
    }
  };

  const getStatusIcon = () => {
    switch (status.type) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Database className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.type) {
      case 'testing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Database className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Configurar Banco de Dados
          </CardTitle>
          <CardDescription className="text-gray-600">
            Configure a conexão com o banco de dados PostgreSQL
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                name="host"
                type="text"
                placeholder="localhost"
                value={form.host}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="port">Porta</Label>
              <Input
                id="port"
                name="port"
                type="text"
                placeholder="5432"
                value={form.port}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="user">Usuário</Label>
              <Input
                id="user"
                name="user"
                type="text"
                placeholder="postgres"
                value={form.user}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Digite sua senha"
                value={form.password}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="database">Nome do Banco</Label>
              <Input
                id="database"
                name="database"
                type="text"
                placeholder="sgp"
                value={form.database}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={testConnection}
              disabled={isLoading || !form.host || !form.port || !form.user || !form.database}
              className="w-full"
              variant="outline"
            >
              {isLoading && status.type === 'testing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                'Testar Conexão'
              )}
            </Button>
            
            <Button
              onClick={saveConfig}
              disabled={isLoading || status.type !== 'success'}
              className="w-full"
            >
              {isLoading && status.type !== 'testing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar e Reconectar'
              )}
            </Button>
            
            <Button
              onClick={clearConfig}
              disabled={isLoading}
              variant="ghost"
              className="w-full text-gray-500 hover:text-red-600"
            >
              Limpar Configuração
            </Button>
          </div>

          {status.message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${getStatusColor()}`}>
              {getStatusIcon()}
              <span>{status.message}</span>
            </div>
          )}
          
          <div className="text-xs text-gray-500 text-center pt-2">
            <p>As configurações serão salvas localmente e a aplicação será reiniciada automaticamente.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
