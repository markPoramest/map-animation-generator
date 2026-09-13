'use client';

import React from 'react';
import { Layers, Maximize2, Navigation } from 'lucide-react';
import { RouteConfig, MapTheme } from '@/types/route';

interface VisualSettingsProps {
  routeConfig: RouteConfig;
  onChange: (updated: Partial<RouteConfig>) => void;
}

const THEMES: { id: MapTheme; label: string; previewColor: string }[] = [
  { id: 'voyager', label: 'Warm Earth / Streets', previewColor: '#e7e5e4' },
  { id: 'dark', label: 'Charcoal Dark', previewColor: '#1c1917' },
  { id: 'satellite', label: 'Satellite Photorealistic', previewColor: '#292524' },
  { id: 'positron', label: 'Linen Minimal', previewColor: '#f5f5f4' },
  { id: 'outdoors', label: 'Moss Outdoors / Topo', previewColor: '#dcfce7' },
  { id: 'retro', label: 'Vintage Terracotta Topo', previewColor: '#fed7aa' },
];

export const VisualSettings: React.FC<VisualSettingsProps> = ({
  routeConfig,
  onChange,
}) => {
  return (
    <div className="flex flex-col gap-6 text-[#403D39]">
      {/* Map Theme Selection */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-bold text-[#736d65] uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#EB5E28]" />
          <span>Map Tile Theme</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((theme) => {
            const isSelected = routeConfig.mapTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onChange({ mapTheme: theme.id })}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs text-left transition-all ${
                  isSelected
                    ? 'bg-[#EB5E28]/10 border-[#EB5E28]/60 text-[#252422] shadow-sm'
                    : 'bg-[#f5efe4] border-[#dcd4c6] hover:bg-[#ede5d6] text-[#736d65] hover:text-[#252422]'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full border border-[#dcd4c6] shadow-inner flex-shrink-0"
                  style={{ backgroundColor: theme.previewColor }}
                />
                <span className="truncate">{theme.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Camera Mode Selection */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-bold text-[#736d65] uppercase tracking-wider flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-[#EB5E28]" />
          <span>Camera Mode</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onChange({ cameraMode: 'static-overview' })}
            className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
              routeConfig.cameraMode === 'static-overview'
                ? 'bg-[#EB5E28]/10 border-[#EB5E28]/60 text-[#252422] shadow-sm ring-1 ring-[#EB5E28]/20'
                : 'bg-[#f5efe4] border-[#dcd4c6] hover:bg-[#ede5d6] text-[#736d65] hover:text-[#252422]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Maximize2 className="w-4 h-4 text-[#EB5E28]" />
              <span className="font-bold text-xs text-[#252422]">Static Overview</span>
            </div>
            <p className="text-[11px] text-[#736d65] leading-relaxed">
              Locked bird&apos;s-eye framing of the full route corridor. Camera stays strictly stationary.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onChange({ cameraMode: 'dynamic-follow' })}
            className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
              routeConfig.cameraMode === 'dynamic-follow'
                ? 'bg-[#EB5E28]/10 border-[#EB5E28]/60 text-[#252422] shadow-sm ring-1 ring-[#EB5E28]/20'
                : 'bg-[#f5efe4] border-[#dcd4c6] hover:bg-[#ede5d6] text-[#736d65] hover:text-[#252422]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="w-4 h-4 text-[#EB5E28]" />
              <span className="font-bold text-xs text-[#252422]">Dynamic Follow</span>
            </div>
            <p className="text-[11px] text-[#736d65] leading-relaxed">
              Cinematic tracking camera dynamically follows the vehicle along the path with smooth panning.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
