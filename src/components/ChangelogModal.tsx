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
import { Loader2, Sparkles } from 'lucide-react';
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
    // Normalizar versão alvo (remove v inicial se existir)
    const normalizedTarget = targetVersion.replace(/^v/, '');

    // Procura por um título que contenha a versão
    // Aceita: ## 1.0.0, ## [1.0.0], ## v1.0.0, # 1.0.0, etc.
    const escapedVersion = normalizedTarget.replace(/\./g, '\\.');
    const versionRegex = new RegExp(`##?\\s*(\\[?v?${escapedVersion}\\]?)`, 'i');

    const match = content.match(versionRegex);
    if (!match) {
      console.warn(`[ChangelogModal] Versão ${targetVersion} não encontrada no conteúdo.`);
      return null;
    }

    const startIndex = match.index!;
    const remainingContent = content.slice(startIndex + match[0].length);

    // Procura o início da próxima versão (qualquer outra versão ## [X.Y.Z])
    // Note: Usamos apenas ## para evitar que # Changelog apareça aqui
    const nextVersionRegex = /##\s*(\[?v?\d+\.\d+\.\d+\]?)/;
    const nextMatch = remainingContent.match(nextVersionRegex);

    if (nextMatch) {
      return content.slice(startIndex, startIndex + match[0].length + nextMatch.index!);
    }

    return content.slice(startIndex);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" size="xl">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">
                Changelog - Versão {version}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Confira todas as mudanças e melhorias desta versão
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <span className="text-gray-600 dark:text-gray-400">Carregando changelog...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 font-medium">Erro ao carregar changelog</p>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-ul:my-2 prose-li:my-1 prose-strong:text-gray-900 dark:prose-strong:text-gray-100">
              <ReactMarkdown>{changelog}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t">
          <Button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
            size="lg"
          >
            Entendi, obrigado!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
