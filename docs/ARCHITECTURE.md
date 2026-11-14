# Architectural Blueprint & System Design

## 1. Architectural Philosophy: Why Vanilla ES Modules?

A common pitfall in modern web development is wrapping 3D WebGL renderers inside heavy reactive component frameworks (such as React, Vue, or Next.js) without a compelling state-binding reason.

In a real-time graphics simulator running at 60–90 frames per second:
1. **Virtual DOM Overhead**: React's reconciliation cycle introduces micro-stutters and garbage collection (GC) pressure when high-frequency state updates (camera positions, vehicle wheel matrices, telemetry vectors) trigger component re-renders.
2. **WebGL Lifecycle Stability**: In WebGL, context loss or canvas re-mounting destroys GPU shader programs, textures, and geometry buffers. Keeping the WebGL canvas decoupled in pure ES modules ensures an uninterrupted GPU state.
3. **WebXR Render Loops**: WebXR requires the browser's native XR frame loop (`renderer.xr.setAnimationLoop`) to maintain sub-millisecond motion-to-photon latency, which must never be choked by framework thread contention.

**MoonWalk VR** utilizes a clean, decoupled **Domain-Driven Architecture** built on standard TypeScript and ES modules.

---

## 2. Directory Hierarchy

```text
src/
├── main.ts                   # Application bootstrap and container acquisition
├── config/
│   └── settings.ts           # Central immutable scientific & physics parameters
├── core/
│   ├── Experience.ts         # Central orchestrator singleton connecting all subsystems
│   ├── Scene.ts              # Three.js scene graph root & environment map management
│   ├── Camera.ts             # PerspectiveCamera with multi-mode viewport projections
│   ├── Renderer.ts           # WebGLRenderer, ACES tone mapping, and WebXR integration
│   └── Time.ts               # Delta time calculation, elapsed time, and rolling FPS
├── world/
│   ├── LunarLighting.ts      # Collimated sunlight, shadow bounds, and Earthshine fill
│   ├── Earth.ts              # Atmospheric Earth sphere with rotating cloud decks & rim glow
│   ├── LunarTerrain.ts       # LOLA fractal heightfield, impact craters, & mountain horizon
│   ├── LunarRocks.ts         # Instanced boulders/pebbles with collision bounding proxies
│   └── LunarEnvironment.ts   # Celestial starfield, Apollo 15 LM descent stage, & flag
├── player/
│   ├── Player.ts             # Astronaut entity, helmet headlight, and A7L spacesuit avatar
│   ├── PlayerMovement.ts     # WASD input, mouse look, and 1.62 m/s² gravity kinematics
│   └── CollisionSystem.ts    # 2D circle obstacle collision and momentum damping
├── rover/
│   ├── Rover.ts              # Apollo Lunar Roving Vehicle 3D model & visual subsystems
│   ├── RoverPhysics.ts       # 4-wheel raycast suspension, Ackermann counter-steer, slopes
│   └── RoverControls.ts      # Driving keyboard input & throttle/braking logic
├── vr/
│   ├── VRManager.ts          # WebXR session negotiation, capability checks, & lifecycle
│   └── VRControls.ts         # Dual 6DoF controller rays, grip models, & thumbstick input
├── ui/
│   ├── HUD.ts                # Telemetry HUD, reticle, and collapsible bottom control dock
│   ├── MainMenu.ts           # Mission briefing modal & initial audio consent
│   └── Settings.ts           # In-game physics sliders, VR comfort, and WebXR guide
├── audio/
│   └── AudioManager.ts       # Vacuum acoustic synthesizer (PLSS suit fan, boots, rover)
└── utils/
    ├── AssetLoader.ts        # Zero-404 procedural PBR texture generation (CanvasTexture)
    └── ResizeHandler.ts      # Viewport aspect ratio, devicePixelRatio, & software GL guard
```

---

## 3. Subsystem Breakdown & Responsibilities

