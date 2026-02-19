
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Navigation, MapPin, Trash2, ChevronLeft, 
  Save, CheckCircle2, AlertCircle, Locate, Activity, Camera, Target
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
      (pos) => setCurrentCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        heading: pos.coords.heading,
        accuracy: pos.coords.accuracy
      }),
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
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
      showMsg("Defina um nome e capture a foto de referência!", "error");
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
    showMsg("Ponto AR salvo com sucesso!", 'success');
  };

  const handleVerifySpot = async (capturedBase64: string) => {
    if (!activeLocation?.referenceImage) return;
    
    setIsVerifying(true);
    const result = await validateVisualAnchor(capturedBase64, activeLocation.referenceImage);
    setIsVerifying(false);

    if (result.isCorrectSpot && result.confidence > 65) {
      showMsg(`IDENTIFICADO! Precisão: ${result.confidence}%`, 'success');
      // Pequeno delay para o usuário ver o sucesso antes de voltar
      setTimeout(() => {
        setMode(AppMode.DASHBOARD);
        setActiveLocation(null);
      }, 3000);
    } else {
      showMsg(result.feedback || "Alinhamento incorreto. Verifique a perspectiva.", 'error');
    }
  };

  const showMsg = (text: string, type: any) => {
    setMessage({ text, type });
    if (type !== 'error') {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  };

  if (mode === AppMode.DASHBOARD) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
        <header className="mb-10 pt-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30">
              <Target className="text-white w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter">PATROL<span className="text-indigo-500">AR</span></h1>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] ml-1">Sistema de Ronda Milimétrica</p>
        </header>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <button 
            onClick={() => setMode(AppMode.REGISTRY)} 
            className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-[40px] border border-slate-800 shadow-xl active:scale-95 transition-all group"
          >
            <Plus className="w-10 h-10 mb-3 text-indigo-500 group-hover:scale-110 transition-transform" />
            <span className="font-black text-xs uppercase tracking-widest text-slate-300">Novo Ponto</span>
          </button>
          <div className="flex flex-col items-center justify-center p-8 bg-indigo-600 rounded-[40px] shadow-2xl shadow-indigo-500/30">
            <span className="text-4xl font-black text-white">{locations.length}</span>
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Ativos</span>
          </div>
        </div>

        <h2 className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-4 px-2">Pontos Cadastrados</h2>
        <div className="space-y-4">
          {locations.length === 0 && (
            <div className="text-center py-10 bg-slate-900/50 rounded-[40px] border border-dashed border-slate-800">
              <p className="text-slate-600 font-bold text-sm italic">Nenhum ponto registrado.</p>
            </div>
          )}
          {locations.map(loc => (
            <div 
              key={loc.id} 
              onClick={() => { setActiveLocation(loc); setMode(AppMode.PATROL); }} 
              className="group bg-slate-900 p-6 rounded-[35px] border border-slate-800 flex items-center justify-between active:bg-slate-800 transition-all cursor-pointer hover:border-indigo-500/50"
            >
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 rounded-[24px] overflow-hidden bg-slate-800 border-2 border-slate-700 group-hover:border-indigo-500 transition-colors shadow-lg">
                  {loc.referenceImage && <img src={loc.referenceImage} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h3 className="font-black text-lg text-white group-hover:text-indigo-400 transition-colors">{loc.name}</h3>
                  <div className="flex items-center text-[9px] text-slate-500 font-bold mono uppercase mt-1">
                    <Locate className="w-3 h-3 mr-1" />
                    <span>{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</span>
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
                className="p-3 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === AppMode.REGISTRY) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col font-sans">
        <header className="flex items-center justify-between mb-8 pt-4">
          <button onClick={() => setMode(AppMode.DASHBOARD)} className="p-4 bg-slate-900 rounded-[20px] shadow-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-slate-500 font-black text-xs uppercase tracking-widest">Configuração AR</span>
        </header>
        
        <h1 className="text-4xl font-black mb-2 tracking-tighter">Novo Ponto.</h1>
        <p className="text-slate-500 mb-8 text-sm font-medium leading-relaxed">Fique exatamente sobre o local e capture uma imagem de referência fixa.</p>

        {!referenceImage ? (
          <ARView onCapture={setReferenceImage} isVerifying={false} />
        ) : (
          <div className="space-y-6 flex-1 flex flex-col animate-in zoom-in-95 duration-300">
            <div className="relative aspect-[3/4] rounded-[50px] overflow-hidden border-4 border-indigo-600 shadow-2xl">
              <img src={referenceImage} className="w-full h-full object-cover" />
              <button onClick={() => setReferenceImage(null)} className="absolute top-6 right-6 bg-black/70 backdrop-blur-md p-4 rounded-full text-white shadow-xl">
                <Trash2 className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4">Nome da Localização</label>
              <input 
                type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Guarita Norte"
                className="w-full bg-slate-900 border-2 border-slate-800 p-6 rounded-[30px] text-xl font-black text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 shadow-inner"
              />
            </div>
            <button 
              onClick={handleSaveLocation} 
              className="mt-auto w-full bg-indigo-600 py-7 rounded-[35px] font-black text-xl shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all flex items-center justify-center space-x-3"
            >
              <Save className="w-6 h-6" /> 
              <span>REGISTRAR ÂNCORA</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (mode === AppMode.PATROL && activeLocation) {
    // Definimos 6 metros como o limiar para o Modo de Precisão AR
    const isNearby = (navState?.distance || 100) < 6.5;

    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col font-sans">
        <header className="flex justify-between items-center mb-8 pt-4">
          <button onClick={() => { setMode(AppMode.DASHBOARD); setActiveLocation(null); }} className="p-4 bg-slate-900 rounded-[20px]">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className={`px-5 py-2 rounded-full border font-black text-[10px] uppercase tracking-widest transition-all ${isNearby ? 'bg-indigo-600 border-indigo-500 text-white animate-pulse' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
            {isNearby ? "ALINHAMENTO AR ATIVO" : "NAVEGAÇÃO GPS"}
          </div>
        </header>

        <main className="flex-1 flex flex-col relative">
          {!isNearby ? (
            <div className="flex-1 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-500">
               <NavigationHud navState={navState!} targetName={activeLocation.name} currentCoords={currentCoords} targetCoords={activeLocation} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-6 animate-in slide-in-from-bottom-8 duration-500">
               <div className="text-center bg-indigo-900/20 p-4 rounded-[25px] border border-indigo-500/30 backdrop-blur-sm">
                  <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Modo Centimétrico</p>
                  <p className="text-[10px] text-indigo-300/70 mt-1">Alinhe a transparência com o local real</p>
               </div>
               <ARView referenceImage={activeLocation.referenceImage} onCapture={handleVerifySpot} isVerifying={isVerifying} />
            </div>
          )}

          {message && (
            <div className={`fixed bottom-10 left-6 right-6 p-6 rounded-[35px] border-2 shadow-2xl backdrop-blur-md flex items-center space-x-4 animate-in slide-in-from-bottom-10 duration-500 z-50 ${message.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
              <div className="p-2 bg-white/20 rounded-full">
                {message.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              </div>
              <p className="font-black text-sm tracking-tight">{message.text}</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
};

export default App;
