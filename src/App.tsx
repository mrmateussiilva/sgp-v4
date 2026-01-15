import { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { loadConfig } from '@/utils/config';
import { normalizeApiUrl, onApiFailure, verifyApiConnection } from './services/apiClient';
import { setApiUrl as applyApiUrl } from './services/api';
import { useAuthStore } from './store/authStore';
import { ThemeProvider } from './components/ThemeProvider';
import { Loader2 } from 'lucide-react';
import { useTauriUpdater } from './hooks/useTauriUpdater';
import { listen } from '@tauri-apps/api/event';
import { toast } from '@/hooks/use-toast';
import { AlertProvider } from './contexts/AlertContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const ConfigApi = lazy(() => import('./pages/ConfigApi'));
const UpdateStatus = lazy(() => import('./pages/UpdateStatus'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
        <p className="text-slate-700">Carregando...</p>
      </div>
    </div>
  );
}

function App() {
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Hook de verificação automática de atualizações usando updater oficial do Tauri
  // Nota: Notificações WebSocket são gerenciadas por useOrderAutoSync em OrderList.tsx
  // que usa o singleton ordersSocket para evitar múltiplas conexões
  useTauriUpdater();

  // Ativar notificações em tempo real globalmente (toasts + refresh)
  // O hook já lida com connect/disconnect baseado no sessionToken.
  useRealtimeNotifications();

  useEffect(() => {
    const verifyConfig = async () => {
      setIsCheckingConnection(true);
      try {
        const config = await loadConfig();
        if (config?.api_url) {
          const normalizedUrl = normalizeApiUrl(config.api_url);
          await verifyApiConnection(normalizedUrl);
          applyApiUrl(normalizedUrl);
          setApiUrl(normalizedUrl);
          setShowFallback(false);
        } else {
          setApiUrl(null);
          setShowFallback(true);
        }
      } catch {
        setApiUrl(null);
        setShowFallback(true);
      } finally {
        setIsCheckingConnection(false);
      }
    };

    verifyConfig();
  }, []);

  useEffect(() => {
    const unsubscribe = onApiFailure(() => {
      setApiUrl(null);
      setShowFallback(true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Listener para eventos de novo pedido
  useEffect(() => {
    if (!apiUrl || !isAuthenticated) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unsubscribe = await listen("novo_pedido", () => {
          toast({
            title: "Novo pedido criado!",
            description: "Um novo pedido foi criado no sistema.",
          });
        });
      } catch (error) {
        console.error("Erro ao configurar listener de notificações:", error);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [apiUrl, isAuthenticated]);

  if (isCheckingConnection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-700">Verificando conexão...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AlertProvider>
        <ConfirmProvider>
          <Suspense fallback={<LoadingFallback />}>
          {showFallback || !apiUrl ? (
            <div className="bg-background text-foreground min-h-screen">
              <ConfigApi
                onConfigured={(url) => {
                  const normalizedUrl = normalizeApiUrl(url);
                  applyApiUrl(normalizedUrl);
                  setApiUrl(normalizedUrl);
                  setShowFallback(false);
                }}
              />
              <Toaster />
            </div>
          ) : (
            <HashRouter>
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
                <Route
                  path="/update-status"
                  element={
                    <PrivateRoute>
                      <UpdateStatus />
                    </PrivateRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
              <Toaster />
            </HashRouter>
          )}
        </Suspense>
        </ConfirmProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

export default App;