### Core Subsystem (`src/core/`)
- **`Experience.ts`**: The central orchestrator. Holds references to all subsystems, initializes them in dependency order, and drives the per-frame update loop.
- **`Time.ts`**: Provides frame-independent `delta` (capped at $0.1\text{s}$ to prevent physics tunnel explosions when a browser tab loses focus) and calculates smooth rolling frames-per-second.
- **`Scene.ts`**: Owns the root `THREE.Scene`. Enforces a pitch-black background (`0x000000`) and provisions `RoomEnvironment` through `PMREMGenerator` so metallic foils (gold Kapton) and shiny alloys reflect realistic indirect light.
- **`Camera.ts`**: Controls a single `THREE.PerspectiveCamera`. Manages four seamless view modes:
  - `first-person`: Astronaut eye level ($1.82\text{m}$) with gait bobbing.
  - `rover-cockpit`: Astronaut driver's seat inside the Apollo LRV.
  - `third-person`: Trailing chase camera with smooth damping.
  - `cinematic`: Orbit view for inspecting equipment.
- **`Renderer.ts`**: Configures the `THREE.WebGLRenderer`. Enables `THREE.ACESFilmicToneMapping` for high dynamic range, sets `outputColorSpace = THREE.SRGBColorSpace`, activates PCF soft shadows, and detects software WebGL fallbacks.

### World Subsystem (`src/world/`)
- **`LunarTerrain.ts`**: Evaluates an analytical elevation function $h(x, z)$ across a $1400\text{m} \times 1400\text{m}$ exploration grid. Also provides $O(1)$ analytical surface normals $\vec{n}(x, z)$ for player walking and rover suspension.
- **`LunarLighting.ts`**: Simulates the harsh, atmospheric-free lunar lighting regime. Direct solar light is collimated with tight orthographic shadow boundaries, paired with faint cool Earthshine fill.
- **`Earth.ts`**: Renders Earth in the sky with procedural continents, swirling cloud decks, and a custom GLSL Fresnel atmosphere glow shader.
- **`LunarRocks.ts`**: Uses `THREE.InstancedMesh` to render hundreds of boulders and surface rocks in two single draw calls.
- **`LunarEnvironment.ts`**: Creates 3,200 astronomical stars with realistic stellar temperatures and builds the Apollo 15 Lunar Module (LM) descent stage and American flag.

### Entity & Physics Subsystem (`src/player/` & `src/rover/`)
- **`PlayerMovement.ts`**: Implements 1/6th gravity ($1.622\text{ m/s}^2$). Astronaut jumps launch at $+3.5\text{ m/s}$ and hang in the air for ~4.2 seconds before gently floating back down.
- **`RoverPhysics.ts`**: Models 4 independent wheel contact points. Samples terrain elevation at each wheel hub to compute chassis pitch, roll, and spring damping. Recreates Apollo's dual 4-wheel counter-steering.
- **`CollisionSystem.ts`**: Fast circular obstacle resolution against rocks and historical artifacts.

### WebXR Subsystem (`src/vr/`)
- **`VRManager.ts`**: Handles WebXR `navigator.xr.requestSession('immersive-vr')`.
- **`VRControls.ts`**: Reads 6DoF hand controller thumbsticks for smooth walking, snap turning, and trigger interactions.

---

## 4. Communication & Lifecycle Data Flow

```text
[Browser Frame Event (setAnimationLoop)]
                 │
                 ▼
          Time.update()
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
Earth.update()     Player/Rover.update()
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      RoverPhysics.update()    CollisionSystem.check()
               │                         │
               └────────────┬────────────┘
                            ▼
                   VRControls.update()
                            │
                            ▼
               LunarLighting.updateShadow()
                            │
                            ▼
                     HUD.update()
                            │
                            ▼
                Renderer.render(scene, cam)
```

By keeping state updates linear and strictly unidirectional, MoonWalk VR avoids race conditions and ensures peak 60/90 FPS rendering on modern GPUs.
