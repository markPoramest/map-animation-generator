'use client';

import React from 'react';
import { Layers } from 'lucide-react';
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

      {/* Camera Orientation Setting */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-bold text-[#736d65] uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#EB5E28]" />
          <span>Camera & Orientation</span>
        </label>
        <div className="flex items-center justify-between p-3 bg-[#f5efe4] rounded-xl border border-[#dcd4c6]">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#252422] flex items-center gap-1.5">
              <span>🧭 Lock North to Top</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-500/30 font-medium">Default</span>
            </span>
            <span className="text-[11px] text-[#736d65]">Keeps map orientation fixed North-Up (Eliminates shaking)</span>
          </div>
          <input
            type="checkbox"
            checked={routeConfig.lockNorth ?? true}
            onChange={(e) => onChange({ lockNorth: e.target.checked })}
            className="w-4 h-4 accent-[#EB5E28] cursor-pointer rounded"
          />
        </div>
      </div>
    </div>
  );
};
