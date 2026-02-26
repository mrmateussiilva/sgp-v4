import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DashboardMenuItemProps {
  icon: LucideIcon;
  label: string;
  path: string;
  active: boolean;
  expanded: boolean;
  onClick?: () => void;
  needsSeparator?: boolean;
  separatorLabel?: string;
  showBadge?: boolean;
  isFirst?: boolean;
  shortcutLabel?: string;
}

export function DashboardMenuItem({
  icon: Icon,
  label,
  path,
  active,
  expanded,
  onClick,
  needsSeparator = false,
  separatorLabel,
  showBadge = false,
  isFirst = false,
  shortcutLabel,
}: DashboardMenuItemProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(path);
    if (onClick) {
      onClick();
    }
  };

  return (
    <div>
      {needsSeparator && (
        <div className={cn("py-2", !isFirst && "mt-4")} role="separator">
          {expanded && separatorLabel && (
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-3 mb-2" role="heading" aria-level={2}>
              {separatorLabel}
            </p>
          )}
          {!isFirst && <Separator className="opacity-50" />}
        </div>
      )}
      <Button
        type="button"
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "h-9 w-full transition-all relative px-3 group",
          expanded ? "justify-start" : "justify-center px-0",
          active ? "bg-primary/5 text-primary font-bold hover:bg-primary/10" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={handleClick}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        title={!expanded ? label : undefined}
      >
        <div className="flex items-center w-full">
          <Icon className={cn("h-4 w-4 shrink-0", expanded && "mr-3")} aria-hidden="true" />
          {expanded && <span className="text-sm truncate flex-1 text-left">{label}</span>}
          {expanded && shortcutLabel && (
            <kbd className="hidden group-hover:inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
              {shortcutLabel}
            </kbd>
          )}
          {showBadge && (
            <span className={cn(
              "absolute h-2 w-2 rounded-full bg-blue-500 border-2 border-background",
              expanded ? "-top-1 -right-1" : "top-0 right-0"
            )} title="Atualização disponível" />
          )}
        </div>
      </Button>
    </div>
  );
}

