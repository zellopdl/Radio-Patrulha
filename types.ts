
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
  referenceImage?: string; // Base64 da foto de referência para AR
  createdAt: number;
}

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  REGISTRY = 'REGISTRY',
  PATROL = 'PATROL'
}

export interface NavigationState {
  distance: number;
  bearing: number;
  instruction: 'STRAIGHT' | 'LEFT' | 'RIGHT' | 'BACK' | 'ARRIVED';
}
