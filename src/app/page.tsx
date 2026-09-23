'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Settings2, 
  Video, 
  Route as RouteIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { RouteConfig } from '@/types/route';
import { calculateRoute, CalculatedRoute } from '@/services/routing';
import type { MapCanvasHandle } from '@/components/MapAnimator/MapCanvas';
import { RouteEditor } from '@/components/MapAnimator/RouteEditor';
import { VisualSettings } from '@/components/MapAnimator/VisualSettings';
import { TimelineControls } from '@/components/MapAnimator/TimelineControls';
import { ExportModal } from '@/components/MapAnimator/ExportModal';

const MapCanvas = dynamic(
  () => import('@/components/MapAnimator/MapCanvas').then((mod) => mod.MapCanvas),
  { ssr: false }
);

export default function Home() {
  const [routeConfig, setRouteConfig] = useState<RouteConfig>({
    id: 'matsumoto-kami-suwa',
    title: 'Matsumoto to Kami-Suwa Train Journey',
    startPoint: {
      name: 'Matsumoto Station',
      lat: 36.2307,
      lng: 137.9644,
      subText: 'Nagano, Japan',
    },
    endPoint: {
      name: 'Kami-Suwa Station',
      lat: 36.0467,
      lng: 138.1165,
      subText: 'Suwa, Nagano, Japan',
    },
    waypoints: [],
    vehicle: 'train',
    modeCategory: 'train',
    travelTimeText: '40 min',
    distanceText: '32 km',
    durationSeconds: 8,
    mapTheme: 'voyager',
    cameraMode: 'static-overview',
    aspectRatio: '16:9',
    trailColor: '#FF4D00',
    trailWidth: 3.5,
    showTimeBadge: true,
    showDistanceBadge: false,
    showStationPins: true,
    showTitleOverlay: true,
    lockNorth: true,
    cameraPitch: 50,
    cameraBearingOffset: 0,
    cameraZoom: 13.0,
  });

  const [activeTab, setActiveTab] = useState<'route' | 'visuals'>('route');
  const [calculatedRoute, setCalculatedRoute] = useState<CalculatedRoute | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const mapCanvasRef = useRef<MapCanvasHandle>(null);
  const initialCalculatedRef = useRef(false);

  const getRouteKey = (config: RouteConfig) => 
    `${config.startPoint.lat.toFixed(4)},${config.startPoint.lng.toFixed(4)}_${config.endPoint.lat.toFixed(4)},${config.endPoint.lng.toFixed(4)}_${config.vehicle}_${config.modeCategory || ''}_${config.waypoints.map(w => `${w.lat},${w.lng}`).join(';')}`;

  const [lastCalculatedKey, setLastCalculatedKey] = useState<string>('');

  const currentRouteKey = getRouteKey(routeConfig);
  const hasUncalculatedChanges = Boolean(!calculatedRoute || currentRouteKey !== lastCalculatedKey);

  const handleGenerateRoute = async (configOverride?: RouteConfig) => {
    const config = configOverride || routeConfig;
    setIsLoadingRoute(true);
    try {
      const route = await calculateRoute(
        config.startPoint,
        config.endPoint,
        config.waypoints,
        config.vehicle,
        config.modeCategory
      );
      setCalculatedRoute(route);
      setLastCalculatedKey(getRouteKey(config));
      setCurrentProgress(0);
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to calculate route:', err);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Only calculate on initial mount once
  useEffect(() => {
    if (!initialCalculatedRef.current) {
      initialCalculatedRef.current = true;
      handleGenerateRoute(routeConfig);
    }
  }, []);

  const handleUpdateConfig = (updated: Partial<RouteConfig>) => {
    setRouteConfig((prev) => {
      const next = { ...prev, ...updated };
      if (updated.startPoint || updated.endPoint) {
        next.title = `${next.startPoint.name} to ${next.endPoint.name} Journey`;
      }
      return next;
    });
  };

  const handlePlayToggle = () => {
    if (currentProgress >= 1.0) {
      setCurrentProgress(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentProgress(0);
    mapCanvasRef.current?.jumpToProgress(0);
  };

  const handleProgressChange = (prog: number) => {
    setCurrentProgress(prog);
    mapCanvasRef.current?.jumpToProgress(prog);
  };

  const handlePlaybackEnd = () => {
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-[#FFFCF2] text-[#252422] flex flex-col font-sans selection:bg-[#EB5E28] selection:text-white">
      {/* Top Studio Header - LIGHT THEME */}
      <header className="h-16 border-b border-[#dcd4c6] bg-white/80 backdrop-blur-xl px-6 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-full overflow-hidden shadow-md shadow-[#EB5E28]/15 border border-[#dcd4c6] bg-white flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Map Animation Generator"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-[#252422]">
                Map Animation Generator
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EB5E28]/10 text-[#EB5E28] border border-[#EB5E28]/20 hidden sm:inline-block">
                by Mark no Nihon Tabi
              </span>
            </div>
            <p className="text-xs text-[#736d65]">
              Create animated 3D route travel videos with custom train models & travel time badges
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExportModalOpen(true)}
            disabled={isLoadingRoute || !calculatedRoute}
            className="px-4 py-2 bg-gradient-to-r from-[#EB5E28] to-[#c2593f] hover:from-[#c2593f] hover:to-[#EB5E28] text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingRoute ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Video className="w-4 h-4" />
            )}
            <span>{isLoadingRoute ? 'Calculating...' : 'Export Video'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Panel - LIGHT */}
        <div className="w-full lg:w-[420px] xl:w-[460px] border-r border-[#dcd4c6] bg-white/60 backdrop-blur-md flex flex-col h-[calc(100vh-4rem)] overflow-hidden flex-shrink-0">
          <div className="flex border-b border-[#dcd4c6] p-2 gap-1 bg-[#f5efe4]/60">
            <button
              onClick={() => setActiveTab('route')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'route'
                  ? 'bg-[#EB5E28]/10 text-[#EB5E28] border border-[#EB5E28]/50 shadow-inner'
                  : 'text-[#736d65] hover:text-[#252422] hover:bg-[#ede5d6]/50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Route & Vehicle</span>
            </button>
            <button
              onClick={() => setActiveTab('visuals')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'visuals'
                  ? 'bg-[#EB5E28]/10 text-[#EB5E28] border border-[#EB5E28]/50 shadow-inner'
                  : 'text-[#736d65] hover:text-[#252422] hover:bg-[#ede5d6]/50'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>Map & Camera</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {activeTab === 'route' ? (
              <RouteEditor 
                routeConfig={routeConfig} 
                onChange={handleUpdateConfig} 
                onGenerateRoute={() => handleGenerateRoute()}
                isLoadingRoute={isLoadingRoute}
                hasUncalculatedChanges={hasUncalculatedChanges}
              />
            ) : (
              <VisualSettings routeConfig={routeConfig} onChange={handleUpdateConfig} />
            )}
          </div>
          {activeTab === 'route' && (
            <div className="p-3 border-t border-[#dcd4c6] bg-[#f5efe4]/90 backdrop-blur-md">
              <button
                type="button"
                onClick={() => handleGenerateRoute()}
                disabled={isLoadingRoute}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasUncalculatedChanges
                    ? 'bg-gradient-to-r from-[#EB5E28] to-[#c2593f] hover:from-[#c2593f] hover:to-[#EB5E28] text-white shadow-[#EB5E28]/25 ring-2 ring-[#EB5E28]/40'
                    : 'bg-[#252422] hover:bg-[#403D39] text-white'
                }`}
              >
                {isLoadingRoute ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Calculating Route...</span>
                  </>
                ) : (
                  <>
                    <RouteIcon className="w-3.5 h-3.5" />
                    <span>{hasUncalculatedChanges ? 'Generate Route' : 'Route Up to Date ✓'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Side - LIGHT */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden bg-[#f5efe4] items-center justify-between gap-4">
          <div className="w-full flex-1 flex items-center justify-center min-h-0 relative">
            {isLoadingRoute && (
              <div className="absolute inset-0 z-40 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-[#EB5E28]/40 text-[#EB5E28] text-xs font-bold shadow-2xl">
                  <span className="w-4 h-4 border-2 border-[#EB5E28] border-t-transparent rounded-full animate-spin"></span>
                  <span>Generating route & 3D camera trajectory...</span>
                </div>
              </div>
            )}
            <MapCanvas
              ref={mapCanvasRef}
              routeConfig={routeConfig}
              calculatedRoute={calculatedRoute}
              currentProgress={currentProgress}
              isPlaying={isPlaying}
              onProgressChange={setCurrentProgress}
              onPlaybackEnd={handlePlaybackEnd}
            />
          </div>
          <div className="w-full max-w-4xl">
            <TimelineControls
              isPlaying={isPlaying}
              currentProgress={currentProgress}
              durationSeconds={routeConfig.durationSeconds}
              aspectRatio={routeConfig.aspectRatio}
              disabledExport={isLoadingRoute || !calculatedRoute}
              onPlayToggle={handlePlayToggle}
              onReset={handleReset}
              onProgressChange={handleProgressChange}
              onDurationChange={(sec) => handleUpdateConfig({ durationSeconds: sec })}
              onAspectRatioChange={(ratio) => handleUpdateConfig({ aspectRatio: ratio })}
              onExportClick={() => setIsExportModalOpen(true)}
            />
          </div>
        </div>
      </main>

      <ExportModal
        key={`${routeConfig.startPoint.lat}_${routeConfig.startPoint.lng}_${routeConfig.endPoint.lat}_${routeConfig.endPoint.lng}_${routeConfig.vehicle}_${routeConfig.modeCategory || ''}`}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        routeConfig={routeConfig}
        calculatedRoute={calculatedRoute}
        isLoadingRoute={isLoadingRoute}
        getCanvas={() => mapCanvasRef.current?.getCanvas() || null}
        renderFrameAtProgress={async (prog) => {
          if (mapCanvasRef.current) {
            await mapCanvasRef.current.renderFrameAtProgress(prog);
          }
        }}
      />
    </div>
  );
}
