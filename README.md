<div align="center">

# 🗺️ Map Animation Generator
### *By Mark no Nihon Tabi*

An interactive, high-performance web studio for generating cinematic 3D animated travel route videos. Built for YouTube travel vlogs, Instagram/TikTok itineraries, and transit documentaries — featuring real railway track geometry (Shinkansen, express trains), pedestrian-aware footway routing, custom vehicle avatars with orange circular framing, and direct **Full HD MP4 & WebM** client-side export.

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![MapLibre GL](https://img.shields.io/badge/Map-MapLibre_GL-0078D7?style=for-the-badge&logo=maplibre)](https://maplibre.org/)
[![Video Export](https://img.shields.io/badge/Export-MP4_&_WebM-EB5E28?style=for-the-badge)](https://github.com/markPoramest/map-animation-generator)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

🌐 **Live Demo**: **[https://map-animation-generator.vercel.app](https://map-animation-generator.vercel.app)**

</div>

---

## ✨ Features

### 🚅 Authentic Railway & Transit Routing
- **Real Railway Track Engine**:
  - Automatically queries OpenStreetMap Overpass API and railway relations (`route=train`, `highspeed=yes`) to follow actual tracks rather than straight lines.
  - Multi-tier routing supports high-speed Shinkansen corridors (e.g. Tohoku Shinkansen via Sendai), inter-island undersea tunnels (Seikan Tunnel connecting Shin-Aomori and Hakodate), and regional express lines (e.g. Hokuto Limited Express, Chuo Line).
  - Graph-based topological A* search with intelligent track-gap bridging (1000m tolerance).
  - Optional serverless Postgres caching (Neon / Vercel Postgres) prevents Overpass API rate limits (HTTP 429).
- **Mode-Specific Pathfinding**:
  - 🚶 **Walk (`walk`)**: Dedicated pedestrian graph routing (`routed-foot`) through narrow historic alleys, stairs, footbridges, plazas, and park trails where motor vehicles cannot travel.
  - 🚲 **Bicycle (`bicycle`)**: Routes via bike paths, cycleways, and bike-friendly roads (`routed-bike`).
  - 🚗 🚌 **Car & Bus (`car`, `bus`)**: Constrained to drivable streets, expressways, and highways (`routed-car`).
  - ✈️ **Airplane (`airplane`)**: Great-circle flight arc with dynamic parabolic altitude curve.
  - 🚢 **Ship (`ship`)**: Smooth nautical splines across waterways.

### 🎨 Custom Vehicle Upload & Branding
- **Custom Image Avatars**: Upload any PNG, JPG, or SVG image (e.g. custom mascot, avatar, or vehicle illustration).
- **Orange Circular Frame**: Custom vehicles are enclosed in a distinctive circular frame with clean white backing, `#EB5E28` terracotta border, and soft drop shadow.
- **Mode Category Inheritance**: Assign custom vehicles to any mode (Train, Flight, Car, Bus, Walk, Bicycle, Ship) so they automatically inherit realistic speeds, paths, and flight altitudes.
- **Dynamic Direction & Banking**: Upright side-view orientation with auto-flip (East/West) and inclination tilt following track slopes without flipping upside down.

### 🎬 Studio-Grade Video Animations & Sequencing
- **Smooth Sequential Animation**:
  1. **Journey Transit**: The route draws out progressively with glowing outer casing and inner core trail.
  2. **Destination Arrival**: As the vehicle pulls into the destination platform, it eases out and smoothly fades away over 0.4s while the emerald green **ARRIVED** pin badge springs up with a tactile bounce (`popInBounce`) and expanding beacon pulse.
  3. **Overview Showcase**: Camera smoothly pans out to frame the entire route corridor, followed by the **Midpoint Route Summary Card** (`Travel Time` • `Distance km`) popping up in the center of the journey.
- **Export Video Motion Polish**:
  - Start pin, arrival pin, vehicle fade-out, summary card, and title headers all feature spring curves and alpha blending for stutter-free Full HD videos.

### 🎥 Camera Choreography & Theming
- **Multiple Camera Perspectives**:
  - **Dynamic Follow**: Camera actively follows the moving vehicle with scale-adaptive cruise zoom and frustum pitch reduction.
  - **Static Overview**: Fixed wide-angle presentation framed across the entire route bounding box.
- **Light Earth Tone Aesthetic**:
  - Warm minimalist Japanese stationery palette with warm cream paper tones (`#FFFCF2`, `#f5efe4`), charcoal ink (`#252422`), and burnt terracotta orange accents (`#EB5E28`).
- **6 Free Map Themes (No API Keys Required)**:
  - CartoDB Voyager, Dark Matter, Positron, Esri World Imagery (Satellite), OpenTopoMap (Outdoors), and Retro.

### ⏱️ Travel Time & Route Controls
- **Numeric Travel Time Inputs**: Precise numerical textboxes for Hours (`hrs`) and Minutes (`min`) with non-numeric key blocking and automatic formatting.
- **Manual "Generate Route" Button**: Calculate route geometry on-demand to prevent unwanted background API requests while typing station names.
- **Station Search & Reverse**: Departure & destination search with station suggestions and instant 1-click swap.

### 💾 Hardware-Accelerated Video Export
- Export directly to **MP4 (H.264)** or **WebM** at **30 FPS / 60 FPS** at Full HD (1080p).
- Frame-accurate capture powered by `mp4-muxer` and `webm-muxer` with map tile pre-caching.
- Zero server processing fees — rendered entirely in-browser.
- Built-in map attribution overlay (`© Esri, © OpenStreetMap, © CARTO`) compliant with YouTube monetization and copyright rules.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI Library**: [React 19](https://react.dev/)
- **Map & Spatial Engine**: [MapLibre GL](https://maplibre.org/) & [Turf.js](https://turfjs.org/)
- **Routing Engines**: OpenStreetMap Overpass API, OpenStreetMap Routed-Foot, Routed-Bike, Routed-Car & OSRM
- **Database (Optional Cache)**: [Neon Postgres](https://neon.tech/) / [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (`@vercel/postgres`)
- **Video Encoding**: [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) & [webm-muxer](https://github.com/Vanilagy/webm-muxer)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/markPoramest/map-animation-generator.git
cd map-animation-generator
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Environment Variables (Optional)
Create a `.env.local` file if you want to enable persistent railway track database caching:
```env
# Optional: Neon Postgres or Vercel Postgres connection string
DATABASE_URL=postgres://...
```
*(If omitted, the app will query live Overpass API endpoints directly with in-memory caching).*

### 4. Run Development Server
```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Starts Next.js development server with Turbopack |
| `pnpm run build` | Builds optimized production package |
| `pnpm run start` | Runs the production build locally |
| `pnpm run lint` | Runs ESLint verification |

---

## 📄 License

MIT License © 2026 Mark no Nihon Tabi. All rights reserved.
