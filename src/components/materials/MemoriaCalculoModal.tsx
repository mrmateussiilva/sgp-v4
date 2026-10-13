import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calculator, BookOpen, Terminal } from 'lucide-react';
import { MaterialStatsResponse } from '@/api/types';

interface MemoriaCalculoModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataInicio: string;
  dataFim: string;
  stats: MaterialStatsResponse | null;
}

export const MemoriaCalculoModal: React.FC<MemoriaCalculoModalProps> = ({
  isOpen,
  onClose,
  dataInicio,
  dataFim,
  stats
}) => {
  if (!stats) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 bg-zinc-900 text-white">
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" /> Memória de Cálculo & Metodologia
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Detalhamento técnico do processamento de dados.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 font-bold text-sm uppercase text-primary">
                <BookOpen className="w-4 h-4" /> Metodologia
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Fórmula de Área</p>
                  <code className="text-sm font-mono block p-2 bg-white dark:bg-zinc-800 rounded border">
                    Area = (L * A) * Quantidade
                  </code>
                </Card>
                <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Agrupamento</p>
                  <p className="text-xs">
                    Os materiais são normalizados para letras maiúsculas e espaços extras são removidos para evitar duplicidade.
                  </p>
                </Card>
              </div>
            </section>
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 font-bold text-sm uppercase text-primary">
                <Terminal className="w-4 h-4" /> Log de Processamento (Simulado)
              </h3>
              <div className="bg-zinc-900 rounded-lg p-4 font-mono text-[10px] text-zinc-300 leading-relaxed shadow-inner">
                <p className="text-emerald-400">[info] Iniciando análise: {dataInicio} até {dataFim}</p>
                <p>[data] Buscando itens na base de dados...</p>
                <p>[proc] Calculando metragem para {stats.kpis?.total_itens} registros registrados...</p>
                <p className="text-blue-400 ml-2">item_idx_01: 2.00x1.50 (x1) {'\u2192'} 3.00m²</p>
                <p className="text-blue-400 ml-2">item_idx_02: 1.00x1.00 (x5) {'\u2192'} 5.00m²</p>
                <p>[aggreg] Consolidando categorias de materiais...</p>
                <p className="text-emerald-400 font-bold">
                  [done] {stats?.kpis?.total_area_m2?.toFixed(2) || '0.00'}m² totalizados com sucesso.
                </p>
              </div>
            </section>
          </div>
        </ScrollArea>
        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose} variant="secondary" className="font-bold">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
