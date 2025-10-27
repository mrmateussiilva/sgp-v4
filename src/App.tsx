import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { loadConfig } from '@/utils/config';
import ConfigApi from './pages/ConfigApi';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { normalizeApiUrl, onApiFailure, verifyApiConnection } from './services/apiClient';
import { setApiUrl as applyApiUrl } from './services/api';
import { useAuthStore } from './store/authStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [showFallback, setShowFallback] = useState(false);

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

  if (isCheckingConnection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando conexão com a API...</p>
        </div>
      </div>
    );
  }

  if (showFallback || !apiUrl) {
    return (
      <div>
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
    );
  }

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
