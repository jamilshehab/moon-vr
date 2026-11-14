# Performance Engineering & VR Optimization

Virtual reality simulation demands uncompromising performance. A dropped frame on a desktop monitor is a minor annoyance; a dropped frame inside a VR headset causes optical judder, visual tearing, and simulator sickness.

This document details the performance budget, memory discipline, and optimization strategies employed in **MoonWalk VR**.

---

## 1. Frame Budget: Desktop vs WebXR

| Platform | Target FPS | Frame Budget | Target Draw Calls |
| :--- | :--- | :--- | :--- |
| **Desktop 60 Hz** | $60\text{ FPS}$ | **$16.6\text{ ms}$** | $< 100$ |
| **Meta Quest 2** | $72\text{ FPS}$ | **$13.8\text{ ms}$** | $< 50$ |
| **Meta Quest 3 / PC VR** | $90\text{ FPS}$ | **$11.1\text{ ms}$** | $< 80$ |
| **Valve Index (High-End)** | $120\text{ FPS}$ | **$8.3\text{ ms}$** | $< 120$ |

To achieve steady $60 \dots 90\text{ FPS}$, CPU JavaScript execution must finish in under **$4\text{ ms}$**, leaving the remaining budget for GPU rasterization, shadows, and WebXR stereo eye reprojection.

---

## 2. Zero-Garbage Collection (Zero-GC) Discipline

In JavaScript, allocating objects inside the per-frame loop triggers the browser's Garbage Collector (GC):
- When the GC runs, it halts JavaScript execution on the main thread for $10 \dots 35\text{ ms}$ to sweep memory.
- This produces noticeable micro-stutters (*jank*).

### The Anti-Pattern
```typescript
// BAD: Allocates 120 Vector3 objects every second!
function update() {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyEuler(camera.rotation);
  player.position.add(direction.multiplyScalar(0.1));
}
```

### The Production Solution
In MoonWalk VR, all temporary vectors, quaternions, and matrices are pre-allocated statically at module scope outside the loop:

In `src/player/PlayerMovement.ts`:
```typescript
// GOOD: Zero heap allocation during per-frame update
private static _moveDir = new THREE.Vector3();
private static _forward = new THREE.Vector3();
private static _right = new THREE.Vector3();

public update(delta: number): void {
  PlayerMovement._moveDir.set(0, 0, 0); // Reuses existing memory address
  // ... compute direction ...
}
```
This guarantees **zero allocations per frame** in the physics and locomotion loops.

---

## 3. Draw Call Optimization via `THREE.InstancedMesh`

A standard WebGL draw call carries CPU driver overhead. If each rock on the lunar surface were an individual `THREE.Mesh`:
- $400\text{ rocks} \times 1\text{ draw call} = 400\text{ draw calls}$.
- This would swamp the CPU, dropping Quest headsets down to $25\text{ FPS}$.

In `src/world/LunarRocks.ts`, we condense all 400 rocks into **2 instanced draw calls**:
1. `largeBouldersMesh`: 50 instances (casts and receives shadows).
2. `smallRocksMesh`: 350 instances (receives shadow only, skips casting).

Total scene draw calls remain under **$18$** across the entire application!

---

## 4. Shadow Map Budgeting

Shadow maps are expensive because every shadow-casting object must be rendered twice per frame: once for the shadow depth pass, and once for the screen pass.

### Optimization Strategy:
1. **Single Shadow Caster**: Only direct sunlight (`sunLight`) casts shadows. Earthshine (`earthBounceLight`) is a non-shadowed hemisphere light.
2. **Tight Orthographic Bounds**: The shadow camera is sized to $160\text{m} \times 160\text{m}$ rather than the whole $1400\text{m}$ world.
3. **Caster Exclusion**: Small pebbles and distant mountain massifs have `castShadow = false`. Only the Lunar Module, the Rover, the Astronaut avatar, and large boulders cast shadows.

---

## 5. Software WebGL Guard

On virtualized environments, headless CI runners, or machines without GPU hardware acceleration (using SwiftShader, llvmpipe, or WARP), high pixel ratios cause massive CPU bottlenecks.

In `src/core/Renderer.ts`:
```typescript
this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);

this.instance = new THREE.WebGLRenderer({
  antialias: !this.isSoftwareGl,
  powerPreference: 'high-performance',
});

// Cap pixel ratio at 1.0 on software WebGL, or 2.0 on real GPUs
this.instance.setPixelRatio(
  this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
);

this.instance.shadowMap.enabled = !this.isSoftwareGl;
```
This ensures that machines lacking dedicated GPUs still run smoothly without freezing the browser tab.
