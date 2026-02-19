
import React, { useState, useEffect } from 'react';
import { 
  Plus, Navigation, MapPin, Trash2, ChevronLeft, 
  Save, CheckCircle2, AlertCircle, Locate, Target,
  Compass, Loader2
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
        showMsg("Ative o GPS para navegar!", "error");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Lógica de atualização da navegação
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
    showMsg("Ponto registrado com sucesso!", 'success');
  };

  const handleVerifySpot = async (capturedBase64: string) => {
    if (!activeLocation?.referenceImage) return;
    setIsVerifying(true);
    const result = await validateVisualAnchor(capturedBase64, activeLocation.referenceImage);
    setIsVerifying(false);

    if (result.isCorrectSpot && result.confidence > 60) {
      showMsg(`IDENTIFICADO! Confiança: ${result.confidence}%`, 'success');
      setTimeout(() => {
        setMode(AppMode.DASHBOARD);
        setActiveLocation(null);
      }, 3000);
    } else {
      showMsg(result.feedback || "Posição incorreta. Ajuste o ângulo.", 'error');
    }
  };

  const showMsg = (text: string, type: any) => {
    setMessage({ text, type });
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  };

  if (mode === AppMode.DASHBOARD) {
    return (
      <div className="flex flex-col min-h-full bg-slate-950 p-6 animate-in fade-in duration-500">
        <header className="mt-10 mb-8 flex flex-col items-center">
          <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-500/20 mb-4">
            <Target className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">PATROL<span className="text-indigo-500">GUARD</span></h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Navegação Tática AR</p>
        </header>

        <button 
          onClick={() => setMode(AppMode.REGISTRY)} 
          className="w-full mb-8 flex flex-col items-center justify-center p-8 bg-slate-900 rounded-[40px] border border-slate-800 shadow-xl active:scale-95 transition-all group"
        >
          <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 transition-colors">
            <Plus className="w-6 h-6 text-indigo-500" />
          </div>
          <span className="font-bold text-xs uppercase tracking-widest text-slate-300">Nova Localização</span>
        </button>

        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Roteiro de Ronda</h2>
          <span className="bg-indigo-600/20 text-indigo-400 text-[9px] font-black px-2 py-1 rounded-full">{locations.length} PONTOS</span>
        </div>

        <div className="space-y-4 pb-10">
          {locations.length === 0 && (
            <div className="text-center py-12 bg-slate-900/40 rounded-[40px] border border-dashed border-slate-800">
              <p className="text-slate-600 font-bold text-sm">Nenhum local registrado.</p>
            </div>
          )}
          {locations.map(loc => (
            <div 
              key={loc.id} 
              onClick={() => { 
                setActiveLocation(loc); 
                setMode(AppMode.PATROL); 
              }} 
              className="bg-slate-900 p-5 rounded-[35px] border border-slate-800 flex items-center justify-between active:bg-slate-800 transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-lg relative">
                  {loc.referenceImage ? (
                    <img src={loc.referenceImage} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><MapPin className="text-slate-600 w-6 h-6" /></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{loc.name}</h3>
                  <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase mt-1">
                    <Navigation className="w-3 h-3 mr-1 text-indigo-500" />
                    <span>Iniciar Guia</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if(confirm(`Remover "${loc.name}"?`)) { 
                    db.deleteLocation(loc.id); 
                    setLocations(prev => prev.filter(l => l.id !== loc.id)); 
                  }
                }} 
                className="p-3 text-slate-700 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === AppMode.PATROL && activeLocation) {
    const isNearby = (navState?.distance || 100) < 6.5;

    return (
      <div className="flex flex-col min-h-full bg-slate-950 p-6 animate-in slide-in-from-right duration-500">
        <header className="mt-8 mb-6 flex justify-between items-center">
          <button 
            onClick={() => { setMode(AppMode.DASHBOARD); setActiveLocation(null); }} 
            className="p-4 bg-slate-900 rounded-2xl shadow-lg border border-slate-800"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alvo Ativo</span>
            <span className="text-white font-bold">{activeLocation.name}</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
            <Compass className={`w-6 h-6 text-indigo-500 ${!isNearby ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center">
          {!currentCoords ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Sincronizando Satélites...</p>
            </div>
          ) : !isNearby ? (
            <NavigationHud 
              navState={navState || { distance: 0, bearing: 0, instruction: 'STRAIGHT' }} 
              targetName={activeLocation.name} 
              currentCoords={currentCoords} 
              targetCoords={activeLocation} 
            />
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
               <div className="text-center bg-indigo-600/10 p-4 rounded-3xl border border-indigo-500/30">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Proximidade Detectada</p>
                  <p className="text-white text-sm font-bold mt-1">Alinhe a câmera com o local</p>
               </div>
               <ARView referenceImage={activeLocation.referenceImage} onCapture={handleVerifySpot} isVerifying={isVerifying} />
            </div>
          )}
        </main>

        {message && (
          <div className={`fixed bottom-10 inset-x-10 p-5 rounded-[30px] border-2 shadow-2xl backdrop-blur-md flex items-center space-x-3 z-50 animate-bounce ${message.type === 'success' ? 'bg-green-500/90 border-green-400' : 'bg-red-500/90 border-red-400'}`}>
            <CheckCircle2 className="w-6 h-6 text-white" />
            <p className="text-white font-black text-xs uppercase tracking-tight leading-tight">{message.text}</p>
          </div>
        )}
      </div>
    );
  }

  // Bloco de REGISTRY
  if (mode === AppMode.REGISTRY) {
    return (
      <div className="flex flex-col min-h-full bg-slate-950 p-6 animate-in slide-in-from-bottom duration-500">
        <header className="mt-8 mb-8 flex items-center justify-between">
          <button onClick={() => setMode(AppMode.DASHBOARD)} className="p-4 bg-slate-900 rounded-2xl">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Registro de Âncora</span>
          <div className="w-10"></div>
        </header>
        
        {!referenceImage ? (
          <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Captura de Ponto.</h2>
            <p className="text-slate-500 text-sm mb-6">Posicione-se no local exato e capture a imagem que servirá de guia.</p>
            <ARView onCapture={setReferenceImage} isVerifying={false} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-in fade-in duration-300">
            <div className="relative aspect-[3/4] rounded-[40px] overflow-hidden border-4 border-indigo-600 shadow-2xl mb-6">
              <img src={referenceImage} className="w-full h-full object-cover" />
              <button onClick={() => setReferenceImage(null)} className="absolute top-4 right-4 bg-black/60 p-3 rounded-full text-white">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 mb-8">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Identificação</label>
              <input 
                type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Corredor Principal"
                className="w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl text-lg font-bold text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>
            <button 
              onClick={handleSaveLocation} 
              className="mt-auto w-full bg-indigo-600 py-6 rounded-[30px] font-black text-lg shadow-xl shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center space-x-3"
            >
              <Save className="w-6 h-6" /> 
              <span>SALVAR ÂNCORA</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default App;
