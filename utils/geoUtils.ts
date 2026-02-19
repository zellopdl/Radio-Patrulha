
import { Coordinates, NavigationState } from '../types';

export const calculateDistance = (pos1: Coordinates, pos2: Coordinates): number => {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = pos1.latitude * Math.PI / 180;
  const φ2 = pos2.latitude * Math.PI / 180;
  const Δφ = (pos2.latitude - pos1.latitude) * Math.PI / 180;
  const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; 
};

export const calculateBearing = (pos1: Coordinates, pos2: Coordinates): number => {
  const φ1 = pos1.latitude * Math.PI / 180;
  const φ2 = pos2.latitude * Math.PI / 180;
  const λ1 = pos1.longitude * Math.PI / 180;
  const λ2 = pos2.longitude * Math.PI / 180;

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
          Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  
  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360; 
};

export const getNavigationInstruction = (
  current: Coordinates,
  target: Coordinates,
  distanceThreshold: number = 6.5
): NavigationState => {
  const distance = calculateDistance(current, target);
  const bearing = calculateBearing(current, target);
  
  if (distance < distanceThreshold) {
    return { distance, bearing, instruction: 'ARRIVED' };
  }

  // Se o heading for null (parado), assumimos que o dispositivo não está rotacionado
  const heading = current.heading ?? 0;
  let relativeBearing = (bearing - heading + 360) % 360;

  let instruction: NavigationState['instruction'] = 'STRAIGHT';
  
  // Faixas de decisão para as setas (mais agressivas para espaços internos)
  if (relativeBearing > 325 || relativeBearing <= 35) {
    instruction = 'STRAIGHT';
  } else if (relativeBearing > 35 && relativeBearing <= 145) {
    instruction = 'RIGHT';
  } else if (relativeBearing > 145 && relativeBearing <= 215) {
    instruction = 'BACK';
  } else {
    instruction = 'LEFT';
  }

  return { distance, bearing, instruction };
};
