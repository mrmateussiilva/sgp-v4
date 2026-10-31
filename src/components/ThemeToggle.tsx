"use client"

import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  showLabel?: boolean
  className?: string
  align?: "start" | "center" | "end"
  variant?: "outline" | "ghost" | "secondary"
}

export function ThemeToggle({
  showLabel = false,
  className,
  align = "end",
  variant = "ghost",
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const currentLabel =
    theme === "dark"
      ? "Modo Escuro"
      : theme === "light"
        ? "Modo Claro"
        : `Sistema (${resolvedTheme === "dark" ? "Escuro" : "Claro"})`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={showLabel ? "sm" : "icon"}
          className={cn(
            "relative transition-colors",
            showLabel ? "justify-start gap-2 px-3" : "h-9 w-9",
            className
          )}
          aria-label="Alternar tema de cores"
          title={`Tema atual: ${currentLabel}`}
        >
          <div className="relative flex items-center justify-center h-4 w-4 shrink-0">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
          </div>
          {showLabel && (
            <span className="text-xs font-medium truncate">{currentLabel}</span>
          )}
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-40">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center justify-between cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Claro</span>
          </span>
          {theme === "light" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center justify-between cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-blue-400" />
            <span>Escuro</span>
          </span>
          {theme === "dark" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center justify-between cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span>Sistema</span>
          </span>
          {theme === "system" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
