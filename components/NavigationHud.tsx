
import React from 'react';
import { NavigationState, Coordinates } from '../types';
import { ArrowUp, ArrowLeft, ArrowRight, ArrowDown, MapPin } from 'lucide-react';

interface NavigationHudProps {
  navState: NavigationState;
  targetName: string;
}

const NavigationHud: React.FC<NavigationHudProps> = ({ navState, targetName }) => {
  const getIcon = () => {
    switch (navState.instruction) {
      case 'STRAIGHT': return <ArrowUp className="w-24 h-24 text-green-400" />;
      case 'LEFT': return <ArrowLeft className="w-24 h-24 text-blue-400" />;
      case 'RIGHT': return <ArrowRight className="w-24 h-24 text-blue-400" />;
      case 'BACK': return <ArrowDown className="w-24 h-24 text-red-400" />;
      case 'ARRIVED': return <MapPin className="w-24 h-24 text-yellow-400 animate-bounce" />;
    }
  };

  const getLabel = () => {
    switch (navState.instruction) {
      case 'STRAIGHT': return 'Siga em frente';
      case 'LEFT': return 'Vire à esquerda';
      case 'RIGHT': return 'Vire à direita';
      case 'BACK': return 'Dê meia volta';
      case 'ARRIVED': return 'Você chegou!';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-400 mb-1">Destino: {targetName}</h2>
        <div className="text-5xl font-bold text-white mono">
          {navState.distance.toFixed(1)}m
        </div>
      </div>

      <div className="relative p-8 bg-slate-900 rounded-full border-4 border-slate-700">
        <div className="transition-transform duration-500 transform">
          {getIcon()}
        </div>
      </div>

      <div className="text-center">
        <div className="text-3xl font-bold uppercase tracking-widest text-white">
          {getLabel()}
        </div>
        <p className="text-slate-500 mt-2">Mantenha o GPS ativo</p>
      </div>
    </div>
  );
};

export default NavigationHud;
