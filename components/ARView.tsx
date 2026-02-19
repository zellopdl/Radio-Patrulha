
import { Camera, Layers, Check, RefreshCw } from 'lucide-react';
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
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        console.error("Erro câmera:", err);
      }
    };
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Ajustamos o canvas para as dimensões REAIS do vídeo para evitar distorção
        // Se o vídeo estiver em pé (retrato), videoWidth/Height refletirão isso
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Comprimimos para JPEG para manter o payload leve, sem alterar a proporção
        onCapture(canvas.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  return (
    <div className="relative w-full aspect-[9/12] bg-black rounded-[40px] overflow-hidden border-4 border-slate-800 shadow-2xl">
      {/* O video usa object-cover para preencher o container, mas o sensor mantém sua proporção */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover" 
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Ghost Overlay - Ajustado para cobrir exatamente como o vídeo */}
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
          <RefreshCw className="w-12 h-12 animate-spin mb-6 text-indigo-300" />
          <p className="font-black tracking-[0.2em] uppercase text-sm animate-pulse">Analisando Imagem...</p>
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
            disabled={!isCameraReady}
            className={`w-20 h-20 bg-white rounded-full flex items-center justify-center border-[8px] border-slate-300/50 shadow-2xl active:scale-90 transition-transform ${!isCameraReady ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {referenceImage ? <Check className="w-10 h-10 text-slate-900" /> : <Camera className="w-10 h-10 text-slate-900" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default ARView;
