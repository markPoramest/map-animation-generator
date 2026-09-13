'use client';

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import { RouteConfig, MapTheme, AspectRatio } from '@/types/route';
import { CalculatedRoute, RouteSamplePoint } from '@/services/routing';
import { VehicleIcon, getVehicleSvgDataUri } from './VehicleIcons';

export interface MapCanvasHandle {
  renderFrameAtProgress: (progress: number) => Promise<void>;
  getCanvas: () => HTMLCanvasElement | null;
  jumpToProgress: (progress: number) => void;
  resetCamera: () => void;
}

interface MapCanvasProps {
  routeConfig: RouteConfig;
  calculatedRoute: CalculatedRoute | null;
  currentProgress: number; // 0.0 to 1.0
  isPlaying: boolean;
  onProgressChange: (progress: number) => void;
  onPlaybackEnd?: () => void;
}

const THEME_STYLES: Record<MapTheme, any> = {
  voyager: {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri &copy; OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'simple-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 19,
        paint: {
          'raster-fade-duration': 0,
        },
      },
    ],
  },
  dark: {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri',
      },
    },
    layers: [
      {
        id: 'simple-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 19,
        paint: {
          'raster-fade-duration': 0,
        },
      },
    ],
  },
  positron: {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri',
      },
    },
    layers: [
      {
        id: 'simple-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 19,
        paint: {
          'raster-fade-duration': 0,
        },
      },
    ],
  },
  satellite: {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri, Maxar',
      },
    },
    layers: [
      {
        id: 'simple-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 19,
        paint: {
          'raster-fade-duration': 0,
        },
      },
    ],
  },
  outdoors: {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'simple-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 17,
        paint: {
          'raster-fade-duration': 0,
        },
      },
    ],
  },
  retro: {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri',
      },
    },
    layers: [
      {
        id: 'simple-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 19,
        paint: {
          'raster-fade-duration': 0,
        },
      },
    ],
  },
};

export function getMapStyle(routeConfig: RouteConfig): any {
  return THEME_STYLES[routeConfig.mapTheme] || THEME_STYLES.voyager;
}

/**
 * Calculates the exact normalized progress thresholds:
 * 1. [0 .. pArrive]: Vehicle travels from start to destination
 * 2. [pArrive .. pOverview]: Smooth cinematic camera zoom-out revealing the full route bounds
 * 3. [pOverview .. 1.0]: Complete route trail showcase holding for ~3 seconds before video end
 */
export function getTimelinePhases(durationSec: number) {
  const HOLD_SEC = 3.0; // Continue showing complete route trail for ~3 seconds before video end
  const ZOOM_SEC = Math.min(1.5, Math.max(1.0, durationSec * 0.12));
  const travelSec = Math.max(2.5, durationSec - HOLD_SEC - ZOOM_SEC);
  const totalSec = travelSec + ZOOM_SEC + HOLD_SEC;

  const pArrive = travelSec / totalSec;
  const pOverview = (travelSec + ZOOM_SEC) / totalSec;

  return { pArrive, pOverview, totalSec };
}

/**
 * Standard cubic ease-in-out interpolation for silky smooth camera transitions
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Quadratic ease-in-out progression over the configured animation duration
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Calculates adaptive cruising zoom based on logarithmic route distance scaling.
 * Prevents tile flickering and dizziness on routes > 50 km - 500+ km.
 */
export function computeCruisingZoom(distanceKm: number, defaultZoom = 13.0): number {
  if (distanceKm <= 35) return defaultZoom;
  // Logarithmic altitude scaling: each doubling of distance drops zoom smoothly
  const scale = Math.log2(distanceKm / 35);
  const cruising = defaultZoom - scale * 1.15;
  return Math.max(4.5, Math.min(defaultZoom, cruising));
}

/**
 * Calculates adaptive cruising pitch for long routes.
 * Bird's-eye view (20° - 25°) dramatically reduces frustum horizon tile load.
 */
export function computeCruisingPitch(distanceKm: number, defaultPitch = 50): number {
  if (distanceKm <= 35) return defaultPitch;
  const ratio = Math.min(1.0, (distanceKm - 35) / 200);
  return (1 - ratio) * defaultPitch + ratio * 22;
}

/**
 * Computes look-ahead bearing along the route line with angular interpolation (exponential smoothing)
 * and [-180, 180] angle wrapping to eliminate 360-degree rotation snaps.
 */
export function computeLookAheadBearing(
  routeLine: ReturnType<typeof turf.lineString>,
  currentDistKm: number,
  totalDistanceKm: number,
  frontCoord: [number, number],
  prevSmoothedBearing: number | null,
  alpha = 0.28
): number {
  // Look-ahead distance: 1.0% - 2.0% of total route distance (clamped between 150m and 6km)
  const lookAheadDist = Math.max(0.15, Math.min(6.0, totalDistanceKm * 0.015));
  const targetDist = Math.min(totalDistanceKm, currentDistKm + lookAheadDist);

  let rawTargetPt: [number, number];
  if (targetDist > currentDistKm + 0.001) {
    const ptAlong = turf.along(routeLine, targetDist, { units: 'kilometers' });
    rawTargetPt = ptAlong.geometry.coordinates as [number, number];
  } else {
    // If at destination end, sample backwards to keep the forward tangent
    const behindDist = Math.max(0, currentDistKm - lookAheadDist);
    const ptBehind = turf.along(routeLine, behindDist, { units: 'kilometers' });
    const behindCoord = ptBehind.geometry.coordinates as [number, number];
    return (turf.bearing(turf.point(behindCoord), turf.point(frontCoord)) + 360) % 360;
  }

  const rawBearing = (turf.bearing(turf.point(frontCoord), turf.point(rawTargetPt)) + 360) % 360;

  if (prevSmoothedBearing === null) {
    return rawBearing;
  }

  // Proper [-180, 180] angle wrapping prevents 360-degree rotation snaps across North (0°/360°)
  const angleDiff = ((rawBearing - prevSmoothedBearing + 540) % 360) - 180;
  const smoothed = (prevSmoothedBearing + angleDiff * alpha + 360) % 360;

  return smoothed;
}

/**
 * Returns stable altitude/zoom and pitch relative to route scale for Dynamic Follow mode
 */
