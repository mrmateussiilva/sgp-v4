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
  const visibleShortcuts = shortcuts.filter((s) => s.enabled !== false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {visibleShortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 py-1.5 border-b border-border/50 last:border-0"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description ?? '—'}
              </span>
              <kbd className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded border bg-muted px-2 font-mono text-xs font-medium">
                {formatShortcut(shortcut)}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
