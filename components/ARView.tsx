
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
            width: { ideal: 1920 },
            height: { ideal: 1080 }
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
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        onCapture(canvas.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  return (
    <div className="relative w-full flex-1 aspect-[9/12] bg-slate-200 rounded-[40px] overflow-hidden border-4 border-white shadow-xl">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover" 
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Sobreposição de Referência (Ghost Mode) */}
      {referenceImage && (
        <img 
          src={referenceImage} 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
          style={{ opacity: opacity, mixBlendMode: 'multiply' }}
          alt="Referência Visual"
        />
      )}

      {isVerifying && (
        <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-slate-900 backdrop-blur-md z-20">
          <RefreshCw className="w-14 h-14 animate-spin mb-6 text-indigo-600" />
          <p className="font-black tracking-[0.2em] uppercase text-xs animate-pulse">Comparando Imagens...</p>
        </div>
      )}

      {/* Controles de Captura e Opacidade */}
      {!isVerifying && (
        <div className="absolute bottom-8 inset-x-0 flex flex-col items-center space-y-5 px-10 z-10">
          {referenceImage && (
            <div className="w-full flex items-center space-x-3 bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-lg">
              <Layers className="w-4 h-4 text-slate-400" />
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={opacity} 
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-600 h-1"
              />
            </div>
          )}
          
          <button 
            onClick={handleCapture}
            disabled={!isCameraReady}
            className={`w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center border-[10px] border-white shadow-2xl active:scale-90 transition-transform ${!isCameraReady ? 'opacity-50' : ''}`}
          >
            {referenceImage ? <Check className="w-10 h-10 text-white" /> : <Camera className="w-10 h-10 text-white" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default ARView;