export function getDynamicFollowZoomPitch(totalDistanceKm: number): { zoom: number; pitch: number } {
  if (totalDistanceKm <= 40) {
    return { zoom: 13.5, pitch: 45 };
  } else if (totalDistanceKm <= 150) {
    return { zoom: 11.8, pitch: 38 };
  } else if (totalDistanceKm <= 600) {
    return { zoom: 9.5, pitch: 32 };
  } else {
    return { zoom: 6.8, pitch: 25 };
  }
}

/**
 * Side-View Orientation Logic:
 * Keeps the 2D vehicle marker upright at all times (wheels pointing downward).
 * - Heading East/Right (0° to 180°): scaleX = 1
 * - Heading West/Left (-180° to 0° or 180° to 360°): scaleX = -1
 * - Vertical tilt angle clamped to ±15° to follow subtle track inclination without flipping
 */
export function getSideViewOrientation(bearing: number): { scaleX: number; tiltDeg: number } {
  // Normalize bearing to [-180, 180]
  const normBearing = ((bearing % 360) + 540) % 360 - 180;

  // Heading East/Right: scaleX = 1; Heading West/Left: scaleX = -1
  const isHeadingWest = normBearing < 0;
  const scaleX = isHeadingWest ? -1 : 1;

  // Trajectory direction vector in screen coordinates
  // 0° = North (dy < 0, dx = 0), 90° = East (dy = 0, dx > 0), 180° = South (dy > 0, dx = 0)
  const rad = (normBearing * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);

  // Vertical inclination angle relative to horizontal:
  // Heading uphill / north: tilt nose up (negative angle)
  // Heading downhill / south: tilt nose down (positive angle)
  const rawPitch = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI);
  // Clamp vertical tilt angle to a maximum of ±15 degrees to follow track inclination without flipping
  const tiltDeg = Math.max(-15, Math.min(15, rawPitch));

  return { scaleX, tiltDeg };
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Checks whether the destination marker, label, and arrival banner should be revealed.
 * Stays hidden initially (progress <= 0.01) and while traveling.
 * Reveals only when progress >= 0.98 or within the final 0.5 km of the destination.
 */
export function checkDestinationReached(
  progress: number,
  durationSeconds: number,
  calculatedRoute: CalculatedRoute | null
): boolean {
  if (!calculatedRoute || !calculatedRoute.coordinates || calculatedRoute.coordinates.length < 2 || progress <= 0.01) {
    return false;
  }
  const { pArrive } = getTimelinePhases(durationSeconds);
  const isArrived = progress >= pArrive;
  const travelFraction = isArrived ? 1.0 : progress / pArrive;
  const easedT = easeInOutQuad(travelFraction);
  const totalKm = calculatedRoute.totalDistanceKm || 0;
  const currentDistKm = Math.min(totalKm, Math.max(0, easedT * totalKm));
  const remainingDistKm = totalKm - currentDistKm;

  return (
    progress >= 0.98 ||
    travelFraction >= 0.98 ||
    (totalKm > 0 && remainingDistKm <= 0.5 && currentDistKm > 0.1)
  );
}

// Canvas Overlay Drawing Helpers for Video Export
function drawPinOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  title: string,
  type: 'start' | 'end',
  scale: number,
  popScale: number = 1
) {
  ctx.save();
  if (popScale !== 1) {
    ctx.translate(x, y);
    ctx.scale(popScale, popScale);
    ctx.translate(-x, -y);
  }
  const isStart = type === 'start';
  const accentColor = isStart ? '#059669' : '#EB5E28';
  const tagText = isStart ? 'START' : 'ARRIVED';

  // 1. Ground shadow
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * scale, 12 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fill();

  // 2. Ground pulse halo
  ctx.beginPath();
  ctx.arc(x, y, 12 * scale, 0, Math.PI * 2);
  ctx.strokeStyle = isStart ? 'rgba(5, 150, 105, 0.45)' : 'rgba(235, 94, 40, 0.45)';
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();

  // 3. Ground pin marker
  ctx.beginPath();
  ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // 4. Stalk
  const stalkH = 12 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - stalkH);
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = accentColor;
  ctx.stroke();

  // 5. Label Card Pill
  ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`;
  const tagW = ctx.measureText(tagText).width + 12 * scale;
  const tagH = 17 * scale;

  ctx.font = `bold ${Math.round(12.5 * scale)}px sans-serif`;
  const textWidth = ctx.measureText(title).width;
  const pillPadding = 8 * scale;
  const pillW = tagW + textWidth + pillPadding * 3;
  const pillH = 30 * scale;
  const pillX = x - pillW / 2;
  const pillY = y - stalkH - pillH;

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 10 * scale;
  ctx.shadowOffsetY = 4 * scale;

  // Background
  ctx.fillStyle = 'rgba(255, 252, 242, 0.96)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 8 * scale);
  ctx.fill();
  ctx.stroke();

  // Reset shadow
  ctx.shadowColor = 'transparent';

  // Tag Badge inside
  const tagX = pillX + pillPadding;
  const tagY = pillY + (pillH - tagH) / 2;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 4 * scale);
  ctx.fill();

  ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(tagText, tagX + tagW / 2, tagY + tagH / 2);

  // Title
  ctx.textAlign = 'left';
  ctx.font = `bold ${Math.round(12.5 * scale)}px sans-serif`;
  ctx.fillStyle = '#252422';
  ctx.fillText(title, tagX + tagW + 8 * scale, pillY + pillH / 2);

  ctx.restore();
}

function drawTitleOverlayOnCanvas(
  ctx: CanvasRenderingContext2D,
  routeConfig: RouteConfig,
  scaleX: number,
  scaleY: number
) {
  ctx.save();
  const cardX = 20 * scaleX;
  const cardY = 20 * scaleY;
  const cardW = 340 * scaleX;
  const cardH = 54 * scaleY;

  ctx.fillStyle = 'rgba(255, 252, 242, 0.92)';
  ctx.strokeStyle = 'rgba(220, 212, 198, 0.8)';
  ctx.lineWidth = 1.5 * scaleX;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 12 * scaleX);
  ctx.fill();
  ctx.stroke();

  ctx.font = `${Math.round(10 * scaleX)}px sans-serif`;
  ctx.fillStyle = '#736d65';
  ctx.fillText('ROUTE JOURNEY', cardX + 16 * scaleX, cardY + 20 * scaleY);

  ctx.font = `bold ${Math.round(13 * scaleX)}px sans-serif`;
  ctx.fillStyle = '#252422';
  ctx.fillText(`${routeConfig.startPoint.name}  ➔  ${routeConfig.endPoint.name}`, cardX + 16 * scaleX, cardY + 40 * scaleY);

  ctx.restore();
}

function drawArrivalCardOnCanvas(
  ctx: CanvasRenderingContext2D,
  routeConfig: RouteConfig,
  totalDistanceKm: number,
  scaleX: number,
  scaleY: number
) {
  ctx.save();
  const cardW = 440 * scaleX;
  const cardH = 50 * scaleY;
  const cardX = (ctx.canvas.width - cardW) / 2;
  const cardY = ctx.canvas.height - cardH - 34 * scaleY;

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 14 * scaleX;
  ctx.shadowOffsetY = 4 * scaleY;

  // Background card pill
  ctx.fillStyle = 'rgba(255, 252, 242, 0.96)';
  ctx.strokeStyle = '#EB5E28';
  ctx.lineWidth = 2 * scaleX;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 14 * scaleX);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';

  // Tag / Icon Pill
  const tagW = 32 * scaleX;
  const tagH = 26 * scaleY;
  const tagX = cardX + 12 * scaleX;
  const tagY = cardY + (cardH - tagH) / 2;
  ctx.fillStyle = '#EB5E28';
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 8 * scaleX);
  ctx.fill();

  ctx.font = `${Math.round(13 * scaleX)}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('🏁', tagX + tagW / 2, tagY + tagH / 2);

  // Text details: start ➔ end • distance • time
  ctx.textAlign = 'left';
  ctx.font = `bold ${Math.round(12.5 * scaleX)}px sans-serif`;
  ctx.fillStyle = '#252422';
  const timeText = routeConfig.travelTimeText ? ` • ${routeConfig.travelTimeText}` : '';
  const text = `${routeConfig.startPoint.name} ➔ ${routeConfig.endPoint.name} • ${totalDistanceKm.toFixed(1)} km${timeText}`;
  ctx.fillText(text, tagX + tagW + 10 * scaleX, cardY + cardH / 2);

  ctx.restore();
}


