import React from 'react';
import { VehicleType, TrainModelType } from '@/types/route';

interface VehicleIconProps {
  type: VehicleType;
  trainModel?: TrainModelType;
  className?: string;
  size?: number;
  glowColor?: string;
}

export function getVehicleSvgRaw(
  type: VehicleType,
  trainModel: TrainModelType = 'azuma',
  glowColor: string = '#c2593f'
): string {
  if (type === 'train' || type === 'shinkansen') {
    const selectedModel = type === 'shinkansen' ? 'shinkansen-e5' : trainModel;

    switch (selectedModel) {
      case 'azuma':
      case 'azusa-express':
        return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="21" y="4" width="22" height="57" rx="5" fill="#000" fill-opacity="0.18"/>
          <!-- CAR 1: Lead Azusa E353 (Wedge Nose) -->
          <path d="M32 3 C26 7 22 13 22 18 L22 33 L42 33 L42 18 C42 13 38 7 32 3 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2"/>
          <path d="M22 17 L22 25 L42 25 L42 17 L38 12 L26 12 Z" fill="#6d28d9"/>
          <rect x="22" y="25" width="20" height="2" fill="#ec4899"/>
          <!-- Cab Windshield & Reflection -->
          <path d="M26 11 Q32 8.5 38 11 L37 15 Q32 13.5 27 15 Z" fill="#0f172a" stroke="#475569" stroke-width="0.6"/>
          <path d="M28 11.5 Q32 10 35 11.5 L34 13 Q32 12 29 13 Z" fill="#38bdf8" fill-opacity="0.7"/>
          <!-- Headlights -->
          <ellipse cx="28.5" cy="5.5" rx="1.8" ry="1.2" fill="#fef08a"/>
          <ellipse cx="35.5" cy="5.5" rx="1.8" ry="1.2" fill="#fef08a"/>
          <polygon points="27,4 30,1 34,1 37,4 35.5,6 28.5,6" fill="#fef08a" fill-opacity="0.35"/>
          <!-- Roof AC & Pantograph -->
          <rect x="28" y="19" width="8" height="8" rx="1.5" fill="#cbd5e1" stroke="#64748b" stroke-width="0.8"/>
          <line x1="30" y1="21" x2="34" y2="21" stroke="#475569" stroke-width="1"/>
          <line x1="30" y1="25" x2="34" y2="25" stroke="#475569" stroke-width="1"/>
          <!-- Side Windows -->
          <rect x="23" y="27" width="2.5" height="4" rx="0.6" fill="#1e293b"/>
          <rect x="38.5" y="27" width="2.5" height="4" rx="0.6" fill="#1e293b"/>

          <!-- Coupler / Gangway -->
          <rect x="26" y="33" width="12" height="4" rx="1" fill="#1e293b"/>
          <line x1="28" y1="35" x2="36" y2="35" stroke="#475569" stroke-width="0.8"/>

          <!-- CAR 2: Follower Passenger Coach -->
          <rect x="22" y="37" width="20" height="23" rx="3" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2"/>
          <rect x="22" y="42" width="20" height="4" fill="#6d28d9"/>
          <rect x="22" y="46" width="20" height="1.8" fill="#ec4899"/>
          <rect x="28" y="49" width="8" height="6" rx="1.5" fill="#cbd5e1" stroke="#64748b" stroke-width="0.8"/>
          <!-- Passenger Windows -->
          <rect x="23.5" y="38.5" width="3" height="3" rx="0.6" fill="#1e293b"/>
          <rect x="37.5" y="38.5" width="3" height="3" rx="0.6" fill="#1e293b"/>
          <rect x="23.5" y="49.5" width="3" height="3.5" rx="0.6" fill="#1e293b"/>
          <rect x="37.5" y="49.5" width="3" height="3.5" rx="0.6" fill="#1e293b"/>
          <circle cx="25" cy="58.5" r="1.2" fill="#ef4444"/>
          <circle cx="39" cy="58.5" r="1.2" fill="#ef4444"/>
        </svg>`;

      case 'shinkansen-e5':
        return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="21" y="3" width="22" height="58" rx="6" fill="#000" fill-opacity="0.18"/>
          <!-- CAR 1: Needle Bullet Nose -->
          <path d="M32 2 C28 5 25 11 23 18 L22 34 L42 34 L41 18 C39 11 36 5 32 2 Z" fill="#047857" stroke="#065f46" stroke-width="1.2"/>
          <path d="M22.5 22 L22 34 L42 34 L41.5 22 C37 25 27 25 22.5 22 Z" fill="#f8fafc"/>
          <path d="M22.3 21 C26 23 38 23 41.7 21 L41.8 23 C38 25 26 25 22.2 23 Z" fill="#f43f5e"/>
          <!-- Cockpit canopy -->
          <path d="M28 13 Q32 10 36 13 L35 17 Q32 15 29 17 Z" fill="#0f172a" stroke="#2dd4bf" stroke-width="0.8"/>
          <path d="M29.5 13.5 Q32 11.5 34.5 13.5 L34 15 Q32 13.5 30 15 Z" fill="#22d3ee" fill-opacity="0.8"/>
          <!-- Nose headlights -->
          <polygon points="29,5 31,4 31,6 29,7" fill="#fef08a"/>
          <polygon points="35,5 33,4 33,6 35,7" fill="#fef08a"/>
          <polygon points="29,4 32,1 35,4 33,6 31,6" fill="#fef08a" fill-opacity="0.4"/>
          <!-- Roof Fairing -->
          <path d="M28 26 L36 26 L35 32 L29 32 Z" fill="#cbd5e1" stroke="#64748b" stroke-width="0.7"/>

          <!-- Gangway -->
          <rect x="25.5" y="34" width="13" height="3.5" rx="1" fill="#1e293b"/>
          <line x1="27" y1="35.5" x2="37" y2="35.5" stroke="#475569" stroke-width="0.8"/>

          <!-- CAR 2: Bullet Coach -->
          <rect x="22" y="37.5" width="20" height="23" rx="2.5" fill="#047857" stroke="#065f46" stroke-width="1.2"/>
          <rect x="22" y="47" width="20" height="13.5" fill="#f8fafc"/>
          <rect x="22" y="45.5" width="20" height="2" fill="#f43f5e"/>
          <rect x="23.5" y="48.5" width="3" height="3" rx="0.6" fill="#1e293b"/>
          <rect x="37.5" y="48.5" width="3" height="3" rx="0.6" fill="#1e293b"/>
          <rect x="23.5" y="53.5" width="3" height="3" rx="0.6" fill="#1e293b"/>
          <rect x="37.5" y="53.5" width="3" height="3" rx="0.6" fill="#1e293b"/>
          <circle cx="25" cy="59" r="1.2" fill="#ef4444"/>
          <circle cx="39" cy="59" r="1.2" fill="#ef4444"/>
        </svg>`;

      case 'steam-locomotive':
        return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="3" width="24" height="58" rx="5" fill="#000" fill-opacity="0.22"/>
          <!-- Front Cowcatcher Pilot -->
          <polygon points="26,6 32,2 38,6 36,8 28,8" fill="#52525b" stroke="#27272a" stroke-width="0.8"/>
          <!-- Cylindrical Boiler & Rings -->
          <rect x="24" y="8" width="16" height="25" rx="4" fill="#18181b" stroke="#3f3f46" stroke-width="1.2"/>
          <line x1="24" y1="14" x2="40" y2="14" stroke="#f59e0b" stroke-width="1.4"/>
          <line x1="24" y1="21" x2="40" y2="21" stroke="#f59e0b" stroke-width="1.4"/>
          <line x1="24" y1="27" x2="40" y2="27" stroke="#f59e0b" stroke-width="1.4"/>
          <!-- Chimney / Smokestack -->
          <ellipse cx="32" cy="11" rx="3" ry="2.2" fill="#27272a" stroke="#d97706" stroke-width="0.8"/>
          <!-- Brass Headlight -->
          <circle cx="32" cy="7" r="3" fill="#ea580c" stroke="#d97706" stroke-width="1"/>
          <circle cx="32" cy="7" r="2" fill="#fef08a"/>
          <!-- Steam Domes -->
          <ellipse cx="32" cy="17.5" rx="2.5" ry="1.8" fill="#3f3f46"/>
          <ellipse cx="32" cy="24" rx="2.2" ry="1.6" fill="#3f3f46"/>
          <!-- Driver Cab -->
          <rect x="21" y="31" width="22" height="10" rx="2" fill="#27272a" stroke="#52525b" stroke-width="1"/>
          <rect x="23" y="33" width="4" height="4" rx="0.8" fill="#fef08a" fill-opacity="0.85"/>
          <rect x="37" y="33" width="4" height="4" rx="0.8" fill="#fef08a" fill-opacity="0.85"/>
          <line x1="21" y1="40" x2="43" y2="40" stroke="#dc2626" stroke-width="1.2"/>

          <!-- Coupler -->
          <rect x="28" y="41" width="8" height="3" fill="#18181b"/>

          <!-- Coal Tender -->
          <rect x="22" y="44" width="20" height="16" rx="2.5" fill="#18181b" stroke="#3f3f46" stroke-width="1.2"/>
          <path d="M24 46 C26 45 29 44 32 45 C35 44 38 45 40 46 L40 54 C38 55 26 55 24 54 Z" fill="#09090b"/>
          <circle cx="28" cy="49" r="1.5" fill="#27272a"/>
          <circle cx="33" cy="48" r="1.8" fill="#27272a"/>
          <circle cx="36" cy="51" r="1.5" fill="#27272a"/>
          <line x1="22" y1="59" x2="42" y2="59" stroke="#dc2626" stroke-width="1.5"/>
        </svg>`;

      case 'classic-commuter':
        return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="21" y="4" width="22" height="57" rx="5" fill="#000" fill-opacity="0.18"/>
          <!-- CAR 1: Stainless Commuter -->
          <rect x="22" y="5" width="20" height="28" rx="4" fill="#e2e8f0" stroke="#64748b" stroke-width="1.2"/>
          <rect x="22" y="16" width="20" height="4" fill="#f97316"/>
          <rect x="22" y="20" width="20" height="2" fill="#16a34a"/>
          <!-- Driver Cab Front -->
          <path d="M24 5 Q32 4 40 5 L40 14 Q32 14 24 14 Z" fill="#1e293b"/>
          <rect x="27" y="6" width="10" height="2.2" rx="0.5" fill="#0f172a" stroke="#38bdf8" stroke-width="0.5"/>
          <rect x="25.5" y="9" width="5" height="4" rx="0.8" fill="#0284c7" fill-opacity="0.7"/>
          <rect x="33.5" y="9" width="5" height="4" rx="0.8" fill="#0284c7" fill-opacity="0.7"/>
          <circle cx="26" cy="14.5" r="1.5" fill="#fef08a"/>
          <circle cx="38" cy="14.5" r="1.5" fill="#fef08a"/>
          <!-- Diamond Pantograph -->
          <line x1="27" y1="24" x2="37" y2="24" stroke="#475569" stroke-width="1"/>
          <polygon points="32,22 36,25 32,28 28,25" fill="none" stroke="#b45309" stroke-width="0.9"/>
          <!-- Side window markers -->
          <rect x="22" y="23" width="1.5" height="5" fill="#475569"/>
          <rect x="40.5" y="23" width="1.5" height="5" fill="#475569"/>

          <!-- Gangway -->
          <rect x="26" y="33" width="12" height="4.5" rx="1" fill="#1e293b"/>
          <line x1="28" y1="35" x2="36" y2="35" stroke="#475569" stroke-width="0.8"/>

          <!-- CAR 2 -->
          <rect x="22" y="37.5" width="20" height="23.5" rx="3" fill="#e2e8f0" stroke="#64748b" stroke-width="1.2"/>
          <rect x="22" y="44" width="20" height="4" fill="#f97316"/>
          <rect x="22" y="48" width="20" height="2" fill="#16a34a"/>
          <rect x="27" y="52" width="10" height="5" rx="1" fill="#cbd5e1" stroke="#94a3b8" stroke-width="0.8"/>
          <rect x="23.5" y="39" width="3" height="3" rx="0.6" fill="#1e293b"/>
          <rect x="37.5" y="39" width="3" height="3" rx="0.6" fill="#1e293b"/>
          <circle cx="25" cy="59.5" r="1.2" fill="#ef4444"/>
          <circle cx="39" cy="59.5" r="1.2" fill="#ef4444"/>
        </svg>`;

      case 'modern-metro':
        return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="21" y="4" width="22" height="57" rx="6" fill="#000" fill-opacity="0.22"/>
          <!-- CAR 1: Metro -->
          <path d="M24 6 C27 4 37 4 40 6 L42 33 L22 33 Z" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
          <path d="M22 17 L22 19 L42 19 L42 17 Z" fill="#00f5d4"/>
          <rect x="22" y="27" width="20" height="2" fill="#00f5d4"/>
          <!-- Panoramic Windshield -->
          <path d="M24.5 7 Q32 5.5 39.5 7 L39 15 Q32 14 25 15 Z" fill="#0f172a" stroke="#00f5d4" stroke-width="0.8"/>
          <path d="M26 8.5 Q32 7 38 8.5 L37.5 12 Q32 11 26.5 12 Z" fill="#38bdf8" fill-opacity="0.6"/>
          <!-- LED Headlight Bar -->
          <path d="M25 5.5 Q32 4.5 39 5.5" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round"/>
          <rect x="28" y="21" width="8" height="5" rx="1.5" fill="#334155"/>

          <!-- Gangway -->
          <rect x="26" y="33" width="12" height="4.5" rx="1" fill="#0f172a"/>
          <line x1="28" y1="35" x2="36" y2="35" stroke="#334155" stroke-width="0.8"/>

          <!-- CAR 2 -->
          <rect x="22" y="37.5" width="20" height="23.5" rx="3" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
          <rect x="22" y="44" width="20" height="2" fill="#00f5d4"/>
          <rect x="23.5" y="48" width="3" height="3.5" rx="0.6" fill="#38bdf8" fill-opacity="0.8"/>
          <rect x="37.5" y="48" width="3" height="3.5" rx="0.6" fill="#38bdf8" fill-opacity="0.8"/>
          <circle cx="25" cy="59.5" r="1.2" fill="#ef4444"/>
          <circle cx="39" cy="59.5" r="1.2" fill="#ef4444"/>
        </svg>`;

      case 'scenic-tram':
        return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="4" width="24" height="57" rx="7" fill="#000" fill-opacity="0.18"/>
          <!-- Heritage Green & Cream -->
          <path d="M24 5 C28 4 36 4 40 5 L42 34 L22 34 Z" fill="#14532d" stroke="#166534" stroke-width="1.2"/>
          <path d="M23 7 C27 6 37 6 41 7 L41 20 L23 20 Z" fill="#fef3c7"/>
          <rect x="24.5" y="8" width="4" height="6" rx="1" fill="#1e293b"/>
          <rect x="30" y="8" width="4" height="6" rx="1" fill="#1e293b"/>
          <rect x="35.5" y="8" width="4" height="6" rx="1" fill="#1e293b"/>
          <!-- Cyclops Headlight -->
          <circle cx="32" cy="5.5" r="3.2" fill="#d97706" stroke="#b45309" stroke-width="0.8"/>
          <circle cx="32" cy="5.5" r="2.2" fill="#fef08a"/>
          <!-- Trolley Pole & Base -->
          <circle cx="32" cy="24" r="2.5" fill="#d97706"/>
          <line x1="32" y1="24" x2="32" y2="15" stroke="#78716c" stroke-width="1.5"/>
          <line x1="28" y1="15" x2="36" y2="15" stroke="#78716c" stroke-width="1.8" stroke-linecap="round"/>

          <!-- Gangway -->
          <rect x="26" y="34" width="12" height="3.5" rx="1" fill="#1e293b"/>

          <!-- Trailer Car -->
          <rect x="22" y="37.5" width="20" height="23.5" rx="3.5" fill="#14532d" stroke="#166534" stroke-width="1.2"/>
          <rect x="22" y="37.5" width="20" height="11" fill="#fef3c7"/>
          <rect x="24" y="39.5" width="3.5" height="5.5" rx="1" fill="#1e293b"/>
          <rect x="30" y="39.5" width="4" height="5.5" rx="1" fill="#1e293b"/>
          <rect x="36.5" y="39.5" width="3.5" height="5.5" rx="1" fill="#1e293b"/>
          <circle cx="26" cy="59.5" r="1.2" fill="#ef4444"/>
          <circle cx="38" cy="59.5" r="1.2" fill="#ef4444"/>
        </svg>`;

      case 'cute-isometric':
        return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- CAR 1: Voxel Train Lead -->
          <polygon points="32,3 46,11 32,19 18,11" fill="#f87171" stroke="#b91c1c" stroke-width="1.2"/>
          <polygon points="18,11 32,19 32,35 18,27" fill="#ef4444" stroke="#b91c1c" stroke-width="1.2"/>
          <polygon points="32,19 46,11 46,27 32,35" fill="#b91c1c" stroke="#991b1b" stroke-width="1.2"/>
          <polygon points="22,15 28,19 28,24 22,20" fill="#38bdf8"/>
          <polygon points="36,19 42,15 42,20 36,24" fill="#0284c7"/>
          <circle cx="32" cy="24" r="2.8" fill="#fef08a" stroke="#d97706" stroke-width="0.8"/>
          <polygon points="30,7 34,7 33,4 31,4" fill="#fef08a"/>

          <!-- Hitch -->
          <line x1="32" y1="35" x2="32" y2="39" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>

          <!-- CAR 2: Follower -->
          <polygon points="32,39 44,46 32,53 20,46" fill="#fb923c" stroke="#c2410c" stroke-width="1.2"/>
          <polygon points="20,46 32,53 32,61 20,54" fill="#f97316" stroke="#c2410c" stroke-width="1.2"/>
          <polygon points="32,53 44,46 44,54 32,61" fill="#c2410c" stroke="#9a3412" stroke-width="1.2"/>
          <polygon points="23,49 28,52 28,55 23,52" fill="#fef08a"/>
          <polygon points="36,52 41,49 41,52 36,55" fill="#fef08a"/>
        </svg>`;
    }
  }

  switch (type) {
    case 'airplane':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 4 C29 10 28 28 28 48 C28 54 30 58 32 60 C34 58 36 54 36 48 C36 28 35 10 32 4 Z" fill="#f8fafc" stroke="#78716c" stroke-width="1.5"/>
        <path d="M32 26 L2 42 C0 43 4 45 8 44 L28 36 L28 46 L20 52 L20 55 L32 53 L44 55 L44 52 L36 46 L36 36 L56 44 C60 45 64 43 62 42 L32 26 Z" fill="#e7e5e4" stroke="#78716c" stroke-width="1.5"/>
        <rect x="20" y="37" width="3" height="7" rx="1.5" fill="#57534e"/>
        <rect x="41" y="37" width="3" height="7" rx="1.5" fill="#57534e"/>
        <path d="M30 10 Q32 8 34 10 L34 13 L30 13 Z" fill="#0284c7"/>
      </svg>`;

    case 'car':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="10" width="28" height="46" rx="10" fill="#EB5E28" stroke="#8c331d" stroke-width="2"/>
        <rect x="21" y="20" width="22" height="11" rx="3" fill="#1c1917" fill-opacity="0.85"/>
        <rect x="22" y="42" width="20" height="7" rx="2" fill="#1c1917" fill-opacity="0.85"/>
        <rect x="19" y="11" width="6" height="3" rx="1.5" fill="#fef08a"/>
        <rect x="39" y="11" width="6" height="3" rx="1.5" fill="#fef08a"/>
        <rect x="14" y="23" width="4" height="6" rx="2" fill="#EB5E28"/>
        <rect x="46" y="23" width="4" height="6" rx="2" fill="#EB5E28"/>
      </svg>`;

    case 'bus':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="16" y="6" width="32" height="52" rx="8" fill="#d97706" stroke="#b45309" stroke-width="2"/>
        <rect x="19" y="10" width="26" height="14" rx="3" fill="#1c1917" fill-opacity="0.85"/>
        <rect x="24" y="28" width="16" height="8" rx="2" fill="#b45309"/>
        <rect x="18" y="26" width="4" height="20" rx="1" fill="#1c1917" fill-opacity="0.6"/>
        <rect x="42" y="26" width="4" height="20" rx="1" fill="#1c1917" fill-opacity="0.6"/>
        <circle cx="21" cy="9" r="2.5" fill="#fff"/>
        <circle cx="43" cy="9" r="2.5" fill="#fff"/>
      </svg>`;

    case 'bicycle':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="14" r="8" fill="#059669" stroke="#047857" stroke-width="2"/>
        <line x1="20" y1="26" x2="44" y2="26" stroke="#e7e5e4" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="32" y1="26" x2="32" y2="52" stroke="#059669" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="32" cy="54" rx="4" ry="7" fill="#292524"/>
        <ellipse cx="32" cy="20" rx="3" ry="5" fill="#292524"/>
      </svg>`;

    case 'walk':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="14" r="7" fill="#7c2d12" stroke="#431407" stroke-width="2"/>
        <path d="M32 23 L32 38 M32 28 L22 36 M32 28 L42 34 M32 38 L24 54 M32 38 L38 52" stroke="#b45309" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case 'ship':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 6 C20 18 16 38 18 56 L46 56 C48 38 44 18 32 6 Z" fill="#0369a1" stroke="#075985" stroke-width="2.5"/>
        <rect x="24" y="24" width="16" height="22" rx="3" fill="#f5f5f4"/>
        <rect x="28" y="30" width="8" height="10" rx="1.5" fill="#0369a1"/>
        <path d="M14 58 Q10 62 6 62" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
        <path d="M50 58 Q54 62 58 62" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
  }
}

export function getVehicleSvgDataUri(
  type: VehicleType,
  trainModel: TrainModelType = 'azuma',
  glowColor: string = '#EB5E28'
): string {
  const rawSvg = getVehicleSvgRaw(type, trainModel, glowColor);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSvg)}`;
}

export const VehicleIcon: React.FC<VehicleIconProps> = ({
  type,
  trainModel = 'azuma',
  className = '',
  size = 52,
  glowColor = '#EB5E28',
}) => {
  const rawSvg = getVehicleSvgRaw(type, trainModel, glowColor);
  const glowStyle = {
    filter: `drop-shadow(0 4px 10px ${glowColor}66) drop-shadow(0 2px 4px rgba(0,0,0,0.3))`,
  };

  return (
    <div
      style={{ width: size, height: size, ...glowStyle }}
      className={`inline-flex items-center justify-center ${className}`}
      dangerouslySetInnerHTML={{ __html: rawSvg }}
    />
  );
};
