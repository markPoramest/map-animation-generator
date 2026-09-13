import * as turf from '@turf/turf';
import { GeoPoint, VehicleType } from '@/types/route';

export interface RouteSamplePoint {
  lat: number;
  lng: number;
  bearing: number; // Angle in degrees (0 = North, 90 = East, 180 = South, 270 = West)
  distanceKmFromStart: number;
  progress: number; // 0.0 to 1.0
  altitudeOffset?: number; // for airplanes
}

export interface CalculatedRoute {
  coordinates: [number, number][]; // [lng, lat]
  samplePoints: RouteSamplePoint[];
  totalDistanceKm: number;
  estimatedTimeMin: number;
  bounds: [[number, number], [number, number]]; // [minLng, minLat], [maxLng, maxLat]
}

/**
 * Generates an interpolated spline path between start, waypoints, and end
 */
export function generateCurvedPath(points: GeoPoint[], vehicle: VehicleType): [number, number][] {
  if (points.length < 2) return [];

  const coords = points.map((p) => [p.lng, p.lat]);

  if (vehicle === 'airplane') {
    // Great circle flight arc
    const start = coords[0];
    const end = coords[coords.length - 1];
    const midLng = (start[0] + end[0]) / 2;
    const midLat = (start[1] + end[1]) / 2;
    
    // Add a natural flight curve perpendicular to direction
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Slight bulge to the north or perpendicular
    const curveMultiplier = Math.min(dist * 0.15, 6);
    const arcMidLat = midLat + curveMultiplier;
    
    const line = turf.lineString([start, [midLng, arcMidLat], end]);
    const curved = turf.bezierSpline(line, { resolution: 10000, sharpness: 0.85 });
    return curved.geometry.coordinates as [number, number][];
  }

  // Multi-point spline interpolation
  if (coords.length === 2) {
    // Generate intermediate points along terrain/realistic path
    const [p1, p2] = coords;
    const mid1 = [p1[0] * 0.66 + p2[0] * 0.34, p1[1] * 0.66 + p2[1] * 0.34];
    const mid2 = [p1[0] * 0.34 + p2[0] * 0.66, p1[1] * 0.34 + p2[1] * 0.66];
    
    // Minor natural curve
    const line = turf.lineString([p1, mid1, mid2, p2]);
    const curved = turf.bezierSpline(line, { resolution: 8000, sharpness: 0.9 });
    return curved.geometry.coordinates as [number, number][];
  }

  const line = turf.lineString(coords);
  const curved = turf.bezierSpline(line, { resolution: 8000, sharpness: 0.85 });
  return curved.geometry.coordinates as [number, number][];
}

/**
 * Attempt to get road/path coordinates from OSRM
 */
export async function fetchOSRMRoute(points: GeoPoint[], vehicle: VehicleType): Promise<[number, number][] | null> {
  if (vehicle === 'airplane' || vehicle === 'ship') {
    return null; // Always use curved geometric geodesics for air & sea
  }

  const coordStr = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const profile = (vehicle === 'walk' || vehicle === 'bicycle') ? 'walking' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordStr}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates as [number, number][];
      }
    }
  } catch (err) {
    console.warn('OSRM route fetch failed, falling back to curved spline:', err);
  }
  return null;
}

/**
 * Builds the full calculated route with high-density sample points and bearings
 */
export async function calculateRoute(
  startPoint: GeoPoint,
  endPoint: GeoPoint,
  waypoints: GeoPoint[] = [],
  vehicle: VehicleType = 'train'
): Promise<CalculatedRoute> {
  const allPoints = [startPoint, ...waypoints, endPoint];
  
  // Try OSRM first for land vehicles (cars, trains, bus, bike, walk)
  let rawCoords = await fetchOSRMRoute(allPoints, vehicle);
  
  if (!rawCoords || rawCoords.length < 2) {
    rawCoords = generateCurvedPath(allPoints, vehicle);
  }

  // Ensure valid line
  if (rawCoords.length < 2) {
    rawCoords = [[startPoint.lng, startPoint.lat], [endPoint.lng, endPoint.lat]];
  }

  const line = turf.lineString(rawCoords);
  const totalDistanceKm = turf.length(line, { units: 'kilometers' });

  // Calculate bounding box for initial camera framing
  const bbox = turf.bbox(line);
  const bounds: [[number, number], [number, number]] = [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[3]],
  ];

  // Discretize into smooth sample points (e.g. 600 steps)
  const STEPS = 600;
  const samplePoints: RouteSamplePoint[] = [];

  for (let i = 0; i <= STEPS; i++) {
    const progress = i / STEPS;
    const distance = progress * totalDistanceKm;
    const pt = turf.along(line, distance, { units: 'kilometers' });
    const coords = pt.geometry.coordinates;

    // Calculate heading/bearing to next point
    let bearing = 0;
    if (i < STEPS) {
      const nextDistance = Math.min((i + 1) / STEPS * totalDistanceKm, totalDistanceKm);
      const nextPt = turf.along(line, nextDistance, { units: 'kilometers' });
      bearing = turf.bearing(pt, nextPt);
    } else if (samplePoints.length > 0) {
      bearing = samplePoints[samplePoints.length - 1].bearing;
    }

    // Airplane parabola altitude curve
    let altitudeOffset = 0;
    if (vehicle === 'airplane') {
      // Parabolic arc peak at mid-flight
      altitudeOffset = Math.sin(progress * Math.PI) * 45;
    }

    samplePoints.push({
      lng: coords[0],
      lat: coords[1],
      bearing: (bearing + 360) % 360,
      distanceKmFromStart: distance,
      progress,
      altitudeOffset,
    });
  }

  // Average vehicle speed estimate in minutes
  const speedKmh: Record<VehicleType, number> = {
    shinkansen: 260,
    train: 75,
    car: 65,
    bus: 50,
    airplane: 800,
    bicycle: 20,
    walk: 5,
    ship: 35,
  };
  const estimatedTimeMin = Math.round((totalDistanceKm / (speedKmh[vehicle] || 60)) * 60);

  return {
    coordinates: rawCoords,
    samplePoints,
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    estimatedTimeMin: Math.max(1, estimatedTimeMin),
    bounds,
  };
}
