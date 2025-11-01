import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = "qr-reader";

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          console.log('QR Code detected:', decodedText);
          onScanSuccess(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Ignore scan errors (happens continuously while scanning)
        }
      );

      setIsScanning(true);
      toast.success('Scanner ativado! Aponte para o QR Code');
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      
      if (err.name === 'NotAllowedError') {
        toast.error('Permissão de câmera negada. Ative nas configurações do navegador.');
      } else if (err.name === 'NotFoundError') {
        toast.error('Nenhuma câmera encontrada no dispositivo');
      } else {
        toast.error('Erro ao iniciar scanner: ' + err.message);
      }
      
      onClose();
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="fixed inset-0 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Escaneie o QR Code</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                stopScanner();
                onClose();
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div 
            id={qrCodeRegionId}
            className="rounded-lg overflow-hidden border-2 border-primary shadow-lg"
          />

          <p className="text-center text-sm text-muted-foreground">
            Posicione o QR Code dentro da área de leitura
          </p>
        </div>
      </div>
    </div>
  );
};
