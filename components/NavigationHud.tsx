
import React, { useMemo } from 'react';
import { NavigationState, Coordinates } from '../types';
import { ArrowUp, ArrowLeft, ArrowRight, ArrowDown, MapPin, Crosshair, Target } from 'lucide-react';

interface NavigationHudProps {
  navState: NavigationState;
  targetName: string;
  currentCoords: Coordinates | null;
  targetCoords: { latitude: number; longitude: number };
}

const NavigationHud: React.FC<NavigationHudProps> = ({ navState, targetName, currentCoords, targetCoords }) => {
  const distanceColor = useMemo(() => {
    if (navState.distance < 10) return 'text-green-400';
    if (navState.distance < 30) return 'text-emerald-400';
    if (navState.distance < 100) return 'text-yellow-400';
    return 'text-orange-400';
  }, [navState.distance]);

  const getIcon = () => {
    const iconClass = "w-24 h-24 transition-all duration-300 transform";
    switch (navState.instruction) {
      case 'STRAIGHT': return <ArrowUp className={`${iconClass} text-green-400 animate-pulse`} />;
      case 'LEFT': return <ArrowLeft className={`${iconClass} text-blue-400`} />;
      case 'RIGHT': return <ArrowRight className={`${iconClass} text-blue-400`} />;
      case 'BACK': return <ArrowDown className={`${iconClass} text-red-500`} />;
      case 'ARRIVED': return <Target className={`${iconClass} text-yellow-400 animate-bounce`} />;
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl text-center relative overflow-hidden">
        {/* Background decorative pulse */}
        <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
        
        <div className="relative z-10">
          <h2 className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mb-4">
            Missão: Encontrar {targetName}
          </h2>
          
          <div className={`text-7xl font-black mb-6 flex items-baseline justify-center ${distanceColor}`}>
            {navState.distance.toFixed(1)}
            <span className="text-2xl text-slate-600 ml-2 font-bold">m</span>
          </div>
          
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
              <div className="relative p-10 bg-slate-950 rounded-full border-4 border-slate-800 shadow-inner">
                {getIcon()}
              </div>
            </div>
          </div>

          <p className="text-slate-300 font-bold text-sm tracking-wide mb-8">
            {navState.instruction === 'ARRIVED' 
              ? 'VOCÊ CHEGOU AO PONTO!' 
              : `SIGA ${navState.instruction === 'STRAIGHT' ? 'EM FRENTE' : navState.instruction === 'BACK' ? 'PARA TRÁS' : navState.instruction === 'LEFT' ? 'À ESQUERDA' : 'À DIREITA'}`}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/80 p-4 rounded-3xl border border-slate-800 backdrop-blur-sm">
              <p className="text-[9px] text-slate-600 font-black uppercase mb-1">Coordenada Atual</p>
              <p className="text-white text-xs mono">{currentCoords?.latitude.toFixed(6)}</p>
              <p className="text-white text-xs mono">{currentCoords?.longitude.toFixed(6)}</p>
            </div>
            <div className="bg-slate-950/80 p-4 rounded-3xl border border-slate-800 backdrop-blur-sm">
              <p className="text-[9px] text-slate-600 font-black uppercase mb-1">Coordenada Alvo</p>
              <p className="text-indigo-400 text-xs mono">{targetCoords.latitude.toFixed(6)}</p>
              <p className="text-indigo-400 text-xs mono">{targetCoords.longitude.toFixed(6)}</p>
            </div>
          </div>
        </div>
      </div>

      {currentCoords?.accuracy && (
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 rounded-3xl border border-slate-800 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${currentCoords.accuracy < 10 ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Sinal GPS</span>
          </div>
          <span className="text-xs font-black text-white mono">±{currentCoords.accuracy.toFixed(1)}m</span>
        </div>
      )}
    </div>
  );
};

export default NavigationHud;
