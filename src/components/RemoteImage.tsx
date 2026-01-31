import React, { useState, useEffect } from 'react';
import { loadAuthenticatedImage } from '@/utils/imageLoader';
import { Loader2, ImageOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RemoteImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src: string | undefined | null;
    fallbackClassName?: string;
    showSkeleton?: boolean;
}

export const RemoteImage: React.FC<RemoteImageProps> = ({
    src,
    className = "",
    fallbackClassName = "",
    showSkeleton = true,
    alt = "Imagem",
    ...props
}) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(!!src);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        if (!src) {
            setLoading(false);
            setError(true);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError(false);

        const loadImage = async () => {
            try {
                const url = await loadAuthenticatedImage(src);
                if (isMounted) {
                    setBlobUrl(url);
                    setLoading(false);
                }
            } catch (err) {
                console.error(`[RemoteImage] Erro ao carregar imagem: ${src}`, err);
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        loadImage();

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (loading && showSkeleton) {
        return <Skeleton className={`w-full h-full rounded-md ${className}`} />;
    }

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-slate-100 rounded-md ${className}`}>
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error || !blobUrl) {
        return (
            <div className={`flex items-center justify-center bg-slate-50 border border-slate-100 rounded-md ${className} ${fallbackClassName}`}>
                <ImageOff className="h-5 w-5 text-slate-300" />
            </div>
        );
    }

    return (
        <img
            src={blobUrl}
            alt={alt}
            className={className}
            {...props}
        />
    );
};
