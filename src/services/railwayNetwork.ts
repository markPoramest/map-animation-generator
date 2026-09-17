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
 * 1. Attempts to find direct train route relations connecting origin and destination (ultra-fast & exact).
 * 2. Falls back to mainline railway ways (filtering out yard/siding service tracks to prevent 504s).
 * 3. Builds in-memory graph and runs fast PriorityQueue A* shortest path search.
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

  const straightDistKm = turf.distance(turf.point(start), turf.point(end), { units: 'kilometers' });
  const isServer = typeof window === 'undefined';
  const maxDistKm = isServer ? 800 : 200;

  if (straightDistKm > maxDistKm) {
    console.error(`[Railway] Route distance ${straightDistKm.toFixed(0)}km exceeds ${maxDistKm}km limit — skipping Overpass`);
    return null;
  }

  let waySegments: [number, number][][] = [];

  // Stage 1: Try direct train route relation query (matches through-train services like JR Hokuto, Shinkansen, TGV)
  console.log(`[Railway] Stage 1: Querying direct train relations connecting ${startPoint.name || 'origin'} and ${endPoint.name || 'destination'}...`);
  const relQuery = `[out:json][timeout:25];
relation["route"~"^(train|railway)$"](around:5000, ${start[1]}, ${start[0]}) -> .start_routes;
relation["route"~"^(train|railway)$"](around:5000, ${end[1]}, ${end[0]}) -> .end_routes;
(.start_routes; - (.start_routes; - .end_routes;););
out geom;`;

  try {
    const relData = await queryOverpass(relQuery, 25000);
    if (relData && relData.elements && relData.elements.length > 0) {
      const relations = relData.elements.filter((e: any) => e.type === 'relation' && Array.isArray(e.members));
      console.log(`[Railway] Stage 1 found ${relations.length} matching train relation(s)`);

      for (const rel of relations) {
        if (rel.tags?.name) {
          console.log(`[Railway] Using train relation: "${rel.tags.name}"`);
        }
        for (const m of rel.members) {
          if (m.type === 'way' && Array.isArray(m.geometry) && m.geometry.length >= 2) {
            waySegments.push(m.geometry.map((g: any) => [g.lon, g.lat]));
          }
        }
      }
    }
  } catch (relErr) {
    console.warn('[Railway] Stage 1 relation query exception:', relErr instanceof Error ? relErr.message : relErr);
  }

  // Stage 2: Fallback to mainline railway corridor bounding box query (excludes sidings and freight yards)
  if (waySegments.length === 0) {
    console.log(`[Railway] Stage 2: Querying mainline railway tracks in bounding corridor...`);
    const margin = Math.max(0.15, Math.min(0.5, straightDistKm * 0.003)); // 15km to 50km buffer for curves
    const minLat = Math.min(start[1], end[1]) - margin;
    const maxLat = Math.max(start[1], end[1]) + margin;
    const minLng = Math.min(start[0], end[0]) - margin;
    const maxLng = Math.max(start[0], end[0]) + margin;

    const bboxQuery = `[out:json][timeout:25];
(
  way["railway"="rail"][!"service"](${minLat},${minLng},${maxLat},${maxLng});
  way["railway"="narrow_gauge"][!"service"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;`;

    try {
      const bboxData = await queryOverpass(bboxQuery, 25000);
      if (bboxData && Array.isArray(bboxData.elements)) {
        for (const el of bboxData.elements) {
          if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 2) {
            if (el.tags && (el.tags.railway === 'abandoned' || el.tags.railway === 'disused')) continue;
            waySegments.push(el.geometry.map((g: any) => [g.lon, g.lat]));
          }
        }
        console.log(`[Railway] Stage 2 retrieved ${waySegments.length} mainline way segments`);
      }
    } catch (bboxErr) {
      console.error('[Railway] Stage 2 mainline query failed:', bboxErr instanceof Error ? bboxErr.message : bboxErr);
    }
  }

  if (waySegments.length === 0) {
    console.error('[Railway] No railway geometry retrieved from Overpass');
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

  for (const seg of waySegments) {
    for (let i = 0; i < seg.length - 1; i++) {
      addEdge(seg[i], seg[i + 1]);
    }
  }

  if (graph.size === 0) {
    console.error('[Railway] Graph is empty — no valid railway edges built');
    return null;
  }

  // Gap-bridging pass: connect dangling dead-ends (degree <= 2) across small gaps (< 250m)
  const BRIDGE_THRESHOLD_SQ = 0.0025 * 0.0025; // ~250m
  const GRID_SIZE = 0.003;
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
    if (degree > 2) continue; // Only bridge endpoints or dead-ends

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

  console.log(`[Railway] Graph: ${graph.size} nodes from ${waySegments.length} segments, bridge edges added: ${bridgeCount}`);

  // Snap start and end to nearest railway nodes
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
  console.log(`[Railway] Snap distances: start=${(startSnapDeg * 111).toFixed(2)}km, end=${(endSnapDeg * 111).toFixed(2)}km`);

  // Snap limit: ~15km
  if (!startNodeKey || !endNodeKey || startSnapDeg > 0.15 || endSnapDeg > 0.15) {
    console.error(`[Railway] Snap failed — station too far from railway network (start=${(startSnapDeg * 111).toFixed(1)}km, end=${(endSnapDeg * 111).toFixed(1)}km)`);
    return null;
  }

  if (startNodeKey === endNodeKey) {
    console.error('[Railway] Start and end snapped to the exact same node');
    return null;
  }

  // PriorityQueue A* Shortest Path Search
  const endCoord = keyToCoord.get(endNodeKey)!;
  function heuristic(nodeKey: string): number {
    const c = keyToCoord.get(nodeKey)!;
    return Math.sqrt(distanceSq(c, endCoord));
  }

  class PriorityQueue {
    heap: { node: string; priority: number }[] = [];
    push(node: string, priority: number) {
      this.heap.push({ node, priority });
      this._up(this.heap.length - 1);
    }
    pop(): string | null {
      if (this.heap.length === 0) return null;
      const top = this.heap[0];
      const bottom = this.heap.pop()!;
      if (this.heap.length > 0) {
        this.heap[0] = bottom;
        this._down(0);
      }
      return top.node;
    }
    _up(i: number) {
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (this.heap[i].priority < this.heap[p].priority) {
          [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
          i = p;
        } else break;
      }
    }
    _down(i: number) {
      const len = this.heap.length;
      while ((i << 1) + 1 < len) {
        let left = (i << 1) + 1;
        let right = left + 1;
        let best = left;
        if (right < len && this.heap[right].priority < this.heap[left].priority) best = right;
        if (this.heap[best].priority < this.heap[i].priority) {
          [this.heap[i], this.heap[best]] = [this.heap[best], this.heap[i]];
          i = best;
        } else break;
      }
    }
    get size() { return this.heap.length; }
  }

  const pq = new PriorityQueue();
  const gScore = new Map<string, number>();
  const previous = new Map<string, string>();
  const visited = new Set<string>();

  gScore.set(startNodeKey, 0);
  pq.push(startNodeKey, heuristic(startNodeKey));

  let foundPath: [number, number][] | null = null;
  let iterations = 0;
  const MAX_ITERATIONS = 300000;

  while (pq.size > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const current = pq.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

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

    const currentG = gScore.get(current)!;
    for (const neighbor of graph.get(current) || []) {
      if (visited.has(neighbor.to)) continue;
      const tentativeG = currentG + neighbor.dist;
      if (tentativeG < (gScore.get(neighbor.to) ?? Infinity)) {
        previous.set(neighbor.to, current);
        gScore.set(neighbor.to, tentativeG);
        pq.push(neighbor.to, tentativeG + heuristic(neighbor.to));
      }
    }
  }

  console.log(`[Railway] A* search: ${iterations} iterations, visited ${visited.size} nodes, path ${foundPath ? 'FOUND (' + foundPath.length + ' raw points)' : 'NOT FOUND'}`);

  if (foundPath && foundPath.length >= 2) {
    const rawLine = turf.lineString([start, ...foundPath, end]);
    // Simplify track to ~15m tolerance for clean visuals and smooth playback
    const simplified = turf.simplify(rawLine, { tolerance: 0.00015, highQuality: true });
    const finalRoute = simplified.geometry.coordinates as [number, number][];

    console.log(`[Railway] ✓ Dynamic route generated: ${finalRoute.length} points, distance: ${turf.length(rawLine, { units: 'kilometers' }).toFixed(1)} km`);
    overpassRouteCache.set(cacheKey, finalRoute);
    return finalRoute;
  }

  if (iterations >= MAX_ITERATIONS) {
    console.error('[Railway] A* exhausted max iterations — graph may be too complex');
  } else {
    console.error('[Railway] A* found no continuous path between stations');
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

