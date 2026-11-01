import { GeoPoint } from '@/types/route';

// Comprehensive offline fallback database for prominent Japanese stations and world hubs
export const FALLBACK_POINTS: GeoPoint[] = [
  // Hokkaido & Tohoku
  { name: 'Sapporo Station', lat: 43.0687, lng: 141.3508, subText: 'Hokkaido, Japan' },
  { name: 'Shin-Sapporo Station', lat: 43.0387, lng: 141.4398, subText: 'Sapporo, Hokkaido, Japan' },
  { name: 'Otaru Station', lat: 43.1974, lng: 140.9939, subText: 'Hokkaido, Japan' },
  { name: 'Asahikawa Station', lat: 43.7628, lng: 142.3588, subText: 'Hokkaido, Japan' },
  { name: 'Hakodate Station', lat: 41.7738, lng: 140.7264, subText: 'Hokkaido, Japan' },
  { name: 'Shin-Hakodate-Hokuto Station', lat: 41.9050, lng: 140.6483, subText: 'Hokuto, Hokkaido, Japan' },
  { name: 'Oshamambe Station', lat: 42.5118, lng: 140.3752, subText: 'Hokkaido, Japan' },
  { name: 'Higashi-Muroran Station', lat: 42.3523, lng: 141.0345, subText: 'Muroran, Hokkaido, Japan' },
  { name: 'Tomakomai Station', lat: 42.6393, lng: 141.6046, subText: 'Hokkaido, Japan' },
  { name: 'Minami-Chitose Station', lat: 42.8087, lng: 141.6756, subText: 'Chitose, Hokkaido, Japan' },
  { name: 'Shin-Aomori Station', lat: 40.8279, lng: 140.6935, subText: 'Aomori, Japan' },
  { name: 'Aomori Station', lat: 40.8299, lng: 140.7334, subText: 'Aomori, Japan' },
  { name: 'Hachinohe Station', lat: 40.5090, lng: 141.4316, subText: 'Aomori, Japan' },
  { name: 'Morioka Station', lat: 39.7013, lng: 141.1367, subText: 'Iwate, Japan' },
  { name: 'Sendai Station', lat: 38.2601, lng: 140.8824, subText: 'Miyagi, Japan' },
  { name: 'Koriyama Station', lat: 37.3980, lng: 140.3883, subText: 'Fukushima, Japan' },
  { name: 'Fukushima Station', lat: 37.7548, lng: 140.4593, subText: 'Fukushima, Japan' },
  { name: 'Akita Station', lat: 39.7169, lng: 140.1299, subText: 'Akita, Japan' },
  { name: 'Yamagata Station', lat: 38.2483, lng: 140.3275, subText: 'Yamagata, Japan' },

  // Kanto / Greater Tokyo
  { name: 'Tokyo Station', lat: 35.6812, lng: 139.7671, subText: 'Tokyo, Japan' },
  { name: 'Shinagawa Station', lat: 35.6285, lng: 139.7388, subText: 'Tokyo, Japan' },
  { name: 'Shinjuku Station', lat: 35.6896, lng: 139.7006, subText: 'Tokyo, Japan' },
  { name: 'Shibuya Station', lat: 35.6580, lng: 139.7016, subText: 'Tokyo, Japan' },
  { name: 'Ikebukuro Station', lat: 35.7295, lng: 139.7109, subText: 'Tokyo, Japan' },
  { name: 'Ueno Station', lat: 35.7141, lng: 139.7774, subText: 'Tokyo, Japan' },
  { name: 'Omiya Station', lat: 35.9063, lng: 139.6240, subText: 'Saitama, Japan' },
  { name: 'Shin-Yokohama Station', lat: 35.5075, lng: 139.6176, subText: 'Kanagawa, Japan' },
  { name: 'Yokohama Station', lat: 35.4658, lng: 139.6223, subText: 'Kanagawa, Japan' },
  { name: 'Odawara Station', lat: 35.2563, lng: 139.1558, subText: 'Kanagawa, Japan' },
  { name: 'Hakone-Yumoto Station', lat: 35.2335, lng: 139.1039, subText: 'Kanagawa, Japan' },
  { name: 'Karuizawa Station', lat: 36.3424, lng: 138.6350, subText: 'Nagano, Japan' },
  { name: 'Takasaki Station', lat: 36.3225, lng: 139.0128, subText: 'Gunma, Japan' },
  { name: 'Nikko Station', lat: 36.7472, lng: 139.6200, subText: 'Tochigi, Japan' },

  // Chubu / Nagano / Hokuriku
  { name: 'Nagano Station', lat: 36.6431, lng: 138.1886, subText: 'Nagano, Japan' },
  { name: 'Matsumoto Station', lat: 36.2307, lng: 137.9644, subText: 'Nagano, Japan' },
  { name: 'Shiojiri Station', lat: 36.1147, lng: 137.9482, subText: 'Nagano, Japan' },
  { name: 'Okaya Station', lat: 36.0569, lng: 138.0458, subText: 'Nagano, Japan' },
  { name: 'Kami-Suwa Station', lat: 36.0467, lng: 138.1165, subText: 'Suwa, Nagano, Japan' },
  { name: 'Chino Station', lat: 35.9947, lng: 138.1525, subText: 'Nagano, Japan' },
  { name: 'Kofu Station', lat: 35.6672, lng: 138.5690, subText: 'Yamanashi, Japan' },
  { name: 'Kanazawa Station', lat: 36.5781, lng: 136.6478, subText: 'Ishikawa, Japan' },
  { name: 'Toyama Station', lat: 36.7017, lng: 137.2133, subText: 'Toyama, Japan' },
  { name: 'Takayama Station', lat: 36.1408, lng: 137.2514, subText: 'Gifu, Japan' },
  { name: 'Shizuoka Station', lat: 34.9717, lng: 138.3891, subText: 'Shizuoka, Japan' },
  { name: 'Hamamatsu Station', lat: 34.7037, lng: 137.7345, subText: 'Shizuoka, Japan' },
  { name: 'Nagoya Station', lat: 35.1709, lng: 136.8815, subText: 'Aichi, Japan' },

  // Kansai / Chugoku / Kyushu
  { name: 'Kyoto Station', lat: 34.9858, lng: 135.7588, subText: 'Kyoto, Japan' },
  { name: 'Shin-Osaka Station', lat: 34.7335, lng: 135.5003, subText: 'Osaka, Japan' },
  { name: 'Osaka Station', lat: 34.7025, lng: 135.4959, subText: 'Osaka, Japan' },
  { name: 'Shin-Kobe Station', lat: 34.7061, lng: 135.1956, subText: 'Hyogo, Japan' },
  { name: 'Himeji Station', lat: 34.8277, lng: 134.6908, subText: 'Hyogo, Japan' },
  { name: 'Okayama Station', lat: 34.6663, lng: 133.9185, subText: 'Okayama, Japan' },
  { name: 'Hiroshima Station', lat: 34.3977, lng: 132.4753, subText: 'Hiroshima, Japan' },
  { name: 'Shin-Shimonoseki Station', lat: 34.0080, lng: 130.9478, subText: 'Yamaguchi, Japan' },
  { name: 'Kokura Station', lat: 33.8867, lng: 130.8824, subText: 'Fukuoka, Japan' },
  { name: 'Hakata Station', lat: 33.5904, lng: 130.4207, subText: 'Fukuoka, Japan' },
  { name: 'Kumamoto Station', lat: 32.7898, lng: 130.6888, subText: 'Kumamoto, Japan' },
  { name: 'Kagoshima-Chuo Station', lat: 31.5837, lng: 130.5422, subText: 'Kagoshima, Japan' },

  // Major Airports
  { name: 'Narita Airport (NRT)', lat: 35.7720, lng: 140.3929, subText: 'Chiba, Japan' },
  { name: 'Haneda Airport (HND)', lat: 35.5494, lng: 139.7798, subText: 'Tokyo, Japan' },
  { name: 'Kansai Airport (KIX)', lat: 34.4320, lng: 135.2304, subText: 'Osaka, Japan' },
  { name: 'New Chitose Airport (CTS)', lat: 42.7752, lng: 141.6923, subText: 'Hokkaido, Japan' },

  // International Prominent Hubs
  { name: 'London St Pancras', lat: 51.5314, lng: -0.1261, subText: 'London, UK' },
  { name: 'Paris Gare du Nord', lat: 48.8809, lng: 2.3553, subText: 'Paris, France' },
  { name: 'Berlin Hauptbahnhof', lat: 52.5256, lng: 13.3695, subText: 'Berlin, Germany' },
  { name: 'Amsterdam Centraal', lat: 52.3791, lng: 4.9003, subText: 'Amsterdam, Netherlands' },
  { name: 'Rome Termini', lat: 41.9010, lng: 12.5018, subText: 'Rome, Italy' },
  { name: 'JFK Airport New York', lat: 40.6413, lng: -73.7781, subText: 'New York, USA' },
  { name: 'Los Angeles LAX', lat: 33.9416, lng: -118.4085, subText: 'California, USA' },
  { name: 'Bangkok Suvarnabhumi', lat: 13.6900, lng: 100.7501, subText: 'Bangkok, Thailand' },
  { name: 'Singapore Changi', lat: 1.3644, lng: 103.9915, subText: 'Singapore' },
  { name: 'Sydney Central', lat: -33.8838, lng: 151.2069, subText: 'Sydney, Australia' },
  { name: 'Seoul Station', lat: 37.5559, lng: 126.9723, subText: 'Seoul, South Korea' },
  { name: 'Taipei Main Station', lat: 25.0478, lng: 121.5170, subText: 'Taipei, Taiwan' },
];

