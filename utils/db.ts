
import { SavedLocation } from '../types';

const STORAGE_KEY = 'patrol_guard_locations';

export const db = {
  getLocations: (): SavedLocation[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Erro ao ler DB:", e);
      return [];
    }
  },
  saveLocation: (loc: Omit<SavedLocation, 'id' | 'createdAt'>) => {
    const locations = db.getLocations();
    const newLoc: SavedLocation = {
      ...loc,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      createdAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...locations, newLoc]));
    return newLoc;
  },
  deleteLocation: (id: string) => {
    const locations = db.getLocations().filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
  }
};
