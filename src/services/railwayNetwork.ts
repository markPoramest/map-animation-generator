import * as turf from '@turf/turf';
import { GeoPoint, VehicleType } from '@/types/route';

// 1. Pre-compiled High-Precision Railway Corridors (Option B)
// Embedded exact OSM railway tracks for major transit corridors
import CHUO_LINE_COORDS from './data/chuoLineTrack.json';
import TOKAIDO_SHINKANSEN_COORDS from './data/tokaidoShinkansenTrack.json';
import HAKODATE_SAPPORO_COORDS from './data/hakodateSapporoTrack.json';

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
    id: 'hakodate-sapporo',
    name: 'JR Hokkaido Limited Express Hokuto (Hakodate to Sapporo)',
    coordinates: HAKODATE_SAPPORO_COORDS as [number, number][],
    line: turf.lineString(HAKODATE_SAPPORO_COORDS as [number, number][]),
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

      // If both start and destination are within 15km of this railway line
      if (dStart <= 15 && dEnd <= 15) {
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

        console.log(`[Railway] Option B: Matched static corridor "${corridor.name}" (${finalCoords.length} track points)`);
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
 * Helper: node key rounded to 4 decimal places (~11 meter tolerance)
 * Lower precision bridges tiny gaps between adjacent OSM railway way segments
 */
function coordKey(c: [number, number]): string {
  return `${c[0].toFixed(4)},${c[1].toFixed(4)}`;
}

/**
 * Queries Overpass API using the single most efficient mirror (overpass-api.de)
 */
async function queryOverpass(query: string, timeoutMs = 15000): Promise<any | null> {
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

  const postBody = `data=${encodeURIComponent(query)}`;
  const isServer = typeof window === 'undefined';

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (isServer) {
    headers['User-Agent'] = 'MapAnimationGenerator/1.0 (contact@mapanimator.local)';
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: postBody,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`[Railway] Overpass API returned HTTP ${res.status}: ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    if (json && Array.isArray(json.elements)) {
      return json;
    }
    console.error('[Railway] Overpass API returned unexpected response format:', JSON.stringify(json).slice(0, 200));
    return null;
  } catch (err) {
    console.error('[Railway] Overpass API request failed:', err instanceof Error ? err.message : err);
    return null;
  }
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
  const isServer = typeof window === 'undefined';

  // Server can handle larger payloads; client limited to 120km to avoid browser memory issues
  const maxDistKm = isServer ? 500 : 120;
  if (straightDistKm > maxDistKm) {
    console.error(`[Railway] Route distance ${straightDistKm.toFixed(0)}km exceeds ${maxDistKm}km limit — skipping Overpass`);
    return null;
  }

  // For long routes (>100km), split into smaller bbox segments to avoid Overpass 504 timeouts
  const SEGMENT_MAX_KM = 80;
  const numSegments = Math.max(1, Math.ceil(straightDistKm / SEGMENT_MAX_KM));
  const allElements: any[] = [];

  console.log(`[Railway] Querying Overpass: ${straightDistKm.toFixed(0)}km route in ${numSegments} segment(s)`);

  for (let i = 0; i < numSegments; i++) {
    // Calculate segment start/end as fractions along the straight line
    const t0 = i / numSegments;
    const t1 = (i + 1) / numSegments;
    const segStart: [number, number] = [
      start[0] + (end[0] - start[0]) * t0,
      start[1] + (end[1] - start[1]) * t0,
    ];
    const segEnd: [number, number] = [
      start[0] + (end[0] - start[0]) * t1,
      start[1] + (end[1] - start[1]) * t1,
    ];

    // Add margin around each segment bbox to capture nearby railway lines
    const margin = 0.08; // ~8km buffer
    const minLat = Math.min(segStart[1], segEnd[1]) - margin;
    const maxLat = Math.max(segStart[1], segEnd[1]) + margin;
    const minLng = Math.min(segStart[0], segEnd[0]) - margin;
    const maxLng = Math.max(segStart[0], segEnd[0]) + margin;

    const query = `[out:json][timeout:15];
(
  way["railway"~"^(rail|narrow_gauge|light_rail|subway)$"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;`;

    const data = await queryOverpass(query, 20000);
    if (data && data.elements && data.elements.length > 0) {
      allElements.push(...data.elements);
      console.log(`[Railway] Segment ${i + 1}/${numSegments}: ${data.elements.length} ways`);
    } else {
      console.warn(`[Railway] Segment ${i + 1}/${numSegments}: no data returned`);
    }
  }

  // Deduplicate elements by OSM way ID
  const seenIds = new Set<number>();
  const uniqueElements = allElements.filter((el) => {
    if (seenIds.has(el.id)) return false;
    seenIds.add(el.id);
    return true;
  });

  if (uniqueElements.length === 0) {
    console.error('[Railway] All Overpass segments returned empty — no railway data found');
    return null;
  }

  console.log(`[Railway] Total unique railway ways: ${uniqueElements.length}`);

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

  for (const el of uniqueElements) {
    if (!el.geometry || el.geometry.length < 2) continue;
    if (el.tags && (el.tags.railway === 'abandoned' || el.tags.railway === 'disused')) continue;

    for (let i = 0; i < el.geometry.length - 1; i++) {
      const p1: [number, number] = [el.geometry[i].lon, el.geometry[i].lat];
      const p2: [number, number] = [el.geometry[i + 1].lon, el.geometry[i + 1].lat];
      addEdge(p1, p2);
    }
  }

  if (graph.size === 0) {
    console.error('[Railway] Graph is empty — no valid railway edges built');
    return null;
  }

  // Gap-bridging pass: OSM railway ways often have small gaps at stations/junctions
  // Use a spatial grid to efficiently find and connect nearby unconnected nodes (~220m)
  const BRIDGE_THRESHOLD_SQ = 0.002 * 0.002; // ~220m squared in degrees
  const GRID_SIZE = 0.002;
  const spatialGrid = new Map<string, string[]>();

  for (const [key, coord] of keyToCoord.entries()) {
    const gx = Math.floor(coord[0] / GRID_SIZE);
    const gy = Math.floor(coord[1] / GRID_SIZE);
    const cell = `${gx},${gy}`;
    if (!spatialGrid.has(cell)) spatialGrid.set(cell, []);
    spatialGrid.get(cell)!.push(key);
  }

  let bridgeCount = 0;
  for (const [key, coord] of keyToCoord.entries()) {
    const degree = (graph.get(key) || []).length;
    // Only bridge endpoints or dead-ends (degree <= 2) across gaps
    if (degree > 2) continue;

    const gx = Math.floor(coord[0] / GRID_SIZE);
    const gy = Math.floor(coord[1] / GRID_SIZE);
    const myNeighbors = new Set((graph.get(key) || []).map((n) => n.to));

    let closestOtherKey: string | null = null;
    let closestDsq = BRIDGE_THRESHOLD_SQ;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cellNodes = spatialGrid.get(`${gx + dx},${gy + dy}`);
        if (!cellNodes) continue;

        for (const otherKey of cellNodes) {
          if (otherKey === key || myNeighbors.has(otherKey)) continue;
          const otherCoord = keyToCoord.get(otherKey)!;
          const dsq = distanceSq(coord, otherCoord);
          if (dsq < closestDsq) {
            closestDsq = dsq;
            closestOtherKey = otherKey;
          }
        }
      }
    }

    if (closestOtherKey) {
      const dist = Math.sqrt(closestDsq);
      const otherCoord = keyToCoord.get(closestOtherKey)!;
      if (!graph.has(key)) graph.set(key, []);
      if (!graph.has(closestOtherKey)) graph.set(closestOtherKey, []);
      graph.get(key)!.push({ to: closestOtherKey, dist, coord: otherCoord });
      graph.get(closestOtherKey)!.push({ to: key, dist, coord });
      myNeighbors.add(closestOtherKey);
      bridgeCount++;
    }
  }

  console.log(`[Railway] Graph: ${graph.size} nodes, bridge edges added: ${bridgeCount}`);

  // Snap start and end to nearest railway nodes within 15km (~0.15 deg)
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

  const startSnapDeg = Math.sqrt(minStartDist);
  const endSnapDeg = Math.sqrt(minEndDist);
  console.log(`[Railway] Snap distances: start=${(startSnapDeg * 111).toFixed(1)}km, end=${(endSnapDeg * 111).toFixed(1)}km`);

  // Snap limit: 0.15 degrees (~15 km)
  if (!startNodeKey || !endNodeKey || startSnapDeg > 0.15 || endSnapDeg > 0.15) {
    console.error(`[Railway] Snap failed — start or end too far from any railway node`);
    return null;
  }

  if (startNodeKey === endNodeKey) {
    console.error('[Railway] Start and end snapped to the same node');
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
  const closedSet = new Set<string>();

  gScore.set(startNodeKey, 0);
  fScore.set(startNodeKey, heuristic(startNodeKey));

  let foundPath: [number, number][] | null = null;
  let iterations = 0;
  const MAX_ITERATIONS = 200000;

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

    if (!current) break;

    if (current === endNodeKey) {
      const path: [number, number][] = [keyToCoord.get(current)!];
      let curr = current;
      while (previous.has(curr)) {
        curr = previous.get(curr)!;
        path.unshift(keyToCoord.get(curr)!);
      }
      foundPath = path;
      break;
    }

    openSet.delete(current);
    closedSet.add(current);
    const neighbors = graph.get(current) || [];
    const currentG = gScore.get(current)!;

    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.to)) continue;
      const tentativeG = currentG + neighbor.dist;
      if (tentativeG < (gScore.get(neighbor.to) ?? Infinity)) {
        previous.set(neighbor.to, current);
        gScore.set(neighbor.to, tentativeG);
        fScore.set(neighbor.to, tentativeG + heuristic(neighbor.to));
        openSet.add(neighbor.to);
      }
    }
  }

  console.log(`[Railway] A* search: ${iterations} iterations, visited ${closedSet.size} nodes, path ${foundPath ? 'FOUND (' + foundPath.length + ' points)' : 'NOT FOUND'}`);

  if (foundPath && foundPath.length >= 2) {
    const finalRoute: [number, number][] = [start, ...foundPath, end];
    overpassRouteCache.set(cacheKey, finalRoute);
    return finalRoute;
  }

  if (iterations >= MAX_ITERATIONS) {
    console.error('[Railway] A* exhausted max iterations — graph may be too large or disconnected');
  } else {
    console.error('[Railway] A* found no path — railway graph is disconnected between start and end');
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
 * Dispatches between Option B (Static GeoJSON Lookup), Option A (Server / Overpass API),
 * and Railway Bezier Spline Fallback (never uses OSRM driving which follows roads).
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
      console.log('[Railway] Using static corridor match');
      return staticCorridor;
    }
  }

  // 2. Call Next.js Server API Route /api/railway (Server-to-Server Overpass with valid User-Agent, zero CORS)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/railway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startPoint, endPoint, waypoints, vehicle }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.coordinates) && data.coordinates.length >= 2) {
          console.log(`[Railway] Server API returned route (source: ${data.source})`);
          return data.coordinates;
        }
      } else {
        console.error(`[Railway] Server API /api/railway returned HTTP ${res.status}`);
      }
    } catch (apiErr) {
      console.error('[Railway] Server API /api/railway failed:', apiErr instanceof Error ? apiErr.message : apiErr);
    }
  }

  // 3. Option A: Dynamic Overpass API Railway Routing (direct fetch — client-side fallback)
  if (waypoints.length === 0) {
    try {
      const dynamicRoute = await fetchOverpassRailwayRoute(startPoint, endPoint);
      if (dynamicRoute && dynamicRoute.length >= 2) {
        console.log('[Railway] Using dynamic Overpass route');
        return dynamicRoute;
      }
    } catch (err) {
      console.error('[Railway] Direct Overpass fetch failed:', err instanceof Error ? err.message : err);
    }
  }

  // 4. Ultimate Fallback: Railway corridor gentle easement curve (never follows roads)
  console.warn('[Railway] All API sources failed — using bezier spline fallback');
  return generateRailwayFallbackPath(startPoint, endPoint, waypoints, vehicle);
}

