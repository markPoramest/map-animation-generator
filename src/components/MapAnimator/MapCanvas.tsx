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
        attribution: '&copy; Esri &copy; Maxar',
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
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
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
        maxzoom: 19,
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
        attribution: '&copy; Esri &copy; OpenStreetMap',
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

// Canvas Overlay Drawing Helpers for Video Export
function drawPinOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  title: string,
  baseColor: string,
  accentColor: string,
  scale: number
) {
  ctx.save();
  // Pin Circle
  ctx.beginPath();
  ctx.arc(x, y, 7 * scale, 0, Math.PI * 2);
  ctx.fillStyle = baseColor;
  ctx.fill();
  ctx.lineWidth = 2.5 * scale;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Label Pill
  ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
  const textWidth = ctx.measureText(title).width;
  const pillW = textWidth + 24 * scale;
  const pillH = 26 * scale;
  const pillX = x - pillW / 2;
  const pillY = y - pillH - 10 * scale;

  // Pill Background
  ctx.fillStyle = 'rgba(255, 252, 242, 0.95)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 13 * scale);
  ctx.fill();
  ctx.stroke();

  // Dot inside pill
  ctx.beginPath();
  ctx.arc(pillX + 10 * scale, pillY + pillH / 2, 3.5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();

  // Text
  ctx.fillStyle = '#252422';
  ctx.fillText(title, pillX + 18 * scale, pillY + pillH / 2 + 4.5 * scale);
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
          drawPinOnCanvas(ctx, p.x * scaleX, p.y * scaleY, routeConfig.startPoint.name, '#059669', '#10b981', scaleX);
        }
        if (routeConfig.endPoint) {
          const p = map.project([routeConfig.endPoint.lng, routeConfig.endPoint.lat]);
          drawPinOnCanvas(ctx, p.x * scaleX, p.y * scaleY, routeConfig.endPoint.name, '#c2410c', '#EB5E28', scaleX);
        }
      }

      // 3. Draw Vehicle Model & Floating Travel Time Badge
      if (calculatedRoute && calculatedRoute.samplePoints.length && progress > 0.001) {
        const samples = calculatedRoute.samplePoints;
        const index = Math.min(Math.floor(progress * (samples.length - 1)), samples.length - 1);
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

        // Draw Floating Distance Badge above Vehicle (dynamically increasing distance only)
        if (routeConfig.showDistanceBadge && calculatedRoute) {
          const currentDistance = progress >= 0.999
            ? calculatedRoute.totalDistanceKm.toFixed(1)
            : sample.distanceKmFromStart.toFixed(1);
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

      // 5. Draw Subtle Map Attribution Credit in bottom-right corner for YouTube compliance
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
        // Pre-warm corridor tiles and jump to start point
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

  // Setup Clean Journey Route Layer
  const setupRouteLayers = (map: maplibregl.Map) => {
    if (!calculatedRoute || !calculatedRoute.coordinates.length) return;

    ['journey-route-layer', 'journey-route-casing', 'trail-glow-layer', 'trail-progress-layer', 'trail-background-layer', 'trail-casing-layer', 'trail-background-casing'].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    ['journey-route-source', 'trail-progress-source', 'trail-background-source'].forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });

    // Single clean GeoJSON route source for journey
    map.addSource('journey-route-source', {
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

    // High contrast crisp casing for route track
    map.addLayer({
      id: 'journey-route-casing',
      type: 'line',
      source: 'journey-route-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': 7,
        'line-opacity': 0.85,
      },
    });

    // Main clean journey track
    map.addLayer({
      id: 'journey-route-layer',
      type: 'line',
      source: 'journey-route-source',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#EB5E28',
        'line-width': 4.5,
        'line-opacity': 0.95,
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
      const index = Math.min(
        Math.floor(progress * (samples.length - 1)),
        samples.length - 1
      );
      const currentSample = samples[index];

      // Calculate smoothed bearing for vehicle vs camera
      let smoothedBearing = currentSample.bearing;
      const windowRadius = 8;
      const startIdx = Math.max(0, index - windowRadius);
      const endIdx = Math.min(samples.length - 1, index + windowRadius);
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

      // Camera Choreography (Default: 3D North-Up with zero shaking)
      const isNorthLocked = routeConfig.lockNorth ?? true;

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

          if (progress < 0.25) {
            targetZoom = startZoom - (progress / 0.25) * (startZoom - midZoom);
          } else if (progress > 0.75) {
            targetZoom = midZoom - ((progress - 0.75) / 0.25) * (midZoom - endZoom);
          }

          map.jumpTo({
            center: [currentSample.lng, currentSample.lat],
            zoom: targetZoom,
            pitch: 35,
            bearing: isNorthLocked ? 0 : (smoothedBearing * 0.3),
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
          const orbitBearing = isNorthLocked ? 0 : ((progress * 360) % 360);
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

      // Update Vehicle screen position & angle AFTER camera positioning (prevents blinking/stuttering)
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

      // Trigger Confetti on 100% arrival
      if (progress >= 0.99 && !confettiFiredRef.current) {
        confettiFiredRef.current = true;
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
            zIndex: 9999,
          });
        } catch {
          // ignore
        }
      } else if (progress < 0.9) {
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
      await new Promise<void>((resolve) => {
        if (mapInstanceRef.current) {
          let isDone = false;
          const finishFrame = () => {
            if (!isDone) {
              isDone = true;
              drawCompositeFrame(progress);
              resolve();
            }
          };
          mapInstanceRef.current.once('render', finishFrame);
          mapInstanceRef.current.triggerRepaint();
          // Fallback timeout guarantees export never stalls
          setTimeout(finishFrame, 60);
        } else {
          resolve();
        }
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
          padding: 60,
          pitch: 30,
          bearing: 0,
        });
      }
    },
  }));

  return (
    <div className={`relative overflow-hidden bg-[#FFFCF2] border border-[#dcd4c6] ${getAspectRatioClasses(routeConfig.aspectRatio)}`}>
      {/* WebGL Map Viewport */}
      <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* HTML Overlays (Pins, Vehicle, Badges, Titles) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Start Station Pin */}
        {routeConfig.showStationPins && startPinScreenPos && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full will-change-transform flex flex-col items-center"
            style={{ left: `${startPinScreenPos.x}px`, top: `${startPinScreenPos.y}px` }}
          >
            <div className="bg-white/95 text-[#252422] text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg border border-emerald-500/40 backdrop-blur-sm whitespace-nowrap mb-1 flex items-center gap-1.5 animate-bounce">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {routeConfig.startPoint.name}
            </div>
            <div className="w-4 h-4 rounded-full bg-emerald-600 border-2 border-stone-100 shadow-md"></div>
          </div>
        )}

        {/* End Station Pin */}
        {routeConfig.showStationPins && endPinScreenPos && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full will-change-transform flex flex-col items-center"
            style={{ left: `${endPinScreenPos.x}px`, top: `${endPinScreenPos.y}px` }}
          >
            <div className="bg-white/95 text-[#252422] text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg border border-[#EB5E28]/40 backdrop-blur-sm whitespace-nowrap mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {routeConfig.endPoint.name}
            </div>
            <div className="w-4 h-4 rounded-full bg-amber-600 border-2 border-stone-100 shadow-md"></div>
          </div>
        )}

        {/* Moving Vehicle & Floating Distance Badge (only distance shown) */}
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
                      {currentProgress >= 0.999
                        ? calculatedRoute.totalDistanceKm.toFixed(1)
                        : (vehicleState.point?.distanceKmFromStart ?? (currentProgress * calculatedRoute.totalDistanceKm)).toFixed(1)} km
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Icon with Dynamic Bearing Rotation (smooth GPU transform, no transition delay) */}
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