// Client-side in-memory cache to prevent redundant network requests
const clientGeocodeCache = new Map<string, GeoPoint[]>();

/**
 * Instant offline search across known stations and hubs (0ms latency, 0 API calls).
 */
export function getLocalMatches(query: string): GeoPoint[] {
  if (!query || query.trim().length < 2) return [];
  const clean = query.trim().toLowerCase();

  return FALLBACK_POINTS.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(clean);
    const subMatch = p.subText ? p.subText.toLowerCase().includes(clean) : false;
    return nameMatch || subMatch;
  });
}

/**
 * Searches for geographic locations using a resilient multi-tier pipeline:
 * 1. Checks in-memory cache
 * 2. Matches local stations/cities immediately
 * 3. Queries internal /api/geocode endpoint (which uses ArcGIS / Nominatim with server caching)
 * 4. Falls back to direct client-side ArcGIS World Geocoding if needed
 *
 * Designed to strictly avoid HTTP 429 rate limiting with query caching and AbortSignal support.
 */
export async function searchLocations(query: string, signal?: AbortSignal): Promise<GeoPoint[]> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();

  // 1. Check in-memory client cache
  if (clientGeocodeCache.has(cleanQuery)) {
    return clientGeocodeCache.get(cleanQuery)!;
  }

  const localMatches = getLocalMatches(query);

  let remoteResults: GeoPoint[] = [];

  // 2. Query Next.js internal /api/geocode endpoint (server cached, proper User-Agent)
  try {
    const apiRes = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
      signal: signal || AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        remoteResults = data.results;
      }
    } else if (apiRes.status === 429) {
      console.warn('[Geocode] Upstream rate limit reached (HTTP 429), using local matches');
      return localMatches;
    }
  } catch (apiErr: any) {
    if (apiErr?.name === 'AbortError') {
      throw apiErr; // propagate abort
    }
    // Continue to direct client fallback if internal API failed or unavailable
  }

  // 3. Direct client fallback to ArcGIS World Geocoding if server route returned no results
  if (remoteResults.length === 0) {
    try {
      const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
        query
      )}&maxLocations=6&outFields=Match_addr,City,Region,Country`;

      const res = await fetch(arcgisUrl, {
        signal: signal || AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        for (const c of data.candidates || []) {
          if (!c.location || c.score < 50) continue;
          const rawName = c.address || c.attributes?.Match_addr || query;
          const name = rawName.replace(/,.*$/, '').trim();
          const details = [c.attributes?.City, c.attributes?.Region, c.attributes?.Country].filter(Boolean).join(', ');

          remoteResults.push({
            name: name || rawName,
            lat: c.location.y,
            lng: c.location.x,
            subText: details || c.attributes?.Match_addr || '',
          });
        }
      }
    } catch (fallbackErr: any) {
      if (fallbackErr?.name === 'AbortError') {
        throw fallbackErr;
      }
      console.warn('[Geocode] Client fallback failed:', fallbackErr?.message || fallbackErr);
    }
  }

  // Merge local matches on top without coordinates duplicates
  const seen = new Set<string>();
  const combined: GeoPoint[] = [];

  for (const item of [...localMatches, ...remoteResults]) {
    const key = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(item);
    }
  }

  const finalResults = combined.slice(0, 8);

  // Cache results
  if (finalResults.length > 0) {
    if (clientGeocodeCache.size > 200) {
      const firstKey = clientGeocodeCache.keys().next().value;
      if (firstKey) clientGeocodeCache.delete(firstKey);
    }
    clientGeocodeCache.set(cleanQuery, finalResults);
  }

  return finalResults.length > 0 ? finalResults : localMatches;
}
