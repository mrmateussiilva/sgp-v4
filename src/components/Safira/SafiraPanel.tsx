import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Bot, User, Send } from 'lucide-react';
import { useSafiraStore, Message } from '@/store/safiraStore';
import { safiraApi } from '@/api/endpoints/safira';
import { cn } from '@/lib/utils';

export function SafiraPanel() {
  const { isOpen, setIsOpen, messages, addMessage } = useSafiraStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('Pensando...');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mensagens de "pensando" para rotacionar
  const thinkingMessages = [
    "Analisando dados do sistema...",
    "Consultando informações...",
    "Processando sua solicitação...",
    "Verificando relatórios..."
  ];

  // Adiciona mensagem inicial se o histórico estiver vazio
  useEffect(() => {
    if (messages.length === 0) {
      addMessage({ 
        role: 'assistant', 
        content: 'Olá, eu sou a SAFIRA.\n\nPosso responder perguntas sobre pedidos, materiais, vendedores e produção.' 
      });
    }
  }, [messages.length, addMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    addMessage(userMsg);
    setInput('');
    setIsLoading(true);
    
    // Escolhe uma mensagem de pensamento aleatória
    setThinkingMessage(thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)]);

    try {
      // Delay intencional para UX (700-1200ms)
      const delay = Math.floor(Math.random() * (1200 - 700 + 1)) + 700;
      await new Promise(resolve => setTimeout(resolve, delay));

      const response = await safiraApi.ask(text);
      addMessage({ role: 'assistant', content: response.answer });
    } catch (error) {
      addMessage({ 
        role: 'assistant', 
        content: 'Desculpe, tive um erro ao processar sua pergunta. Pode tentar novamente?',
        isError: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Pedidos feitos hoje",
    "Pedidos em produção",
    "Pedidos atrasados",
    "Tipo de pedido mais feito"
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex flex-col bg-white border-l shadow-2xl transition-transform duration-250 ease-in-out",
        "w-[35vw] min-w-[320px] max-w-[600px]",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-blue-200 shadow-lg">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">SAFIRA</h2>
            <p className="text-[11px] text-slate-500 font-medium">Assistente FinderBit</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsOpen(false)}
          className="rounded-full hover:bg-slate-200/50 h-8 w-8"
        >
          <X className="h-4 w-4 text-slate-500" />
        </Button>
      </div>

      {/* Messages View */}
      <ScrollArea className="flex-1 p-4 bg-slate-50/30" ref={scrollRef}>
        <div className="space-y-6 pb-4">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={cn(
                "flex flex-col gap-2",
                msg.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div className={cn(
                "flex gap-3 max-w-[90%]",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "p-2 rounded-lg shrink-0 h-8 w-8 flex items-center justify-center",
                  msg.role === 'user' ? "bg-slate-100 text-slate-600" : "bg-blue-600 text-white"
                )}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-blue-600 text-white rounded-tr-none" 
                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-none",
                  msg.isError && "bg-red-50 border-red-100 text-red-800"
                )}>
                  {msg.content.split('\n').map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white shrink-0 h-8 w-8 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                </div>
                <span className="text-[13px] text-slate-500 font-medium ml-1">{thinkingMessage}</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input & Suggestions */}
      <div className="p-4 bg-white border-t space-y-4">
        {/* Chips de Sugestão */}
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              className="text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-100 transition-all text-left"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative">
          <Input 
            placeholder="Pergunte algo para a SAFIRA..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            className="pr-12 py-6 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <Button
            size="icon"
            onClick={() => handleSend(input)}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 h-8 w-8 bg-blue-600 hover:bg-blue-700 shadow-md"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-center text-slate-400">
          Assistente SAFIRA. Verifique informações críticas.
        </p>
      </div>
    </aside>
  );
}
