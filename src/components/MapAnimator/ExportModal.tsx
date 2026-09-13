'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Film, Sparkles, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { RouteConfig } from '@/types/route';
import { CalculatedRoute } from '@/services/routing';
import { exportRouteVideo, downloadVideoFile, ExportProgress } from '@/services/videoExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeConfig: RouteConfig;
  calculatedRoute?: CalculatedRoute | null;
  isLoadingRoute?: boolean;
  getCanvas: () => HTMLCanvasElement | null;
  renderFrameAtProgress: (progress: number) => Promise<void>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  routeConfig,
  calculatedRoute,
  isLoadingRoute = false,
  getCanvas,
  renderFrameAtProgress,
}) => {
  const [format, setFormat] = useState<'mp4' | 'webm'>('mp4');
  const [fps, setFps] = useState<30 | 60>(30);
  const [isExporting, setIsExporting] = useState(false);
  const [progressState, setProgressState] = useState<ExportProgress>({
    progress: 0,
    status: 'Ready to export',
  });
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-reset exported video state whenever modal opens or when route endpoints/vehicle change
  useEffect(() => {
    if (isOpen) {
      setExportedVideoUrl(null);
      setExportedFilename(null);
      setErrorMessage(null);
      setIsExporting(false);
      setProgressState({
        progress: 0,
        status: 'Ready to export',
      });
    }
  }, [
    isOpen,
    routeConfig.startPoint.lat,
    routeConfig.startPoint.lng,
    routeConfig.endPoint.lat,
    routeConfig.endPoint.lng,
    routeConfig.vehicle,
    routeConfig.modeCategory,
    routeConfig.durationSeconds,
  ]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (isLoadingRoute || !calculatedRoute) {
      setErrorMessage('Route geometry is currently calculating. Please wait a moment.');
      return;
    }

    const canvas = getCanvas();
    if (!canvas) {
      setErrorMessage('Map canvas not initialized. Please try again.');
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    setExportedVideoUrl(null);

    const title = `${routeConfig.startPoint.name}_to_${routeConfig.endPoint.name}_${routeConfig.vehicle}`;

    try {
      const result = await exportRouteVideo({
        canvas,
        durationSeconds: routeConfig.durationSeconds || 8,
        fps,
        format,
        title,
        onProgress: (prog) => {
          setProgressState(prog);
        },
        renderFrameAtProgress,
      });

      setExportedVideoUrl(result.url);
      setExportedFilename(result.filename);
      setIsExporting(false);
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMessage(err?.message || 'Failed to export video. Please try WebM format.');
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (exportedVideoUrl && exportedFilename) {
      downloadVideoFile(exportedVideoUrl, exportedFilename);
    }
  };

  const handleResetExport = () => {
    setExportedVideoUrl(null);
    setExportedFilename(null);
    setErrorMessage(null);
    setIsExporting(false);
    setProgressState({
      progress: 0,
      status: 'Ready to export',
    });
  };

  const isRoutePending = isLoadingRoute || !calculatedRoute;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#FFFCF2]/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#f5efe4] border border-[#dcd4c6] rounded-3xl p-6 max-w-lg w-full shadow-2xl relative flex flex-col gap-6 text-[#403D39]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dcd4c6] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EB5E28]/12 text-[#EB5E28] border border-amber-600/40">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#252422]">Export Animation Video</h3>
              <p className="text-xs text-[#736d65]">
                {routeConfig.startPoint.name} ➔ {routeConfig.endPoint.name} ({routeConfig.travelTimeText})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 text-[#736d65] hover:text-[#252422] rounded-lg hover:bg-[#ede5d6] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview or Config */}
        {exportedVideoUrl ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl overflow-hidden border border-emerald-500/40 bg-[#252422] aspect-video flex items-center justify-center shadow-lg">
              <video
                src={exportedVideoUrl}
                controls
                autoPlay
                loop
                className="max-h-full max-w-full rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-600 bg-emerald-50 border border-emerald-300 p-3 rounded-xl">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Video rendered successfully!
              </span>
              <span className="font-mono">{exportedFilename}</span>
            </div>
          </div>
        ) : isRoutePending ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 bg-[#FFFCF2] rounded-2xl border border-[#dcd4c6] gap-3 text-center">
            <div className="w-6 h-6 border-2 border-[#EB5E28] border-t-transparent rounded-full animate-spin" />
            <div className="text-xs font-bold text-[#252422]">Updating Route Geometry...</div>
            <div className="text-[11px] text-[#736d65]">
              Calculating path for {routeConfig.startPoint.name} ➔ {routeConfig.endPoint.name}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Format Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#736d65] uppercase tracking-wider">
                Video Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('mp4')}
                  disabled={isExporting}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    format === 'mp4'
                      ? 'bg-[#EB5E28]/12 border-[#EB5E28] text-[#EB5E28]'
                      : 'bg-[#FFFCF2] border-[#dcd4c6] text-[#736d65] hover:text-[#252422]'
                  }`}
                >
                  <div className="font-bold text-xs">MP4 Video</div>
                  <div className="text-[11px] text-[#736d65] mt-0.5">Universal compatibility</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('webm')}
                  disabled={isExporting}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    format === 'webm'
                      ? 'bg-[#EB5E28]/12 border-[#EB5E28] text-[#EB5E28]'
                      : 'bg-[#FFFCF2] border-[#dcd4c6] text-[#736d65] hover:text-[#252422]'
                  }`}
                >
                  <div className="font-bold text-xs">WebM Video</div>
                  <div className="text-[11px] text-[#736d65] mt-0.5">High quality VP9 stream</div>
                </button>
              </div>
            </div>

            {/* Framerate Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#736d65] uppercase tracking-wider">
                Frame Rate (FPS)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFps(30)}
                  disabled={isExporting}
                  className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                    fps === 30
                      ? 'bg-[#EB5E28]/12 border-[#EB5E28] text-[#EB5E28] font-bold'
                      : 'bg-[#FFFCF2] border-[#dcd4c6] text-[#736d65] hover:text-[#252422]'
                  }`}
                >
                  30 FPS (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setFps(60)}
                  disabled={isExporting}
                  className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                    fps === 60
                      ? 'bg-[#EB5E28]/12 border-[#EB5E28] text-[#EB5E28] font-bold'
                      : 'bg-[#FFFCF2] border-[#dcd4c6] text-[#736d65] hover:text-[#252422]'
                  }`}
                >
                  60 FPS (Ultra Smooth)
                </button>
              </div>
            </div>

            {/* Progress Bar while Exporting */}
            {isExporting && (
              <div className="flex flex-col gap-2 bg-[#FFFCF2] p-4 rounded-2xl border border-[#dcd4c6]">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#EB5E28]">{progressState.status}</span>
                  <span className="font-mono font-bold text-[#EB5E28]">{progressState.progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-[#ede5d6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#EB5E28] to-[#f2794b] transition-all duration-150 rounded-full"
                    style={{ width: `${progressState.progress}%` }}
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-300 text-red-600 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dcd4c6]">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-[#ede5d6] hover:bg-[#dcd4c6] text-[#403D39] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {exportedVideoUrl ? 'Done' : 'Cancel'}
          </button>

          {exportedVideoUrl ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetExport}
                className="px-4 py-2.5 rounded-xl bg-[#ede5d6] hover:bg-[#dcd4c6] text-[#403D39] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-export</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EB5E28] to-[#c2593f] hover:from-[#c2593f] hover:to-[#EB5E28] text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Video</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartExport}
              disabled={isExporting || isRoutePending}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#EB5E28] to-[#c2593f] hover:from-[#c2593f] hover:to-[#EB5E28] text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : isRoutePending ? 'Calculating Route...' : 'Start Video Render'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
