
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
      () => showMsg("GPS Requerido", "error"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (activeLocation && currentCoords) {
      setNavState(getNavigationInstruction(currentCoords, activeLocation, 10.0));
    }
  }, [currentCoords, activeLocation]);

  useEffect(() => {
    const isNear = navState?.distance !== undefined && navState.distance < 10.0;
    const canScan = mode === AppMode.PATROL && activeLocation && isNear && !isVerifying;

    if (canScan) {
      if (!scanIntervalRef.current) {
        scanIntervalRef.current = window.setInterval(async () => {
          if (arRef.current && !isVerifying) {
            const frame = arRef.current.captureOptimized();
            if (frame && activeLocation.referenceImage) {
              await handleAutoVerify(frame, activeLocation.referenceImage);
            }
          }
        }, 4500); // Intervalo ligeiramente maior para dar tempo à API
      }
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [navState?.distance, mode, activeLocation, isVerifying]);

  const handleAutoVerify = async (frame: string, reference: string) => {
    setIsVerifying(true);
    const result = await validateVisualAnchor(frame, reference);
    
    if (result.isCorrectSpot || result.confidence >= 20) {
      showMsg("LOCAL CONFIRMADO!", 'success');
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setTimeout(() => {
        setMode(AppMode.DASHBOARD);
        setActiveLocation(null);
        setIsVerifying(false);
      }, 1000); // Retorna rápido após confirmação
    } else {
      // Pequeno delay antes de liberar o próximo scan para evitar overlap
      setTimeout(() => setIsVerifying(false), 500);
    }
  };

  const handleSaveLocation = () => {
    if (!currentCoords || !newName.trim() || !referenceImage) {
      showMsg("Preencha tudo!", "error");
      return;
    }
    const newLoc = db.saveLocation({
      name: newName,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      referenceImage
    });
    setLocations(db.getLocations());
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
          <header className="mt-12 mb-8 flex flex-col items-center px-6">
            <div className="p-4 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-500/20 mb-4">
              <Target className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase">Patrol<span className="text-indigo-600">Guard</span></h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Ronda Digital</p>
          </header>

          <div className="px-6 space-y-6 flex-1">
            <button 
              onClick={() => setMode(AppMode.REGISTRY)} 
              className="w-full flex flex-col items-center justify-center p-10 bg-white rounded-[40px] border border-slate-200 shadow-sm active:bg-slate-50 transition-all"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="font-bold text-xs uppercase tracking-widest text-slate-500">Novo Ponto de Ronda</span>
            </button>

            <div className="space-y-4 pb-20">
              <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest px-2">Pontos Salvos</h2>
              {locations.length === 0 && (
                <div className="text-center py-10 bg-white/50 rounded-[40px] border border-dashed border-slate-200 text-slate-300 text-xs italic">
                  Nenhum local cadastrado
                </div>
              )}
              {locations.map(loc => (
                <div key={loc.id} onClick={() => { setActiveLocation(loc); setMode(AppMode.PATROL); }} className="bg-white p-4 rounded-[35px] border border-slate-200 flex items-center justify-between active:bg-slate-50 shadow-sm">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      {loc.referenceImage && <img src={loc.referenceImage} className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-base truncate">{loc.name}</h3>
                      <div className="flex items-center text-[9px] text-indigo-500 font-black uppercase mt-0.5">
                        <Navigation className="w-2.5 h-2.5 mr-1" />
                        <span>Ir para Local</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir?')){ db.deleteLocation(loc.id); setLocations(db.getLocations()); }}} className="p-3 text-slate-300 hover:text-red-500">
                    <Trash2 className="w-5 h-5" />
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
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em Rota</span>
              <span className="text-slate-900 font-bold truncate max-w-[180px]">{activeLocation.name}</span>
            </div>
            <div className="w-14"></div>
          </header>

          <main className="flex-1 flex flex-col justify-center px-6 pb-12">
            {(!currentCoords || (navState?.distance || 100) >= 10.0) ? (
              <NavigationHud navState={navState || { distance: 0, bearing: 0, instruction: 'STRAIGHT' }} targetName={activeLocation.name} currentCoords={currentCoords} targetCoords={activeLocation} />
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                 <div className="text-center bg-indigo-50 p-6 rounded-[40px] border border-indigo-100 shadow-sm">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Reconhecimento Ativo</p>
                    <p className="text-slate-900 text-sm font-bold mt-1">Aponte a câmera para o objeto</p>
                 </div>
                 <ARView ref={arRef} referenceImage={activeLocation.referenceImage} onCapture={() => {}} isVerifying={isVerifying} autoMode={true} />
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
            <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Novo Registro</span>
            <div className="w-10"></div>
          </header>
          
          {!referenceImage ? (
            <div className="flex-1 flex flex-col pb-10">
              <ARView onCapture={setReferenceImage} isVerifying={false} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in pb-10">
              <div className="relative aspect-[9/12] rounded-[45px] overflow-hidden border-4 border-white shadow-xl mb-6">
                <img src={referenceImage} className="w-full h-full object-cover" />
                <button onClick={() => setReferenceImage(null)} className="absolute top-5 right-5 bg-white/90 p-3 rounded-full text-slate-900 shadow-lg">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <input 
                type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Identifique este local..."
                className="w-full bg-white border border-slate-200 p-5 rounded-[25px] text-base font-bold text-slate-900 outline-none shadow-sm mb-6 focus:border-indigo-500 transition-colors"
              />
              <button onClick={handleSaveLocation} className="w-full bg-indigo-600 py-6 rounded-[30px] font-black text-base shadow-xl shadow-indigo-600/30 text-white flex items-center justify-center space-x-3 active:scale-95 transition-all">
                <Save className="w-6 h-6" /> <span>SALVAR PONTO</span>
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`fixed bottom-10 inset-x-6 p-6 rounded-[35px] border shadow-2xl backdrop-blur-xl flex items-center space-x-4 z-50 animate-in fade-in slide-in-from-bottom-10 ${message.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 shadow-emerald-500/20' : 'bg-rose-500/90 border-rose-400 shadow-rose-500/20'}`}>
          <div className="p-2 bg-white/20 rounded-full shrink-0">
            {message.type === 'success' ? <Sparkles className="w-6 h-6 text-white" /> : <AlertCircle className="w-6 h-6 text-white" />}
          </div>
          <p className="text-white font-black text-lg uppercase tracking-tight">{message.text}</p>
        </div>
      )}
    </div>
  );
};

export default App;
