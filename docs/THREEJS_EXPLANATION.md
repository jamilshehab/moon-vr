# Three.js Fundamentals & Graphics Pipeline Guide

This guide breaks down the core concepts of **Three.js** used throughout **MoonWalk VR**, explaining what each component does, the underlying math, and common pitfalls.

---

## 1. The Core Trinity: Scene, Camera, and Renderer

Three.js applications are structured around three fundamental objects:

```text
       Scene (Data Graph)
        ├── Meshes (Geometry + Material)
        ├── Lights
        └── Cameras
              │
              ▼
   Renderer (WebGL Context) ──▶ HTML <canvas> Output
```

1. **`THREE.Scene`**: A hierarchical container (the **Scene Graph**) holding every 3D object, light, and coordinate frame. When you add a child object to a parent, the child moves and rotates with the parent.
2. **`THREE.PerspectiveCamera`**: Defines the viewer's eye position and optics using a **Frustum** (a pyramid sliced at near and far planes).
   - `fov` (Field of View): Vertical viewing angle in degrees (we use $70^\circ$).
   - `aspect`: Viewport width divided by height (`window.innerWidth / window.innerHeight`).
   - `near`: Nearest plane rendered ($0.1\text{m}$).
   - `far`: Furthest distance rendered ($14,000\text{m}$ to accommodate distant lunar mountains).
3. **`THREE.WebGLRenderer`**: The bridge between Three.js and the GPU via WebGL2. It translates the scene graph into GPU draw calls, binds shader programs, uploads vertex buffers, and rasterizes pixels into the HTML `<canvas>`.

---

## 2. Coordinate Systems & Math Helpers

Three.js uses a **Right-Handed Coordinate System**:
- $+X$: Points to the right.
- $+Y$: Points straight UP (altitude / elevation).
- $+Z$: Points out of the screen toward you (south), while $-Z$ points forward into the distance (north).

### Matrices and World Transforms
Every `THREE.Object3D` has three transformation properties:
- `position` (`Vector3`)
- `rotation` (`Euler`) or `quaternion` (`Quaternion`)
- `scale` (`Vector3`)

When rendered, Three.js combines these into a local $4 \times 4$ transformation matrix:
$$\mathbf{M}_{\text{local}} = \mathbf{T} \cdot \mathbf{R} \cdot \mathbf{S}$$

To determine an object's global position in space, Three.js walks down the scene graph and multiplies matrices:
$$\mathbf{M}_{\text{world}} = \mathbf{M}_{\text{parent\_world}} \cdot \mathbf{M}_{\text{local}}$$

> **Three.js Tip**: Always set pivots at the **bottom-center** for props and vehicles that rest on the ground. This ensures that setting `mesh.position.y = terrainHeight` aligns the bottom of the object flush with the surface without floating.

---

## 3. BufferGeometry & Vertex Buffers

All 3D shapes in Three.js are represented as `THREE.BufferGeometry`. A geometry consists of arrays of numbers stored directly in GPU memory:

- `position` attribute: An array of 3D coordinates $[x_0, y_0, z_0, x_1, y_1, z_1, \dots]$.
- `normal` attribute: Unit vectors perpendicular to each vertex $[nx_0, ny_0, nz_0, \dots]$. Normals are crucial for light reflection calculations!
- `uv` attribute: 2D texture coordinates $[u_0, v_0, u_1, v_1, \dots]$ mapping pixels from a 2D image onto the 3D surface ($0.0$ to $1.0$).

In `src/world/LunarTerrain.ts`, we start with a flat grid:
```typescript
const geometry = new THREE.PlaneGeometry(1400, 1400, 180, 180);
geometry.rotateX(-Math.PI / 2); // Rotate flat into X-Z ground plane
```
We then directly modify the `position` buffer array by calculating the exact lunar elevation $y = h(x, z)$ for each vertex, followed by:
```typescript
geometry.computeVertexNormals();
```
This recalculates normal vectors based on the new undulating terrain shape so sunlight shades craters accurately.

