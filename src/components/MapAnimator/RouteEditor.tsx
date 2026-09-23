'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Train, 
  Car, 
  Plane, 
  Bus, 
  Bike, 
  Footprints, 
  Ship, 
  MapPin, 
  ArrowUpDown, 
  Clock, 
  Search,
  Check,
  ImagePlus,
  Upload,
  X,
  Route,
  Navigation
} from 'lucide-react';
import { RouteConfig, VehicleType, GeoPoint, ModeCategory, getEffectiveModeCategory } from '@/types/route';
import { searchLocations } from '@/services/geocoding';
import { CategoryGlyph, CATEGORY_LABELS } from './CategoryGlyphs';

interface RouteEditorProps {
  routeConfig: RouteConfig;
  onChange: (updated: Partial<RouteConfig>) => void;
  onGenerateRoute: () => void;
  isLoadingRoute: boolean;
  hasUncalculatedChanges: boolean;
}

const VEHICLE_OPTIONS: { type: VehicleType; label: string; icon: React.ReactNode }[] = [
  { type: 'train', label: 'Train', icon: <Train className="w-4 h-4 text-[#EB5E28]" /> },
  { type: 'shinkansen', label: 'Shinkansen', icon: <Train className="w-4 h-4 text-teal-500" /> },
  { type: 'car', label: 'Car', icon: <Car className="w-4 h-4 text-orange-500" /> },
  { type: 'airplane', label: 'Flight', icon: <Plane className="w-4 h-4 text-sky-500" /> },
  { type: 'bus', label: 'Bus', icon: <Bus className="w-4 h-4 text-[#EB5E28]" /> },
  { type: 'bicycle', label: 'Bicycle', icon: <Bike className="w-4 h-4 text-emerald-500" /> },
  { type: 'walk', label: 'Walk', icon: <Footprints className="w-4 h-4 text-[#736d65]" /> },
  { type: 'ship', label: 'Ferry', icon: <Ship className="w-4 h-4 text-cyan-600" /> },
];

