
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bell, 
  MapPin, 
  Camera as CameraIcon, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { PatrolTask, TaskStatus, Coordinates, NavigationState } from './types';
import { getNavigationInstruction } from './utils/geoUtils';
import { validateObject, ValidationResult } from './services/geminiService';
import NavigationHud from './components/NavigationHud';
import CameraView from './components/CameraView';

// Mock initial tasks - in a real app these could be loaded from localStorage or an API
const INITIAL_TASKS: PatrolTask[] = [
  {
    id: '1',
    name: 'Cozinha - Máquina de Café',
    targetObject: 'Cafeteira ou Máquina de Café',
    targetLocation: { latitude: -23.5505, longitude: -46.6333 }, // Example: São Paulo center
    scheduledTime: '08:00',
    status: TaskStatus.PENDING
  },
  {
    id: '2',
    name: 'Sala - Smart TV',
    targetObject: 'Televisão ou Monitor',
    targetLocation: { latitude: -23.5510, longitude: -46.6338 },
    scheduledTime: '14:00',
    status: TaskStatus.PENDING
  }
];

const App: React.FC = () => {
  const [tasks, setTasks] = useState<PatrolTask[]>(INITIAL_TASKS);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [navState, setNavState] = useState<NavigationState | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [alarmActive, setAlarmActive] = useState(false);

  const activeTask = tasks.find(t => t.id === activeTaskId);
  const watchId = useRef<number | null>(null);

  // Sound effects
  const playAlarm = useCallback(() => {
    // Basic browser beep or vibration
    if ('vibrate' in navigator) navigator.vibrate([500, 200, 500]);
  }, []);

  // Update GPS and Navigation
  useEffect(() => {
    if (activeTaskId && activeTask) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading
          };
          setCurrentCoords(coords);
          
          const nav = getNavigationInstruction(coords, activeTask.targetLocation);
          setNavState(nav);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    } else {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    }

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [activeTaskId, activeTask]);

  // Check Alarms every minute
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const dueTask = tasks.find(t => t.scheduledTime === currentString && t.status === TaskStatus.PENDING);
      if (dueTask && !activeTaskId) {
        setAlarmActive(true);
        playAlarm();
      }
    };

    const timer = setInterval(checkAlarms, 30000);
    return () => clearInterval(timer);
  }, [tasks, activeTaskId, playAlarm]);

  const startTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: TaskStatus.ACTIVE } : t));
    setActiveTaskId(id);
    setAlarmActive(false);
    setValidationResult(null);
  };

  const handleCapture = async (imageBase64: string) => {
    if (!activeTask) return;
    
    setValidationLoading(true);
    const result = await validateObject(imageBase64, activeTask.targetObject);
    setValidationLoading(false);
    setValidationResult(result);

    if (result.isMatch) {
      setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, status: TaskStatus.COMPLETED } : t));
      // End task after a short delay to show success
      setTimeout(() => setActiveTaskId(null), 3000);
    } else {
      // In a real app we might increment failure counts
      setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, status: TaskStatus.FAILED } : t));
    }
  };

  // UI for Active Task (Navigation or Verification)
  if (activeTaskId && activeTask) {
    const isAtLocation = navState?.instruction === 'ARRIVED';

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col p-4 md:p-8">
        <header className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setActiveTaskId(null)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">RONDA ATIVA</h1>
            <p className="text-indigo-400 text-sm font-medium">{activeTask.name}</p>
          </div>
          <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
          </div>
        </header>

        <main className="flex-1 flex flex-col space-y-6 max-w-lg mx-auto w-full">
          {!isAtLocation ? (
            navState && <NavigationHud navState={navState} targetName={activeTask.name} />
          ) : (
            <div className="space-y-6">
              <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-2xl flex items-center space-x-4">
                <MapPin className="text-green-400 w-8 h-8" />
                <div>
                  <p className="text-green-100 font-bold">Local Alcançado!</p>
                  <p className="text-green-300/80 text-sm">Tire uma foto de: {activeTask.targetObject}</p>
                </div>
              </div>
              
              <CameraView onCapture={handleCapture} isLoading={validationLoading} />

              {validationResult && !validationLoading && (
                <div className={`p-4 rounded-2xl border ${validationResult.isMatch ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'} animate-in fade-in slide-in-from-bottom-4`}>
                  <div className="flex items-start space-x-3">
                    {validationResult.isMatch ? (
                      <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-lg">{validationResult.isMatch ? 'Sucesso!' : 'Falha na Verificação'}</p>
                      <p className="text-slate-300">{validationResult.reasoning}</p>
                      {!validationResult.isMatch && (
                        <p className="text-sm mt-2 text-red-400">Por favor, vá para o local correto ou tire nova foto.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      {/* Header */}
      <div className="bg-slate-800 p-6 pt-12 rounded-b-[40px] shadow-xl border-b border-slate-700">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">PatrolGuard AI</h1>
              <p className="text-slate-400">Sistema de Monitoramento Residencial</p>
            </div>
            <button className="p-3 bg-slate-700 rounded-2xl text-slate-300 hover:text-white transition-colors">
              <Settings className="w-6 h-6" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-600 p-4 rounded-3xl text-white">
              <div className="text-indigo-200 text-xs font-bold uppercase mb-1">Rondas Pendentes</div>
              <div className="text-3xl font-bold">{tasks.filter(t => t.status === TaskStatus.PENDING).length}</div>
            </div>
            <div className="bg-slate-700 p-4 rounded-3xl text-white">
              <div className="text-slate-400 text-xs font-bold uppercase mb-1">Concluídas</div>
              <div className="text-3xl font-bold">{tasks.filter(t => t.status === TaskStatus.COMPLETED).length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="max-w-4xl mx-auto p-6 space-y-6 mt-4">
        <h2 className="text-xl font-bold px-2 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          <span>Agenda de Hoje</span>
        </h2>

        {tasks.map(task => (
          <div 
            key={task.id}
            className={`group relative bg-slate-800 p-5 rounded-[32px] border-2 transition-all duration-300 ${
              task.status === TaskStatus.COMPLETED 
              ? 'border-green-500/30 bg-green-500/5' 
              : 'border-slate-700 hover:border-indigo-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-4 rounded-2xl ${
                  task.status === TaskStatus.COMPLETED ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                }`}>
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{task.name}</h3>
                  <div className="flex items-center space-x-2 text-slate-400 text-sm mt-1">
                    <Clock className="w-4 h-4" />
                    <span className="mono">{task.scheduledTime}</span>
                    <span>•</span>
                    <span>{task.targetObject}</span>
                  </div>
                </div>
              </div>

              {task.status === TaskStatus.COMPLETED ? (
                <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluído</span>
                </div>
              ) : (
                <button 
                  onClick={() => startTask(task.id)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Alarm Modal */}
      {alarmActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-indigo-600 w-full max-w-sm rounded-[40px] p-8 text-center shadow-2xl animate-pulse-ring relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-white/20 p-6 rounded-full mb-6">
                <Bell className="w-16 h-16 text-white animate-bounce" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">HORA DA RONDA!</h2>
              <p className="text-indigo-100 mb-8 opacity-90">Sua patrulha agendada começou agora. Por favor, inicie a operação.</p>
              
              <div className="flex flex-col w-full space-y-3">
                <button 
                  onClick={() => {
                    const due = tasks.find(t => t.status === TaskStatus.PENDING);
                    if (due) startTask(due.id);
                  }}
                  className="bg-white text-indigo-600 font-bold py-4 rounded-3xl text-xl shadow-xl active:scale-95 transition-transform"
                >
                  Iniciar Agora
                </button>
                <button 
                  onClick={() => setAlarmActive(false)}
                  className="text-indigo-200 font-medium py-3"
                >
                  Adiar 5 min
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Nav Bar */}
      <nav className="fixed bottom-0 inset-x-0 h-20 bg-slate-800 border-t border-slate-700 flex items-center justify-around px-6">
        <div className="flex flex-col items-center text-indigo-400">
          <ShieldCheck className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1 uppercase">Ronda</span>
        </div>
        <div className="flex flex-col items-center text-slate-500">
          <Clock className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1 uppercase text-slate-500">Histórico</span>
        </div>
        <div className="flex flex-col items-center text-slate-500">
          <MapPin className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1 uppercase text-slate-500">Locais</span>
        </div>
      </nav>
    </div>
  );
};

export default App;
