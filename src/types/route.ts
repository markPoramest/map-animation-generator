export type VehicleType = 
  | 'train' 
  | 'shinkansen' 
  | 'car' 
  | 'airplane' 
  | 'bus' 
  | 'bicycle' 
  | 'walk' 
  | 'ship'
  | 'custom';

export type ModeCategory = 
  | 'walk' 
  | 'bicycle' 
  | 'car' 
  | 'bus' 
  | 'train' 
  | 'shinkansen' 
  | 'flight' 
  | 'ship';

export function getEffectiveModeCategory(config: { vehicle: VehicleType; modeCategory?: ModeCategory }): ModeCategory {
  if (config.vehicle === 'custom') {
    return config.modeCategory || 'train';
  }
  switch (config.vehicle) {
    case 'train': return 'train';
    case 'shinkansen': return 'shinkansen';
    case 'car': return 'car';
    case 'airplane': return 'flight';
    case 'bus': return 'bus';
    case 'bicycle': return 'bicycle';
    case 'walk': return 'walk';
    case 'ship': return 'ship';
    default: return 'train';
  }
}

export type CameraMode = 'static-overview' | 'dynamic-follow';

export type AspectRatio = '16:9';

export type MapTheme = 'voyager' | 'dark' | 'positron' | 'satellite' | 'outdoors' | 'retro';

export interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
  subText?: string;
}

export interface RouteConfig {
  id: string;
  title: string;
  startPoint: GeoPoint;
  endPoint: GeoPoint;
  waypoints: GeoPoint[];
  vehicle: VehicleType;
  modeCategory?: ModeCategory;
  travelTimeText: string;
  distanceText?: string;
  speedText?: string;
  customNotes?: string;
  
  // Visual & Animation Config
  durationSeconds: number;
  mapTheme: MapTheme;
  cameraMode: CameraMode;
  aspectRatio: AspectRatio;
  showTimeBadge: boolean;
  showDistanceBadge: boolean;
  showStationPins: boolean;
  showTitleOverlay: boolean;
  lockNorth: boolean;
  trailColor?: string;
  trailWidth?: number;
  trailGlow?: boolean;
  customVehicleImage?: string;
  
  // Camera params
  cameraPitch: number;
  cameraBearingOffset: number;
  cameraZoom: number;
}

export interface PresetRoute {
  name: string;
  description: string;
  startPoint: GeoPoint;
  endPoint: GeoPoint;
  vehicle: VehicleType;
  modeCategory?: ModeCategory;
  travelTimeText: string;
  durationSeconds: number;
  cameraMode: CameraMode;
  mapTheme: MapTheme;
}

export const PRESET_ROUTES: PresetRoute[] = [
  {
    name: 'Matsumoto ➔ Kami-Suwa (Train)',
    description: 'Chuo Line Limited Express in Nagano, Japan (40 min)',
    startPoint: {
      name: 'Matsumoto Station',
      lat: 36.2307,
      lng: 137.9644,
      subText: 'Nagano, Japan'
    },
    endPoint: {
      name: 'Kami-Suwa Station',
      lat: 36.0467,
      lng: 138.1165,
      subText: 'Suwa, Nagano'
    },
    vehicle: 'train',
    travelTimeText: '40 min',
    durationSeconds: 8,
    cameraMode: 'static-overview',
    mapTheme: 'voyager'
  },
  {
    name: 'Tokyo ➔ Kyoto (Shinkansen)',
    description: 'Tokaido Shinkansen bullet train (2h 15m)',
    startPoint: {
      name: 'Tokyo Station',
      lat: 35.6812,
      lng: 139.7671,
      subText: 'Tokyo, Japan'
    },
    endPoint: {
      name: 'Kyoto Station',
      lat: 34.9858,
      lng: 135.7588,
      subText: 'Kyoto, Japan'
    },
    vehicle: 'shinkansen',
    travelTimeText: '2h 15 min',
    durationSeconds: 10,
    cameraMode: 'static-overview',
    mapTheme: 'voyager'
  },
];

export interface VideoExportSettings {
  format: 'mp4' | 'webm';
  fps: 30 | 60;
  quality: number;
  durationSeconds: number;
  aspectRatio: AspectRatio;
  includeAudio: boolean;
  audioTrack?: string;
  watermark: boolean;
}
