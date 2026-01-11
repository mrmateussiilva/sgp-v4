import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  children: React.ReactNode
  trigger: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Collapsible({ 
  children, 
  trigger, 
  defaultOpen = false,
  className 
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn("border border-slate-200 rounded-md bg-white shadow-sm overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1">{trigger}</div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-slate-500 transition-transform flex-shrink-0 ml-2",
            isOpen && "transform rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="border-t border-slate-200">
          {children}
        </div>
      )}
    </div>
  )
}