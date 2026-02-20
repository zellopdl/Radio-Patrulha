
import { Camera, Layers, Check, RefreshCw, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

interface ARViewProps {
  referenceImage?: string;
  onCapture: (base64: string) => void;
  isVerifying: boolean;
  autoMode?: boolean;
}

export interface ARViewHandle {
  captureOptimized: () => string | null;
}

const ARView = forwardRef<ARViewHandle, ARViewProps>(({ referenceImage, onCapture, isVerifying, autoMode }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [opacity, setOpacity] = useState(0.4);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => setIsCameraReady(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const getCapturedFrame = (quality = 0.8, maxWidth = 1280) => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        // Redimensionamento para payload otimizado (evita erro de comunicação)
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', quality);
      }
    }
    return null;
  };

  useImperativeHandle(ref, () => ({
    captureOptimized: () => getCapturedFrame(0.5, 600) // Frame extra leve para Auto-Scan (resolve timeouts)
  }));

  const handleManualCapture = () => {
    const frame = getCapturedFrame(0.8, 1280);
    if (frame) onCapture(frame);
  };

  return (
    <div className="relative w-full flex-1 aspect-[9/12] bg-slate-200 rounded-[40px] overflow-hidden border-4 border-white shadow-xl">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {referenceImage && (
        <img 
          src={referenceImage} 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
          style={{ opacity: opacity, mixBlendMode: 'multiply' }}
          alt="Ref"
        />
      )}

      {/* Indicador Visual de Busca Ativa */}
      {autoMode && !isVerifying && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-100 flex items-center space-x-2 shadow-sm animate-pulse z-30">
          <Zap className="w-3 h-3 text-indigo-600 fill-indigo-600" />
          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Reconhecendo...</span>
        </div>
      )}

      {isVerifying && (
        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center text-slate-900 backdrop-blur-md z-40">
          <RefreshCw className="w-12 h-12 animate-spin mb-4 text-indigo-600" />
          <p className="font-black tracking-widest uppercase text-[10px] animate-pulse">Analisando Frame</p>
        </div>
      )}

      <div className="absolute bottom-8 inset-x-0 flex flex-col items-center space-y-4 px-10 z-10">
        {referenceImage && (
          <div className="w-full flex items-center space-x-3 bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-lg">
            <Layers className="w-4 h-4 text-slate-400" />
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600 h-1"
            />
          </div>
        )}
        
        {/* Botão manual visível apenas se não estiver em autoMode ou como confirmação opcional */}
        {!autoMode && (
          <button 
            onClick={handleManualCapture}
            disabled={!isCameraReady || isVerifying}
            className={`w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center border-[8px] border-white shadow-2xl active:scale-95 transition-transform ${!isCameraReady ? 'opacity-50' : ''}`}
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </div>
  );
});

export default ARView;
