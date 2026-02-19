
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Layers, Check } from 'lucide-react';

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
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
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
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        onCapture(canvasRef.current.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  return (
    <div className="relative w-full aspect-[3/4] bg-black rounded-[40px] overflow-hidden border-4 border-slate-800 shadow-2xl">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Ghost Overlay - O "AR" de precisão */}
      {referenceImage && (
        <img 
          src={referenceImage} 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
          style={{ opacity: opacity, mixBlendMode: 'overlay' }}
          alt="Referência AR"
        />
      )}

      {isVerifying && (
        <div className="absolute inset-0 bg-indigo-900/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-bold tracking-widest uppercase text-xs">Analisando Precisão...</p>
        </div>
      )}

      {/* Controles de AR */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center space-y-4 px-8">
        {referenceImage && (
          <div className="w-full flex items-center space-x-3 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10">
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
          disabled={isVerifying}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-8 border-slate-300 shadow-xl active:scale-90 transition-transform disabled:opacity-50"
        >
          {referenceImage ? <Check className="w-8 h-8 text-slate-900" /> : <Camera className="w-8 h-8 text-slate-900" />}
        </button>
      </div>
    </div>
  );
};

export default ARView;
