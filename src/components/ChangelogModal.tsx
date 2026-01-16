import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChangelogModalProps {
  version: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ version, isOpen, onClose }: ChangelogModalProps) {
  const [changelog, setChangelog] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && version) {
      loadChangelog();
    }
  }, [isOpen, version]);

  const loadChangelog = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const content = await invoke<string>('fetch_changelog', { version });
      
      // Extrair apenas a seção da versão atual
      const versionSection = extractVersionSection(content, version);
      setChangelog(versionSection || content);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar changelog';
      console.error('[ChangelogModal] Erro:', err);
      setError(errorMsg);
      setChangelog('Não foi possível carregar o changelog desta versão.');
    } finally {
      setIsLoading(false);
    }
  };

  // Extrai a seção do changelog para a versão específica
  const extractVersionSection = (content: string, targetVersion: string): string | null => {
    // Remove o prefixo "v" se existir para comparação
    const normalizedVersion = targetVersion.replace(/^v/, '');
    
    // Procura pela seção da versão no formato [X.Y.Z] ou ## [X.Y.Z]
    const versionPattern = new RegExp(
      `##?\\s*\\[?${normalizedVersion.replace(/\./g, '\\.')}\\]?[^#]*`,
      'i'
    );
    
    const match = content.match(versionPattern);
    if (match) {
      // Pega até a próxima versão ou fim do arquivo
      const startIndex = content.indexOf(match[0]);
      const nextVersionMatch = content.slice(startIndex + match[0].length).match(/##?\s*\[?\d+\.\d+\.\d+\]?/);
      
      if (nextVersionMatch) {
        return content.slice(startIndex, startIndex + match[0].length + nextVersionMatch.index);
      }
      
      return content.slice(startIndex);
    }
    
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]" size="xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center justify-between">
            <span>📋 Changelog - Versão {version}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Confira todas as mudanças e melhorias desta versão
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Carregando changelog...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{changelog}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Entendi, obrigado!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
