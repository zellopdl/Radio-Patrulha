
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Navigation, 
  MapPin, 
  Trash2, 
  ChevronLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Locate,
  History,
  Activity
} from 'lucide-react';
import { AppMode, SavedLocation, Coordinates, NavigationState } from './types';
import { getNavigationInstruction, calculateDistance } from './utils/geoUtils';
import { db } from './utils/db';
import NavigationHud from './components/NavigationHud';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [activeLocation, setActiveLocation] = useState<SavedLocation | null>(null);
  const [newName, setNewName] = useState('');
  const [navState, setNavState] = useState<NavigationState | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  const watchId = useRef<number | null>(null);

  useEffect(() => {
    setLocations(db.getLocations());

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy
        };
        setCurrentCoords(coords);
      },
      (err) => console.error("Erro GPS:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  useEffect(() => {
    if (activeLocation && currentCoords) {
      const nav = getNavigationInstruction(currentCoords, {
        latitude: activeLocation.latitude,
        longitude: activeLocation.longitude
      });
      setNavState(nav);
    }
  }, [currentCoords, activeLocation]);

  const handleSaveLocation = () => {
    if (!currentCoords || !newName.trim()) return;
    const newLoc = db.saveLocation({
      name: newName,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude
    });
    setLocations(prev => [...prev, newLoc]);
    setNewName('');
    setMode(AppMode.DASHBOARD);
    showMsg("Local cadastrado com sucesso!", 'success');
  };

  const handleDeleteLocation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Deseja excluir este local?")) {
      db.deleteLocation(id);
      setLocations(prev => prev.filter(l => l.id !== id));
    }
  };

  const startPatrol = (loc: SavedLocation) => {
    setActiveLocation(loc);
    setMode(AppMode.PATROL);
    setMessage(null);
  };

  const checkArrival = () => {
    if (!navState || !activeLocation) return;
    
    // Margem de erro do GPS considerada: 10 metros ou a própria precisão do sinal
    const threshold = Math.max(8, currentCoords?.accuracy || 5);
    
    if (navState.distance <= threshold) {
      showMsg(`Confirmado! Você está em: ${activeLocation.name}`, 'success');
      setTimeout(() => {
        setMode(AppMode.DASHBOARD);
        setActiveLocation(null);
      }, 3000);
    } else {
      showMsg(`Ainda não. Você está a ${navState.distance.toFixed(1)}m do ponto correto.`, 'error');
    }
  };

  const showMsg = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage({ text, type });
    if (type !== 'error') setTimeout(() => setMessage(null), 4000);
  };

  // UI: Dashboard
  if (mode === AppMode.DASHBOARD) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
        <header className="mb-8 pt-6">
          <h1 className="text-3xl font-black tracking-tighter text-white flex items-center">
            <Activity className="mr-2 text-indigo-500" />
            PATROL GUARD
          </h1>
          <p className="text-slate-500 font-medium">Gestão de Check-points GPS</p>
        </header>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => setMode(AppMode.REGISTRY)}
            className="flex flex-col items-center justify-center p-6 bg-indigo-600 rounded-[32px] shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform"
          >
            <Plus className="w-8 h-8 mb-2" />
            <span className="font-bold">Cadastrar</span>
          </button>
          <div className="flex flex-col items-center justify-center p-6 bg-slate-800 rounded-[32px] border border-slate-700">
            <span className="text-3xl font-black mb-1">{locations.length}</span>
            <span className="text-xs font-bold text-slate-500 uppercase">Pontos</span>
          </div>
        </div>

        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 px-2">Seus Locais</h2>
        <div className="space-y-3">
          {locations.length === 0 && (
            <div className="text-center py-12 bg-slate-800/30 rounded-[32px] border-2 border-dashed border-slate-700">
              <MapPin className="w-12 h-12 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500">Nenhum local salvo</p>
            </div>
          )}
          {locations.map(loc => (
            <div 
              key={loc.id}
              onClick={() => startPatrol(loc)}
              className="bg-slate-800 p-5 rounded-[28px] border border-slate-700 flex items-center justify-between group active:bg-slate-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-slate-900 p-3 rounded-2xl text-indigo-400">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">{loc.name}</h3>
                  <p className="text-[10px] text-slate-500 mono uppercase tracking-tight">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => handleDeleteLocation(loc.id, e)}
                className="p-2 text-slate-600 hover:text-red-400"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // UI: Registry
  if (mode === AppMode.REGISTRY) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col">
        <button onClick={() => setMode(AppMode.DASHBOARD)} className="p-2 w-fit bg-slate-800 rounded-full mb-8">
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="text-3xl font-black mb-2">Novo Local</h1>
        <p className="text-slate-500 mb-8">Posicione-se exatamente onde deseja marcar o check-point.</p>

        <div className="bg-slate-800 p-8 rounded-[40px] border border-slate-700 mb-8 space-y-6">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Coordenadas Atuais</p>
            <div className="mono text-2xl font-bold text-indigo-400">
              {currentCoords ? (
                <>
                  <div>{currentCoords.latitude.toFixed(6)}</div>
                  <div>{currentCoords.longitude.toFixed(6)}</div>
                </>
              ) : "Obtendo GPS..."}
            </div>
            {currentCoords && (
              <p className="text-[10px] text-slate-500 mt-2">Margem de erro: ±{currentCoords.accuracy?.toFixed(1)}m</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase px-2">Nome do Local</label>
            <input 
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Sala de Reunião"
              className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-lg font-bold outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <button 
          onClick={handleSaveLocation}
          disabled={!currentCoords || !newName.trim()}
          className="mt-auto w-full bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-600 py-5 rounded-[32px] font-black text-xl flex items-center justify-center space-x-3 shadow-xl shadow-indigo-500/10 active:scale-95 transition-transform"
        >
          <Save className="w-6 h-6" />
          <span>Salvar Localização</span>
        </button>
      </div>
    );
  }

  // UI: Patrol
  if (mode === AppMode.PATROL && activeLocation) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col">
        <header className="flex items-center justify-between mb-8">
          <button onClick={() => setMode(AppMode.DASHBOARD)} className="p-2 bg-slate-800 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 text-indigo-400">
            <Locate className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">Em Missão</span>
          </div>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full space-y-6">
          {navState && (
            <NavigationHud 
              navState={navState} 
              targetName={activeLocation.name}
              currentCoords={currentCoords}
              targetCoords={{ latitude: activeLocation.latitude, longitude: activeLocation.longitude }}
            />
          )}

          {message && (
            <div className={`p-5 rounded-3xl border-2 flex items-start space-x-3 animate-in slide-in-from-top ${
              message.type === 'success' ? 'bg-green-500/20 border-green-500 text-green-100' : 'bg-red-500/20 border-red-500 text-red-100'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="shrink-0 mt-1" /> : <AlertCircle className="shrink-0 mt-1" />}
              <p className="font-bold">{message.text}</p>
            </div>
          )}

          <button 
            onClick={checkArrival}
            className="w-full bg-white text-slate-900 py-6 rounded-[32px] font-black text-2xl shadow-2xl active:scale-95 transition-transform"
          >
            ACHEI!
          </button>
        </main>
      </div>
    );
  }

  return null;
};

export default App;
