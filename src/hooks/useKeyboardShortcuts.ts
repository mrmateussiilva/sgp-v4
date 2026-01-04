import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd no Mac
  action: () => void;
  description?: string;
  enabled?: boolean;
}

/**
 * Hook para gerenciar atalhos de teclado
 * 
 * @param shortcuts Array de atalhos de teclado
 * @param enabled Se false, os atalhos não são registrados
 * @param preventDefault Se true, previne o comportamento padrão do navegador
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true,
  preventDefault: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignorar se estiver digitando em inputs, textareas, etc
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Permitir Esc sempre, e alguns atalhos mesmo em inputs (Ctrl+S, Ctrl+F, etc)
      const allowedInInput = ['Escape', 'Escape', 'Escape'].includes(event.key);
      const ctrlBased = event.ctrlKey || event.metaKey;
      const allowCtrlBased = ['s', 'f', 'n', 'k', '/'].includes(event.key.toLowerCase());

      if (isInput && !allowedInInput && !(ctrlBased && allowCtrlBased)) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl === undefined || shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const shiftMatches = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const altMatches = shortcut.alt === undefined || shortcut.alt === event.altKey;
        const metaMatches = shortcut.meta === undefined || shortcut.meta === event.metaKey;

        // Para Ctrl, também aceitar Meta (Cmd no Mac)
        const ctrlOrMetaMatches =
          shortcut.ctrl !== undefined
            ? shortcut.ctrl === (event.ctrlKey || event.metaKey)
            : true;

        if (
          keyMatches &&
          ctrlOrMetaMatches &&
          shiftMatches &&
          altMatches &&
          (shortcut.meta === undefined || metaMatches)
        ) {
          if (preventDefault) {
            event.preventDefault();
            event.stopPropagation();
          }
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts, enabled, preventDefault]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Formata um atalho para exibição
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl || shortcut.meta) parts.push(shortcut.meta ? '⌘' : 'Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  
  // Formatar a tecla principal
  const keyDisplay = shortcut.key.length === 1 
    ? shortcut.key.toUpperCase() 
    : formatSpecialKey(shortcut.key);
  parts.push(keyDisplay);
  
  return parts.join(' + ');
}

function formatSpecialKey(key: string): string {
  const mapping: Record<string, string> = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': 'Enter',
    'Escape': 'Esc',
    'Space': 'Space',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Tab': 'Tab',
    '/': '/',
  };
  return mapping[key] || key;
}

