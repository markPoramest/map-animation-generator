import * as turf from '@turf/turf';
import { GeoPoint, VehicleType, ModeCategory } from '@/types/route';
import { getRailwayRoute } from './railwayNetwork';

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
 * Attempt to get road/pedestrian/cycle path coordinates from OpenStreetMap / OSRM routing
 */
export async function fetchOSRMRoute(points: GeoPoint[], vehicle: VehicleType): Promise<[number, number][] | null> {
  if (vehicle === 'airplane' || vehicle === 'ship' || vehicle === 'train' || vehicle === 'shinkansen') {
    return null; // Airplane/ship use geodesics, train/shinkansen use railway network
  }

  const coordStr = points.map((p) => `${p.lng},${p.lat}`).join(';');
  
  // Profile routing URLs:
  // - 'walk': OpenStreetMap routed-foot (supports narrow alleys, footways, steps, pedestrian plazas & park trails)
  // - 'bicycle': OpenStreetMap routed-bike (supports cycleways, bike paths, and bike-friendly roads)
  // - 'car' / 'bus': OpenStreetMap routed-car and standard OSRM driving
  const candidateUrls: string[] = [];

  if (vehicle === 'walk') {
    candidateUrls.push(
      `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordStr}?overview=full&geometries=geojson`,
      `https://router.project-osrm.org/route/v1/walking/${coordStr}?overview=full&geometries=geojson`
    );
  } else if (vehicle === 'bicycle') {
    candidateUrls.push(
      `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${coordStr}?overview=full&geometries=geojson`,
      `https://router.project-osrm.org/route/v1/bicycle/${coordStr}?overview=full&geometries=geojson`
    );
  } else {
    candidateUrls.push(
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordStr}?overview=full&geometries=geojson`,
      `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`
    );
  }

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MapAnimator/1.0' },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates?.length > 1) {
          return data.routes[0].geometry.coordinates as [number, number][];
        }
      }
    } catch (err) {
      console.warn(`[Routing] Endpoint failed for ${vehicle} (${url}):`, err instanceof Error ? err.message : err);
    }
  }

  return null;
}

/**
 * Resolves the underlying transport mode for routing calculations.
 * When vehicle is 'custom', maps its modeCategory to the corresponding transport mode:
 * - 'train' / 'shinkansen' -> railway tracks
 * - 'flight' -> airplane great-circle flight arc with altitude curve
 * - 'ship' -> curved sea route
 * - 'car' / 'bus' -> road driving directions
 * - 'walk' / 'bicycle' -> walking/cycling paths
 */
export function resolveEffectiveTransportMode(
  vehicle: VehicleType,
  modeCategory?: ModeCategory
): VehicleType {
  if (vehicle !== 'custom') {
    return vehicle;
  }
  switch (modeCategory) {
    case 'flight':
      return 'airplane';
    case 'shinkansen':
      return 'shinkansen';
    case 'train':
      return 'train';
    case 'ship':
      return 'ship';
    case 'car':
      return 'car';
    case 'bus':
      return 'bus';
    case 'bicycle':
      return 'bicycle';
    case 'walk':
      return 'walk';
    default:
      return 'train';
  }
}

/**
 * Builds the full calculated route with high-density sample points and bearings
 */
export async function calculateRoute(
  startPoint: GeoPoint,
  endPoint: GeoPoint,
  waypoints: GeoPoint[] = [],
  vehicle: VehicleType = 'train',
  modeCategory?: ModeCategory
): Promise<CalculatedRoute> {
  const allPoints = [startPoint, ...waypoints, endPoint];
  const effectiveMode = resolveEffectiveTransportMode(vehicle, modeCategory);
  
  let rawCoords: [number, number][] | null = null;

  if (effectiveMode === 'train' || effectiveMode === 'shinkansen') {
    // Authentic railway track extraction (Option B static corridors -> Option A Overpass -> Fallback easement)
    rawCoords = await getRailwayRoute(startPoint, endPoint, waypoints, effectiveMode);
  } else if (effectiveMode === 'airplane' || effectiveMode === 'ship') {
    rawCoords = generateCurvedPath(allPoints, effectiveMode);
  } else {
    // Road networks for car, bus, bicycle, walk via OSRM
    rawCoords = await fetchOSRMRoute(allPoints, effectiveMode);
    if (!rawCoords || rawCoords.length < 2) {
      rawCoords = generateCurvedPath(allPoints, effectiveMode);
    }
  }

  // Ensure valid line
  if (!rawCoords || rawCoords.length < 2) {
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
    if (effectiveMode === 'airplane') {
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
    custom: 60,
  };
  const effectiveSpeed = speedKmh[effectiveMode] || 60;
  const estimatedTimeMin = Math.round((totalDistanceKm / effectiveSpeed) * 60);

  return {
    coordinates: rawCoords,
    samplePoints,
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    estimatedTimeMin: Math.max(1, estimatedTimeMin),
    bounds,
  };
}
