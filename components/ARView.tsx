
import { Camera, Layers, Check } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ARViewProps {
  referenceImage?: string;
  onCapture: (base64: string) => void;
  isVerifying: boolean;
}

const ARView: React.FC<ARViewProps> = ({ referenceImage, onCapture, isVerifying }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [opacity, setOpacity] = useState(0.5);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', 
            // Reduzindo a resolução para otimizar o envio à IA e evitar erro de conexão
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
          } 
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Erro câmera:", err);
      }
    };
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // Capturando em tamanho otimizado para a API
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        // Qualidade 0.7 reduz significativamente o tamanho do payload base64
        onCapture(canvasRef.current.toDataURL('image/jpeg', 0.7));
      }
    }
  };

  return (
    <div className="relative w-full aspect-[3/4] bg-black rounded-[40px] overflow-hidden border-4 border-slate-800 shadow-2xl">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Ghost Overlay - Referência Visual */}
      {referenceImage && (
        <img 
          src={referenceImage} 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
          style={{ opacity: opacity, mixBlendMode: 'screen' }}
          alt="Referência AR"
        />
      )}

      {isVerifying && (
        <div className="absolute inset-0 bg-indigo-900/80 flex flex-col items-center justify-center text-white backdrop-blur-md z-20">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-6" />
          <p className="font-black tracking-[0.2em] uppercase text-sm animate-pulse">Validando Local...</p>
        </div>
      )}

      {/* Controles de AR */}
      {!isVerifying && (
        <div className="absolute bottom-6 inset-x-0 flex flex-col items-center space-y-4 px-8 z-10">
          {referenceImage && (
            <div className="w-full flex items-center space-x-3 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <Layers className="w-4 h-4 text-white/60" />
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={opacity} 
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
            </div>
          )}
          
          <button 
            onClick={handleCapture}
            className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-[10px] border-slate-300 shadow-2xl active:scale-90 transition-transform"
          >
            {referenceImage ? <Check className="w-10 h-10 text-slate-900" /> : <Camera className="w-10 h-10 text-slate-900" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default ARView;
