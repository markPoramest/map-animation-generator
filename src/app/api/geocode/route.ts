import { NextResponse } from 'next/server';
import { GeoPoint } from '@/types/route';

// In-memory server cache to prevent hitting upstream geocoding providers repeatedly
const serverGeocodeCache = new Map<string, { data: GeoPoint[]; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = q.toLowerCase();
  const cached = serverGeocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.data, source: 'cache' });
  }

  const results: GeoPoint[] = [];
  const seen = new Set<string>();

  // 1. First attempt: ArcGIS World Geocoding (high availability, no 1 req/sec limit)
  try {
    const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
      q
    )}&maxLocations=7&outFields=Match_addr,City,Region,Country`;

    const res = await fetch(arcgisUrl, {
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const data = await res.json();
      for (const c of data.candidates || []) {
        if (!c.location || c.score < 50) continue;
        const key = `${c.location.y.toFixed(3)},${c.location.x.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const rawName = c.address || c.attributes?.Match_addr || q;
        const name = rawName.replace(/,.*$/, '').trim();
        const details = [c.attributes?.City, c.attributes?.Region, c.attributes?.Country].filter(Boolean).join(', ');

        results.push({
          name: name || rawName,
          lat: c.location.y,
          lng: c.location.x,
          subText: details || c.attributes?.Match_addr || '',
        });
      }
    }
  } catch (err: any) {
    console.warn('[Geocode API] ArcGIS search error:', err?.message || err);
  }

  // 2. Second attempt if needed: Nominatim with custom User-Agent
  if (results.length < 3) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q
      )}&limit=5&addressdetails=1`;

      const nomRes = await fetch(nomUrl, {
        headers: {
          'User-Agent': 'MapAnimationGenerator/1.0 (https://mapgen.marknonihontabi.com; contact: mark@marknonihontabi.com)',
          'Referer': 'https://mapgen.marknonihontabi.com/',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(3500),
      });

      if (nomRes.status === 429) {
        console.warn('[Geocode API] Nominatim returned 429 Too Many Requests, skipping');
      } else if (nomRes.ok) {
        const nomData = await nomRes.json();
        for (const item of nomData) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const parts = (item.display_name || '').split(',');
          results.push({
            name: parts[0]?.trim() || q,
            lat,
            lng,
            subText: parts.slice(1, 4).join(',').trim(),
          });
        }
      }
    } catch (err: any) {
      console.warn('[Geocode API] Nominatim search error:', err?.message || err);
    }
  }

  // Cache results
  if (results.length > 0) {
    if (serverGeocodeCache.size > 500) {
      // Evict oldest entries
      const firstKey = serverGeocodeCache.keys().next().value;
      if (firstKey) serverGeocodeCache.delete(firstKey);
    }
    serverGeocodeCache.set(cacheKey, { data: results, timestamp: Date.now() });
  }

  return NextResponse.json(
    { results: results.slice(0, 7) },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    }
  );
}
