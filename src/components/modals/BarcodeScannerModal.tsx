import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, ScanLine, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startCamera = async () => {
    setErrorMsg(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não suportada neste dispositivo/navegador.');
      }

      // Priorizar câmera traseira em celulares
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setupDetector();
      }
    } catch (err: any) {
      let message = 'Não foi possível acessar a câmera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Permissão de acesso à câmera negada. Permita o uso da câmera nas configurações do navegador.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'Nenhuma câmera detectada neste dispositivo.';
      }
      setErrorMsg(message);
      setIsScanning(false);
    }
  };

  const setupDetector = async () => {
    // Verificar se BarcodeDetector nativo está disponível
    const hasBarcodeDetector = 'BarcodeDetector' in window;

    if (!hasBarcodeDetector) {
      // Navegadores sem suporte a BarcodeDetector nativo informam o usuário
      return;
    }

    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'ean_8', 'itf'],
      });

      const scanLoop = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animationFrameRef.current = requestAnimationFrame(scanLoop);
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue && rawValue.trim()) {
              // Vibração de confirmação de leitura
              if ('vibrate' in navigator) {
                try {
                  navigator.vibrate([100]);
                } catch {}
              }
              onScanSuccess(rawValue.trim());
              onClose();
              return;
            }
          }
        } catch {
          // Erro de frame individual ignorado
        }

        animationFrameRef.current = requestAnimationFrame(scanLoop);
      };

      animationFrameRef.current = requestAnimationFrame(scanLoop);
    } catch {
      // detector init fallback
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[92vw] p-4 bg-background/95 backdrop-blur-md rounded-2xl border shadow-2xl overflow-hidden">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Escanear Código do Pedido
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Aponte a câmera para o código de barras ou QR Code da ficha impressa
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full max-h-[55vh] rounded-xl overflow-hidden bg-black flex items-center justify-center my-2">
          {errorMsg ? (
            <div className="p-4 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
              <p className="text-xs text-rose-200 leading-relaxed max-w-xs">{errorMsg}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="text-xs font-semibold"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Guia visual de mira */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
                <div className="relative w-full aspect-video max-w-[280px] border-2 border-primary/80 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center">
                  <div className="absolute w-full h-0.5 bg-rose-500/90 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
                  <span className="absolute -top-7 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ScanLine className="h-3 w-3" /> Posicione o código aqui
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            {isScanning ? 'Procurando código...' : 'Câmera pausada'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold h-8 px-3"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
