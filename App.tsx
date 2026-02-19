
import React, { useState, useEffect } from 'react';
import { 
  Plus, Navigation, MapPin, Trash2, ChevronLeft, 
  Save, CheckCircle2, AlertCircle, Locate, Target,
  Compass, Loader2, Sparkles
} from 'lucide-react';
import { AppMode, SavedLocation, Coordinates, NavigationState } from './types';
import { getNavigationInstruction } from './utils/geoUtils';
import { db } from './utils/db';
import NavigationHud from './components/NavigationHud';
import ARView from './components/ARView';
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

  useEffect(() => {
    setLocations(db.getLocations());
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        console.error("GPS Error:", err);
        showMsg("Ative o GPS para funcionar!", "error");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (activeLocation && currentCoords) {
      const state = getNavigationInstruction(currentCoords, {
        latitude: activeLocation.latitude,
        longitude: activeLocation.longitude
      });
      setNavState(state);
    }
  }, [currentCoords, activeLocation]);

  const handleSaveLocation = () => {
    if (!currentCoords || !newName.trim() || !referenceImage) {
      showMsg("Preencha o nome e tire a foto!", "error");
      return;
    }
    const newLoc = db.saveLocation({
      name: newName,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      referenceImage: referenceImage
    });
    setLocations(prev => [...prev, newLoc]);
    setNewName('');
    setReferenceImage(null);
    setMode(AppMode.DASHBOARD);
    showMsg("Ponto registrado!", 'success');
  };

  const handleVerifySpot = async (capturedBase64: string) => {
    if (!activeLocation?.referenceImage) return;
    setIsVerifying(true);
    
    const result = await validateVisualAnchor(capturedBase64, activeLocation.referenceImage);
    
    if (result.isCorrectSpot || result.confidence >= 20) {
      setIsVerifying(false);
      showMsg("OBJETO LOCALIZADO!", 'success');
      
      setTimeout(() => {
        setMode(AppMode.DASHBOARD);
        setActiveLocation(null);
        setMessage(null);
      }, 2000);
    } else {
      setIsVerifying(false);
      showMsg(result.feedback || "Tente alinhar melhor.", 'error');
    }
  };

  const showMsg = (text: string, type: any) => {
    setMessage({ text, type });
    if (type === 'error') {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full min-h-screen bg-slate-950 overflow-x-hidden safe-top safe-bottom">
      {mode === AppMode.DASHBOARD && (
        <div className="flex flex-col flex-1 animate-in fade-in duration-500 w-full">
          <header className="mt-12 mb-8 flex flex-col items-center px-6">
            <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-500/20 mb-4">
              <Target className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase">Patrol<span className="text-indigo-500">Guard</span></h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1 text-center">Navegação e Ronda AR</p>
          </header>

          <div className="px-6 space-y-8 flex-1">
            <button 
              onClick={() => setMode(AppMode.REGISTRY)} 
              className="w-full flex flex-col items-center justify-center p-12 bg-slate-900 rounded-[50px] border border-slate-800 shadow-xl active:scale-95 transition-all group"
            >
              <div className="w-14 h-14 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                <Plus className="w-7 h-7 text-indigo-500" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest text-slate-300">Novo Ponto de Ronda</span>
            </button>

            <div className="space-y-4 pb-20">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Seu Roteiro</h2>
                <span className="bg-indigo-600/20 text-indigo-400 text-[9px] font-black px-2 py-1 rounded-full uppercase">{locations.length} Registros</span>
              </div>

              {locations.length === 0 && (
                <div className="text-center py-16 bg-slate-900/40 rounded-[50px] border border-dashed border-slate-800">
                  <p className="text-slate-600 font-bold text-sm">Nenhum ponto registrado ainda.</p>
                </div>
              )}
              {locations.map(loc => (
                <div 
                  key={loc.id} 
                  onClick={() => { setActiveLocation(loc); setMode(AppMode.PATROL); }} 
                  className="bg-slate-900 p-6 rounded-[40px] border border-slate-800 flex items-center justify-between active:bg-slate-800 transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-5 min-w-0">
                    <div className="w-16 h-16 rounded-3xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-lg shrink-0">
                      {loc.referenceImage ? (
                        <img src={loc.referenceImage} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><MapPin className="text-slate-600 w-7 h-7" /></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors truncate">{loc.name}</h3>
                      <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase mt-1">
                        <Navigation className="w-3 h-3 mr-1.5 text-indigo-500" />
                        <span>Toque para Navegar</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if(confirm(`Excluir "${loc.name}"?`)) { 
                        db.deleteLocation(loc.id); 
                        setLocations(prev => prev.filter(l => l.id !== loc.id)); 
                      }
                    }} 
                    className="p-4 text-slate-700 hover:text-red-500 shrink-0 transition-colors"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === AppMode.PATROL && activeLocation && (
        <div className="flex flex-col flex-1 animate-in slide-in-from-right duration-500 w-full h-full">
          <header className="mt-8 mb-6 flex justify-between items-center px-6">
            <button 
              onClick={() => { setMode(AppMode.DASHBOARD); setActiveLocation(null); }} 
              className="p-4 bg-slate-900 rounded-2xl border border-slate-800"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Em Missão</span>
              <span className="text-white font-bold truncate max-w-[200px]">{activeLocation.name}</span>
            </div>
            <div className="w-14"></div>
          </header>

          <main className="flex-1 flex flex-col justify-center px-6 pb-12 overflow-y-auto">
            {(!currentCoords || (navState?.distance || 100) >= 6.5) ? (
              <NavigationHud 
                navState={navState || { distance: 0, bearing: 0, instruction: 'STRAIGHT' }} 
                targetName={activeLocation.name} 
                currentCoords={currentCoords} 
                targetCoords={activeLocation} 
              />
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                 <div className="text-center bg-indigo-600/10 p-6 rounded-[40px] border border-indigo-500/30">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Alvo Detectado</p>
                    <p className="text-white text-base font-bold mt-1">Confirme o local para finalizar</p>
                 </div>
                 <ARView referenceImage={activeLocation.referenceImage} onCapture={handleVerifySpot} isVerifying={isVerifying} />
              </div>
            )}
          </main>
        </div>
      )}

      {mode === AppMode.REGISTRY && (
        <div className="flex flex-col flex-1 animate-in slide-in-from-bottom duration-500 w-full px-6">
          <header className="mt-8 mb-8 flex items-center justify-between">
            <button onClick={() => setMode(AppMode.DASHBOARD)} className="p-4 bg-slate-900 rounded-2xl">
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Novo Registro</span>
            <div className="w-10"></div>
          </header>
          
          {!referenceImage ? (
            <div className="flex-1 flex flex-col pb-10">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white tracking-tight">Ancoragem Visual</h2>
                <p className="text-slate-500 text-sm mt-1">Fotografe o ponto exato da sua ronda.</p>
              </div>
              <ARView onCapture={setReferenceImage} isVerifying={false} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300 pb-10">
              <div className="relative aspect-[9/12] rounded-[50px] overflow-hidden border-4 border-indigo-600 shadow-2xl mb-8">
                <img src={referenceImage} className="w-full h-full object-cover" />
                <button onClick={() => setReferenceImage(null)} className="absolute top-6 right-6 bg-black/70 p-4 rounded-full text-white backdrop-blur-md">
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4 mb-8">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">Identificação do Local</label>
                <input 
                  type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Painel de Controle A1"
                  className="w-full bg-slate-900 border border-slate-800 p-6 rounded-[30px] text-lg font-bold text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
                />
              </div>
              <button 
                onClick={handleSaveLocation} 
                className="mt-auto w-full bg-indigo-600 py-7 rounded-[35px] font-black text-lg shadow-xl shadow-indigo-500/40 flex items-center justify-center space-x-3 active:scale-95 transition-all"
              >
                <Save className="w-7 h-7" /> 
                <span>CONCLUIR REGISTRO</span>
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`fixed bottom-10 inset-x-6 p-7 rounded-[40px] border-2 shadow-2xl backdrop-blur-lg flex items-center space-x-5 z-50 animate-in fade-in slide-in-from-bottom-10 ${message.type === 'success' ? 'bg-green-500/90 border-green-400 shadow-green-500/50' : 'bg-red-500/90 border-red-400 shadow-red-500/50'}`}>
          <div className="p-2.5 bg-white/20 rounded-full shrink-0">
            {message.type === 'success' ? <Sparkles className="w-7 h-7 text-white" /> : <AlertCircle className="w-7 h-7 text-white" />}
          </div>
          <p className="text-white font-black text-xl uppercase tracking-tight leading-tight">{message.text}</p>
        </div>
      )}
    </div>
  );
};

export default App;
