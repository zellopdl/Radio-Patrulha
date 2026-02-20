
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Navigation, MapPin, Trash2, ChevronLeft, 
  Save, Target, Sparkles, AlertCircle
} from 'lucide-react';
import { AppMode, SavedLocation, Coordinates, NavigationState } from './types';
import { getNavigationInstruction } from './utils/geoUtils';
import { db } from './utils/db';
import NavigationHud from './components/NavigationHud';
import ARView, { ARViewHandle } from './components/ARView';
import { validateVisualAnchor } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [activeLocation, setActiveLocation] = useState<SavedLocation | null>(null);
  const [newName, setNewName] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [navState, setNavState] = useState<NavigationState | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  const arRef = useRef<ARViewHandle>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setLocations(db.getLocations());
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setCurrentCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        heading: pos.coords.heading,
        accuracy: pos.coords.accuracy
      }),
      () => showMsg("Ative o GPS!", "error"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (activeLocation && currentCoords) {
      setNavState(getNavigationInstruction(currentCoords, activeLocation, 10.0));
    }
  }, [currentCoords, activeLocation]);

  // Lógica de Reconhecimento Automático (Auto-Scan)
  useEffect(() => {
    const isNear = navState?.distance !== undefined && navState.distance < 10.0;
    const canScan = mode === AppMode.PATROL && activeLocation && isNear && !isVerifying;

    if (canScan) {
      if (!scanIntervalRef.current) {
        scanIntervalRef.current = window.setInterval(async () => {
          if (arRef.current && !isVerifying) {
            const frame = arRef.current.captureOptimized();
            if (frame && activeLocation.referenceImage) {
              handleAutoVerify(frame, activeLocation.referenceImage);
            }
          }
        }, 4000);
      }
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [navState?.distance, mode, activeLocation, isVerifying]);

  const handleAutoVerify = async (frame: string, reference: string) => {
    setIsVerifying(true);
    const result = await validateVisualAnchor(frame, reference);
    
    if (result.isCorrectSpot || result.confidence >= 25) {
      showMsg("LOCAL RECONHECIDO!", 'success');
      // Limpa intervalo imediatamente
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setTimeout(() => {
        setMode(AppMode.DASHBOARD);
        setActiveLocation(null);
        setIsVerifying(false);
      }, 1500);
    } else {
      setIsVerifying(false);
      // No modo automático, falhas silenciosas permitem continuar tentando
    }
  };

  const handleSaveLocation = () => {
    if (!currentCoords || !newName.trim() || !referenceImage) {
      showMsg("Dados incompletos!", "error");
      return;
    }
    const newLoc = db.saveLocation({
      name: newName,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      referenceImage
    });
    setLocations(prev => [...prev, newLoc]);
    setNewName('');
    setReferenceImage(null);
    setMode(AppMode.DASHBOARD);
    showMsg("PONTO REGISTRADO!", 'success');
  };

  const showMsg = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage({ text, type });
    const duration = type === 'success' ? 1000 : 3000;
    setTimeout(() => setMessage(null), duration);
  };

  return (
    <div className="flex flex-col flex-1 w-full min-h-screen bg-slate-50 overflow-x-hidden safe-top safe-bottom">
      {mode === AppMode.DASHBOARD && (
        <div className="flex flex-col flex-1 animate-in fade-in w-full">
          <header className="mt-12 mb-8 flex flex-col items-center px-6 text-center">
            <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-500/20 mb-4">
              <Target className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Patrol<span className="text-indigo-600">Guard</span></h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Ronda Inteligente & IA</p>
          </header>

          <div className="px-6 space-y-8 flex-1">
            <button 
              onClick={() => setMode(AppMode.REGISTRY)} 
              className="w-full flex flex-col items-center justify-center p-12 bg-white rounded-[50px] border border-slate-200 shadow-sm active:scale-95 transition-all group"
            >
              <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-active:bg-indigo-100">
                <Plus className="w-7 h-7 text-indigo-600" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest text-slate-600">Novo Ponto</span>
            </button>

            <div className="space-y-4 pb-20">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Roteiro Ativo</h2>
                <span className="bg-indigo-100 text-indigo-600 text-[9px] font-black px-2 py-1 rounded-full">{locations.length} PONTOS</span>
              </div>
              {locations.length === 0 && (
                <div className="text-center py-10 text-slate-300 text-sm italic">Nenhum ponto registrado.</div>
              )}
              {locations.map(loc => (
                <div key={loc.id} onClick={() => { setActiveLocation(loc); setMode(AppMode.PATROL); }} className="bg-white p-5 rounded-[40px] border border-slate-200 flex items-center justify-between active:bg-slate-50 shadow-sm transition-colors">
                  <div className="flex items-center space-x-5 min-w-0">
                    <div className="w-16 h-16 rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      {loc.referenceImage && <img src={loc.referenceImage} className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-lg truncate">{loc.name}</h3>
                      <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase mt-1">
                        <Navigation className="w-3 h-3 mr-1.5 text-indigo-500" />
                        <span>Iniciar Ronda</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir ponto?')){ db.deleteLocation(loc.id); setLocations(db.getLocations()); }}} className="p-4 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === AppMode.PATROL && activeLocation && (
        <div className="flex flex-col flex-1 animate-in slide-in-from-right w-full h-full">
          <header className="mt-8 mb-6 flex justify-between items-center px-6">
            <button onClick={() => { setMode(AppMode.DASHBOARD); setActiveLocation(null); }} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <ChevronLeft className="w-6 h-6 text-slate-900" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ronda Ativa</span>
              <span className="text-slate-900 font-bold truncate max-w-[200px]">{activeLocation.name}</span>
            </div>
            <div className="w-14"></div>
          </header>

          <main className="flex-1 flex flex-col justify-center px-6 pb-12">
            {(!currentCoords || (navState?.distance || 100) >= 10.0) ? (
              <NavigationHud navState={navState || { distance: 0, bearing: 0, instruction: 'STRAIGHT' }} targetName={activeLocation.name} currentCoords={currentCoords} targetCoords={activeLocation} />
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                 <div className="text-center bg-indigo-50 p-6 rounded-[40px] border border-indigo-100 shadow-sm">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Alvo Detectado</p>
                    <p className="text-slate-900 text-base font-bold mt-1">O sistema está reconhecendo automaticamente...</p>
                 </div>
                 <ARView 
                    ref={arRef} 
                    referenceImage={activeLocation.referenceImage} 
                    onCapture={() => {}} // Captura agora é automática
                    isVerifying={isVerifying} 
                    autoMode={true} 
                  />
              </div>
            )}
          </main>
        </div>
      )}

      {mode === AppMode.REGISTRY && (
        <div className="flex flex-col flex-1 animate-in slide-in-from-bottom w-full px-6">
          <header className="mt-8 mb-8 flex items-center justify-between">
            <button onClick={() => setMode(AppMode.DASHBOARD)} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <ChevronLeft className="w-6 h-6 text-slate-900" />
            </button>
            <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Registrar Âncora</span>
            <div className="w-10"></div>
          </header>
          
          {!referenceImage ? (
            <div className="flex-1 flex flex-col pb-10">
              <ARView onCapture={setReferenceImage} isVerifying={false} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in pb-10">
              <div className="relative aspect-[9/12] rounded-[50px] overflow-hidden border-4 border-white shadow-xl mb-8">
                <img src={referenceImage} className="w-full h-full object-cover" />
                <button onClick={() => setReferenceImage(null)} className="absolute top-6 right-6 bg-white/90 p-4 rounded-full text-slate-900 shadow-md">
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
              <input 
                type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Identificação do Ponto"
                className="w-full bg-white border border-slate-200 p-6 rounded-[30px] text-lg font-bold text-slate-900 outline-none shadow-sm mb-6 focus:border-indigo-500 transition-colors"
              />
              <button onClick={handleSaveLocation} className="w-full bg-indigo-600 py-7 rounded-[35px] font-black text-lg shadow-xl shadow-indigo-600/30 text-white flex items-center justify-center space-x-3 active:scale-95 transition-all">
                <Save className="w-7 h-7" /> <span>CONCLUIR</span>
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`fixed bottom-10 inset-x-6 p-7 rounded-[40px] border shadow-2xl backdrop-blur-xl flex items-center space-x-5 z-50 animate-in fade-in slide-in-from-bottom-10 ${message.type === 'success' ? 'bg-emerald-500/90 border-emerald-400' : 'bg-rose-500/90 border-rose-400'}`}>
          <div className="p-2.5 bg-white/20 rounded-full shrink-0">
            {message.type === 'success' ? <Sparkles className="w-7 h-7 text-white" /> : <AlertCircle className="w-7 h-7 text-white" />}
          </div>
          <p className="text-white font-black text-xl uppercase tracking-tight leading-none">{message.text}</p>
        </div>
      )}
    </div>
  );
};

export default App;
