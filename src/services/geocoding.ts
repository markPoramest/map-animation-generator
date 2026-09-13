import { GeoPoint } from '@/types/route';

// Quick offline fallback database for prominent stations and cities
const FALLBACK_POINTS: GeoPoint[] = [
  { name: 'Matsumoto Station', lat: 36.2307, lng: 137.9644, subText: 'Nagano, Japan' },
  { name: 'Kami-Suwa Station', lat: 36.0467, lng: 138.1165, subText: 'Suwa, Nagano, Japan' },
  { name: 'Shiojiri Station', lat: 36.1147, lng: 137.9482, subText: 'Nagano, Japan' },
  { name: 'Okaya Station', lat: 36.0569, lng: 138.0458, subText: 'Nagano, Japan' },
  { name: 'Tokyo Station', lat: 35.6812, lng: 139.7671, subText: 'Tokyo, Japan' },
  { name: 'Shinjuku Station', lat: 35.6896, lng: 139.7006, subText: 'Tokyo, Japan' },
  { name: 'Kyoto Station', lat: 34.9858, lng: 135.7588, subText: 'Kyoto, Japan' },
  { name: 'Shin-Osaka Station', lat: 34.7335, lng: 135.5003, subText: 'Osaka, Japan' },
  { name: 'Nagoya Station', lat: 35.1709, lng: 136.8815, subText: 'Aichi, Japan' },
  { name: 'Hakone-Yumoto Station', lat: 35.2335, lng: 139.1039, subText: 'Kanagawa, Japan' },
  { name: 'London St Pancras', lat: 51.5314, lng: -0.1261, subText: 'London, UK' },
  { name: 'Paris Gare du Nord', lat: 48.8809, lng: 2.3553, subText: 'Paris, France' },
  { name: 'JFK Airport New York', lat: 40.6413, lng: -73.7781, subText: 'New York, USA' },
  { name: 'Los Angeles LAX', lat: 33.9416, lng: -118.4085, subText: 'California, USA' },
  { name: 'Bangkok Suvarnabhumi', lat: 13.6900, lng: 100.7501, subText: 'Bangkok, Thailand' },
  { name: 'Singapore Changi', lat: 1.3644, lng: 103.9915, subText: 'Singapore' },
  { name: 'Sydney Central', lat: -33.8838, lng: 151.2069, subText: 'Sydney, Australia' },
];

export async function searchLocations(query: string): Promise<GeoPoint[]> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();

  // Check fallback matching first
  const localMatches = FALLBACK_POINTS.filter(
    (p) =>
      p.name.toLowerCase().includes(cleanQuery) ||
      (p.subText && p.subText.toLowerCase().includes(cleanQuery))
  );

  try {
    // Search using Photon API (fast, OSM based)
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`;
    const response = await fetch(photonUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const remoteResults: GeoPoint[] = data.features.map((f: any) => {
          const props = f.properties || {};
          const name = props.name || props.street || query;
          const details = [props.city, props.state, props.country].filter(Boolean).join(', ');
          return {
            name: name,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            subText: details || props.country || '',
          };
        });

        // Merge local matches on top without duplicates
        const seen = new Set<string>();
        const combined: GeoPoint[] = [];

        for (const item of [...localMatches, ...remoteResults]) {
          const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(item);
          }
        }
        return combined.slice(0, 7);
      }
    }
  } catch (err) {
    console.warn('Photon geocoding error or timeout, falling back to local/Nominatim:', err);
  }

  // Second fallback: Nominatim OSM
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=5&addressdetails=1`;
    const nomResponse = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'MapRouteAnimationStudio/1.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (nomResponse.ok) {
      const nomData = await nomResponse.json();
      const results: GeoPoint[] = nomData.map((item: any) => ({
        name: item.display_name.split(',')[0],
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        subText: item.display_name.split(',').slice(1, 3).join(',').trim(),
      }));
      return [...localMatches, ...results].slice(0, 7);
    }
  } catch {
    // return local matches
  }

  return localMatches;
}
