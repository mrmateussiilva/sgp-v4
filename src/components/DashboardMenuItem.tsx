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
        <div className="py-2" role="separator">
          <Separator />
          {expanded && separatorLabel && (
            <p className="text-xs text-muted-foreground px-3 mt-2" role="heading" aria-level={2}>
              {separatorLabel}
            </p>
          )}
        </div>
      )}
      <Button
        type="button"
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "w-full transition-all relative",
          expanded ? "justify-start" : "justify-center px-0",
          active && "bg-primary/10 text-primary hover:bg-primary/20"
        )}
        onClick={handleClick}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        title={!expanded ? label : undefined}
      >
        <div className="relative">
          <Icon className={cn("h-4 w-4", expanded && "mr-2")} aria-hidden="true" />
          {showBadge && (
            <span className={cn(
              "absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-600 border border-white",
              expanded ? "-top-1 -right-1" : "-top-1 -right-3"
            )} />
          )}
        </div>
        {expanded && <span>{label}</span>}
      </Button>
    </div>
  );
}

