
import React, { useRef, useState, useCallback } from 'react';
import { Camera, RefreshCcw, CheckCircle } from 'lucide-react';

interface CameraViewProps {
  onCapture: (base64: string) => void;
  isLoading: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, isLoading }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  }, []);

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const data = canvasRef.current.toDataURL('image/jpeg');
        onCapture(data);
      }
    }
  }, [onCapture]);

  React.useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {isLoading ? (
        <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white p-6 text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xl font-semibold">Analisando objeto com IA...</p>
          <p className="text-slate-400 mt-2">Aguarde um momento.</p>
        </div>
      ) : (
        <div className="absolute bottom-8 inset-x-0 flex justify-center">
          <button 
            onClick={capture}
            className="w-20 h-20 bg-white rounded-full border-8 border-slate-400/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          >
            <Camera className="w-8 h-8 text-slate-900" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraView;
