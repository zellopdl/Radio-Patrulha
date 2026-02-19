
import React, { useMemo } from 'react';
import { NavigationState, Coordinates } from '../types';
import { ArrowUp, ArrowLeft, ArrowRight, ArrowDown, Target, Navigation, Zap } from 'lucide-react';

interface NavigationHudProps {
  navState: NavigationState;
  targetName: string;
  currentCoords: Coordinates | null;
  targetCoords: { latitude: number; longitude: number };
}

const NavigationHud: React.FC<NavigationHudProps> = ({ navState, targetName, currentCoords, targetCoords }) => {
  const distanceTheme = useMemo(() => {
    if (navState.distance < 10) return { color: 'text-emerald-600', glow: 'shadow-emerald-500/10', border: 'border-emerald-200', bg: 'bg-emerald-50', label: 'MUITO PERTO' };
    if (navState.distance < 30) return { color: 'text-blue-600', glow: 'shadow-blue-500/10', border: 'border-blue-200', bg: 'bg-blue-50', label: 'PRÓXIMO' };
    if (navState.distance < 100) return { color: 'text-amber-600', glow: 'shadow-amber-500/10', border: 'border-amber-200', bg: 'bg-amber-50', label: 'MÉDIA DISTÂNCIA' };
    return { color: 'text-slate-600', glow: 'shadow-slate-500/10', border: 'border-slate-200', bg: 'bg-slate-50', label: 'LONGE' };
  }, [navState.distance]);

  const DirectionIcon = () => {
    const s = "w-32 h-32 transition-transform duration-500";
    switch (navState.instruction) {
      case 'STRAIGHT': return <ArrowUp className={`${s} text-emerald-500 animate-bounce`} />;
      case 'LEFT': return <ArrowLeft className={`${s} text-indigo-500 animate-pulse`} />;
      case 'RIGHT': return <ArrowRight className={`${s} text-indigo-500 animate-pulse`} />;
      case 'BACK': return <ArrowDown className={`${s} text-rose-500`} />;
      case 'ARRIVED': return <Target className={`${s} text-amber-500 scale-110`} />;
      default: return <Navigation className={`${s} text-slate-300`} />;
    }
  };

  const instructionLabel = () => {
    switch (navState.instruction) {
      case 'STRAIGHT': return 'SIGA EM FRENTE';
      case 'LEFT': return 'VIRE À ESQUERDA';
      case 'RIGHT': return 'VIRE À DIREITA';
      case 'BACK': return 'DÊ MEIA VOLTA';
      case 'ARRIVED': return 'DESTINO ALCANÇADO';
      default: return 'AGUARDANDO GPS';
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full animate-in fade-in slide-in-from-bottom-10 duration-700">
      {/* Container de Radar e Distância */}
      <div className={`relative bg-white rounded-[50px] border ${distanceTheme.border} p-10 flex flex-col items-center shadow-lg overflow-hidden`}>
        {/* Background Radar Rings */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <div className="w-full aspect-square border-2 border-slate-900 rounded-full animate-ping" />
          <div className="w-3/4 aspect-square border-2 border-slate-900 rounded-full absolute" />
          <div className="w-1/2 aspect-square border-2 border-slate-900 rounded-full absolute" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <span className={`text-[10px] font-black tracking-[0.4em] mb-4 uppercase ${distanceTheme.color}`}>
            {distanceTheme.label}
          </span>
          
          <div className={`flex items-baseline mb-6 ${distanceTheme.color}`}>
            <span className="text-8xl font-black tracking-tighter tabular-nums">
              {navState.distance.toFixed(1)}
            </span>
            <span className="text-2xl font-bold ml-2">m</span>
          </div>

          <div className="p-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner mb-6">
            <DirectionIcon />
          </div>

          <div className={`px-8 py-3 rounded-2xl font-black text-xl tracking-wider mb-2 bg-slate-900 text-white text-center`}>
            {instructionLabel()}
          </div>
        </div>
      </div>

      {/* Grid de Coordenadas Táticas */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-white p-5 rounded-[30px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sua Posição</span>
            <div className="flex items-center space-x-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Sinal GPS Ativo</span>
            </div>
          </div>
          <div className="flex justify-between text-[11px] font-mono font-bold text-slate-600">
            <span>LAT: {currentCoords?.latitude.toFixed(6) || '---'}</span>
            <span>LNG: {currentCoords?.longitude.toFixed(6) || '---'}</span>
          </div>
        </div>

        <div className="bg-indigo-50 p-5 rounded-[30px] border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-indigo-100/50 pb-2">
            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Ponto Salvo</span>
            <Zap className="w-3 h-3 text-indigo-400" />
          </div>
          <div className="flex justify-between text-[11px] font-mono font-bold text-indigo-600">
            <span>LAT: {targetCoords.latitude.toFixed(6)}</span>
            <span>LNG: {targetCoords.longitude.toFixed(6)}</span>
          </div>
        </div>
      </div>

      {/* Signal Accuracy */}
      <div className="flex items-center justify-between px-8 py-4 bg-white rounded-[25px] border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${currentCoords && (currentCoords.accuracy || 100) < 15 ? 'bg-emerald-500' : 'bg-amber-500'} shadow-lg`} />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precisão GPS</span>
        </div>
        <span className="text-xs font-black text-slate-900 mono">±{currentCoords?.accuracy?.toFixed(1) || '0'}m</span>
      </div>
    </div>
  );
};

export default NavigationHud;
