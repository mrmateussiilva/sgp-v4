import type { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
  title?: string;
}

export function ShortcutsHelp({
  open,
  onOpenChange,
  shortcuts,
  title = 'Atalhos de teclado',
}: ShortcutsHelpProps) {
  const globalShortcuts: KeyboardShortcut[] = [
    { key: 'k', ctrl: true, description: 'Abrir Command Palette', action: () => { } },
    { key: '1', ctrl: true, description: 'Ir para Início', action: () => { } },
    { key: '2', ctrl: true, description: 'Ir para Pedidos', action: () => { } },
    { key: '3', ctrl: true, description: 'Novo Pedido', action: () => { } },
    { key: '4', ctrl: true, description: 'Ir para Clientes', action: () => { } },
    { key: 'b', ctrl: true, description: 'Recolher/Expandir menu', action: () => { } },
    { key: 'r', ctrl: true, description: 'Atualizar sistema', action: () => { } },
  ];

  const pageShortcuts = shortcuts.filter((s) => s.enabled !== false);

  const categories = [
    { name: 'Geral', items: globalShortcuts },
    { name: 'Nesta página', items: pageShortcuts },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          {categories.map((category) => (
            <div key={category.name} className="space-y-2">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider px-1">
                {category.name}
              </h3>
              <div className="space-y-1">
                {category.items.length > 0 ? (
                  category.items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-4 py-1.5 px-1 border-b border-border/50 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description ?? '—'}
                      </span>
                      <kbd className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded border bg-muted px-2 font-mono text-xs font-medium">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic px-1">Nenhum atalho específico.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