---

## 4. Physically Based Rendering (PBR) Materials

In MoonWalk VR, surfaces use `THREE.MeshStandardMaterial`, which implements the **Cook-Torrance Physically Based Rendering (PBR)** lighting model:

- `color`: Diffuse base reflectance (Albedo).
- `roughness` ($0.0 \dots 1.0$):
  - $0.0$ is mirror-smooth, producing tight specular highlights.
  - $1.0$ is microscopically rough, scattering light diffusely in all directions. Lunar regolith has an extremely high roughness ($0.92 \dots 0.96$).
- `metalness` ($0.0 \dots 1.0$):
  - $0.0$ represents dielectric materials (dust, rocks, cloth, glass).
  - $1.0$ represents pure electrical conductors (aluminum frame, gold foil), where diffuse color is black and all reflected light is tinted specular reflections.
- `normalMap`: A RGB texture where $(R, G, B)$ values encode per-pixel surface angle variations. This gives flat geometry the visual appearance of thousands of tiny pebbles and micro-craters without requiring millions of extra polygons.

---

## 5. Shadow Mapping: Frustums, Bias, and Acne

Real-time shadows are generated through a two-pass algorithm:
1. **Depth Pass**: The scene is rendered from the perspective of the Sun (`DirectionalLight`). Instead of colors, the GPU records the distance (depth) from the light to the nearest surface into a texture called the **Shadow Map**.
2. **Lighting Pass**: The scene is rendered from the player's camera. For every pixel, the GPU compares its distance to the Sun against the depth recorded in the shadow map. If the pixel is further away, it is in shadow!

### Solving "Shadow Acne" and "Peter-Panning"
Due to finite shadow map resolution ($2048 \times 2048$), surfaces can self-shadow erroneously (creating dark striped moiré patterns called **Shadow Acne**).

In `src/world/LunarLighting.ts`, we solve this using:
```typescript
this.sunLight.shadow.bias = -0.0004;
this.sunLight.shadow.normalBias = 0.025;
```
- `bias`: Offsets depth slightly backward along the light vector.
- `normalBias`: Offsets depth along the surface's normal vector. This virtually eliminates acne without causing shadows to detach from the base of rocks (a defect known as *Peter-Panning*).

---

## 6. Color Management & Tone Mapping

In real life, sunlight is thousands of times brighter than ambient reflections. Computer monitors, however, can only display brightness values between $0.0$ and $1.0$.

In `src/core/Renderer.ts`:
```typescript
this.instance.outputColorSpace = THREE.SRGBColorSpace;
this.instance.toneMapping = THREE.ACESFilmicToneMapping;
this.instance.toneMappingExposure = 1.1;
```
- `SRGBColorSpace`: Ensures gamma correction ($2.2$ power curve) is applied so dark crater shadows don't look crushed or washed out.
- `ACESFilmicToneMapping`: The Academy Color Encoding System standard used in Hollywood film CGI. It smoothly rolls off ultra-bright highlights (like direct sunlight glinting off gold Kapton foil) with a realistic S-curve, avoiding harsh clipping artifacts.

---

## 7. Instancing with `THREE.InstancedMesh`

If you create 400 separate rock meshes, the CPU must submit 400 separate draw calls to the GPU every frame. This introduces massive driver overhead that drops frame rates below 30 FPS.

In `src/world/LunarRocks.ts`, we use `THREE.InstancedMesh`:
- A single geometry and material are uploaded to the GPU once.
- An array of $4 \times 4$ transformation matrices (one per rock instance) is passed in a single buffer.
- The GPU draws all 400 rocks in **1 single draw call**!

```typescript
this.largeBouldersMesh.setMatrixAt(index, transformMatrix);
this.largeBouldersMesh.instanceMatrix.needsUpdate = true;
this.largeBouldersMesh.computeBoundingSphere();
```
Calling `computeBoundingSphere()` is critical: it tells Three.js the spatial extent of all instances combined so frustum culling doesn't accidentally make rocks disappear when looking away from the origin!
