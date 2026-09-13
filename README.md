<div align="center">

# 🗺️ Map Animation Generator
### *By Mark no Nihon Tabi*

An interactive, high-performance web application for generating cinematic 3D animated travel route videos. Designed for YouTube travel vlogs, itinerary recaps, and transit journeys — featuring realistic vehicle models (Azusa Express train, Shinkansen, cars, flights), dynamic travel time badges, and direct **Full HD MP4 & WebM** video export.

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![MapLibre GL](https://img.shields.io/badge/Map-MapLibre_GL-0078D7?style=for-the-badge&logo=maplibre)](https://maplibre.org/)
[![Video Export](https://img.shields.io/badge/Export-MP4_&_WebM-EB5E28?style=for-the-badge)](https://github.com/markPoramest/map-animation-generator)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

🌐 **Live Demo**: **[https://map-animation-generator.vercel.app](https://map-animation-generator.vercel.app)** *(Deploy on Vercel)*

</div>

---

## ✨ Features

- 🚅 **Realistic 3D Vehicles & Custom Train Models**:
  - **JR E353 Azusa Express**: Custom Japanese express train with authentic livery, roof aerodynamic cowls, and glowing headlights.
  - **Shinkansen Bullet Train**: Streamlined aerodynamic nose cone and high-speed rail styling.
  - **Multi-Modal Transit**: Cars, Airplanes, City Buses, Bicycles, Ships, and Walking avatars.
  - Realistic vehicle banking, curve heading calculations, and directional rotation along geographic paths.
- 🎥 **5 Cinematic Camera Choreography Modes**:
  - **Chase 3D**: Dynamic third-person chase camera following behind the vehicle through every mountain pass and curve.
  - **Dynamic Overview**: Smart corridor framing that smoothly adjusts zoom and bearing as the trip unfolds.
  - **Fixed 3D**: Elevated 45° perspective preserving regional landmark context.
  - **Top-Down 2D**: Clean orthographic map view ideal for itinerary overviews.
  - **Cinematic Orbit**: Sweeping orbital rotation showcasing the surrounding terrain.
- ⏱️ **Live Travel Time & Distance Badges**:
  - Real-time animated vehicle badge displaying elapsed travel time (e.g., *0 min ➔ 40 min*).
  - Dynamic distance counter (*km* traveled) synchronized with route progress.
  - Station name tags, destination arrival celebrations, and start/destination pins.
- 🎬 **YouTube 16:9 Video Studio**:
  - Optimized **16:9 Widescreen (Landscape)** canvas ready for YouTube long-form travel videos.
  - Interactive scrubber timeline with frame-accurate seek, play/pause, and duration controls.
  - Pre-configured journey presets (Matsumoto ➔ Kami-Suwa, Tokyo ➔ Kyoto, London ➔ Paris, and more).
- 💾 **Client-Side Hardware-Accelerated Video Export**:
  - Export directly to **MP4 (H.264)** or **WebM** up to **60 FPS** at Full HD (1080p).
  - Powered by `mp4-muxer` and `webm-muxer` right inside your browser — **0 server processing costs** and instant rendering.
- 🌍 **6 Curated Map Styles & Free Tiles**:
  - CartoDB Voyager, Dark Matter, Positron, Esri World Imagery (Satellite), OpenTopoMap (Outdoors), and Retro.
  - Zero required API keys — ready to use out of the box.
- ⚖️ **YouTube Monetization Friendly**:
  - Automatic in-video attribution credit overlay (`© Esri, © OpenStreetMap, © CARTO`) burned into exported video frames, satisfying YouTube copyright and attribution guidelines.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI Library**: [React 19](https://react.dev/)
- **Map & Spatial Engine**: [MapLibre GL](https://maplibre.org/) & [Turf.js](https://turfjs.org/)
- **Video Encoding & Muxing**: [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) & [webm-muxer](https://github.com/Vanilagy/webm-muxer)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Effects**: [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Hosting**: [Vercel](https://vercel.com/)

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

### 3. Run Development Server
```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Scripts

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Starts Next.js development server with Turbopack |
| `pnpm run build` | Builds optimized production package |
| `pnpm run start` | Runs the production build locally |
| `pnpm run lint` | Runs ESLint checks |

---

## 📄 License

MIT License © 2026 Mark no Nihon Tabi. All rights reserved.
