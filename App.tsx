
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Navigation, MapPin, Trash2, ChevronLeft, 
  Save, CheckCircle2, AlertCircle, Locate, Activity, Camera
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
      null,
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (activeLocation && currentCoords) {
      setNavState(getNavigationInstruction(currentCoords, {
        latitude: activeLocation.latitude,
        longitude: activeLocation.longitude
      }));
    }
  }, [currentCoords, activeLocation]);

  const handleSaveLocation = () => {
    if (!currentCoords || !newName.trim() || !referenceImage) {
      showMsg("Nome e foto de referência são obrigatórios!", "error");
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
    showMsg("Ponto AR cadastrado!", 'success');
  };

  const handleVerifySpot = async (capturedBase64: string) => {
    if (!activeLocation?.referenceImage) return;
    
    setIsVerifying(true);
    const result = await validateVisualAnchor(capturedBase64, activeLocation.referenceImage);
    setIsVerifying(false);

    if (result.isCorrectSpot && result.confidence > 70) {
      showMsg(`Sucesso! Precisão Visual: ${result.confidence}%`, 'success');
      setTimeout(() => {
        setMode(AppMode.DASHBOARD);
        setActiveLocation(null);
      }, 3000);
    } else {
      showMsg(result.feedback || "Alinhamento incorreto. Tente novamente.", 'error');
    }
  };

  const showMsg = (text: string, type: any) => {
    setMessage({ text, type });
    if (type !== 'error') setTimeout(() => setMessage(null), 4000);
  };

  if (mode === AppMode.DASHBOARD) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <header className="mb-8 pt-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center">
              <Activity className="mr-2 text-indigo-500" />
              PATROL AR
            </h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Precision Patrol</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button onClick={() => setMode(AppMode.REGISTRY)} className="flex flex-col items-center p-6 bg-indigo-600 rounded-[32px] shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform">
            <Plus className="w-8 h-8 mb-2" />
            <span className="font-bold">Novo Ponto</span>
          </button>
          <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-[32px] border border-slate-800">
            <span className="text-3xl font-black">{locations.length}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registros</span>
          </div>
        </div>

        <div className="space-y-3">
          {locations.map(loc => (
            <div key={loc.id} onClick={() => { setActiveLocation(loc); setMode(AppMode.PATROL); }} className="bg-slate-900 p-5 rounded-[28px] border border-slate-800 flex items-center justify-between active:bg-slate-800 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
                  {loc.referenceImage && <img src={loc.referenceImage} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h3 className="font-bold">{loc.name}</h3>
                  <p className="text-[10px] text-slate-500 mono uppercase">GPS: {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); if(confirm("Excluir?")) { db.deleteLocation(loc.id); setLocations(prev => prev.filter(l => l.id !== loc.id)); }}} className="p-2 text-slate-700 hover:text-red-400">
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
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col">
        <button onClick={() => setMode(AppMode.DASHBOARD)} className="p-3 w-fit bg-slate-900 rounded-full mb-6">
          <ChevronLeft />
        </button>
        
        <h1 className="text-3xl font-black mb-1">Âncora AR</h1>
        <p className="text-slate-500 mb-6 text-sm font-medium">Capture um detalhe fixo para garantir precisão centimétrica.</p>

        {!referenceImage ? (
          <ARView onCapture={setReferenceImage} isVerifying={false} />
        ) : (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="relative aspect-[3/4] rounded-[40px] overflow-hidden border-4 border-indigo-500 shadow-2xl">
              <img src={referenceImage} className="w-full h-full object-cover" />
              <button onClick={() => setReferenceImage(null)} className="absolute top-4 right-4 bg-black/60 p-2 rounded-full text-white">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase px-2">Identificação do Local</label>
              <input 
                type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Canto da Prateleira 4"
                className="w-full bg-slate-900 border border-slate-800 p-5 rounded-2xl text-lg font-bold outline-none focus:border-indigo-500"
              />
            </div>
            <button onClick={handleSaveLocation} className="mt-auto w-full bg-indigo-600 py-6 rounded-[32px] font-black text-xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-transform flex items-center justify-center space-x-2">
              <Save /> <span>Confirmar Ponto AR</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (mode === AppMode.PATROL && activeLocation) {
    const isNearby = (navState?.distance || 100) < 6;

    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col">
        <header className="flex justify-between items-center mb-6">
          <button onClick={() => { setMode(AppMode.DASHBOARD); setActiveLocation(null); }} className="p-3 bg-slate-900 rounded-full">
            <ChevronLeft />
          </button>
          <div className="bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase">
            {isNearby ? "MODO AR ATIVADO" : "APROXIME-SE VIA GPS"}
          </div>
        </header>

        <main className="flex-1 space-y-4">
          {!isNearby ? (
            <div className="animate-in fade-in duration-500">
               <NavigationHud navState={navState!} targetName={activeLocation.name} currentCoords={currentCoords} targetCoords={activeLocation} />
            </div>
          ) : (
            <div className="space-y-4 animate-in zoom-in-95 duration-500">
               <div className="text-center p-2 bg-indigo-600/20 rounded-2xl border border-indigo-500/30">
                  <p className="text-xs font-bold text-indigo-300">ALINHE A IMAGEM FANTASMA COM O REAL</p>
               </div>
               <ARView referenceImage={activeLocation.referenceImage} onCapture={handleVerifySpot} isVerifying={isVerifying} />
            </div>
          )}

          {message && (
            <div className={`p-5 rounded-3xl border-2 flex items-start space-x-3 ${message.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-100' : 'bg-red-500/10 border-red-500 text-red-100'}`}>
              {message.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
              <p className="font-bold text-sm">{message.text}</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
};

export default App;