function drawTrailOnCanvas(
  ctx: CanvasRenderingContext2D,
  coordinates: [number, number][],
  map: maplibregl.Map,
  scaleX: number,
  scaleY: number,
  trailColor: string = '#FF4D00',
  coreWidth: number = 3.5
) {
  if (!coordinates || coordinates.length < 2) return;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < coordinates.length; i++) {
    const pt = map.project(coordinates[i]);
    points.push({ x: pt.x * scaleX, y: pt.y * scaleY });
  }

  if (points.length < 2) return;

  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  };

  // 1. Shadow Layer: Soft blurred drop shadow underneath the active trail (#000000, opacity 0.2, blur: 3px, width: 8px)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 8 * scaleX;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 3 * scaleX;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1 * scaleY;
  trace();
  ctx.stroke();
  ctx.restore();

  // 2. Casing Layer: High-contrast white outer casing (#FFFFFF, opacity 0.95, width: 6px)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6 * scaleX;
  ctx.globalAlpha = 0.95;
  trace();
  ctx.stroke();
  ctx.restore();

  // 3. Core Line: Crisp, vibrant inner stroke (#FF4D00 or dynamic theme color, width: 3.5px)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = trailColor || '#FF4D00';
  ctx.lineWidth = coreWidth * scaleX;
  ctx.globalAlpha = 1.0;
  trace();
  ctx.stroke();
  ctx.restore();
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  {
    routeConfig,
    calculatedRoute,
    currentProgress,
    isPlaying,
    onProgressChange,
    onPlaybackEnd,
  },
  ref
) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vehicleImageRef = useRef<HTMLImageElement | null>(null);
  const isMapLoadedRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCoordsRef = useRef<[number, number][]>([]);
  const progressRef = useRef<number>(currentProgress);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const smoothedBearingRef = useRef<number | null>(null);
  const exportSmoothedBearingRef = useRef<number | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Overlay state for vehicle and pins
  const [vehicleState, setVehicleState] = useState<{
    point: RouteSamplePoint | null;
    screenPos: { x: number; y: number } | null;
    visible: boolean;
  }>({ point: null, screenPos: null, visible: false });

  const [startPinScreenPos, setStartPinScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [endPinScreenPos, setEndPinScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isDestinationRevealed, setIsDestinationRevealed] = useState<boolean>(false);

  useEffect(() => {
    progressRef.current = currentProgress;
    const reached = checkDestinationReached(
      currentProgress,
      routeConfig.durationSeconds || 8,
      calculatedRoute
    );
    setIsDestinationRevealed(reached);
  }, [currentProgress, routeConfig.durationSeconds, calculatedRoute]);

  // Preload vehicle image (SVG or custom uploaded image) for canvas composite rendering
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    if (routeConfig.vehicle === 'custom' && routeConfig.customVehicleImage) {
      img.src = routeConfig.customVehicleImage;
    } else {
      img.src = getVehicleSvgDataUri(routeConfig.vehicle, '#EB5E28');
    }
    vehicleImageRef.current = img;
  }, [routeConfig.vehicle, routeConfig.customVehicleImage]);

  // Aspect ratio helper (16:9 YouTube Landscape)
  const getAspectRatioClasses = (_ratio: AspectRatio) => {
    return 'aspect-[16/9] w-full max-w-5xl mx-auto shadow-2xl rounded-2xl';
  };

  const renderTrailCanvas = useCallback(() => {
    const map = mapInstanceRef.current;
    const trailCanvas = trailCanvasRef.current;
    const coords = activeCoordsRef.current;
    if (!map || !trailCanvas) return;
    const container = mapContainerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;

    if (trailCanvas.width !== Math.round(w * dpr) || trailCanvas.height !== Math.round(h * dpr)) {
      trailCanvas.width = Math.round(w * dpr);
      trailCanvas.height = Math.round(h * dpr);
      trailCanvas.style.width = `${w}px`;
      trailCanvas.style.height = `${h}px`;
    }

    const ctx = trailCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    if (coords && coords.length >= 2) {
      drawTrailOnCanvas(
        ctx,
        coords,
        map,
        1,
        1,
        routeConfig.trailColor || '#FF4D00',
        routeConfig.trailWidth || 3.5
      );
    }
    ctx.restore();
  }, [routeConfig.trailColor, routeConfig.trailWidth]);

  // Draw complete composite frame (Map + Vehicle + Badges + Pins) onto canvas for Video Export
  const drawCompositeFrame = useCallback(
    (progress: number) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const mapCanvas = map.getCanvas();
      if (!mapCanvas) return;

      if (!compositeCanvasRef.current) {
        compositeCanvasRef.current = document.createElement('canvas');
      }
      const canvas = compositeCanvasRef.current;
      const targetW = mapCanvas.width % 2 === 0 ? mapCanvas.width : mapCanvas.width - 1;
      const targetH = mapCanvas.height % 2 === 0 ? mapCanvas.height : mapCanvas.height - 1;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 0. Fill solid opaque background so video encoder never samples transparent black
      const baseBg =
        routeConfig.mapTheme === 'dark'
          ? '#121212'
          : routeConfig.mapTheme === 'satellite'
          ? '#0b1320'
          : '#FFFCF2';
      ctx.fillStyle = baseBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Map WebGL Canvas Frame
      ctx.drawImage(mapCanvas, 0, 0);

      const container = mapContainerRef.current;
      const containerWidth = container ? container.clientWidth : mapCanvas.width;
      const containerHeight = container ? container.clientHeight : mapCanvas.height;
      const scaleX = mapCanvas.width / containerWidth;
      const scaleY = mapCanvas.height / containerHeight;

      // 1b. Draw Active Glowing Traveled Route Trail directly on export composite canvas
      let exportCoords = activeCoordsRef.current;
      if ((!exportCoords || exportCoords.length < 2) && calculatedRoute && calculatedRoute.coordinates.length && progress > 0.0001) {
        const routeLine = turf.lineString(calculatedRoute.coordinates);
        const totalDistanceKm = turf.length(routeLine, { units: 'kilometers' });
        const { pArrive } = getTimelinePhases(routeConfig.durationSeconds || 10);
        const isArrived = progress >= pArrive;
        const travelFraction = isArrived ? 1.0 : progress / pArrive;
        const easedT = easeInOutQuad(travelFraction);
        const currentDistKm = Math.min(totalDistanceKm, Math.max(0.001, easedT * totalDistanceKm));
        try {
          const sliced = turf.lineSliceAlong(routeLine, 0, currentDistKm, { units: 'kilometers' });
          exportCoords = sliced.geometry.coordinates as [number, number][];
        } catch {
          // fallback
        }
      }
      if (exportCoords && exportCoords.length >= 2) {
        drawTrailOnCanvas(
          ctx,
          exportCoords,
          map,
          scaleX,
          scaleY,
          routeConfig.trailColor || '#FF4D00',
          routeConfig.trailWidth || 3.5
        );
      }

      // 2. Draw Station Pins if enabled
      const isDestinationRevealedForExport = checkDestinationReached(
        progress,
        routeConfig.durationSeconds || 10,
        calculatedRoute
      );

      if (routeConfig.showStationPins) {
        if (routeConfig.startPoint) {
          const p = map.project([routeConfig.startPoint.lng, routeConfig.startPoint.lat]);
          drawPinOnCanvas(ctx, p.x * scaleX, p.y * scaleY, routeConfig.startPoint.name, 'start', scaleX);
        }
        if (routeConfig.endPoint && isDestinationRevealedForExport) {
          const p = map.project([routeConfig.endPoint.lng, routeConfig.endPoint.lat]);
          const { pArrive: pArr } = getTimelinePhases(routeConfig.durationSeconds || 10);
          const travelFrac = progress >= pArr ? 1.0 : progress / pArr;
          const revealT = Math.min(1.0, Math.max(0, (travelFrac - 0.98) / 0.02));
          const popScale = Math.max(0.5, Math.min(1.15, easeOutBack(revealT)));
          drawPinOnCanvas(ctx, p.x * scaleX, p.y * scaleY, routeConfig.endPoint.name, 'end', scaleX, popScale);
        }
      }

      // 3. Draw Vehicle Model & Floating Travel Time Badge
      const { pArrive } = getTimelinePhases(routeConfig.durationSeconds || 10);
      const isArrived = progress >= pArrive;
      const travelFraction = isArrived ? 1.0 : progress / pArrive;

      if (calculatedRoute && calculatedRoute.coordinates.length && progress > 0.001) {
        const routeLine = turf.lineString(calculatedRoute.coordinates);
        const totalDistanceKm = turf.length(routeLine, { units: 'kilometers' });
        const easedT = easeInOutQuad(travelFraction);
        const currentDistKm = Math.min(totalDistanceKm, Math.max(0, easedT * totalDistanceKm));

        if (progress <= 0.001) {
          exportSmoothedBearingRef.current = null;
        }

        let frontCoord: [number, number];
        if (currentDistKm <= 0.0001) {
          frontCoord = calculatedRoute.coordinates[0];
        } else {
          const safeSliceDist = Math.min(totalDistanceKm, Math.max(0.001, currentDistKm));
          const sliced = turf.lineSliceAlong(routeLine, 0, safeSliceDist, { units: 'kilometers' });
          const activeCoords = sliced.geometry.coordinates as [number, number][];
          frontCoord = activeCoords[activeCoords.length - 1];
        }

        const smoothedBearing = computeLookAheadBearing(
          routeLine,
          currentDistKm,
          totalDistanceKm,
          frontCoord,
          exportSmoothedBearingRef.current
        );
        exportSmoothedBearingRef.current = smoothedBearing;

        const vp = map.project(frontCoord);
        const vx = vp.x * scaleX;
        const vy = vp.y * scaleY;

        // Draw Vehicle Icon with Side-View Orientation (Auto-Flip & Upright Clamped Tilt)
        if (vehicleImageRef.current && vehicleImageRef.current.complete) {
          const { scaleX: vehFlipX, tiltDeg } = getSideViewOrientation(smoothedBearing);
          ctx.save();
          ctx.translate(vx, vy);
          ctx.scale(vehFlipX, 1);
          ctx.rotate((tiltDeg * Math.PI) / 180);
          const vehicleSize = 58 * scaleX;
          ctx.shadowColor = 'rgba(0,0,0,0.45)';
          ctx.shadowBlur = 10 * scaleX;
          ctx.shadowOffsetY = 4 * scaleY;
          ctx.drawImage(vehicleImageRef.current, -vehicleSize / 2, -vehicleSize / 2, vehicleSize, vehicleSize);
          ctx.restore();
        }
      }

      // 4. Draw Header Card if enabled
      if (routeConfig.showTitleOverlay) {
        drawTitleOverlayOnCanvas(ctx, routeConfig, scaleX, scaleY);
      }

      // 5. Draw Arrival celebration card when arriving at destination and during complete route showcase
      if (isDestinationRevealedForExport && calculatedRoute) {
        drawArrivalCardOnCanvas(ctx, routeConfig, calculatedRoute.totalDistanceKm, scaleX, scaleY);
      }

      // 6. Draw Subtle Map Attribution Credit in bottom-right corner for YouTube compliance
      const attributionText =
        routeConfig.mapTheme === 'outdoors'
          ? '© OpenStreetMap contributors'
          : routeConfig.mapTheme === 'satellite'
          ? '© Esri, Maxar'
          : '© Esri, © OpenStreetMap';

      ctx.save();
      ctx.font = `${Math.round(11 * scaleX)}px sans-serif`;
      const textWidth = ctx.measureText(attributionText).width;
      const padX = 8 * scaleX;
      const padY = 4 * scaleY;
      const pillW = textWidth + padX * 2;
      const pillH = 20 * scaleY;
      const pillX = canvas.width - pillW - 14 * scaleX;
      const pillY = canvas.height - pillH - 12 * scaleY;

      ctx.fillStyle = 'rgba(255, 252, 242, 0.88)';
      ctx.strokeStyle = 'rgba(220, 212, 198, 0.8)';
      ctx.lineWidth = 1 * scaleX;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 5 * scaleX);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#736d65';
      ctx.textBaseline = 'middle';
      ctx.fillText(attributionText, pillX + padX, pillY + pillH / 2);
      ctx.restore();
    },
    [calculatedRoute, routeConfig]
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const startLng = routeConfig.startPoint.lng;
    const startLat = routeConfig.startPoint.lat;

    const style = getMapStyle(routeConfig);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: style,
      center: [startLng, startLat],
      zoom: routeConfig.cameraZoom || 13,
      pitch: routeConfig.cameraPitch || 45,
      bearing: 0,
      attributionControl: false,
      preserveDrawingBuffer: true, // Essential for Video export
      fadeDuration: 0, // Eliminate tile loading fade lag
      maxTileCacheSize: 2500, // Preload and keep tiles in memory for long routes
      interactive: false,
      dragPan: false,
      scrollZoom: false,
      boxZoom: false,
      dragRotate: false,
      keyboard: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      touchPitch: false,
    } as any);

    // Completely lock map preview screen: user cannot move, pan, rotate, or zoom
    map.dragPan?.disable();
    map.scrollZoom?.disable();
    map.boxZoom?.disable();
    map.dragRotate?.disable();
    map.keyboard?.disable();
    map.doubleClickZoom?.disable();
    map.touchZoomRotate?.disable();
    map.touchPitch?.disable();

    map.on('load', () => {
      isMapLoadedRef.current = true;
      setupRouteLayers(map);
      updateProgressVisuals(progressRef.current);

      if (calculatedRoute && calculatedRoute.bounds) {
        const isStaticOverview = routeConfig.cameraMode === 'static-overview';

        if (isStaticOverview) {
          // Mode A: Static Overview — lock camera with padding 100 and pitch 20
          map.fitBounds(calculatedRoute.bounds, {
            padding: 100,
            duration: 0,
            pitch: 20,
            bearing: 0,
          });
          let initTimer: ReturnType<typeof setTimeout> | null = null;
          const onInitIdle = () => {
            if (initTimer) clearTimeout(initTimer);
            map.off('idle', onInitIdle);
            setupRouteLayers(map);
            updateProgressVisuals(progressRef.current);
          };
          map.once('idle', onInitIdle);
          initTimer = setTimeout(onInitIdle, 800);
        } else {
          // Mode B: Dynamic Follow — pre-cache overview tiles, then jump to start with scale-aware zoom
          map.fitBounds(calculatedRoute.bounds, { padding: 80, duration: 0, pitch: 0, bearing: 0 });
          const { zoom, pitch } = getDynamicFollowZoomPitch(calculatedRoute.totalDistanceKm);
          const onInitIdle = () => {
            map.off('idle', onInitIdle);
            map.jumpTo({
              center: [startLng, startLat],
              zoom,
              pitch,
              bearing: 0,
            });
            setupRouteLayers(map);
            updateProgressVisuals(progressRef.current);
          };
          map.on('idle', onInitIdle);
          setTimeout(onInitIdle, 1200);
        }
      }
    });

    map.on('move', () => {
      renderTrailCanvas();
      if (!isPlayingRef.current) {
        updateScreenOverlays();
      }
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      isMapLoadedRef.current = false;
    };
  }, [
    routeConfig.mapTheme,
  ]);

  // Setup Journey Route Layers (Base track + Traveled Glowing Active Trail)
  const setupRouteLayers = (map: maplibregl.Map) => {
    if (!calculatedRoute || !calculatedRoute.coordinates.length) return;

    [
      'journey-base-casing',
      'journey-base-line',
      'journey-active-shadow',
      'journey-active-glow',
      'journey-active-casing',
      'journey-active-line',
      'journey-route-layer',
      'journey-route-casing',
      'trail-glow-layer',
      'trail-progress-layer',
      'trail-background-layer',
      'trail-casing-layer',
      'trail-background-casing',
    ].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    [
      'journey-base-source',
      'journey-active-source',
      'journey-route-source',
      'trail-progress-source',
      'trail-background-source',
    ].forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });

    // 1. Base route source (full upcoming route preview)
    map.addSource('journey-base-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: calculatedRoute.coordinates,
        },
      },
    });

    // Base Layer: Subtle dashed preview line for the upcoming full route (#64748b, opacity 0.35, dasharray [1.5, 2])
    map.addLayer({
      id: 'journey-base-line',
      type: 'line',
      source: 'journey-base-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#64748b',
        'line-width': 3,
        'line-opacity': 0.35,
        'line-dasharray': [1.5, 2],
      },
    });

    // 2. Traveled Active Route Trail Source
    map.addSource('journey-active-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    // Shadow Layer: Soft blurred drop shadow underneath the active trail (#000000, opacity 0.2, blur: 3px, width: 8px)
    map.addLayer({
      id: 'journey-active-shadow',
      type: 'line',
      source: 'journey-active-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#000000',
        'line-width': 8,
        'line-opacity': 0.2,
        'line-blur': 3,
      },
    });

    // Casing Layer: High-contrast white outer casing (#FFFFFF, opacity 0.95, width: 6px)
    map.addLayer({
      id: 'journey-active-casing',
      type: 'line',
      source: 'journey-active-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#FFFFFF',
        'line-width': 6,
        'line-opacity': 0.95,
      },
    });

    // Core Line: Crisp, vibrant inner stroke (#FF4D00 or dynamic theme color, width: 3.5px)
    map.addLayer({
      id: 'journey-active-line',
      type: 'line',
      source: 'journey-active-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': routeConfig.trailColor || '#FF4D00',
        'line-width': 3.5,
        'line-opacity': 1.0,
      },
    });
  };

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && isMapLoadedRef.current) {
      smoothedBearingRef.current = null;
      const isStaticOverview = routeConfig.cameraMode === 'static-overview';

      if (calculatedRoute && calculatedRoute.bounds) {
        if (isStaticOverview) {
          // Mode A: Static Overview
          map.fitBounds(calculatedRoute.bounds, {
            padding: 100,
            duration: 0,
            pitch: 20,
            bearing: 0,
          });
          let routeTimer: ReturnType<typeof setTimeout> | null = null;
          const onRouteIdle = () => {
            if (routeTimer) clearTimeout(routeTimer);
            map.off('idle', onRouteIdle);
            setupRouteLayers(map);
            updateProgressVisuals(currentProgress);
          };
          map.once('idle', onRouteIdle);
          routeTimer = setTimeout(onRouteIdle, 800);
        } else {
          // Mode B: Dynamic Follow
          const { zoom, pitch } = getDynamicFollowZoomPitch(calculatedRoute.totalDistanceKm);
          map.fitBounds(calculatedRoute.bounds, { padding: 80, duration: 0, pitch: 0, bearing: 0 });
          const onRouteIdle = () => {
            map.off('idle', onRouteIdle);
            map.jumpTo({
              center: [routeConfig.startPoint.lng, routeConfig.startPoint.lat],
              zoom,
              pitch,
              bearing: 0,
            });
            setupRouteLayers(map);
            updateProgressVisuals(currentProgress);
          };
          map.on('idle', onRouteIdle);
          setTimeout(onRouteIdle, 1200);
        }
      } else {
        setupRouteLayers(map);
        updateProgressVisuals(currentProgress);
      }
    }
  }, [calculatedRoute, routeConfig.cameraMode]);

  const updateScreenOverlays = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !calculatedRoute) return;

    if (routeConfig.startPoint) {
      const p = map.project([routeConfig.startPoint.lng, routeConfig.startPoint.lat]);
      setStartPinScreenPos({ x: p.x, y: p.y });
    }

    if (routeConfig.endPoint) {
      const p = map.project([routeConfig.endPoint.lng, routeConfig.endPoint.lat]);
      setEndPinScreenPos({ x: p.x, y: p.y });
    }

    if (vehicleState.point) {
      const vp = map.project([vehicleState.point.lng, vehicleState.point.lat]);
      setVehicleState((prev) => ({ ...prev, screenPos: { x: vp.x, y: vp.y } }));
    }
  }, [calculatedRoute, routeConfig.startPoint, routeConfig.endPoint, vehicleState.point]);

  const updateProgressVisuals = useCallback(
    (progress: number) => {
      const map = mapInstanceRef.current;
      if (!map || !calculatedRoute || !calculatedRoute.coordinates.length) return;

      const duration = routeConfig.durationSeconds || 10;
      const { pArrive } = getTimelinePhases(duration);
      const isArrived = progress >= pArrive;
      const travelFraction = isArrived ? 1.0 : progress / pArrive;

      // Update destination reveal state in render loop
      const destReached = checkDestinationReached(progress, duration, calculatedRoute);
      setIsDestinationRevealed(destReached);

      // Requirement 2: easeInOutQuad progression over the configured duration
      const easedT = easeInOutQuad(travelFraction);

      // Requirement 2: Calculate total route distance using Turf.js (turf.length)
      const routeLine = turf.lineString(calculatedRoute.coordinates);
      const totalDistanceKm = turf.length(routeLine, { units: 'kilometers' });
      const currentDistKm = Math.min(totalDistanceKm, Math.max(0, easedT * totalDistanceKm));

      // Requirement 2: In each animation frame, slice route geometry from distance 0 to current distance
      if (progress <= 0.001) {
        smoothedBearingRef.current = null;
      }

      // Requirement 2: In each animation frame, slice route geometry from distance 0 to current distance
      let activeCoords: [number, number][];
      let frontCoord: [number, number];

      if (currentDistKm <= 0.0001 || progress <= 0.0001) {
        const startPt = calculatedRoute.coordinates[0];
        activeCoords = [startPt, startPt];
        frontCoord = startPt;
      } else {
        const safeSliceDist = Math.min(totalDistanceKm, Math.max(0.001, currentDistKm));
        try {
          const sliced = turf.lineSliceAlong(routeLine, 0, safeSliceDist, { units: 'kilometers' });
          activeCoords = sliced.geometry.coordinates as [number, number][];
          frontCoord = activeCoords[activeCoords.length - 1];
        } catch {
          frontCoord = calculatedRoute.coordinates[0];
          activeCoords = [calculatedRoute.coordinates[0], calculatedRoute.coordinates[1] || frontCoord];
        }
      }

      // Synchronize dedicated 60fps Trail Canvas overlay
      activeCoordsRef.current = progress > 0.0001 ? activeCoords : [];
      renderTrailCanvas();

      // Task 1: Look-ahead distance approach (1.0% - 2.0% of total distance) with angular Lerp
      // and [-180, 180] angle wrapping to eliminate 360-degree rotation snaps and rotation jitter
      const frontBearing = computeLookAheadBearing(
        routeLine,
        currentDistKm,
        totalDistanceKm,
        frontCoord,
        smoothedBearingRef.current
      );
      smoothedBearingRef.current = frontBearing;

      // Requirement 2: Update route source data with sliced geometry
      const activeSource = map.getSource('journey-active-source') as maplibregl.GeoJSONSource | undefined;
      if (activeSource) {
        activeSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: activeCoords,
          },
        });
      }
      map.triggerRepaint();

      const isStaticOverview = routeConfig.cameraMode === 'static-overview';

      if (isStaticOverview) {
        // Mode A: Static Overview
        // Keep the camera strictly stationary across all frames.
        // Do not animate map.flyTo or map.panTo.
      } else {
        // Mode B: Dynamic Follow
        // Camera dynamically pans and follows the vehicle's coordinates with stable scale-aware altitude/zoom
        const { zoom, pitch } = getDynamicFollowZoomPitch(totalDistanceKm);
        const isNorthLocked = routeConfig.lockNorth ?? true;
        const camBearing = isNorthLocked ? 0 : frontBearing * 0.35;

        map.jumpTo({
          center: frontCoord,
          zoom,
          pitch,
          bearing: camBearing,
        });
      }

      // Requirement 2: Update vehicle/train marker's coordinate to match current front point
      const screenPos = map.project(frontCoord);
      setVehicleState({
        point: {
          lng: frontCoord[0],
          lat: frontCoord[1],
          bearing: frontBearing,
          distanceKmFromStart: currentDistKm,
          progress: travelFraction,
        },
        screenPos: { x: screenPos.x, y: screenPos.y },
        visible: progress > 0.0001,
      });

      // Synchronize station pin screen positions
      if (routeConfig.startPoint) {
        const sp = map.project([routeConfig.startPoint.lng, routeConfig.startPoint.lat]);
        setStartPinScreenPos({ x: sp.x, y: sp.y });
      }
      if (routeConfig.endPoint) {
        const ep = map.project([routeConfig.endPoint.lng, routeConfig.endPoint.lat]);
        setEndPinScreenPos({ x: ep.x, y: ep.y });
      }

      // Confetti removed per design requirement
    },
    [calculatedRoute, routeConfig, updateScreenOverlays]
  );

  const onProgressChangeRef = useRef(onProgressChange);
  onProgressChangeRef.current = onProgressChange;

  const onPlaybackEndRef = useRef(onPlaybackEnd);
  onPlaybackEndRef.current = onPlaybackEnd;

  const updateProgressVisualsRef = useRef(updateProgressVisuals);
  updateProgressVisualsRef.current = updateProgressVisuals;

  const durationSecondsRef = useRef(routeConfig.durationSeconds);
  durationSecondsRef.current = routeConfig.durationSeconds;

  // Animation Loop for live preview playback
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    // Reset to start if currently at end, or synchronize with currentProgress
    if (progressRef.current >= 0.999 || currentProgress >= 0.999) {
      progressRef.current = 0;
      setIsDestinationRevealed(false);
      onProgressChangeRef.current(0);
      updateProgressVisualsRef.current(0);
    } else {
      progressRef.current = currentProgress;
    }

    lastTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const durationMs = (durationSecondsRef.current || 8) * 1000;
      const progressDelta = deltaTime / durationMs;
      const nextProgress = Math.min(1.0, progressRef.current + progressDelta);
      progressRef.current = nextProgress;

      onProgressChangeRef.current(nextProgress);
      updateProgressVisualsRef.current(nextProgress);

      if (nextProgress < 1.0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        if (onPlaybackEndRef.current) onPlaybackEndRef.current();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPlaying]);

  // Imperative handle for video exporter and controls
  useImperativeHandle(ref, () => ({
    renderFrameAtProgress: async (progress: number) => {
      progressRef.current = progress;
      updateProgressVisuals(progress);

      const map = mapInstanceRef.current;
      if (!map) return;

      // Wait until all map tiles for current frame viewpoint are fully loaded (prevents washed-out/blank tiles)
      if (!map.areTilesLoaded()) {
        await new Promise<void>((res) => {
          let resolved = false;
          const onIdle = () => {
            if (!resolved) {
              resolved = true;
              map.off('idle', onIdle);
              res();
            }
          };
          map.on('idle', onIdle);
          setTimeout(onIdle, 800);
        });
      }

      await new Promise<void>((resolve) => {
        let isDone = false;
        const finishFrame = () => {
          if (!isDone) {
            isDone = true;
            drawCompositeFrame(progress);
            resolve();
          }
        };
        map.once('render', finishFrame);
        map.triggerRepaint();
        // Fallback timeout guarantees export never stalls
        setTimeout(finishFrame, 100);
      });
    },
    getCanvas: () => {
      if (!compositeCanvasRef.current && mapInstanceRef.current) {
        drawCompositeFrame(currentProgress);
      }
      return compositeCanvasRef.current || mapInstanceRef.current?.getCanvas() || null;
    },
    jumpToProgress: (progress: number) => {
      progressRef.current = progress;
      setIsDestinationRevealed(
        checkDestinationReached(progress, routeConfig.durationSeconds || 8, calculatedRoute)
      );
      updateProgressVisuals(progress);
    },
    resetCamera: () => {
      if (mapInstanceRef.current && calculatedRoute) {
        smoothedBearingRef.current = null;
        if (routeConfig.cameraMode === 'static-overview') {
          mapInstanceRef.current.fitBounds(calculatedRoute.bounds, {
            padding: 100,
            duration: 800,
            pitch: 20,
            bearing: 0,
          });
        } else {
          const { zoom, pitch } = getDynamicFollowZoomPitch(calculatedRoute.totalDistanceKm);
          mapInstanceRef.current.jumpTo({
            center: [routeConfig.startPoint.lng, routeConfig.startPoint.lat],
            zoom,
            pitch,
            bearing: 0,
          });
        }
      }
    },
  }));

  const duration = routeConfig.durationSeconds || 8;
  const { pArrive } = getTimelinePhases(duration);
  const isArrived = currentProgress >= pArrive;
  const isDestReachedCalc = checkDestinationReached(currentProgress, duration, calculatedRoute);
  const showDestinationPin = isDestinationRevealed || isDestReachedCalc;

  return (
    <div className={`relative overflow-hidden bg-[#FFFCF2] border border-[#dcd4c6] select-none ${getAspectRatioClasses(routeConfig.aspectRatio)}`}>
      {/* WebGL Map Viewport - Locked against user movement/zoom */}
      <div ref={mapContainerRef} className="w-full h-full cursor-default select-none pointer-events-none touch-none" />

      {/* Real-time High-FPS Trail Canvas Overlay */}
      <canvas ref={trailCanvasRef} className="absolute inset-0 pointer-events-none z-[5]" />

      {/* HTML Overlays (Pins, Vehicle, Badges, Titles) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Outstanding Start Station Pin */}
        {routeConfig.showStationPins && startPinScreenPos && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full will-change-transform flex flex-col items-center z-10"
            style={{ left: `${startPinScreenPos.x}px`, top: `${startPinScreenPos.y}px` }}
          >
            {/* Prominent Card Pill */}
            <div className="bg-white/95 text-[#252422] rounded-xl shadow-xl border border-emerald-500/60 backdrop-blur-md px-3 py-1.5 flex items-center gap-2 mb-1.5 select-none transform hover:scale-105 transition-transform">
              <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black text-[9px] tracking-wider uppercase shadow-sm">
                START
              </span>
              <span className="text-xs font-bold text-[#252422] tracking-tight">
                {routeConfig.startPoint.name}
              </span>
            </div>
            {/* Pulsing Beacon & Pin Stalk */}
            <div className="relative flex items-center justify-center">
              <span className="absolute -inset-2.5 rounded-full bg-emerald-500/35 animate-ping pointer-events-none" />
              <div className="w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
          </div>
        )}

        {/* Outstanding Destination Station Pin - Hidden until destination arrival with smooth pop-in bounce */}
        {routeConfig.showStationPins && endPinScreenPos && showDestinationPin && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full will-change-transform z-10 pointer-events-none"
            style={{ left: `${endPinScreenPos.x}px`, top: `${endPinScreenPos.y}px` }}
          >
            <div className="flex flex-col items-center animate-pop-in-bounce origin-bottom">
              {/* Prominent Card Pill with Arrival Highlight */}
              <div className="bg-white/95 text-[#252422] rounded-xl shadow-2xl border border-[#EB5E28] ring-4 ring-[#EB5E28]/25 backdrop-blur-md px-3 py-1.5 flex items-center gap-2 mb-1.5 select-none scale-105">
                <span className="px-1.5 py-0.5 rounded bg-[#EB5E28] text-white font-black text-[9px] tracking-wider uppercase shadow-sm">
                  ARRIVED
                </span>
                <span className="text-xs font-bold text-[#252422] tracking-tight">
                  {routeConfig.endPoint.name}
                </span>
              </div>
              {/* Pulsing Beacon & Pin Stalk */}
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-2.5 rounded-full bg-[#EB5E28]/35 animate-ping pointer-events-none" />
                <div className="w-5 h-5 rounded-full bg-[#EB5E28] border-2 border-white shadow-lg flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Moving Vehicle & Floating Distance Badge */}
        {vehicleState.visible && vehicleState.screenPos && vehicleState.point && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 will-change-transform"
            style={{
              left: `${vehicleState.screenPos.x}px`,
              top: `${vehicleState.screenPos.y}px`,
            }}
          >
            {/* Vehicle Icon with Side-View Orientation (Auto-Flip & Upright Clamped Tilt) */}
            {(() => {
              const { scaleX: vehFlipX, tiltDeg } = getSideViewOrientation(vehicleState.point.bearing);
              return (
                <div
                  className="will-change-transform"
                  style={{
                    transformOrigin: '50% 50%',
                    transform: `scaleX(${vehFlipX}) rotate(${tiltDeg}deg) translateY(-${vehicleState.point.altitudeOffset || 0}px)`,
                  }}
                >
                  <VehicleIcon
                    type={routeConfig.vehicle}
                    size={54}
                    glowColor="#EB5E28"
                    customImageUrl={routeConfig.customVehicleImage}
                  />
                </div>
              );
            })()}
          </div>
        )}

        {/* Title & Route Info Overlay at top */}
        {routeConfig.showTitleOverlay && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md border border-[#dcd4c6] px-4 py-2.5 rounded-xl shadow-2xl">
              <div className="text-[10px] font-medium text-[#736d65] uppercase tracking-wider">Route Journey</div>
              <div className="text-xs font-bold text-[#252422] flex items-center gap-2">
                <span>{routeConfig.startPoint.name}</span>
                <span className="text-[#EB5E28]">➔</span>
                <span>{routeConfig.endPoint.name}</span>
              </div>
            </div>

            {/* Travel Mode Badge */}
            <div className="bg-[#EB5E28]/10 backdrop-blur-md border border-[#EB5E28]/30 px-3 py-1.5 rounded-lg text-[#EB5E28] text-xs font-semibold uppercase tracking-wider">
              {routeConfig.vehicle === 'custom' ? 'Custom' : routeConfig.vehicle} • {routeConfig.travelTimeText}
            </div>
          </div>
        )}

        {/* Arrival Celebration Banner when arriving at destination */}
        {showDestinationPin && calculatedRoute && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-30">
            <div className="animate-pop-in-bounce origin-bottom">
              <div className="bg-white/95 backdrop-blur-md border-2 border-[#EB5E28] px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3">
                <span className="text-base">🏁</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#252422]">
                    {routeConfig.startPoint.name} ➔ {routeConfig.endPoint.name}
                  </span>
                  <span className="text-xs font-bold text-[#736d65]">•</span>
                  <span className="text-xs font-bold text-[#EB5E28]">
                    {calculatedRoute.totalDistanceKm.toFixed(1)} km
                  </span>
                  {routeConfig.travelTimeText && (
                    <>
                      <span className="text-xs font-bold text-[#736d65]">•</span>
                      <span className="text-xs font-bold text-[#EB5E28]">
                        {routeConfig.travelTimeText}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subtle Map Attribution Badge in bottom-right corner */}
        <div className="absolute bottom-2.5 right-3 pointer-events-none z-20">
          <div className="bg-[#FFFCF2]/90 backdrop-blur-sm border border-[#dcd4c6] px-2 py-0.5 rounded-md text-[9px] font-medium text-[#736d65] shadow-sm">
            {routeConfig.mapTheme === 'outdoors'
              ? '© OpenStreetMap contributors'
              : routeConfig.mapTheme === 'satellite'
              ? '© Esri, Maxar'
              : '© Esri, © OpenStreetMap'}
          </div>
        </div>
      </div>
    </div>
  );
});
