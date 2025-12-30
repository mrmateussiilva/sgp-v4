import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DashboardMenuItemProps {
  icon: LucideIcon;
  label: string;
  path: string;
  active: boolean;
  expanded: boolean;
  onClick?: () => void;
  showTooltip?: boolean;
  needsSeparator?: boolean;
  separatorLabel?: string;
}

export function DashboardMenuItem({
  icon: Icon,
  label,
  path,
  active,
  expanded,
  onClick,
  showTooltip = false,
  needsSeparator = false,
  separatorLabel,
}: DashboardMenuItemProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(path);
    onClick?.();
  };

  const button = (
    <Button
      variant={active ? "secondary" : "ghost"}
      className={cn(
        "w-full transition-all",
        expanded ? "justify-start" : "justify-center px-0",
        active && "bg-primary/10 text-primary hover:bg-primary/20"
      )}
      onClick={handleClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={cn("h-4 w-4", expanded && "mr-2")} aria-hidden="true" />
      {expanded && <span>{label}</span>}
    </Button>
  );

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
      {showTooltip && !expanded ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right">
            {label}
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </div>
  );
}

