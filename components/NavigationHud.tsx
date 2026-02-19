
import React from 'react';
import { NavigationState, Coordinates } from '../types';
import { ArrowUp, ArrowLeft, ArrowRight, ArrowDown, MapPin, Crosshair } from 'lucide-react';

interface NavigationHudProps {
  navState: NavigationState;
  targetName: string;
  currentCoords: Coordinates | null;
  targetCoords: { latitude: number; longitude: number };
}

const NavigationHud: React.FC<NavigationHudProps> = ({ navState, targetName, currentCoords, targetCoords }) => {
  const getIcon = () => {
    switch (navState.instruction) {
      case 'STRAIGHT': return <ArrowUp className="w-20 h-20 text-green-400" />;
      case 'LEFT': return <ArrowLeft className="w-20 h-20 text-blue-400" />;
      case 'RIGHT': return <ArrowRight className="w-20 h-20 text-blue-400" />;
      case 'BACK': return <ArrowDown className="w-20 h-20 text-red-400" />;
      case 'ARRIVED': return <MapPin className="w-20 h-20 text-yellow-400 animate-bounce" />;
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl text-center">
        <h2 className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-2">Rumo a: {targetName}</h2>
        <div className="text-6xl font-black text-white mono mb-4">
          {navState.distance.toFixed(1)}<span className="text-2xl text-slate-500 ml-1">m</span>
        </div>
        
        <div className="flex justify-center mb-6">
          <div className="p-6 bg-slate-900 rounded-full border-4 border-slate-700">
             {getIcon()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] mono uppercase">
          <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-700">
            <p className="text-slate-500">Seu GPS</p>
            <p className="text-white">{currentCoords?.latitude.toFixed(6)}</p>
            <p className="text-white">{currentCoords?.longitude.toFixed(6)}</p>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-700">
            <p className="text-slate-500">Destino</p>
            <p className="text-indigo-400">{targetCoords.latitude.toFixed(6)}</p>
            <p className="text-indigo-400">{targetCoords.longitude.toFixed(6)}</p>
          </div>
        </div>
      </div>

      {currentCoords?.accuracy && (
        <div className="flex items-center justify-center space-x-2 bg-slate-800/50 py-2 rounded-full border border-slate-700">
          <Crosshair className={`w-4 h-4 ${currentCoords.accuracy < 10 ? 'text-green-400' : 'text-amber-400'}`} />
          <span className="text-xs font-bold text-slate-300">Precisão: ±{currentCoords.accuracy.toFixed(1)}m</span>
        </div>
      )}
    </div>
  );
};

export default NavigationHud;
