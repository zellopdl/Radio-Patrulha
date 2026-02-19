
export interface Coordinates {
  latitude: number;
  longitude: number;
  heading?: number | null;
}

export enum TaskStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  VALIDATING = 'VALIDATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface PatrolTask {
  id: string;
  name: string;
  targetObject: string;
  targetLocation: Coordinates;
  scheduledTime: string; // HH:mm
  status: TaskStatus;
  lastAttempt?: string;
}

export interface NavigationState {
  distance: number; // meters
  bearing: number; // degrees from North
  instruction: 'STRAIGHT' | 'LEFT' | 'RIGHT' | 'BACK' | 'ARRIVED';
}
