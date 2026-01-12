import { useState, useEffect, useRef } from 'react';
import { loadAuthenticatedImage } from '@/utils/imageLoader';
import { isValidImagePath } from '@/utils/path';

interface UseLazyImageOptions {
  /**
   * Se true, a imagem será carregada imediatamente (sem lazy loading)
   * Útil para imagens críticas que precisam estar visíveis imediatamente
   */
  eager?: boolean;
  /**
   * Threshold para o Intersection Observer (0.0 a 1.0)
   * Quanto menor, mais cedo a imagem começa a carregar
   * Padrão: 0.01 (carrega quando 1% da imagem está visível)
   */
  threshold?: number;
  /**
   * Margem adicional para o Intersection Observer
   * Permite começar a carregar a imagem antes dela entrar na viewport
   * Ex: '50px' faz com que a imagem comece a carregar 50px antes de aparecer
   */
  rootMargin?: string;
}

interface UseLazyImageReturn {
  /** URL da imagem carregada (blob URL ou base64) */
  imageSrc: string | null;
  /** Se a imagem está sendo carregada */
  isLoading: boolean;
  /** Se houve erro ao carregar a imagem */
  error: boolean;
  /** Referência para o elemento que deve ser observado */
  imgRef: React.RefObject<HTMLImageElement | HTMLDivElement>;
}

/**
 * Hook para lazy loading de imagens usando Intersection Observer
 * 
 * A imagem só será carregada quando o elemento estiver visível (ou próximo de estar)
 * na viewport, melhorando significativamente a performance inicial.
 * 
 * @param imagePath - Caminho/URL da imagem a ser carregada
 * @param options - Opções de configuração do lazy loading
 * @returns Estado da imagem e referência para o elemento
 * 
 * @example
 * ```tsx
 * const { imageSrc, isLoading, error, imgRef } = useLazyImage(item.imagem);
 * 
 * return (
 *   <div ref={imgRef}>
 *     {imageSrc ? (
 *       <img src={imageSrc} alt="Imagem" />
 *     ) : isLoading ? (
 *       <div>Carregando...</div>
 *     ) : error ? (
 *       <div>Erro ao carregar imagem</div>
 *     ) : null}
 *   </div>
 * );
 * ```
 */
export function useLazyImage(
  imagePath: string | null | undefined,
  options: UseLazyImageOptions = {}
): UseLazyImageReturn {
  const {
    eager = false,
    threshold = 0.01,
    rootMargin = '50px',
  } = options;

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement | HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    // Se não há caminho de imagem, resetar estado
    if (!imagePath) {
      setImageSrc(null);
      setIsLoading(false);
      setError(false);
      return;
    }

    // Se for base64, usar diretamente sem lazy loading
    if (imagePath.startsWith('data:image/')) {
      setImageSrc(imagePath);
      setIsLoading(false);
      setError(false);
      return;
    }

    // Verificar se é um caminho válido
    if (!isValidImagePath(imagePath)) {
      setError(true);
      setIsLoading(false);
      return;
    }

    // Função para carregar a imagem
    const loadImage = async () => {
      if (loadingRef.current) return; // Evitar carregamentos duplicados
      
      loadingRef.current = true;
      setIsLoading(true);
      setError(false);

      try {
        const blobUrl = await loadAuthenticatedImage(imagePath);
        setImageSrc(blobUrl);
        setError(false);
      } catch (err) {
        console.error('[useLazyImage] Erro ao carregar imagem:', err);
        setError(true);
        setImageSrc(null);
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    };

    // Se eager for true, carregar imediatamente
    if (eager) {
      loadImage();
      return;
    }

    // Configurar Intersection Observer para lazy loading
    const element = imgRef.current;
    if (!element) {
      // Se não há elemento ainda, carregar imediatamente (fallback)
      loadImage();
      return;
    }

    // Criar observer se não existir
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !loadingRef.current && !imageSrc) {
              loadImage();
              // Desconectar após começar a carregar
              if (observerRef.current && element) {
                observerRef.current.unobserve(element);
              }
            }
          });
        },
        {
          threshold,
          rootMargin,
        }
      );
    }

    // Observar o elemento
    if (observerRef.current && element) {
      observerRef.current.observe(element);
    }

    // Cleanup
    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
      }
      // Resetar estado de loading para permitir recarregamento se necessário
      loadingRef.current = false;
    };
  }, [imagePath, eager, threshold, rootMargin, imageSrc]);

  return {
    imageSrc,
    isLoading,
    error,
    imgRef,
  };
}
