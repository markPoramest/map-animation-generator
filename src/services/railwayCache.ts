import { neon, NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Railway Route Database using Neon Postgres (Vercel Marketplace).
 *
 * Stores real railway track geometries permanently so routes
 * are served from the database instead of hitting Overpass API.
 *
 * Table: railway_routes
 *   - route_key    TEXT PRIMARY KEY
 *   - coordinates  JSONB
 *   - source       TEXT
 *   - distance_km  REAL
 *   - point_count  INTEGER
 *   - created_at   TIMESTAMPTZ
 *
 * Gracefully degrades: if DATABASE_URL is not set, all operations
 * silently return null/void — the app still works via Overpass fallback.
 */

function getDbUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

let tableInitialized = false;

function getSql(): NeonQueryFunction<false, false> | null {
  const url = getDbUrl();
  if (!url) return null;
  return neon(url);
}

async function ensureTable(sql: NeonQueryFunction<false, false>): Promise<boolean> {
  if (tableInitialized) return true;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS railway_routes (
        route_key   TEXT PRIMARY KEY,
        coordinates JSONB NOT NULL,
        source      TEXT NOT NULL DEFAULT 'overpass',
        distance_km REAL,
        point_count INTEGER,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    tableInitialized = true;
    return true;
  } catch (err) {
    console.error('[Railway DB] Failed to create table:', err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Build a deterministic route key from two coordinate pairs.
 * Sorted so A→B and B→A share the same key (railway tracks are bidirectional).
 */
function buildRouteKey(
  startLat: number, startLng: number,
  endLat: number, endLng: number
): string {
  const a = `${startLat.toFixed(3)},${startLng.toFixed(3)}`;
  const b = `${endLat.toFixed(3)},${endLng.toFixed(3)}`;
  const [first, second] = [a, b].sort();
  return `${first}_${second}`;
}

/**
 * Look up a stored railway route from the database.
 */
export async function getStoredRoute(
  startLat: number, startLng: number,
  endLat: number, endLng: number
): Promise<[number, number][] | null> {
  const sql = getSql();
  if (!sql) return null;

  const ready = await ensureTable(sql);
  if (!ready) return null;

  const key = buildRouteKey(startLat, startLng, endLat, endLng);

  try {
    const rows = await sql`
      SELECT coordinates FROM railway_routes WHERE route_key = ${key}
    ` as Record<string, unknown>[];

    if (rows.length > 0) {
      const coords = rows[0].coordinates as [number, number][] | undefined;
      if (Array.isArray(coords) && coords.length >= 2) {
        console.log(`[Railway DB] Route found: ${key} (${coords.length} points)`);
        return coords;
      }
    }

    console.log(`[Railway DB] No stored route for ${key}`);
    return null;
  } catch (err) {
    console.error('[Railway DB] Read error:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Store a railway route geometry in the database permanently.
 */
export async function storeRoute(
  startLat: number, startLng: number,
  endLat: number, endLng: number,
  coordinates: [number, number][],
  source: string = 'overpass',
  distanceKm?: number
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  if (!coordinates || coordinates.length < 2) return;

  const ready = await ensureTable(sql);
  if (!ready) return;

  const key = buildRouteKey(startLat, startLng, endLat, endLng);
  const coordsJson = JSON.stringify(coordinates);

  try {
    await sql`
      INSERT INTO railway_routes (route_key, coordinates, source, distance_km, point_count)
      VALUES (${key}, ${coordsJson}::jsonb, ${source}, ${distanceKm ?? null}, ${coordinates.length})
      ON CONFLICT (route_key) DO UPDATE SET
        coordinates = EXCLUDED.coordinates,
        source = EXCLUDED.source,
        distance_km = EXCLUDED.distance_km,
        point_count = EXCLUDED.point_count
    `;
    console.log(`[Railway DB] Stored route ${key} (${coordinates.length} points, source: ${source})`);
  } catch (err) {
    console.error('[Railway DB] Write error:', err instanceof Error ? err.message : err);
  }
}
