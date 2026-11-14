# MoonWalk VR &mdash; Technical & Educational Documentation

Welcome to the comprehensive educational documentation suite for **MoonWalk VR**.

This documentation was designed specifically for developers, graphics engineers, and students learning **Three.js**, **WebXR**, and **real-time 3D simulation engineering**. Rather than just describing what functions do, each guide explains **why** specific architectural patterns were chosen, the underlying mathematical and physical principles, and how alternatives compare.

---

## Documentation Index

| Document | Topic & Focus Area |
| :--- | :--- |
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | System design, module breakdown, dataflow, and design patterns. |
| [**THREEJS_EXPLANATION.md**](./THREEJS_EXPLANATION.md) | Core Three.js concepts: Scene graph, cameras, renderers, coordinate systems, and matrices. |
| [**TERRAIN_SYSTEM.md**](./TERRAIN_SYSTEM.md) | Analytical elevation fields, LOLA altimeter models, impact crater mathematics, and horizon rings. |
| [**LIGHTING_SYSTEM.md**](./LIGHTING_SYSTEM.md) | Vacuum lighting physics, collimated solar Key light, Earthshine bounce, and shadow maps. |
| [**PLAYER_MOVEMENT.md**](./PLAYER_MOVEMENT.md) | 1/6th lunar gravity kinematics, astronaut bounding gait, Pointer Lock, and collision resolution. |
| [**ROVER_SYSTEM.md**](./ROVER_SYSTEM.md) | Apollo LRV 4-wheel independent raycast suspension, Ackermann counter-steering, and motor audio. |
| [**WEBXR_GUIDE.md**](./WEBXR_GUIDE.md) | WebXR `immersive-vr` session lifecycle, controller thumbstick locomotion, and headset compatibility. |
| [**NASA_DATA_GUIDE.md**](./NASA_DATA_GUIDE.md) | Authentic lunar datasets (LROC, LOLA, Apollo journals), reflectance spectra, and real data integration. |
| [**PERFORMANCE.md**](./PERFORMANCE.md) | GPU/CPU optimization, instancing (`InstancedMesh`), zero-GC loop discipline, and mobile VR profiling. |

---

## Quick Start for Learners

If you are new to Three.js and real-time graphics:
1. Start with [**THREEJS_EXPLANATION.md**](./THREEJS_EXPLANATION.md) to understand how scenes, projection matrices, materials, and the render loop work together.
2. Read [**ARCHITECTURE.md**](./ARCHITECTURE.md) to see how an enterprise-grade 3D application is partitioned into clean, decoupled domain modules without framework bloat.
3. Dive into [**TERRAIN_SYSTEM.md**](./TERRAIN_SYSTEM.md) and [**ROVER_SYSTEM.md**](./ROVER_SYSTEM.md) for game math and physics.
