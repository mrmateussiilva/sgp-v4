import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorMessage, isAuthError } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.login({ username, password });

      if (response.success && response.user_id && response.username && response.session_token) {
        const isAdmin = response.is_admin || false;
        login({
          userId: response.user_id,
          username: response.username,
          sessionToken: response.session_token,
          isAdmin,
        });
        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta.",
        });
        navigate('/dashboard');
      } else {
        toast({
          variant: "destructive",
          title: "Falha na autenticação",
          description: response.message || 'Usuário ou senha inválidos.',
        });
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const isAuth = isAuthError(err);

      toast({
        variant: "destructive",
        title: isAuth ? "Falha na autenticação" : "Erro ao fazer login",
        description: errorMessage,
      });
      logger.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            SGP - Acessar Sistema
          </CardTitle>
          <CardDescription>
            Faça login com suas credenciais para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                disabled={loading}
                noUppercase
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Desenvolvido por{' '}
              <a
                href="https://finderbit.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                finderbit.com.br
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
