import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DatabaseConnection from './pages/DatabaseConnection';
import { useAuthStore } from './store/authStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const [isDatabaseConnected, setIsDatabaseConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  // Verificar se o banco está conectado ao inicializar
  useEffect(() => {
    checkDatabaseConnection();
  }, []);

  const checkDatabaseConnection = async () => {
    setIsCheckingConnection(true);
    
    try {
      // Tentar fazer uma chamada simples para verificar se o backend está funcionando
      // Usamos o comando load_db_config que sempre existe, mesmo quando o banco não está conectado
      const savedConfig = await import('@tauri-apps/api/tauri').then(({ invoke }) => 
        invoke('load_db_config')
      );
      
      // Se temos uma configuração salva, tentar conectar com ela
      if (savedConfig) {
        const dbUrl = `postgresql://${savedConfig.user}:${savedConfig.password}@${savedConfig.host}:${savedConfig.port}/${savedConfig.database}`;
        
        await import('@tauri-apps/api/tauri').then(({ invoke }) => 
          invoke('test_db_connection', { dbUrl })
        );
        
        setIsDatabaseConnected(true);
      } else {
        // Se não há configuração salva, assumir que precisa de configuração
        setIsDatabaseConnected(false);
      }
    } catch (error) {
      console.log('Database connection check failed:', error);
      setIsDatabaseConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Mostrar loading enquanto verifica a conexão
  if (isCheckingConnection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando conexão com o banco de dados...</p>
        </div>
      </div>
    );
  }

  // Se o banco não está conectado, mostrar a tela de configuração
  if (isDatabaseConnected === false) {
    return (
      <div>
        <DatabaseConnection onConnectionRestored={checkDatabaseConnection} />
        <Toaster />
      </div>
    );
  }

  // Se o banco está conectado, mostrar a aplicação normal
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
