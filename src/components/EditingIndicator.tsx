import { AlertCircle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditingTracker } from '@/hooks/useEditingTracker';

interface EditingIndicatorProps {
  orderId: number;
  className?: string;
}

export function EditingIndicator({ orderId, className = '' }: EditingIndicatorProps) {
  const { getEditingUser, isBeingEdited } = useEditingTracker();
  const editingUser = getEditingUser(orderId);

  if (!isBeingEdited(orderId) || !editingUser) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`flex items-center gap-1.5 border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400 ${className}`}
          >
            <AlertCircle className="h-3 w-3 animate-pulse" />
            <User className="h-3 w-3" />
            <span className="text-xs">Editando</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{editingUser.username}</p>
            <p className="text-xs text-muted-foreground">está editando este pedido</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