export const RouteEditor: React.FC<RouteEditorProps> = ({
  routeConfig,
  onChange,
  onGenerateRoute,
  isLoadingRoute,
  hasUncalculatedChanges,
}) => {
  const [startQuery, setStartQuery] = useState(routeConfig.startPoint.name);
  const [endQuery, setEndQuery] = useState(routeConfig.endPoint.name);
  const [startSuggestions, setStartSuggestions] = useState<GeoPoint[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<GeoPoint[]>([]);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showEndDropdown, setShowEndDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const defaultCategory: ModeCategory = routeConfig.vehicle === 'airplane'
          ? 'flight'
          : (routeConfig.vehicle === 'custom'
              ? (routeConfig.modeCategory || 'train')
              : (routeConfig.vehicle as ModeCategory));
        onChange({
          vehicle: 'custom',
          customVehicleImage: reader.result,
          modeCategory: defaultCategory,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  useEffect(() => {
    setStartQuery(routeConfig.startPoint.name);
  }, [routeConfig.startPoint.name]);

  useEffect(() => {
    setEndQuery(routeConfig.endPoint.name);
  }, [routeConfig.endPoint.name]);

  const handleStartSearch = async (val: string) => {
    setStartQuery(val);
    if (val.trim().length >= 2) {
      const results = await searchLocations(val);
      setStartSuggestions(results);
      setShowStartDropdown(true);
    } else {
      setStartSuggestions([]);
      setShowStartDropdown(false);
    }
  };

  const handleEndSearch = async (val: string) => {
    setEndQuery(val);
    if (val.trim().length >= 2) {
      const results = await searchLocations(val);
      setEndSuggestions(results);
      setShowEndDropdown(true);
    } else {
      setEndSuggestions([]);
      setShowEndDropdown(false);
    }
  };

  const handleSelectStart = (point: GeoPoint) => {
    setStartQuery(point.name);
    onChange({ startPoint: point });
    setShowStartDropdown(false);
  };

  const handleSelectEnd = (point: GeoPoint) => {
    setEndQuery(point.name);
    onChange({ endPoint: point });
    setShowEndDropdown(false);
  };

  // Helper to parse hours & minutes from travelTimeText
  const parseTime = (text: string): { hours: number; minutes: number } => {
    let hours = 0;
    let minutes = 0;
    const hrMatch = text.match(/(\d+)\s*(?:h|hr|hour)/i);
    const minMatch = text.match(/(\d+)\s*(?:m|min)/i);
    if (hrMatch) hours = parseInt(hrMatch[1], 10);
    if (minMatch) minutes = parseInt(minMatch[1], 10);
    if (!hrMatch && !minMatch) {
      const num = parseInt(text, 10);
      if (!isNaN(num)) minutes = num;
    }
    return { hours, minutes };
  };

  const { hours: currentHours, minutes: currentMinutes } = parseTime(routeConfig.travelTimeText || '40 min');

  const handleTimeChange = (h: number, m: number) => {
    let text = '';
    if (h > 0 && m > 0) {
      text = `${h}h ${m} min`;
    } else if (h > 0) {
      text = `${h} ${h === 1 ? 'hr' : 'hrs'}`;
    } else {
      text = `${m} min`;
    }
    onChange({ travelTimeText: text });
  };

  const handleSwapPoints = () => {
    const prevStart = routeConfig.startPoint;
    const prevEnd = routeConfig.endPoint;
    onChange({
      startPoint: prevEnd,
      endPoint: prevStart,
    });
  };

  return (
    <div className="flex flex-col gap-6 text-[#403D39]">
      {/* Start & End Points Inputs */}
      <div className="flex flex-col gap-3">
        {/* Start Station */}
        <div className="relative">
          <label className="text-xs font-bold text-[#736d65] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Departure Point (Start)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={startQuery}
              onChange={(e) => handleStartSearch(e.target.value)}
              onFocus={() => setShowStartDropdown(startSuggestions.length > 0)}
              placeholder="e.g. Matsumoto Station, Tokyo, London..."
              className="w-full bg-[#f5efe4] border border-[#dcd4c6] rounded-xl px-3.5 py-2.5 text-xs text-[#252422] placeholder-[#9e978d] focus:border-[#EB5E28]/60 focus:bg-white transition-all outline-none"
            />
            <Search className="w-3.5 h-3.5 absolute right-3.5 top-3 text-[#9e978d]" />
          </div>
          {showStartDropdown && startSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white border border-[#dcd4c6] rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
              {startSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectStart(item)}
                  className="w-full px-3 py-2 text-left text-xs text-[#403D39] hover:bg-[#ede5d6] border-b border-[#e8e1d5] last:border-none flex flex-col"
                >
                  <span className="font-semibold text-[#252422]">{item.name}</span>
                  {item.subText && <span className="text-[10px] text-[#736d65] truncate">{item.subText}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-1 z-10">
          <button
            onClick={handleSwapPoints}
            className="p-1.5 rounded-full bg-[#ede5d6] hover:bg-[#dcd4c6] border border-[#dcd4c6] text-[#736d65] hover:text-[#252422] transition-colors"
            title="Swap Start & Destination"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Destination Station */}
        <div className="relative">
          <label className="text-xs font-bold text-[#736d65] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#EB5E28]" />
            <span>Destination Point (End)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={endQuery}
              onChange={(e) => handleEndSearch(e.target.value)}
              onFocus={() => setShowEndDropdown(endSuggestions.length > 0)}
              placeholder="e.g. Kami-Suwa Station, Kyoto, Paris..."
              className="w-full bg-[#f5efe4] border border-[#dcd4c6] rounded-xl px-3.5 py-2.5 text-xs text-[#252422] placeholder-[#9e978d] focus:border-[#EB5E28]/60 focus:bg-white transition-all outline-none"
            />
            <Search className="w-3.5 h-3.5 absolute right-3.5 top-3 text-[#9e978d]" />
          </div>
          {showEndDropdown && endSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white border border-[#dcd4c6] rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
              {endSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectEnd(item)}
                  className="w-full px-3 py-2 text-left text-xs text-[#403D39] hover:bg-[#ede5d6] border-b border-[#e8e1d5] last:border-none flex flex-col"
                >
                  <span className="font-semibold text-[#252422]">{item.name}</span>
                  {item.subText && <span className="text-[10px] text-[#736d65] truncate">{item.subText}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generate / Update Route Button */}
      <div className="flex flex-col gap-1.5 -mt-2">
        <button
          type="button"
          onClick={onGenerateRoute}
          disabled={isLoadingRoute}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            hasUncalculatedChanges
              ? 'bg-gradient-to-r from-[#EB5E28] to-[#c2593f] hover:from-[#c2593f] hover:to-[#EB5E28] text-white shadow-[#EB5E28]/25 ring-2 ring-[#EB5E28]/40'
              : 'bg-[#252422] hover:bg-[#403D39] text-white'
          }`}
        >
          {isLoadingRoute ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Calculating Route...</span>
            </>
          ) : (
            <>
              <Route className="w-4 h-4" />
              <span>{hasUncalculatedChanges ? 'Generate Route' : 'Route Up to Date ✓ (Click to Recalculate)'}</span>
            </>
          )}
        </button>
        {hasUncalculatedChanges && !isLoadingRoute && (
          <p className="text-[11px] text-[#EB5E28] font-medium text-center flex items-center justify-center gap-1">
            <span>●</span> Changes detected — click &quot;Generate Route&quot; to calculate path.
          </p>
        )}
      </div>

      {/* Vehicle Mode Grid & Custom Upload */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#736d65] uppercase tracking-wider">
            <span>Travel Vehicle</span>
          </label>
          {routeConfig.vehicle === 'custom' && (
            <span className="text-[10px] font-bold text-[#EB5E28] bg-[#EB5E28]/10 px-2 py-0.5 rounded-md border border-[#EB5E28]/30">
              Custom Image Active
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {VEHICLE_OPTIONS.map((opt) => {
            const isSelected = routeConfig.vehicle === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => onChange({ vehicle: opt.type })}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-[#EB5E28]/10 border-[#EB5E28]/60 text-[#EB5E28] font-bold shadow-sm'
                    : 'bg-[#f5efe4] border-[#dcd4c6] hover:bg-[#ede5d6] text-[#736d65] hover:text-[#252422]'
                }`}
              >
                {opt.icon}
                <span className="text-[11px] truncate w-full text-center">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Image Upload Card / Dropzone */}
        <div className="mt-1">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />

          {routeConfig.customVehicleImage ? (
            <div
              onClick={() => onChange({ vehicle: 'custom' })}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                routeConfig.vehicle === 'custom'
                  ? 'bg-[#EB5E28]/10 border-[#EB5E28]/60 shadow-sm ring-1 ring-[#EB5E28]/20'
                  : 'bg-[#f5efe4] border-[#dcd4c6] hover:bg-[#ede5d6]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white border border-[#dcd4c6] p-1 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                  <img
                    src={routeConfig.customVehicleImage}
                    alt="Custom vehicle"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#252422] truncate">Custom Vehicle</span>
                    {routeConfig.vehicle === 'custom' && (
                      <Check className="w-3.5 h-3.5 text-[#EB5E28]" />
                    )}
                  </div>
                  <span className="text-[10px] text-[#736d65]">
                    {routeConfig.vehicle === 'custom' ? 'Currently traveling with your image' : 'Click to select custom image'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-[#dcd4c6] hover:bg-[#ede5d6] text-[11px] font-semibold text-[#403D39] transition-all"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      vehicle: 'train',
                      customVehicleImage: undefined,
                    });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1.5 rounded-lg bg-white border border-[#dcd4c6] hover:bg-red-50 text-[#736d65] hover:text-red-600 transition-all"
                  title="Remove custom image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) {
                  processFile(file);
                }
              }}
              className="p-3 rounded-xl border border-dashed border-[#dcd4c6] hover:border-[#EB5E28]/60 bg-[#f5efe4]/70 hover:bg-[#f5efe4] transition-all cursor-pointer flex items-center justify-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-[#dcd4c6] flex items-center justify-center group-hover:border-[#EB5E28]/40 transition-colors flex-shrink-0">
                <ImagePlus className="w-4 h-4 text-[#EB5E28]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#252422] group-hover:text-[#EB5E28] transition-colors">
                  Upload Custom Vehicle Image
                </span>
                <span className="text-[10px] text-[#736d65]">
                  Click or drag image (PNG, JPG, SVG, WebP)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Custom Vehicle Category Mapping */}
        {routeConfig.vehicle === 'custom' && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#f5efe4] border border-[#dcd4c6] mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#736d65] uppercase tracking-wider">
                Transit Category
              </span>
              <span className="text-[10px] text-[#EB5E28] font-bold">
                {CATEGORY_LABELS[getEffectiveModeCategory(routeConfig)]}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(['walk', 'bicycle', 'car', 'bus', 'train', 'shinkansen', 'flight', 'ship'] as ModeCategory[]).map((cat) => {
                const currentCat = getEffectiveModeCategory(routeConfig);
                const isCatSelected = currentCat === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onChange({ modeCategory: cat })}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                      isCatSelected
                        ? 'bg-white border-[#EB5E28] text-[#EB5E28] shadow-sm font-bold ring-1 ring-[#EB5E28]/20'
                        : 'bg-white/60 border-[#dcd4c6] hover:bg-white text-[#736d65] hover:text-[#252422]'
                    }`}
                  >
                    <CategoryGlyph category={cat} size={15} color={isCatSelected ? '#EB5E28' : '#736d65'} />
                    <span className="truncate mt-0.5">{CATEGORY_LABELS[cat]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Travel Time Badge Dropdown */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-bold text-[#736d65] uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#EB5E28]" />
            <span>Travel Time</span>
          </span>
          <span className="text-[10px] text-[#EB5E28] font-semibold">{routeConfig.travelTimeText}</span>
        </label>

        {/* Hours and Minutes Dropdowns */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#736d65]">Hours</span>
            <select
              value={currentHours}
              onChange={(e) => handleTimeChange(Number(e.target.value), currentMinutes)}
              className="bg-[#f5efe4] border border-[#dcd4c6] rounded-xl px-3 py-2 text-xs font-semibold text-[#252422] focus:border-[#EB5E28] outline-none cursor-pointer"
            >
              {[...Array(25).keys()].map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? 'hr' : 'hrs'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#736d65]">Minutes</span>
            <select
              value={currentMinutes}
              onChange={(e) => handleTimeChange(currentHours, Number(e.target.value))}
              className="bg-[#f5efe4] border border-[#dcd4c6] rounded-xl px-3 py-2 text-xs font-semibold text-[#252422] focus:border-[#EB5E28] outline-none cursor-pointer"
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap gap-1.5">
          {['25 min', '40 min', '1h 15 min', '2h 30 min', '4h 45 min', '6 hrs'].map((time) => (
            <button
              key={time}
              onClick={() => onChange({ travelTimeText: time })}
              className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all ${
                routeConfig.travelTimeText === time
                  ? 'bg-[#EB5E28]/12 text-[#EB5E28] border-[#EB5E28]/50'
                  : 'bg-[#f5efe4] text-[#736d65] border-[#dcd4c6] hover:text-[#252422]'
              }`}
            >
              {time}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
