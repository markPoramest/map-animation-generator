'use client';

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import confetti from 'canvas-confetti';
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

// Canvas Overlay Drawing Helpers for Video Export
function drawPinOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  title: string,
  type: 'start' | 'end',
  scale: number
) {
  ctx.save();
  const isStart = type === 'start';
  const accentColor = isStart ? '#059669' : '#EB5E28';
  const tagText = isStart ? 'START' : 'DESTINATION';

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

function drawTimeBadgeOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  scale: number
) {
  ctx.save();
  ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
  const textWidth = ctx.measureText(text).width;
  const pillW = textWidth + 28 * scale;
  const pillH = 32 * scale;
  const pillX = x - pillW / 2;
  const pillY = y - pillH / 2;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 10 * scale;
  ctx.shadowOffsetY = 4 * scale;

  // Background
  ctx.fillStyle = 'rgba(255, 252, 242, 0.95)';
  ctx.strokeStyle = '#EB5E28';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 16 * scale);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#EB5E28';
  ctx.fillText(text, pillX + 14 * scale, pillY + pillH / 2 + 5 * scale);
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
  const cardW = 400 * scaleX;
  const cardH = 48 * scaleY;
  const cardX = (ctx.canvas.width - cardW) / 2;
  const cardY = ctx.canvas.height - cardH - 34 * scaleY;

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 14 * scaleX;
  ctx.shadowOffsetY = 4 * scaleY;

  // Background
  ctx.fillStyle = 'rgba(255, 252, 242, 0.96)';
  ctx.strokeStyle = '#EB5E28';
  ctx.lineWidth = 2 * scaleX;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 12 * scaleX);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';

  // Tag: ARRIVED
  const tagW = 64 * scaleX;
  const tagH = 24 * scaleY;
  const tagX = cardX + 12 * scaleX;
  const tagY = cardY + (cardH - tagH) / 2;
  ctx.fillStyle = '#EB5E28';
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 6 * scaleX);
  ctx.fill();

  ctx.font = `bold ${Math.round(10 * scaleX)}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('ARRIVED', tagX + tagW / 2, tagY + tagH / 2);

  // Text details
  ctx.textAlign = 'left';
  ctx.font = `bold ${Math.round(12.5 * scaleX)}px sans-serif`;
  ctx.fillStyle = '#252422';
  const text = `${routeConfig.startPoint.name} ➔ ${routeConfig.endPoint.name} • ${totalDistanceKm.toFixed(1)} km`;
  ctx.fillText(text, tagX + tagW + 10 * scaleX, cardY + cardH / 2);

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
  const confettiFiredRef = useRef<boolean>(false);
  const progressRef = useRef<number>(currentProgress);
  const isPlayingRef = useRef<boolean>(isPlaying);

  useEffect(() => {
    progressRef.current = currentProgress;
  }, [currentProgress]);

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

  // Preload vehicle SVG image for canvas composite rendering
  useEffect(() => {
    const dataUri = getVehicleSvgDataUri(
      routeConfig.vehicle,
      routeConfig.trainModel || 'azuma',
      '#EB5E28'
    );
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = dataUri;
    vehicleImageRef.current = img;
  }, [routeConfig.vehicle, routeConfig.trainModel]);

  // Aspect ratio helper (16:9 YouTube Landscape)
  const getAspectRatioClasses = (_ratio: AspectRatio) => {
    return 'aspect-[16/9] w-full max-w-5xl mx-auto shadow-2xl rounded-2xl';
  };

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
      if (canvas.width !== mapCanvas.width || canvas.height !== mapCanvas.height) {
        canvas.width = mapCanvas.width;
        canvas.height = mapCanvas.height;
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

      // 2. Draw Station Pins if enabled
      if (routeConfig.showStationPins) {
        if (routeConfig.startPoint) {
          const p = map.project([routeConfig.startPoint.lng, routeConfig.startPoint.lat]);
          drawPinOnCanvas(ctx, p.x * scaleX, p.y * scaleY, routeConfig.startPoint.name, 'start', scaleX);
        }
        if (routeConfig.endPoint) {
          const p = map.project([routeConfig.endPoint.lng, routeConfig.endPoint.lat]);
          drawPinOnCanvas(ctx, p.x * scaleX, p.y * scaleY, routeConfig.endPoint.name, 'end', scaleX);
        }
      }

      // 3. Draw Vehicle Model & Floating Travel Time Badge
      const { pArrive, pOverview } = getTimelinePhases(routeConfig.durationSeconds || 8);
      const isArrived = progress >= pArrive;
      const travelFraction = isArrived ? 1.0 : progress / pArrive;

      if (calculatedRoute && calculatedRoute.samplePoints.length && progress > 0.001) {
        const samples = calculatedRoute.samplePoints;
        const index = Math.min(Math.floor(travelFraction * (samples.length - 1)), samples.length - 1);
        const sample = samples[index];

        // Smoothed Bearing
        let smoothedBearing = sample.bearing;
        const windowRadius = 8;
        const startIdx = Math.max(0, index - windowRadius);
        const endIdx = Math.min(samples.length - 1, index + windowRadius);
        let sinSum = 0, cosSum = 0;
        for (let i = startIdx; i <= endIdx; i++) {
          const rad = (samples[i].bearing * Math.PI) / 180;
          sinSum += Math.sin(rad);
          cosSum += Math.cos(rad);
        }
        if (cosSum !== 0 || sinSum !== 0) {
          smoothedBearing = ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
        }

        const vp = map.project([sample.lng, sample.lat]);
        const vx = vp.x * scaleX;
        const vy = (vp.y - (sample.altitudeOffset || 0)) * scaleY;

        // Draw Floating Distance Badge above Vehicle (dynamically increasing distance)
        if (routeConfig.showDistanceBadge && calculatedRoute) {
          const currentDistance = travelFraction >= 0.999
            ? calculatedRoute.totalDistanceKm.toFixed(1)
            : (travelFraction * calculatedRoute.totalDistanceKm).toFixed(1);
          const badgeText = `${currentDistance} km`;
          drawTimeBadgeOnCanvas(ctx, vx, vy - 46 * scaleY, badgeText, scaleX);
        }

        // Draw Vehicle Icon
        if (vehicleImageRef.current && vehicleImageRef.current.complete) {
          ctx.save();
          ctx.translate(vx, vy);
          ctx.rotate((smoothedBearing * Math.PI) / 180);
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
      if (isArrived && calculatedRoute) {
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
      maxTileCacheSize: 1000, // Preload and keep tiles in memory
      interactive: true,
    } as any);

    map.on('load', () => {
      isMapLoadedRef.current = true;
      setupRouteLayers(map);
      updateProgressVisuals(progressRef.current);

      if (calculatedRoute && calculatedRoute.bounds) {
        // Pre-warm full route bounds tiles so zoom-out is butter smooth
        map.fitBounds(calculatedRoute.bounds, { padding: 40, duration: 0 });
        setTimeout(() => {
          map.jumpTo({
            center: [startLng, startLat],
            zoom: routeConfig.cameraZoom || 13,
            pitch: routeConfig.cameraPitch || 45,
            bearing: 0,
          });
          setupRouteLayers(map);
          updateProgressVisuals(progressRef.current);
        }, 120);
      }
    });

    map.on('move', () => {
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

    // 1. Base route source (full route path, subtle dashed planned route track)
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

    // Base subtle casing
    map.addLayer({
      id: 'journey-base-casing',
      type: 'line',
      source: 'journey-base-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': 5.5,
        'line-opacity': 0.45,
      },
    });

    // Base subtle line
    map.addLayer({
      id: 'journey-base-line',
      type: 'line',
      source: 'journey-base-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#EB5E28',
        'line-width': 3,
        'line-opacity': 0.35,
        'line-dasharray': [2, 2],
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

    // Traveled Outer Glow
    map.addLayer({
      id: 'journey-active-glow',
      type: 'line',
      source: 'journey-active-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#EB5E28',
        'line-width': 14,
        'line-opacity': 0.4,
        'line-blur': 4,
      },
    });

    // Traveled Crisp High-Contrast White Casing
    map.addLayer({
      id: 'journey-active-casing',
      type: 'line',
      source: 'journey-active-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': 7.5,
        'line-opacity': 0.95,
      },
    });

    // Traveled Active Vibrant Orange/Coral Line
    map.addLayer({
      id: 'journey-active-line',
      type: 'line',
      source: 'journey-active-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#EB5E28',
        'line-width': 5,
        'line-opacity': 1.0,
      },
    });
  };

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && isMapLoadedRef.current) {
      setupRouteLayers(map);
      updateProgressVisuals(currentProgress);
    }
  }, [calculatedRoute]);

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
      if (!map || !calculatedRoute || !calculatedRoute.samplePoints.length) return;

      const samples = calculatedRoute.samplePoints;
      const totalSamples = samples.length;
      if (!totalSamples) return;

      const { pArrive, pOverview } = getTimelinePhases(routeConfig.durationSeconds || 8);
      const isArrived = progress >= pArrive;
      const travelFraction = isArrived ? 1.0 : progress / pArrive;
      const sampleIndex = Math.min(
        Math.floor(travelFraction * (totalSamples - 1)),
        totalSamples - 1
      );
      const currentSample = samples[sampleIndex];

      // Calculate smoothed bearing for vehicle vs camera
      let smoothedBearing = currentSample.bearing;
      const windowRadius = 8;
      const startIdx = Math.max(0, sampleIndex - windowRadius);
      const endIdx = Math.min(totalSamples - 1, sampleIndex + windowRadius);
      let sinSum = 0;
      let cosSum = 0;
      for (let i = startIdx; i <= endIdx; i++) {
        const rad = (samples[i].bearing * Math.PI) / 180;
        sinSum += Math.sin(rad);
        cosSum += Math.cos(rad);
      }
      if (cosSum !== 0 || sinSum !== 0) {
        smoothedBearing = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
        smoothedBearing = (smoothedBearing + 360) % 360;
      }

      // 1. Update Traveled Active Trail Line
      const activeSource = map.getSource('journey-active-source') as maplibregl.GeoJSONSource | undefined;
      if (activeSource) {
        let activeCoords: [number, number][];
        if (sampleIndex <= 0) {
          activeCoords = [
            [samples[0].lng, samples[0].lat],
            [samples[0].lng, samples[0].lat],
          ];
        } else {
          activeCoords = samples.slice(0, sampleIndex + 1).map((s) => [s.lng, s.lat]);
        }
        activeSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: activeCoords,
          },
        });
      }

      // 2. Camera Positioning
      const isNorthLocked = routeConfig.lockNorth ?? true;

      if (!isArrived) {
        // Normal Travel Camera Choreography
        switch (routeConfig.cameraMode) {
          case 'chase-3d': {
            map.jumpTo({
              center: [currentSample.lng, currentSample.lat],
              zoom: routeConfig.cameraZoom || 13.2,
              pitch: routeConfig.cameraPitch || 50,
              bearing: isNorthLocked ? 0 : smoothedBearing + (routeConfig.cameraBearingOffset || 0),
            });
            break;
          }

          case 'dynamic-overview': {
            const startZoom = 13.8;
            const endZoom = 11.5;
            const midZoom = 13.0;
            let targetZoom = midZoom;

            if (travelFraction < 0.25) {
              targetZoom = startZoom - (travelFraction / 0.25) * (startZoom - midZoom);
            } else if (travelFraction > 0.75) {
              targetZoom = midZoom - ((travelFraction - 0.75) / 0.25) * (midZoom - endZoom);
            }

            map.jumpTo({
              center: [currentSample.lng, currentSample.lat],
              zoom: targetZoom,
              pitch: 35,
              bearing: isNorthLocked ? 0 : smoothedBearing * 0.3,
            });
            break;
          }

          case 'top-down-2d': {
            map.jumpTo({
              center: [currentSample.lng, currentSample.lat],
              zoom: routeConfig.cameraZoom || 12.5,
              pitch: 0,
              bearing: 0,
            });
            break;
          }

          case 'cinematic-orbit': {
            const orbitBearing = isNorthLocked ? 0 : (travelFraction * 360) % 360;
            map.jumpTo({
              center: [currentSample.lng, currentSample.lat],
              zoom: 12.8,
              pitch: 45,
              bearing: orbitBearing,
            });
            break;
          }

          case 'fixed-3d':
          default: {
            map.jumpTo({
              center: [currentSample.lng, currentSample.lat],
              zoom: routeConfig.cameraZoom || 13.0,
              pitch: routeConfig.cameraPitch || 50,
              bearing: isNorthLocked ? 0 : smoothedBearing,
            });
            break;
          }
        }
      } else {
        // ARRIVAL & ZOOM-OUT ANIMATION:
        // Interpolate to full overview, then hold the complete route trail for ~3 seconds before video ends
        const t = Math.min(1.0, Math.max(0.0, (progress - pArrive) / (pOverview - pArrive)));
        // Smooth easing for zoom out
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        const destLng = currentSample.lng;
        const destLat = currentSample.lat;
        const destZoom = routeConfig.cameraZoom || 13.0;
        const destPitch = routeConfig.cameraPitch || 50;
        const destBearing = isNorthLocked ? 0 : smoothedBearing;

        // Target Overview camera fitting the route bounds
        const b = calculatedRoute.bounds;
        let overviewCenterLng = (b[0][0] + b[1][0]) / 2;
        let overviewCenterLat = (b[0][1] + b[1][1]) / 2;
        let overviewZoom = 11.2;
        let overviewPitch = 32;
        let overviewBearing = 0;

        try {
          const cam = map.cameraForBounds(b, {
            padding: { top: 90, bottom: 80, left: 80, right: 80 },
          });
          if (cam && cam.center) {
            const center = maplibregl.LngLat.convert(cam.center);
            overviewCenterLng = center.lng;
            overviewCenterLat = center.lat;
            if (typeof cam.zoom === 'number') {
              overviewZoom = Math.min(cam.zoom, 12.2);
            }
          }
        } catch {
          // fallback
        }

        const curLng = destLng + (overviewCenterLng - destLng) * ease;
        const curLat = destLat + (overviewCenterLat - destLat) * ease;
        const curZoom = destZoom + (overviewZoom - destZoom) * ease;
        const curPitch = destPitch + (overviewPitch - destPitch) * ease;

        let bearingDiff = (overviewBearing - destBearing + 540) % 360 - 180;
        const curBearing = destBearing + bearingDiff * ease;

        map.jumpTo({
          center: [curLng, curLat],
          zoom: curZoom,
          pitch: curPitch,
          bearing: curBearing,
        });
      }

      // Update Vehicle screen position & angle AFTER camera positioning
      const screenPos = map.project([currentSample.lng, currentSample.lat]);
      setVehicleState({
        point: { ...currentSample, bearing: smoothedBearing },
        screenPos: { x: screenPos.x, y: screenPos.y },
        visible: progress > 0.001,
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

      // Trigger Confetti on arrival
      if (progress >= pArrive && !confettiFiredRef.current) {
        confettiFiredRef.current = true;
        try {
          confetti({
            particleCount: 65,
            spread: 80,
            origin: { y: 0.6 },
            zIndex: 9999,
          });
        } catch {
          // ignore
        }
      } else if (progress < pArrive - 0.05) {
        confettiFiredRef.current = false;
      }
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

      // On initial start frame, wait until map tiles are completely loaded so no blank or black map appears
      if (progress <= 0.001) {
        if (!map.areTilesLoaded()) {
          await new Promise<void>((res) => {
            const onIdle = () => {
              map.off('idle', onIdle);
              res();
            };
            map.on('idle', onIdle);
            setTimeout(onIdle, 600);
          });
        }
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
        setTimeout(finishFrame, 80);
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
      updateProgressVisuals(progress);
    },
    resetCamera: () => {
      if (mapInstanceRef.current && calculatedRoute) {
        mapInstanceRef.current.fitBounds(calculatedRoute.bounds, {
          padding: { top: 90, bottom: 80, left: 80, right: 80 },
          pitch: 32,
          bearing: 0,
        });
      }
    },
  }));

  const { pArrive } = getTimelinePhases(routeConfig.durationSeconds || 8);
  const isArrived = currentProgress >= pArrive;

  return (
    <div className={`relative overflow-hidden bg-[#FFFCF2] border border-[#dcd4c6] ${getAspectRatioClasses(routeConfig.aspectRatio)}`}>
      {/* WebGL Map Viewport */}
      <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

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

        {/* Outstanding Destination Station Pin */}
        {routeConfig.showStationPins && endPinScreenPos && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full will-change-transform flex flex-col items-center z-10"
            style={{ left: `${endPinScreenPos.x}px`, top: `${endPinScreenPos.y}px` }}
          >
            {/* Prominent Card Pill with Arrival Highlight */}
            <div className={`bg-white/95 text-[#252422] rounded-xl shadow-xl border border-[#EB5E28]/60 backdrop-blur-md px-3 py-1.5 flex items-center gap-2 mb-1.5 select-none transition-all duration-300 ${
              isArrived ? 'scale-110 ring-4 ring-[#EB5E28]/25 shadow-2xl border-[#EB5E28]' : ''
            }`}>
              <span className="px-1.5 py-0.5 rounded bg-[#EB5E28] text-white font-black text-[9px] tracking-wider uppercase shadow-sm">
                DESTINATION
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
            {/* Custom Travel Distance Badge (e.g. "12.4 km") */}
            {routeConfig.showDistanceBadge && calculatedRoute && (
              <div className="absolute left-1/2 -top-10 -translate-x-1/2 whitespace-nowrap z-20 pointer-events-none">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#EB5E28] to-[#c2593f] rounded-full blur opacity-50"></div>
                  <div className="relative px-3 py-0.5 bg-white/95 backdrop-blur-md rounded-full border border-[#EB5E28]/40 shadow-xl flex items-center justify-center text-xs font-bold text-[#EB5E28]">
                    <span className="font-mono text-[11px] tracking-tight">
                      {isArrived
                        ? calculatedRoute.totalDistanceKm.toFixed(1)
                        : ((currentProgress / pArrive) * calculatedRoute.totalDistanceKm).toFixed(1)} km
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Icon with Dynamic Bearing Rotation */}
            <div
              className="origin-center will-change-transform"
              style={{
                transform: `rotate(${vehicleState.point.bearing}deg) translateY(-${vehicleState.point.altitudeOffset || 0}px)`,
              }}
            >
              <VehicleIcon
                type={routeConfig.vehicle}
                trainModel={routeConfig.trainModel}
                size={54}
                glowColor="#EB5E28"
              />
            </div>
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
              {routeConfig.vehicle} • {routeConfig.travelTimeText}
            </div>
          </div>
        )}

        {/* Arrival Celebration Banner when arriving and zoomed out */}
        {isArrived && calculatedRoute && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 transition-all duration-500 ease-out transform animate-fade-in">
            <div className="bg-white/95 backdrop-blur-md border-2 border-[#EB5E28] px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3">
              <span className="text-base">🏁</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-[#EB5E28] tracking-widest uppercase">
                  JOURNEY COMPLETED
                </span>
                <span className="text-xs font-bold text-[#252422]">
                  {routeConfig.startPoint.name} ➔ {routeConfig.endPoint.name} • {calculatedRoute.totalDistanceKm.toFixed(1)} km
                </span>
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
