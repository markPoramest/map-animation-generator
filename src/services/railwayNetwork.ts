import * as turf from '@turf/turf';
import { GeoPoint, VehicleType } from '@/types/route';

// 1. Pre-compiled High-Precision Railway Corridors (Option B)
// Embedded exact OSM railway tracks for major transit corridors
import CHUO_LINE_COORDS from './data/chuoLineTrack.json';
import TOKAIDO_SHINKANSEN_COORDS from './data/tokaidoShinkansenTrack.json';

// Curated High Speed 1 + Channel Tunnel + LGV Nord (Eurostar corridor)
const EUROSTAR_COORDS: [number, number][] = [
  [-0.1261, 51.5314], // St Pancras Intl (London)
  [-0.0502, 51.5365],
  [-0.0076, 51.5420], // Stratford Intl
  [0.1245, 51.5123],
  [0.2456, 51.4812],
  [0.3208, 51.4428], // Ebbsfleet Intl
  [0.4512, 51.3789],
  [0.6123, 51.2912],
  [0.7512, 51.2045],
  [0.8752, 51.1436], // Ashford Intl
  [0.9856, 51.1123],
  [1.1500, 51.0934], // Folkestone (UK Portal)
  [1.3200, 51.0450], // Channel Tunnel undersea
  [1.5100, 50.9900], // Mid-Channel
  [1.6800, 50.9450],
  [1.8105, 50.9234], // Coquelles (France Portal)
  [1.8123, 50.9025], // Calais-Fréthun
  [1.9567, 50.8123],
  [2.1543, 50.6512],
  [2.3412, 50.4123],
  [2.5123, 50.1543],
  [2.7123, 49.9812],
  [2.8315, 49.8590], // Haute-Picardie TGV
  [2.7845, 49.6512],
  [2.6512, 49.4123],
  [2.5412, 49.2156],
  [2.4512, 49.0512],
  [2.4012, 48.9612],
  [2.3712, 48.9123],
  [2.3553, 48.8809], // Paris Gare du Nord
];

interface RailwayCorridor {
  id: string;
  name: string;
  coordinates: [number, number][];
  line: ReturnType<typeof turf.lineString>;
}

const STATIC_CORRIDORS: RailwayCorridor[] = [
  {
    id: 'chuo-line',
    name: 'JR East Chuo Main Line / Shinonoi Line',
    coordinates: CHUO_LINE_COORDS as [number, number][],
    line: turf.lineString(CHUO_LINE_COORDS as [number, number][]),
  },
  {
    id: 'tokaido-shinkansen',
    name: 'JR Tokaido Shinkansen (Tokyo to Shin-Osaka)',
    coordinates: TOKAIDO_SHINKANSEN_COORDS as [number, number][],
    line: turf.lineString(TOKAIDO_SHINKANSEN_COORDS as [number, number][]),
  },
  {
    id: 'eurostar',
    name: 'Eurostar (London - Channel Tunnel - Paris)',
    coordinates: EUROSTAR_COORDS,
    line: turf.lineString(EUROSTAR_COORDS),
  },
];

/**
 * Option B: Matches start and destination points against major railway corridors
 * using turf.pointToLineDistance. If both stations are within 12km of the line,
 * slices the exact track geometry via turf.lineSlice.
 */
export function matchMajorRailwayCorridor(
  startPoint: GeoPoint,
  endPoint: GeoPoint
): [number, number][] | null {
  const startPt = turf.point([startPoint.lng, startPoint.lat]);
  const endPt = turf.point([endPoint.lng, endPoint.lat]);

  for (const corridor of STATIC_CORRIDORS) {
    try {
      const dStart = turf.pointToLineDistance(startPt, corridor.line, { units: 'kilometers' });
      const dEnd = turf.pointToLineDistance(endPt, corridor.line, { units: 'kilometers' });

      // If both start and destination are within 12km of this railway line
      if (dStart <= 12 && dEnd <= 12) {
        const sliced = turf.lineSlice(startPt, endPt, corridor.line);
        let coords = sliced.geometry.coordinates as [number, number][];

        if (coords.length < 2) continue;

        // Check direction: verify first point is closer to start than end
        const distStartToFirst = turf.distance(startPt, turf.point(coords[0]));
        const distStartToLast = turf.distance(startPt, turf.point(coords[coords.length - 1]));

        if (distStartToFirst > distStartToLast) {
          coords = [...coords].reverse();
        }

        // Seamless station snapping: prepend exact start point and append exact end point
        const finalCoords: [number, number][] = [
          [startPoint.lng, startPoint.lat],
          ...coords,
          [endPoint.lng, endPoint.lat],
        ];

        return finalCoords;
      }
    } catch (err) {
      console.warn(`Error matching corridor ${corridor.name}:`, err);
    }
  }

  return null;
}

// In-memory cache for dynamic Overpass railway queries
const overpassRouteCache = new Map<string, [number, number][]>();

/**
 * Helper: distance squared in degrees
 */
