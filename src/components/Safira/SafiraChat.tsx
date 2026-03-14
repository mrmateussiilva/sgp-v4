import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { useSafiraStore } from '@/store/safiraStore';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

export function SafiraChat({ expanded = true }: { expanded?: boolean }) {
  const { isOpen, setIsOpen } = useSafiraStore();

  return (
    <div className="w-full">
      {expanded ? (
        <Button 
          variant="ghost" 
          className="w-full justify-start px-3 h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 group font-medium"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center w-full">
            <Sparkles className="h-4 w-4 mr-3 animate-pulse text-blue-500" />
            <span className="text-sm">SAFIRA</span>
            <Badge variant="secondary" className="ml-auto text-[10px] py-0 px-1 bg-blue-100 text-blue-700 border-none">BETA</Badge>
          </div>
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-center px-0 h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 group font-medium"
              onClick={() => setIsOpen(!isOpen)}
            >
              <Sparkles className="h-4 w-4 animate-pulse text-blue-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            SAFIRA Assistente
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
