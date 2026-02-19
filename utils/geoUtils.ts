
import { Coordinates, NavigationState } from '../types';

export const calculateDistance = (pos1: Coordinates, pos2: Coordinates): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = pos1.latitude * Math.PI / 180;
  const φ2 = pos2.latitude * Math.PI / 180;
  const Δφ = (pos2.latitude - pos1.latitude) * Math.PI / 180;
  const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
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
  return (θ * 180 / Math.PI + 360) % 360; // Bearing in degrees
};

export const getNavigationInstruction = (
  current: Coordinates,
  target: Coordinates,
  distanceThreshold: number = 5
): NavigationState => {
  const distance = calculateDistance(current, target);
  const bearing = calculateBearing(current, target);
  
  if (distance < distanceThreshold) {
    return { distance, bearing, instruction: 'ARRIVED' };
  }

  // If we have heading from GPS, use it. Otherwise, assume device is pointing North for simplicity in this demo.
  const heading = current.heading ?? 0;
  let relativeBearing = (bearing - heading + 360) % 360;

  let instruction: NavigationState['instruction'] = 'STRAIGHT';
  
  if (relativeBearing > 315 || relativeBearing <= 45) {
    instruction = 'STRAIGHT';
  } else if (relativeBearing > 45 && relativeBearing <= 135) {
    instruction = 'RIGHT';
  } else if (relativeBearing > 135 && relativeBearing <= 225) {
    instruction = 'BACK';
  } else {
    instruction = 'LEFT';
  }

  return { distance, bearing, instruction };
};
