import { NextResponse } from 'next/server';
import { GeoPoint, VehicleType } from '@/types/route';
import { matchMajorRailwayCorridor, fetchOverpassRailwayRoute, generateRailwayFallbackPath } from '@/services/railwayNetwork';

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

    // 1. Option B: Check major static corridors (0ms offline lookup)
    if (!waypoints || waypoints.length === 0) {
      const staticTrack = matchMajorRailwayCorridor(startPoint, endPoint);
      if (staticTrack && staticTrack.length >= 2) {
        console.log('[Railway API] ✓ Static corridor match found');
        return NextResponse.json({ coordinates: staticTrack, source: 'static-corridor' });
      }
    }

    // 2. Option A: Dynamic Overpass API query on Node server (has valid User-Agent, no CORS limits)
    try {
      const overpassTrack = await fetchOverpassRailwayRoute(startPoint, endPoint);
      if (overpassTrack && overpassTrack.length >= 2) {
        console.log(`[Railway API] ✓ Overpass route found (${overpassTrack.length} points)`);
        return NextResponse.json({ coordinates: overpassTrack, source: 'overpass-railway' });
      }
      console.warn('[Railway API] Overpass returned no usable route');
    } catch (err) {
      console.error('[Railway API] Overpass query error:', err instanceof Error ? err.message : err);
    }

    // 3. Fallback: Railway bezier spline (smooth curve along the corridor, never follows roads)
    console.warn('[Railway API] Using bezier spline fallback (no API route found)');
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

