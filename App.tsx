
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
        showMsg("Ative o GPS!", "error");
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
      showMsg("Dados incompletos!", "error");
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
    
    // Agora aceitamos se isCorrectSpot for verdadeiro OU se a confiança for razoável (20%)
    if (result.isCorrectSpot || result.confidence >= 20) {
      setIsVerifying(false);
      showMsg("OBJETO LOCALIZADO!", 'success');
      
      // Espera 2 segundos antes de voltar
      setTimeout(() => {
        setMode(AppMode.DASHBOARD);
        setActiveLocation(null);
        setMessage(null);
      }, 2000);
    } else {
      setIsVerifying(false);
      showMsg(result.feedback || "Tente outro ângulo.", 'error');
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
    <div className="flex flex-col flex-1 w-full bg-slate-950 safe-top safe-bottom">
      {mode === AppMode.DASHBOARD && (
        <div className="flex flex-col p-6 animate-in fade-in duration-500">
          <header className="mt-8 mb-8 flex flex-col items-center">
            <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-500/20 mb-4">
              <Target className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">PATROL<span className="text-indigo-500">GUARD</span></h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1 text-center">Ronda Inteligente</p>
          </header>

          <button 
            onClick={() => setMode(AppMode.REGISTRY)} 
            className="w-full mb-8 flex flex-col items-center justify-center p-8 bg-slate-900 rounded-[40px] border border-slate-800 shadow-xl active:scale-95 transition-all group"
          >
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 transition-colors">
              <Plus className="w-6 h-6 text-indigo-500" />
            </div>
            <span className="font-bold text-xs uppercase tracking-widest text-slate-300">Novo Ponto</span>
          </button>

          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Seu Roteiro</h2>
            <span className="bg-indigo-600/20 text-indigo-400 text-[9px] font-black px-2 py-1 rounded-full">{locations.length} LOCAIS</span>
          </div>

          <div className="space-y-4 pb-10">
            {locations.length === 0 && (
              <div className="text-center py-12 bg-slate-900/40 rounded-[40px] border border-dashed border-slate-800">
                <p className="text-slate-600 font-bold text-sm">Lista vazia.</p>
              </div>
            )}
            {locations.map(loc => (
              <div 
                key={loc.id} 
                onClick={() => { setActiveLocation(loc); setMode(AppMode.PATROL); }} 
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
                      <span>Iniciar Ronda</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if(confirm(`Excluir?`)) { 
                      db.deleteLocation(loc.id); 
                      setLocations(prev => prev.filter(l => l.id !== loc.id)); 
                    }
                  }} 
                  className="p-3 text-slate-700 hover:text-red-500"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === AppMode.PATROL && activeLocation && (
        <div className="flex flex-col flex-1 p-6 animate-in slide-in-from-right duration-500 overflow-hidden">
          <header className="mb-6 flex justify-between items-center">
            <button 
              onClick={() => { setMode(AppMode.DASHBOARD); setActiveLocation(null); }} 
              className="p-4 bg-slate-900 rounded-2xl border border-slate-800"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ronda Ativa</span>
              <span className="text-white font-bold">{activeLocation.name}</span>
            </div>
            <div className="w-14 h-14"></div>
          </header>

          <main className="flex-1 flex flex-col justify-center">
            {(!currentCoords || (navState?.distance || 100) >= 6.5) ? (
              <NavigationHud 
                navState={navState || { distance: 0, bearing: 0, instruction: 'STRAIGHT' }} 
                targetName={activeLocation.name} 
                currentCoords={currentCoords} 
                targetCoords={activeLocation} 
              />
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                 <div className="text-center bg-indigo-600/10 p-4 rounded-3xl border border-indigo-500/30">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Você chegou!</p>
                    <p className="text-white text-sm font-bold mt-1">Confirme visualmente o local</p>
                 </div>
                 <ARView referenceImage={activeLocation.referenceImage} onCapture={handleVerifySpot} isVerifying={isVerifying} />
              </div>
            )}
          </main>
        </div>
      )}

      {mode === AppMode.REGISTRY && (
        <div className="flex flex-col flex-1 p-6 animate-in slide-in-from-bottom duration-500">
          <header className="mb-8 flex items-center justify-between">
            <button onClick={() => setMode(AppMode.DASHBOARD)} className="p-4 bg-slate-900 rounded-2xl">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Novo Registro</span>
            <div className="w-10"></div>
          </header>
          
          {!referenceImage ? (
            <div className="flex-1 flex flex-col">
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Captura de Ponto</h2>
              <p className="text-slate-500 text-sm mb-6">Fotografe o objeto ou local da ronda.</p>
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
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Nome do Ponto</label>
                <input 
                  type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Extintor Hall"
                  className="w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl text-lg font-bold text-white outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <button 
                onClick={handleSaveLocation} 
                className="mt-auto w-full bg-indigo-600 py-6 rounded-[30px] font-black text-lg shadow-xl shadow-indigo-500/30 flex items-center justify-center space-x-3"
              >
                <Save className="w-6 h-6" /> 
                <span>SALVAR PONTO</span>
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`fixed bottom-10 inset-x-6 p-6 rounded-[35px] border-2 shadow-2xl backdrop-blur-md flex items-center space-x-4 z-50 animate-in fade-in slide-in-from-bottom-10 ${message.type === 'success' ? 'bg-green-500/95 border-green-400 shadow-green-500/40' : 'bg-red-500/95 border-red-400'}`}>
          <div className="p-2 bg-white/20 rounded-full">
            {message.type === 'success' ? <Sparkles className="w-6 h-6 text-white" /> : <AlertCircle className="w-6 h-6 text-white" />}
          </div>
          <p className="text-white font-black text-xl uppercase tracking-tight leading-tight">{message.text}</p>
        </div>
      )}
    </div>
  );
};

export default App;