function distanceSq(c1: [number, number], c2: [number, number]): number {
  const dx = c1[0] - c2[0];
  const dy = c1[1] - c2[1];
  return dx * dx + dy * dy;
}

/**
 * Helper: node key rounded to 5 decimal places (~1.1 meter tolerance)
 */
function coordKey(c: [number, number]): string {
  return `${c[0].toFixed(5)},${c[1].toFixed(5)}`;
}

/**
 * Queries Overpass API across multiple public mirrors with timeout failover
 */
async function queryOverpassWithFailover(query: string, timeoutMs = 8000): Promise<any | null> {
  const mirrors = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  for (const mirror of mirrors) {
    try {
      const url = `${mirror}?data=${encodeURIComponent(query)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MapAnimationGenerator/1.0' },
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.elements)) {
          return json;
        }
      }
    } catch {
      // Try next mirror
    }
  }
  return null;
}

/**
 * Option A: Dynamic Overpass API Railway Routing
 * Queries OSM railway ways (`way["railway"~"rail|narrow_gauge|light_rail|subway"]`),
 * builds an in-memory railway topology graph, and runs A* search.
 */
export async function fetchOverpassRailwayRoute(
  startPoint: GeoPoint,
  endPoint: GeoPoint
): Promise<[number, number][] | null> {
  const start: [number, number] = [startPoint.lng, startPoint.lat];
  const end: [number, number] = [endPoint.lng, endPoint.lat];

  const cacheKey = `${start[0].toFixed(4)},${start[1].toFixed(4)}_to_${end[0].toFixed(4)},${end[1].toFixed(4)}`;
  if (overpassRouteCache.has(cacheKey)) {
    return overpassRouteCache.get(cacheKey)!;
  }

  // Calculate approximate straight-line distance
  const straightDistKm = turf.distance(turf.point(start), turf.point(end), { units: 'kilometers' });

  // If distance exceeds 120km, Overpass bbox payload is too large (>10MB). Skip to fallback.
  if (straightDistKm > 120) {
    return null;
  }

  const margin = Math.max(0.04, Math.min(0.12, straightDistKm * 0.0015));
  const minLat = Math.min(start[1], end[1]) - margin;
  const maxLat = Math.max(start[1], end[1]) + margin;
  const minLng = Math.min(start[0], end[0]) - margin;
  const maxLng = Math.max(start[0], end[0]) + margin;

  const query = `[out:json][timeout:10];
(
  way["railway"~"^(rail|narrow_gauge|light_rail|subway)$"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;`;

  const data = await queryOverpassWithFailover(query, 7000);
  if (!data || !data.elements || data.elements.length === 0) {
    return null;
  }

  // Build in-memory topology graph
  const graph = new Map<string, { to: string; dist: number; coord: [number, number] }[]>();
  const keyToCoord = new Map<string, [number, number]>();

  function addEdge(p1: [number, number], p2: [number, number]) {
    const k1 = coordKey(p1);
    const k2 = coordKey(p2);
    if (k1 === k2) return;

    keyToCoord.set(k1, p1);
    keyToCoord.set(k2, p2);

    const dist = Math.sqrt(distanceSq(p1, p2));
    if (!graph.has(k1)) graph.set(k1, []);
    if (!graph.has(k2)) graph.set(k2, []);

    graph.get(k1)!.push({ to: k2, dist, coord: p2 });
    graph.get(k2)!.push({ to: k1, dist, coord: p1 });
  }

  for (const el of data.elements) {
    if (!el.geometry || el.geometry.length < 2) continue;
    if (el.tags && (el.tags.railway === 'abandoned' || el.tags.railway === 'disused')) continue;

    for (let i = 0; i < el.geometry.length - 1; i++) {
      const p1: [number, number] = [el.geometry[i].lon, el.geometry[i].lat];
      const p2: [number, number] = [el.geometry[i + 1].lon, el.geometry[i + 1].lat];
      addEdge(p1, p2);
    }
  }

  if (graph.size === 0) return null;

  // Snap start and end to nearest railway nodes within 5km (~0.05 deg)
  let startNodeKey: string | null = null;
  let minStartDist = Infinity;
  let endNodeKey: string | null = null;
  let minEndDist = Infinity;

  for (const [k, coord] of keyToCoord.entries()) {
    const dStart = distanceSq(coord, start);
    if (dStart < minStartDist) {
      minStartDist = dStart;
      startNodeKey = k;
    }
    const dEnd = distanceSq(coord, end);
    if (dEnd < minEndDist) {
      minEndDist = dEnd;
      endNodeKey = k;
    }
  }

  // Snap limit: 0.05 degrees (~5 km)
  if (!startNodeKey || !endNodeKey || Math.sqrt(minStartDist) > 0.05 || Math.sqrt(minEndDist) > 0.05) {
    return null;
  }

  // A* Shortest Path Search
  const endCoord = keyToCoord.get(endNodeKey)!;
  function heuristic(nodeKey: string): number {
    const c = keyToCoord.get(nodeKey)!;
    return Math.sqrt(distanceSq(c, endCoord));
  }

  const previous = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const openSet = new Set<string>([startNodeKey]);

  gScore.set(startNodeKey, 0);
  fScore.set(startNodeKey, heuristic(startNodeKey));

  let foundPath: [number, number][] | null = null;
  let iterations = 0;
  const MAX_ITERATIONS = 40000;

  while (openSet.size > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    let current: string | null = null;
    let lowestF = Infinity;

    for (const node of openSet) {
      const f = fScore.get(node) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = node;
      }
    }

    if (!current || current === endNodeKey) {
      if (current === endNodeKey) {
        const path: [number, number][] = [keyToCoord.get(current)!];
        let curr = current;
        while (previous.has(curr)) {
          curr = previous.get(curr)!;
          path.unshift(keyToCoord.get(curr)!);
        }
        foundPath = path;
      }
      break;
    }

    openSet.delete(current);
    const neighbors = graph.get(current) || [];
    const currentG = gScore.get(current)!;

    for (const neighbor of neighbors) {
      const tentativeG = currentG + neighbor.dist;
      if (tentativeG < (gScore.get(neighbor.to) ?? Infinity)) {
        previous.set(neighbor.to, current);
        gScore.set(neighbor.to, tentativeG);
        fScore.set(neighbor.to, tentativeG + heuristic(neighbor.to));
        openSet.add(neighbor.to);
      }
    }
  }

  if (foundPath && foundPath.length >= 2) {
    const finalRoute: [number, number][] = [start, ...foundPath, end];
    overpassRouteCache.set(cacheKey, finalRoute);
    return finalRoute;
  }

  return null;
}

/**
 * Task 2: Railway Fallback Mechanism
 * If railway track data cannot be queried dynamically, snap start/destination
 * coordinates to a smooth railway easement curve (never car highways).
 * Railway tracks have large curve radii, gentle tangents, and direct tunneling.
 */
export function generateRailwayFallbackPath(
  startPoint: GeoPoint,
  endPoint: GeoPoint,
  waypoints: GeoPoint[] = [],
  vehicle: VehicleType = 'train'
): [number, number][] {
  const points = [startPoint, ...waypoints, endPoint];
  const coords = points.map((p) => [p.lng, p.lat] as [number, number]);

  if (coords.length < 2) {
    return [[startPoint.lng, startPoint.lat], [endPoint.lng, endPoint.lat]];
  }

  // If 2 points, generate natural railway corridor with gentle terrain transition
  if (coords.length === 2) {
    const [p1, p2] = coords;
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Railway tracks follow natural valleys: generate gentle intermediate easing
    const mid1: [number, number] = [
      p1[0] + dx * 0.33 + dy * 0.02,
      p1[1] + dy * 0.33 - dx * 0.02,
    ];
    const mid2: [number, number] = [
      p1[0] + dx * 0.67 - dy * 0.015,
      p1[1] + dy * 0.67 + dx * 0.015,
    ];

    const line = turf.lineString([p1, mid1, mid2, p2]);
    const sharpness = vehicle === 'shinkansen' ? 0.95 : 0.88;
    const curved = turf.bezierSpline(line, { resolution: 10000, sharpness });
    return curved.geometry.coordinates as [number, number][];
  }

  const line = turf.lineString(coords);
  const sharpness = vehicle === 'shinkansen' ? 0.95 : 0.88;
  const curved = turf.bezierSpline(line, { resolution: 10000, sharpness });
  return curved.geometry.coordinates as [number, number][];
}

/**
 * Master Railway Route Resolver:
 * Dispatches between Option B (Static GeoJSON Lookup), Option A (Overpass API),
 * and Fallback Mechanism (Railway spline).
 */
export async function getRailwayRoute(
  startPoint: GeoPoint,
  endPoint: GeoPoint,
  waypoints: GeoPoint[] = [],
  vehicle: VehicleType = 'train'
): Promise<[number, number][]> {
  // 1. Option B: Check major static railway corridors (0ms, 100% offline & reliable)
  if (waypoints.length === 0) {
    const staticCorridor = matchMajorRailwayCorridor(startPoint, endPoint);
    if (staticCorridor && staticCorridor.length >= 2) {
      return staticCorridor;
    }
  }

  // 2. Option A: Dynamic Overpass API Railway Routing
  if (waypoints.length === 0) {
    try {
      const dynamicRoute = await fetchOverpassRailwayRoute(startPoint, endPoint);
      if (dynamicRoute && dynamicRoute.length >= 2) {
        return dynamicRoute;
      }
    } catch (err) {
      console.warn('Overpass railway fetch failed, proceeding to railway fallback:', err);
    }
  }

  // 3. Fallback: Railway corridor snapping & gentle railway easement (never car roads)
  return generateRailwayFallbackPath(startPoint, endPoint, waypoints, vehicle);
}
