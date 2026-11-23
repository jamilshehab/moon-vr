<<<<<<< HEAD
# MoonWalk VR &mdash; Photorealistic Lunar Exploration Simulator

**MoonWalk VR** is a commercial-grade, photorealistic lunar surface exploration simulator built with **Three.js**, **WebXR**, and modern **ES modules**.

Designed with strict adherence to real lunar science and NASA planetary data products, MoonWalk VR lets users experience the Apollo lunar landings in desktop first-person mode or fully immersive virtual reality.

---

## Key Features

- **Photorealistic Lunar Environment**:
  - Analytical terrain modeled after **NASA Lunar Orbiter Laser Altimeter (LOLA)** elevation profiles.
  - Authentic impact crater morphology: parabolic bowls, raised overturn rims, and central uplift peaks.
  - Distant mountain massif horizon ring inspired by the Montes Apenninus at Apollo 15.
  - Procedural PBR lunar regolith shaders matching Apollo returned sample reflectance spectra (iron/titanium-rich mare basalt).
  - Hundreds of scattered rocks and boulders rendered via single-draw-call `THREE.InstancedMesh`.

- **Apollo Lunar Roving Vehicle (LRV)**:
  - Procedural 16-part 3D vehicle model with woven wire-mesh wheels, titanium chevron cleats, and gold Kapton foil.
  - 4-wheel independent raycast suspension conforming chassis pitch and roll to terrain slopes.
  - Authentic **4-wheel counter-steering** (front and rear wheels turn in opposite directions for a tight 3.1m turning radius).
  - Seamless boarding and dismounting with dedicated cockpit and chase cameras.

- **Lunar Gravity Kinematics & Astronaut Locomotion**:
  - Authentic 1/6th gravity simulation ($g = 1.622\text{ m/s}^2$).
  - Floating astronaut leaps with $4.3\text{-second}$ hang times.
  - Spacesuit inertial momentum and bounding gait head-bobbing.
  - Helmet-mounted toggleable EVA spotlight.

- **Photorealistic Vacuum Lighting**:
  - Collimated solar Key Light casting razor-sharp black shadows in the airless void.
  - Subtle Earthshine fill light ($0.28\text{ lux}$) reflected from Earth's oceans and clouds.
  - Earth globe positioned in the sky with procedural continents, swirling cloud decks, and atmospheric Fresnel limb glow.
  - Interactive Sun elevation slider to simulate dawn, Apollo landing geometry ($19.5^\circ$), and high-noon washout.

- **Vacuum Acoustic Synthesis (Web Audio API)**:
  - 100% procedural audio engine modeling acoustic conduction through equipment in a vacuum.
  - Spacesuit Portable Life Support System (PLSS) continuous oxygen fan hum.
  - Muffled boot crunches transmitted through suit boots.
  - Dual-oscillator LRV electric motor whine scaling with speed.
  - NASA Apollo Quindar radio squelch tones ($2525\text{ Hz} / 2475\text{ Hz}$).

- **WebXR Immersive VR**:
  - Full `immersive-vr` session support for Meta Quest 2/3/Pro, Apple Vision Pro, and PC VR headsets.
  - Dual 6DoF hand controller ray pointers and thumbstick locomotion.
  - VR comfort modes: smooth rotation or $45^\circ$ snap turn.

- **Professional Scientific HUD**:
  - Real-time mission telemetry: Lunar coordinates (Lat/Long), elevation, speed, heading tape, and EVA clock.
  - Three.js compliant **Collapsible Bottom Control Dock** (press `H` for full-screen cinema mode).
  - Quick landmark teleportation (Apollo LM, Armstrong Crater Rim, Rover Staging, Megabreccia Boulder Field).

---

## Technology Stack

- **Graphics Engine**: Three.js (`^0.174.0` / current stable)
- **Language**: TypeScript (`^7.0.0`) & ES Modules
- **Build Tool**: Vite (`^8.3.0`)
- **Styling**: Tailwind CSS
- **Audio**: Web Audio API (procedural synthesis, zero external MP3s)
- **VR API**: W3C WebXR Device API

---

## Getting Started

### 1. Installation
Clone repository and install dependencies:
```bash
npm install
```

### 2. Run Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Production Build
Compile and bundle for production:
```bash
npm run build
```
The optimized bundle will be generated in `dist/`.

---

## Desktop Controls

| Action | Input |
| :--- | :--- |
| **Move / Drive** | `W`, `A`, `S`, `D` or Arrow Keys |
| **Look Around** | Mouse (Click screen to lock cursor) |
| **Jump / Handbrake** | `Spacebar` |
| **Board / Exit Rover** | `E` or `Enter` (when near rover) |
| **Switch Camera Mode** | `C` (First-Person, Cockpit, 3rd-Person) |
| **Toggle Suit Headlight** | `L` |
| **Toggle HUD Cinema Mode** | `H` |
| **Sprint (Bounding Gait)**| `Shift` |
| **Mute / Unmute Audio** | `M` |

---

## WebXR Headset Instructions

1. Ensure the app is served over **HTTPS** (or `localhost`).
2. Open the page inside your VR headset browser (e.g., **Meta Quest Browser** on Quest 2/3, Safari on Apple Vision Pro, or Chrome with SteamVR running).
3. Click the **ENTER VR** button in the bottom dock.
4. Use the **left thumbstick** to walk or drive, and the **right thumbstick** to turn. Pull the **trigger** when pointing at the Lunar Rover to board.

---

## Educational Documentation Directory

For in-depth architectural and mathematical explanations:
- [**docs/README.md**](./docs/README.md) &mdash; Documentation Index
- [**docs/ARCHITECTURE.md**](./docs/ARCHITECTURE.md) &mdash; Software Design & Module Separation
- [**docs/THREEJS_EXPLANATION.md**](./docs/THREEJS_EXPLANATION.md) &mdash; Three.js Graphics Pipeline Guide
- [**docs/TERRAIN_SYSTEM.md**](./docs/TERRAIN_SYSTEM.md) &mdash; LOLA Elevation Math & Crater Physics
- [**docs/LIGHTING_SYSTEM.md**](./docs/LIGHTING_SYSTEM.md) &mdash; Vacuum Optics & Shadow Mapping
- [**docs/PLAYER_MOVEMENT.md**](./docs/PLAYER_MOVEMENT.md) &mdash; 1/6th Lunar Gravity Kinematics
- [**docs/ROVER_SYSTEM.md**](./docs/ROVER_SYSTEM.md) &mdash; Apollo LRV 4-Wheel Physics & Suspension
- [**docs/WEBXR_GUIDE.md**](./docs/WEBXR_GUIDE.md) &mdash; WebXR Session Lifecycle & Locomotion
- [**docs/NASA_DATA_GUIDE.md**](./docs/NASA_DATA_GUIDE.md) &mdash; NASA Dataset Citations (LRO, LOLA, LROC)
- [**docs/PERFORMANCE.md**](./docs/PERFORMANCE.md) &mdash; Zero-GC Loop Discipline & VR Optimization
- [**TESTING.md**](./TESTING.md) &mdash; Verification Log & Transparent Testing Notes
=======
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/24969478-5799-42bd-acca-412260813a9e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
>>>>>>> d8bc69c (changes added)
