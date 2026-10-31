"use client"

import { createContext, useContext, useEffect, useState } from "react"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: "system" | "light" | "dark"
  storageKey?: string
}

type ThemeProviderState = {
  theme: "system" | "light" | "dark"
  resolvedTheme: "light" | "dark"
  setTheme: (theme: "system" | "light" | "dark") => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<"system" | "light" | "dark">(() => {
    // Garantir que localStorage só seja acessado no lado do cliente
    if (typeof window === 'undefined') {
      return defaultTheme
    }
    return (localStorage.getItem(storageKey) as "system" | "light" | "dark") || defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    // Garantir que window só seja acessado no lado do cliente
    if (typeof window === 'undefined') {
      return
    }

    const root = window.document.documentElement
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const applyTheme = () => {
      root.classList.remove("light", "dark")
      const effectiveTheme =
        theme === "system"
          ? mediaQuery.matches
            ? "dark"
            : "light"
          : theme

      root.classList.add(effectiveTheme)
      root.style.colorScheme = effectiveTheme
      setResolvedTheme(effectiveTheme)
    }

    applyTheme()

    if (theme === "system" && typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", applyTheme)
      return () => mediaQuery.removeEventListener("change", applyTheme)
    }
  }, [theme])

  const value = {
    theme,
    resolvedTheme,
    setTheme: (theme: "system" | "light" | "dark") => {
      // Garantir que localStorage só seja acessado no lado do cliente
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, theme)
      }
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
