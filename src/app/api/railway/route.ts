import { NextResponse } from 'next/server';
import { GeoPoint, VehicleType } from '@/types/route';
import { matchMajorRailwayCorridor, fetchOverpassRailwayRoute, generateRailwayFallbackPath } from '@/services/railwayNetwork';
import { getStoredRoute, storeRoute } from '@/services/railwayCache';
import * as turf from '@turf/turf';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { startPoint, endPoint, waypoints = [], vehicle = 'train' } = body as {
      startPoint: GeoPoint;
      endPoint: GeoPoint;
      waypoints?: GeoPoint[];
      vehicle?: VehicleType;
    };

    if (!startPoint || !endPoint) {
      return NextResponse.json({ error: 'Missing startPoint or endPoint' }, { status: 400 });
    }

    console.log(`[Railway API] Request: ${startPoint.lat.toFixed(3)},${startPoint.lng.toFixed(3)} → ${endPoint.lat.toFixed(3)},${endPoint.lng.toFixed(3)} (${vehicle})`);

    // 0. Check database for stored railway route data
    if (!waypoints || waypoints.length === 0) {
      const stored = await getStoredRoute(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
      if (stored && stored.length >= 2) {
        // Route is stored bidirectionally — check if we need to reverse for correct direction
        const startCoord: [number, number] = [startPoint.lng, startPoint.lat];
        const firstStored = stored[0];
        const lastStored = stored[stored.length - 1];
        const distToFirst = Math.abs(firstStored[0] - startCoord[0]) + Math.abs(firstStored[1] - startCoord[1]);
        const distToLast = Math.abs(lastStored[0] - startCoord[0]) + Math.abs(lastStored[1] - startCoord[1]);

        const coordinates = distToFirst > distToLast ? [...stored].reverse() : stored;
        console.log('[Railway API] ✓ Database route found');
        return NextResponse.json({ coordinates, source: 'database' });
      }
    }

    // 1. Check major static corridors (0ms offline lookup)
    if (!waypoints || waypoints.length === 0) {
      const staticTrack = matchMajorRailwayCorridor(startPoint, endPoint);
      if (staticTrack && staticTrack.length >= 2) {
        console.log('[Railway API] ✓ Static corridor match found');
        // Store static corridor in database for future lookups
        const line = turf.lineString(staticTrack);
        const distKm = turf.length(line, { units: 'kilometers' });
        await storeRoute(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng, staticTrack, 'static-corridor', distKm);
        return NextResponse.json({ coordinates: staticTrack, source: 'static-corridor' });
      }
    }

    // 2. Dynamic Overpass API query (server-side with valid User-Agent)
    try {
      const overpassTrack = await fetchOverpassRailwayRoute(startPoint, endPoint);
      if (overpassTrack && overpassTrack.length >= 2) {
        console.log(`[Railway API] ✓ Overpass route found (${overpassTrack.length} points)`);
        // Store real railway data in database permanently
        const line = turf.lineString(overpassTrack);
        const distKm = turf.length(line, { units: 'kilometers' });
        await storeRoute(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng, overpassTrack, 'overpass-railway', distKm);
        return NextResponse.json({ coordinates: overpassTrack, source: 'overpass-railway' });
      }
      console.warn('[Railway API] Overpass returned no usable route');
    } catch (err) {
      console.error('[Railway API] Overpass query error:', err instanceof Error ? err.message : err);
    }

    // 3. Fallback: Railway bezier spline (NOT stored in DB — it's not real track data)
    console.warn('[Railway API] Using bezier spline fallback (no real track data found)');
    const fallbackCoords = generateRailwayFallbackPath(startPoint, endPoint, waypoints || [], vehicle);
    if (fallbackCoords && fallbackCoords.length >= 2) {
      return NextResponse.json({ coordinates: fallbackCoords, source: 'railway-bezier-fallback' });
    }

    return NextResponse.json({ coordinates: null }, { status: 404 });
  } catch (err: any) {
    console.error('[Railway API] Fatal error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
