
export interface Coordinates {
  latitude: number;
  longitude: number;
  heading?: number | null;
  accuracy?: number | null;
}

export interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: number;
}

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  REGISTRY = 'REGISTRY',
  PATROL = 'PATROL'
}

export interface NavigationState {
  distance: number; // metros
  bearing: number; // graus
  instruction: 'STRAIGHT' | 'LEFT' | 'RIGHT' | 'BACK' | 'ARRIVED';
}
