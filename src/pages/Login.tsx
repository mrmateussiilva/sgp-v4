import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorMessage } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const usernameRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { toast } = useToast();

  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorStatus(null);

    try {
      const response = await api.login({ username, password });

      if (response.success && response.user_id && response.username && response.session_token) {
        const isAdmin = response.is_admin || false;
        login({
          userId: response.user_id,
          username: response.username,
          sessionToken: response.session_token,
          isAdmin,
          setor: response.setor || 'geral',
        });
        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao ecossistema SGP.",
        });
        navigate('/dashboard');
      } else {
        setErrorStatus(response.message || 'Usuário ou senha incorretos.');
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setErrorStatus(errorMessage);
      logger.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4">
      <Card className="w-full max-w-[440px] shadow-2xl border-slate-200/50 bg-white/90 backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="space-y-4 text-center pb-8 pt-10">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 transform transition-all hover:scale-110 hover:rotate-3 duration-300 shadow-inner">
            <Lock className="w-8 h-8 text-primary drop-shadow-sm" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
              SGP • FinderBit
            </CardTitle>
            <CardDescription className="text-slate-500 font-bold text-sm">
                Entre com suas credenciais para acessar o sistema.
            </CardDescription>
          </div>

          {/* SaaS Benefits Section */}
          <div className="flex flex-col items-center gap-2 pt-2 pb-1">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                {[
                    'Controle total da produção',
                    'Gestão em tempo real',
                    'Insights com SAFIRA'
                ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tight">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {benefit}
                    </div>
                ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário</Label>
              <Input
                id="username"
                ref={usernameRef}
                type="text"
                placeholder="Ex: mateus.silva"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorStatus(null);
                }}
                required
                className={cn(
                  "h-12 bg-slate-50/50 transition-all duration-300 border-slate-200 focus:bg-white focus:ring-primary/10",
                  errorStatus && "border-red-400 focus:border-red-500 focus:ring-red-100"
                )}
                autoComplete="username"
                disabled={loading}
                noUppercase
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</Label>
              </div>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha secreta"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorStatus(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                  required
                  className={cn(
                    "h-12 pr-12 bg-slate-50/50 transition-all duration-300 border-slate-200 focus:bg-white focus:ring-primary/10",
                    errorStatus && "border-red-400 focus:border-red-500 focus:ring-red-100"
                  )}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors duration-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {errorStatus && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[13px] font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorStatus}</span>
              </div>
            )}

            <div className="space-y-4">
                <Button 
                    type="submit" 
                    className="w-full h-12 font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.97]" 
                    disabled={loading}
                >
                {loading ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                    </>
                ) : 'Acessar Sistema'}
                </Button>
                
                <div className="text-center">
                    <button type="button" className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">
                        Esqueceu sua senha?
                    </button>
                </div>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                    © FinderBit • SGP v1.3.5
                </p>
                <div className="h-1 w-1 rounded-full bg-slate-200" />
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-100">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black text-green-600 uppercase tracking-tight">Sistema operacional</span>
                </div>
              </div>
              <a
                href="https://finderbit.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest opacity-50 hover:opacity-100"
              >
                atendimento suporte
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
