import { NextResponse } from 'next/server';
import { GeoPoint, VehicleType } from '@/types/route';
import { matchMajorRailwayCorridor, fetchOverpassRailwayRoute } from '@/services/railwayNetwork';

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

    // 1. Option B: Check major static corridors (0ms offline lookup)
    if (!waypoints || waypoints.length === 0) {
      const staticTrack = matchMajorRailwayCorridor(startPoint, endPoint);
      if (staticTrack && staticTrack.length >= 2) {
        return NextResponse.json({ coordinates: staticTrack, source: 'static-corridor' });
      }
    }

    // 2. Option A: Dynamic Overpass API query on Node server (has valid User-Agent, no CORS limits)
    try {
      const overpassTrack = await fetchOverpassRailwayRoute(startPoint, endPoint);
      if (overpassTrack && overpassTrack.length >= 2) {
        return NextResponse.json({ coordinates: overpassTrack, source: 'overpass-railway' });
      }
    } catch (err) {
      console.warn('Overpass server query error:', err);
    }

    // 3. Fallback: Ground corridor via OSRM (stays on ground passes/valleys, never an airplane arc)
    try {
      const allPoints = [startPoint, ...(waypoints || []), endPoint];
      const coordStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
      const res = await fetch(osrmUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates as [number, number][];
          if (coords.length >= 2) {
            return NextResponse.json({ coordinates: coords, source: 'ground-corridor' });
          }
        }
      }
    } catch (osrmErr) {
      console.warn('Server OSRM ground corridor fallback error:', osrmErr);
    }

    return NextResponse.json({ coordinates: null }, { status: 404 });
  } catch (err: any) {
    console.error('Railway API fatal error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
