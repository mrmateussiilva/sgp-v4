import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  X,
  Bot,
} from 'lucide-react';
import { OrderWithItems } from '@/types';
import { useGeminiAnalysis } from '@/hooks/useGeminiAnalysis';
import { loadGeminiApiKey, saveGeminiApiKey } from '@/utils/geminiConfig';
import { cn } from '@/lib/utils';
import { formatDateForDisplay } from '@/utils/date';

interface GeminiAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  order: OrderWithItems | null;
}

export function GeminiAnalysisModal({ open, onClose, order }: GeminiAnalysisModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);

  const { loading, result, error, analyze, clear } = useGeminiAnalysis();

  // Carrega a key salva ao abrir
  useEffect(() => {
    if (open) {
      const saved = loadGeminiApiKey();
      if (saved) {
        setApiKey(saved);
        setKeyConfigured(true);
        setInputKey('');
      } else {
        setApiKey('');
        setKeyConfigured(false);
        setInputKey('');
      }
      clear();
    }
  }, [open, clear]);

  // Dispara análise automaticamente quando abre e já tem key
  useEffect(() => {
    if (open && keyConfigured && order && apiKey) {
      analyze(order, apiKey);
    }
  }, [open, keyConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveKey = () => {
    const trimmed = inputKey.trim();
    if (!trimmed) return;
    saveGeminiApiKey(trimmed);
    setApiKey(trimmed);
    setKeyConfigured(true);
    setInputKey('');
    if (order) analyze(order, trimmed);
  };

  const handleReanalyze = () => {
    if (order && apiKey) analyze(order, apiKey);
  };

  const handleClose = () => {
    clear();
    onClose();
  };

  const handleChangeKey = () => {
    setKeyConfigured(false);
    setInputKey('');
    clear();
  };

  if (!order) return null;

  const completionSteps = [
    { label: 'Fin', done: order.financeiro },
    { label: 'Conf', done: order.conferencia },
    { label: 'Imp', done: order.sublimacao },
    { label: 'Cost', done: order.costura },
    { label: 'Exp', done: order.expedicao },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-0 shadow-2xl">
        {/* Header com gradiente */}
        <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 rounded-t-lg flex-shrink-0">
          {/* Efeito de brilho */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)] rounded-t-lg pointer-events-none" />

          <DialogHeader className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white font-bold text-base leading-tight">
                    Análise com IA
                  </DialogTitle>
                  <p className="text-violet-200 text-xs mt-0.5">Powered by Gemini</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white/70 hover:text-white hover:bg-white/10 h-7 w-7 flex-shrink-0 -mt-0.5"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Resumo do pedido */}
          <div className="relative z-10 mt-4 bg-white/10 backdrop-blur-sm border border-white/15 rounded-lg px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-white font-black text-sm tracking-tight">
                  #{order.numero || order.id}
                </span>
                <span className="text-violet-200 text-xs ml-2">
                  {order.cliente || order.customer_name}
                </span>
              </div>
              {order.prioridade === 'ALTA' && (
                <Badge className="bg-red-500/80 text-white border-0 text-[10px] font-bold px-2 py-0 animate-pulse">
                  ALTA PRIORIDADE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap text-[11px]">
              <span className="text-violet-200">
                📅 {formatDateForDisplay(order.data_entrega, 'Sem prazo')}
              </span>
              {order.forma_envio && (
                <span className="text-violet-200">🚚 {order.forma_envio}</span>
              )}
              {order.cidade_cliente && (
                <span className="text-violet-200">
                  📍 {order.cidade_cliente}{order.estado_cliente ? `/${order.estado_cliente}` : ''}
                </span>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {completionSteps.map((step) => (
                <span
                  key={step.label}
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    step.done
                      ? 'bg-green-400/30 text-green-200 border border-green-400/40'
                      : 'bg-white/10 text-white/40 border border-white/10'
                  )}
                >
                  {step.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Corpo do modal */}
        <div className="flex-1 overflow-y-auto bg-background">
          {/* Configuração de API Key (se não configurada) */}
          {!keyConfigured && (
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Chave da API Gemini necessária
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    Insira sua API key do Google Gemini. Ela será salva localmente neste dispositivo
                    e usada apenas para analisar pedidos.{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium hover:text-amber-900 dark:hover:text-amber-200"
                    >
                      Obter chave gratuita →
                    </a>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  API Key do Gemini
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      placeholder="AIza..."
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                      className="pr-10 font-mono text-sm"
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore - prop customizada do projeto
                      noUppercase
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={handleSaveKey}
                    disabled={!inputKey.trim()}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-2 px-4"
                  >
                    <Sparkles className="h-4 w-4" />
                    Analisar
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A chave é salva apenas no seu navegador (localStorage) e nunca enviada para
                  nossos servidores.
                </p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Sparkles className="w-7 h-7 text-white animate-pulse" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 opacity-20 blur-sm animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Analisando pedido...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O Gemini está revisando os detalhes
                </p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Erro */}
          {error && !loading && (
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                    Erro na análise
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReanalyze}
                  className="gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Tentar novamente
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleChangeKey}
                  className="gap-2 text-muted-foreground"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Trocar API Key
                </Button>
              </div>
            </div>
          )}

          {/* Resultado */}
          {result && !loading && (
            <div className="p-5">
              <div className="text-sm leading-relaxed space-y-1
                [&_ul]:space-y-2 [&_li]:flex [&_li]:gap-2
                [&_p]:text-foreground/85 [&_p]:leading-relaxed
                [&_strong]:text-foreground [&_strong]:font-semibold
              ">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {keyConfigured && (
          <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
            <button
              onClick={handleChangeKey}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <KeyRound className="h-3 w-3" />
              Trocar API Key
            </button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="h-8 text-xs"
              >
                Fechar
              </Button>
              <Button
                size="sm"
                onClick={handleReanalyze}
                disabled={loading}
                className="h-8 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-1.5"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Analisar novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
