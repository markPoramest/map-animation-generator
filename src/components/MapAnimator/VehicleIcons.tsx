import React from 'react';
import { VehicleType } from '@/types/route';

interface VehicleIconProps {
  type: VehicleType;
  className?: string;
  size?: number;
  glowColor?: string;
  customImageUrl?: string;
}

export function getVehicleSvgRaw(
  type: VehicleType,
  glowColor: string = '#EB5E28'
): string {
  switch (type) {
    case 'custom':
      // Fallback SVG when user selects custom vehicle without an uploaded image yet
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="32" cy="55" rx="22" ry="3" fill="#000" fill-opacity="0.25"/>
        <circle cx="32" cy="30" r="22" fill="#ffffff" stroke="#EB5E28" stroke-width="2.5"/>
        <path d="M20 44 C20 37 25 32 32 32 C39 32 44 37 44 44 Z" fill="#EB5E28"/>
        <circle cx="32" cy="24" r="6" fill="#EB5E28"/>
        <circle cx="42" cy="18" r="4.5" fill="#f2794b"/>
        <path d="M42 15.5 L42 20.5 M39.5 18 L44.5 18" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
      </svg>`;

    case 'shinkansen':
      // 2D Side-profile: Tohoku Shinkansen E5 Series Hayabusa (Facing Right)
      // Long arrow-line nose, Tokiwa Green upper, Tsutsuji Pink stripe, Hiun White lower
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Ground / Track Shadow -->
        <ellipse cx="32" cy="55" rx="27" ry="2.5" fill="#000" fill-opacity="0.25"/>

        <!-- Low-Noise Pantograph Shield on Roof (Left) -->
        <path d="M 12 21 L 16 17 L 22 17 L 24 21 Z" fill="#047857"/>
        <line x1="17" y1="17" x2="20" y2="13" stroke="#e11d48" stroke-width="1.3" stroke-linecap="round"/>

        <!-- Lower Body (Hiun White) & Nose Base -->
        <path d="M 5 48 L 5 38 L 44 38 C 50 38 55 41 61 46 L 61 47 C 61 48 59 48.5 56 48.5 L 5 48.5 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8"/>

        <!-- Upper Body (Tokiwa Green & Extended Aerodynamic Long Nose) -->
        <path d="M 5 38 L 5 23 C 5 21 7 20 10 20 L 32 20 C 40 20 50 26 56 36 L 61 46 C 55 41 50 38 44 38 L 5 38 Z" fill="#047857"/>

        <!-- Signature Tsutsuji Pink Pinstripe -->
        <path d="M 5 38.5 L 44 38.5 C 50 38.5 55 41.5 60.5 46.5 L 59.8 47.8 C 54.8 43 49.5 40 44 40 L 5 40 Z" fill="#f43f5e"/>

        <!-- Cockpit Angled Windshield (Recessed Canopy) -->
        <path d="M 43 24 C 46 24 50 28 52 34 L 46 34 C 43 30 41 26 43 24 Z" fill="#0f172a"/>
        <path d="M 45 26 C 47 28 49 31 51 33 L 48 33 C 46 30 45 27 45 26 Z" fill="#38bdf8" fill-opacity="0.6"/>

        <!-- Passenger Windows -->
        <rect x="8" y="27" width="5.5" height="4.5" rx="1" fill="#0f172a"/>
        <rect x="16.5" y="27" width="5.5" height="4.5" rx="1" fill="#0f172a"/>
        <rect x="25" y="27" width="5.5" height="4.5" rx="1" fill="#0f172a"/>
        <rect x="33.5" y="27" width="5.5" height="4.5" rx="1" fill="#0f172a"/>
        <line x1="9" y1="28.5" x2="12.5" y2="28.5" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="17.5" y1="28.5" x2="21" y2="28.5" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="26" y1="28.5" x2="29.5" y2="28.5" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="34.5" y1="28.5" x2="38" y2="28.5" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round"/>

        <!-- Sharp Nose Headlight LED -->
        <polygon points="59,45 61.5,46.5 58.5,47.2" fill="#fef08a"/>

        <!-- Dark Undercarriage Bogie Skirts -->
        <rect x="7" y="47" width="48" height="3" rx="0.8" fill="#1e293b"/>
        <circle cx="14" cy="49" r="2.2" fill="#475569"/>
        <circle cx="21" cy="49" r="2.2" fill="#475569"/>
        <circle cx="41" cy="49" r="2.2" fill="#475569"/>
        <circle cx="47" cy="49" r="2.2" fill="#475569"/>
      </svg>`;

    case 'train':
      // 2D Side-profile: JR East E353 Series Azusa Express (Facing Right)
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Ground / Track Shadow -->
        <ellipse cx="32" cy="56" rx="26" ry="3" fill="#000" fill-opacity="0.25"/>

        <!-- Roof Pantograph & Fairing (Top Left) -->
        <rect x="18" y="18" width="16" height="4" rx="1.5" fill="#cbd5e1" stroke="#94a3b8" stroke-width="0.8"/>
        <line x1="12" y1="22" x2="16" y2="15" stroke="#e11d48" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="16" y1="15" x2="11" y2="12" stroke="#e11d48" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="8" y1="12" x2="15" y2="12" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>

        <!-- Main Train Coach Body (Alpine White) -->
        <path d="M 6 48 L 6 24 C 6 24 20 22 44 22 C 50 22 55 26 58 35 L 59 44 C 59 46 56 48 52 48 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2"/>

        <!-- Azusa Signature Violet Livery Stripe -->
        <path d="M 6 23 L 42 23 C 48 23 53 26 56 32 L 54 35 C 50 30 46 27 40 27 L 6 27 Z" fill="#6d28d9"/>

        <!-- Azusa Magenta / Pink Accent Stripe -->
        <path d="M 6 27.5 L 39 27.5 C 44 27.5 48 30 52 34.5 L 50.5 36 C 46 32 42 29.5 37 29.5 L 6 29.5 Z" fill="#ec4899"/>

        <!-- Cockpit Angled Windshield (Right Side) -->
        <path d="M 45 24 L 54 29 L 51 35 L 43 35 Z" fill="#0f172a"/>
        <line x1="46" y1="26" x2="51" y2="33" stroke="#38bdf8" stroke-width="0.9" stroke-linecap="round"/>

        <!-- LED Headlight (Warm White, Facing Right) -->
        <circle cx="57" cy="42" r="2.2" fill="#fef08a"/>
        <circle cx="57" cy="42" r="4.5" fill="#fef08a" fill-opacity="0.3"/>

        <!-- Rear Tail Marker Lamp (Red, Left Side) -->
        <circle cx="7.5" cy="42" r="1.6" fill="#ef4444"/>

        <!-- Passenger Tinted Side Windows -->
        <rect x="9" y="30" width="6.5" height="5.5" rx="1" fill="#1e293b"/>
        <rect x="18" y="30" width="6.5" height="5.5" rx="1" fill="#1e293b"/>
        <rect x="27" y="30" width="6.5" height="5.5" rx="1" fill="#1e293b"/>
        <rect x="36" y="30" width="6.5" height="5.5" rx="1" fill="#1e293b"/>
        <line x1="10" y1="31.5" x2="14" y2="31.5" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="19" y1="31.5" x2="23" y2="31.5" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="28" y1="31.5" x2="32" y2="31.5" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="37" y1="31.5" x2="41" y2="31.5" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round"/>

        <!-- Dark Undercarriage Skirt -->
        <rect x="8" y="47" width="46" height="3" rx="0.8" fill="#334155"/>

        <!-- Wheel Bogies -->
        <rect x="9" y="49" width="14" height="2.5" rx="0.8" fill="#1e293b"/>
        <circle cx="12.5" cy="52" r="3.2" fill="#475569" stroke="#1e293b" stroke-width="1"/>
        <circle cx="12.5" cy="52" r="1.2" fill="#cbd5e1"/>
        <circle cx="19.5" cy="52" r="3.2" fill="#475569" stroke="#1e293b" stroke-width="1"/>
        <circle cx="19.5" cy="52" r="1.2" fill="#cbd5e1"/>

        <rect x="37" y="49" width="14" height="2.5" rx="0.8" fill="#1e293b"/>
        <circle cx="40.5" cy="52" r="3.2" fill="#475569" stroke="#1e293b" stroke-width="1"/>
        <circle cx="40.5" cy="52" r="1.2" fill="#cbd5e1"/>
        <circle cx="47.5" cy="52" r="3.2" fill="#475569" stroke="#1e293b" stroke-width="1"/>
        <circle cx="47.5" cy="52" r="1.2" fill="#cbd5e1"/>
      </svg>`;

    case 'car':
      // 2D Side-profile: Modern Sports Sedan (Flipped Horizontal to match other models)
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(64, 0) scale(-1, 1)">
          <!-- Ground Shadow -->
          <ellipse cx="32" cy="54" rx="24" ry="2.5" fill="#000" fill-opacity="0.25"/>
          <!-- Aerodynamic Car Body -->
          <path d="M 6 46 L 8 38 C 10 37 14 36 18 36 L 24 25 C 26 22 30 21 38 21 L 44 21 C 47 21 49 24 51 28 L 54 36 C 57 37 59 40 59 43 L 59 46 Z" fill="#EB5E28" stroke="#9a3412" stroke-width="1.2"/>
          <!-- Side Glass Area -->
          <path d="M 25 24 L 36 24 L 36 34 L 19 34 Z" fill="#0f172a"/>
          <path d="M 38 24 L 43 24 L 49 34 L 38 34 Z" fill="#0f172a"/>
          <line x1="27" y1="26" x2="33" y2="26" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round"/>
          <line x1="40" y1="26" x2="44" y2="31" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round"/>
          <!-- Headlight & Taillight -->
          <polygon points="56,38 59,40 59,44 56,43" fill="#fef08a"/>
          <polygon points="6,39 8,39 8,43 6,43" fill="#ef4444"/>
          <!-- Door Line & Handle -->
          <line x1="36" y1="34" x2="36" y2="45" stroke="#9a3412" stroke-width="0.8"/>
          <rect x="29" y="36.5" width="3" height="1" rx="0.5" fill="#475569"/>
          <!-- Wheels with Alloy Rims -->
          <circle cx="18" cy="47" r="5.5" fill="#18181b"/>
          <circle cx="18" cy="47" r="3.2" fill="#94a3b8" stroke="#475569" stroke-width="0.8"/>
          <circle cx="18" cy="47" r="1.2" fill="#18181b"/>
          <circle cx="47" cy="47" r="5.5" fill="#18181b"/>
          <circle cx="47" cy="47" r="3.2" fill="#94a3b8" stroke="#475569" stroke-width="0.8"/>
          <circle cx="47" cy="47" r="1.2" fill="#18181b"/>
        </g>
      </svg>`;

    case 'bus':
      // 2D Side-profile: Express Coach Bus (Facing Right)
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="32" cy="55" rx="26" ry="2.5" fill="#000" fill-opacity="0.25"/>
        <path d="M 6 48 L 6 20 C 6 18 8 16 12 16 L 50 16 C 54 16 57 19 58 24 L 59 45 C 59 47 57 48 54 48 Z" fill="#d97706" stroke="#b45309" stroke-width="1.2"/>
        <path d="M 50 19 L 56 24 L 56 33 L 49 33 Z" fill="#0f172a"/>
        <rect x="9" y="21" width="7" height="11" rx="1" fill="#0f172a"/>
        <rect x="18" y="21" width="7" height="11" rx="1" fill="#0f172a"/>
        <rect x="27" y="21" width="7" height="11" rx="1" fill="#0f172a"/>
        <rect x="36" y="21" width="7" height="11" rx="1" fill="#0f172a"/>
        <rect x="56" y="41" width="3" height="3" rx="0.5" fill="#fef08a"/>
        <rect x="6" y="41" width="2" height="4" rx="0.5" fill="#ef4444"/>
        <path d="M 6 36 Q 32 40 58 36" stroke="#fef3c7" stroke-width="2"/>
        <circle cx="16" cy="49" r="5.5" fill="#18181b"/>
        <circle cx="16" cy="49" r="3" fill="#cbd5e1"/>
        <circle cx="48" cy="49" r="5.5" fill="#18181b"/>
        <circle cx="48" cy="49" r="3" fill="#cbd5e1"/>
      </svg>`;

    case 'airplane':
      // 2D Side-profile: Jet Airliner Cruising (Facing Right)
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 6 32 C 10 32 18 31 46 31 C 53 31 58 33 60 36 C 58 39 53 41 46 41 C 18 41 10 40 6 40 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2"/>
        <path d="M 52 33 Q 56 34 58 36 L 54 36 Z" fill="#0284c7"/>
        <path d="M 8 32 L 14 14 L 20 14 L 17 32 Z" fill="#0284c7" stroke="#0369a1" stroke-width="0.8"/>
        <polygon points="26,38 38,38 32,48 24,46" fill="#cbd5e1" stroke="#94a3b8" stroke-width="0.8"/>
        <rect x="28" y="42" width="10" height="4" rx="2" fill="#334155"/>
        <ellipse cx="38" cy="44" rx="1.5" ry="2" fill="#ea580c"/>
        <polygon points="6,34 12,34 10,38 5,38" fill="#cbd5e1"/>
      </svg>`;

    case 'ship':
      // 2D Side-profile: Cruise Ferry (Facing Right)
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 4 52 Q 18 50 32 52 Q 46 54 60 52" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M 7 38 L 52 38 L 58 48 C 50 51 14 51 7 48 Z" fill="#0369a1" stroke="#075985" stroke-width="1.2"/>
        <rect x="12" y="24" width="36" height="14" rx="1.5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8"/>
        <path d="M 40 24 L 46 24 L 49 32 L 40 32 Z" fill="#0284c7"/>
        <line x1="28" y1="24" x2="28" y2="17" stroke="#475569" stroke-width="1.2"/>
        <circle cx="28" cy="16" r="1.5" fill="#ef4444"/>
        <circle cx="16" cy="31" r="1.5" fill="#0f172a"/>
        <circle cx="22" cy="31" r="1.5" fill="#0f172a"/>
        <circle cx="28" cy="31" r="1.5" fill="#0f172a"/>
        <circle cx="34" cy="31" r="1.5" fill="#0f172a"/>
      </svg>`;

    case 'bicycle':
      // 2D Side-profile: Road Cyclist with Helmet & Pro Frame (Facing Right)
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Ground Shadow -->
        <ellipse cx="32" cy="54" rx="22" ry="2.5" fill="#000" fill-opacity="0.22"/>

        <!-- Bike Wheels with Rims & Hubs -->
        <circle cx="15" cy="43" r="8.5" stroke="#1e293b" stroke-width="2.5" fill="none"/>
        <circle cx="15" cy="43" r="6.5" stroke="#cbd5e1" stroke-width="0.8" fill="none"/>
        <circle cx="15" cy="43" r="2" fill="#0f172a"/>
        <circle cx="49" cy="43" r="8.5" stroke="#1e293b" stroke-width="2.5" fill="none"/>
        <circle cx="49" cy="43" r="6.5" stroke="#cbd5e1" stroke-width="0.8" fill="none"/>
        <circle cx="49" cy="43" r="2" fill="#0f172a"/>

        <!-- Road Bike Frame (Cyan Blue) -->
        <path d="M 15 43 L 28 43 L 38 32 L 26 32 Z" stroke="#06b6d4" stroke-width="2.5" stroke-linejoin="round" fill="none"/>
        <line x1="28" y1="43" x2="35" y2="25" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="38" y1="32" x2="49" y2="43" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="49" y1="43" x2="44" y2="24" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Drop Handlebar & Saddle -->
        <path d="M 44 24 L 47 22 C 49 22 50 24 48 27" stroke="#334155" stroke-width="2" stroke-linecap="round" fill="none"/>
        <line x1="32" y1="24" x2="37" y2="24" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Cyclist Figure (Athletic Riding Posture) -->
        <path d="M 34 26 L 37 35 L 31 41" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="31" cy="41" r="1.5" fill="#f59e0b"/>
        <!-- Torso Jersey & Arms -->
        <path d="M 34 26 L 43 24 L 45 29 L 35 31 Z" fill="#f97316"/>
        <line x1="43" y1="24" x2="47" y2="26" stroke="#fed7aa" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Head & Aero Helmet -->
        <circle cx="43" cy="17" r="3.5" fill="#fed7aa"/>
        <path d="M 39 17 C 39 13 43 12 48 14 C 49 15 48 18 44 18 Z" fill="#0f172a"/>
        <path d="M 41 15 Q 46 13 47 15" stroke="#06b6d4" stroke-width="1" stroke-linecap="round"/>
      </svg>`;

    case 'walk':
      // 2D Side-profile: Dynamic Adventure Hiker in Stride (Facing Right)
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Ground Shadow -->
        <ellipse cx="32" cy="55" rx="16" ry="2.5" fill="#000" fill-opacity="0.22"/>

        <!-- Trailing Trekking Pole & Back Leg -->
        <line x1="22" y1="36" x2="15" y2="54" stroke="#78716c" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M 29 36 L 21 44 L 16 53" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <rect x="13" y="51" width="6" height="3" rx="1.5" fill="#78350f"/>

        <!-- Expedition Backpack (Back) -->
        <rect x="18" y="22" width="10" height="15" rx="3" fill="#ea580c"/>
        <rect x="17" y="26" width="11" height="4" rx="1" fill="#c2410c"/>
        <line x1="28" y1="25" x2="31" y2="28" stroke="#fdba74" stroke-width="1.5"/>

        <!-- Hiker Body & Jacket -->
        <path d="M 26 23 C 26 21 34 20 36 24 L 34 37 C 34 37 29 38 27 36 Z" fill="#0284c7"/>

        <!-- Leading Leg (Front Step) -->
        <path d="M 31 36 L 37 44 L 43 52" stroke="#334155" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <rect x="41" y="51" width="6" height="3" rx="1.5" fill="#78350f"/>

        <!-- Front Arm & Leading Trekking Pole -->
        <path d="M 33 25 L 40 32 L 39 42" stroke="#fed7aa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <line x1="39" y1="35" x2="45" y2="54" stroke="#78716c" stroke-width="1.8" stroke-linecap="round"/>

        <!-- Head & Safari Outdoor Hat -->
        <circle cx="34" cy="17" r="4" fill="#fed7aa"/>
        <path d="M 27 15 C 29 11 40 11 42 15 Z" fill="#d97706"/>
        <ellipse cx="34" cy="15" rx="7.5" ry="1.8" fill="#b45309"/>
      </svg>`;
  }
}

export function getVehicleSvgDataUri(
  type: VehicleType,
  glowColor: string = '#EB5E28'
): string {
  const rawSvg = getVehicleSvgRaw(type, glowColor);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSvg)}`;
}

export const VehicleIcon: React.FC<VehicleIconProps> = ({
  type,
  className = '',
  size = 54,
  glowColor = '#EB5E28',
  customImageUrl,
}) => {
  const glowStyle = {
    filter: `drop-shadow(0 4px 12px ${glowColor}66) drop-shadow(0 2px 5px rgba(0,0,0,0.35))`,
  };

  if (type === 'custom' && customImageUrl) {
    return (
      <div
        style={{ width: size, height: size, ...glowStyle }}
        className={`inline-flex items-center justify-center relative select-none pointer-events-none ${className}`}
      >
        <img
          src={customImageUrl}
          alt="Custom Vehicle"
          className="w-full h-full object-contain filter drop-shadow-md select-none pointer-events-none"
        />
      </div>
    );
  }

  const rawSvg = getVehicleSvgRaw(type, glowColor);

  return (
    <div
      style={{ width: size, height: size, ...glowStyle }}
      className={`inline-flex items-center justify-center ${className}`}
      dangerouslySetInnerHTML={{ __html: rawSvg }}
    />
  );
};
