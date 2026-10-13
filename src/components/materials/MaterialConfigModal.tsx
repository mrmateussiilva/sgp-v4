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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings } from 'lucide-react';
import { MaterialConfigMap } from '@/types/materialAnalysis';

interface MaterialConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  materiaisList: any[];
  materialConfigs: MaterialConfigMap;
  onUpdateConfig: (nome: string, measure: 'm2' | 'linear' | 'unidade', width: number) => void;
}

export const MaterialConfigModal: React.FC<MaterialConfigModalProps> = ({
  isOpen,
  onClose,
  materiaisList,
  materialConfigs,
  onUpdateConfig
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 bg-zinc-900 text-white shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" /> Configuração de Medidas dos Materiais
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Defina se um material é contabilizado em Metros Quadrados (m²), Metros Lineares ou Unidades.
            Isso ajustará os valores estimados mostrados nos cards e rankings, enquanto a área total continua sendo medida em m².
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-950">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materiaisList.map((mat) => {
              const cfg = materialConfigs[mat.nome] || { medida: 'm2', larguraRolo: 1.5 };
              return (
                <Card key={mat.id} className="p-4 shadow-sm border-none bg-white dark:bg-zinc-900">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-sm truncate" title={mat.nome}>{mat.nome}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase">{mat.tipo || 'Geral'}</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Unidade de Medida</label>
                      <Select
                        value={cfg.medida}
                        onValueChange={(val: any) => onUpdateConfig(mat.nome, val, cfg.larguraRolo || 1.5)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-zinc-50 border border-zinc-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m2">Metro Quadrado (m²)</SelectItem>
                          <SelectItem value="linear">Metro Linear (Rolo)</SelectItem>
                          <SelectItem value="unidade">Unidade (Peça)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {cfg.medida === 'linear' && (
                      <div className="space-y-1 mt-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Largura do Rolo (m)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.1"
                          className="h-8 text-xs bg-zinc-50 border border-zinc-200"
                          value={cfg.larguraRolo}
                          onChange={(e) => onUpdateConfig(mat.nome, cfg.medida, parseFloat(e.target.value) || 1)}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
            {materiaisList.length === 0 && (
              <div className="col-span-full py-10 text-center text-muted-foreground text-sm font-medium">
                Carregando materiais...
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t flex justify-end bg-white dark:bg-zinc-950 shrink-0">
          <Button onClick={onClose} className="font-bold bg-primary text-primary-foreground hover:bg-primary/90">
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
