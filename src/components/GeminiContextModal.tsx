import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Save, RotateCcw, X, CheckCircle2 } from 'lucide-react';
import { loadGeminiContext, saveGeminiContext, GEMINI_CONTEXT_PLACEHOLDER } from '@/utils/geminiContext';

interface GeminiContextModalProps {
  open: boolean;
  onClose: () => void;
}

export function GeminiContextModal({ open, onClose }: GeminiContextModalProps) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const existing = loadGeminiContext();
      setText(existing || GEMINI_CONTEXT_PLACEHOLDER);
      setSaved(false);
    }
  }, [open]);

  const handleSave = () => {
    saveGeminiContext(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setText(GEMINI_CONTEXT_PLACEHOLDER);
    setSaved(false);
  };

  const charCount = text.trim().length;
  const tokenEstimate = Math.round(charCount / 4); // ~4 chars per token

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0 border-0 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-5 rounded-t-lg flex-shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.2),transparent_60%)] rounded-t-lg pointer-events-none" />
          <DialogHeader className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white font-bold text-base leading-tight">
                    Contexto da IA
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs mt-0.5">
                    Escreva tudo que a IA precisa saber sobre sua empresa
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/70 hover:text-white hover:bg-white/10 h-7 w-7 flex-shrink-0 -mt-0.5"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Info card */}
          <div className="relative z-10 mt-4 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-xs text-slate-300 leading-relaxed">
            Este texto é injetado automaticamente no início de <strong className="text-white">toda análise</strong>.
            Quanto mais específico sobre seu negócio, mais precisa a IA fica.
            Use markdown para organizar (cabeçalhos, listas, etc.).
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-background">
          <Textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setSaved(false); }}
            className="flex-1 resize-none rounded-none border-0 border-b focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm leading-relaxed p-5 min-h-[350px]"
            placeholder={GEMINI_CONTEXT_PLACEHOLDER}
            // @ts-ignore
            noUppercase
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-muted-foreground">
            {charCount} chars · ~{tokenEstimate} tokens por análise
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 text-xs gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar exemplo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className={`h-8 text-xs gap-1.5 transition-all ${
                saved
                  ? 'bg-green-600 hover:bg-green-600 text-white'
                  : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
              }`}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Salvo!
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Salvar contexto
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
