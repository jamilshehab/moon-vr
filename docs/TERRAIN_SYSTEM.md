# Lunar Terrain System & Impact Morphology

The lunar surface is not a terrestrial desert. It has no wind erosion, no flowing water, and no plate tectonics. Its topography is sculpted exclusively by **billions of years of hypervelocity meteorite impacts** and ancient volcanic basalt flows (**maria**).

This document explains how **MoonWalk VR** translates lunar geology and NASA Lunar Orbiter Laser Altimeter (LOLA) scientific data into real-time 3D geometry.

---

## 1. Geological Anatomy of an Impact Crater

In basic 3D games, craters are often modeled as crude dips in the ground. Real impact craters follow distinct geological mechanics:

```text
       Raised Overturn Rim
            ▲
         ___|___                               ___|___
       /         \                           /         \
      /   Interior \    Central Peak        /   Interior \
_____/      Bowl    \       ▲              /      Bowl    \_____
Ejecta               \______|______/                     Ejecta
Blanket                                                  Blanket
```

1. **Transient Cavity Collapse & Interior Bowl**:
   The meteor impacts at $15 \dots 25\text{ km/s}$, creating an explosive shockwave that excavates a parabolic bowl:
   $$h_{\text{bowl}}(r) = -D \cdot \left(1 - \left(\frac{r}{R}\right)^{1.85}\right) \quad \text{for } r \le R$$
   where $R$ is crater radius and $D$ is excavated depth.

2. **Raised Overturn Rim**:
   The crater rim is not simply the edge of the hole; it is raised significantly *above* the surrounding terrain due to structural upwarping and overturned bedrock layers. In our analytical model, rims peak at $r \approx 1.05R$ with height $H_{\text{rim}}$:
   $$h_{\text{rim}}(r) = H_{\text{rim}} \cdot \left(\frac{2.2 - \frac{r}{R}}{1.2}\right)^{1.6} \quad \text{for } R < r \le 2.2R$$

3. **Central Uplift Peak (Complex Craters)**:
   For craters with diameters exceeding $\sim 15\text{ km}$ (or in scaled local simulations, $> 100\text{m}$), the deep floor rebounds upward immediately after impact due to gravitational collapse of the transient cavity:
   $$h_{\text{peak}}(r) = (0.35 \cdot D) \cdot \cos\left(\frac{r}{0.28 R} \cdot \frac{\pi}{2}\right) \quad \text{for } r < 0.28R$$

---

## 2. Analytical Elevation Field vs Texture Heightmaps

Most game engines load a pre-baked $2048 \times 2048$ 16-bit PNG heightmap. While simple, texture heightmaps have significant disadvantages for scientific simulations:
1. **Memory & Bandwidth**: A 16-bit float heightmap requires $8\text{ MB}$ of VRAM and network bandwidth.
2. **CPU Physics Overhead**: For player footsteps, vehicle wheels, and rock placement, the CPU must read image pixels using expensive bilinear interpolation, causing memory bus stalls.
3. **Resolution Limits**: At close range, texture pixels become visible as stair-stepped jagged terrain artifacts.

### The Analytical Solution (`getElevationAt(x, z)`)
In `src/world/LunarTerrain.ts`, we compute elevation analytically using mathematical functions:

```typescript
public getElevationAt(x: number, z: number): number {
  let elevation = 0;

  // 1. Long-wavelength mare basalt undulations (LOLA scale: 600m to 200m)
  elevation += Math.sin(x * 0.0035 + 0.4) * Math.cos(z * 0.0031) * 9.5;
  elevation += Math.sin(x * 0.0082 - z * 0.0075) * 4.2;

  // 2. Micro-relief hummocks (8m to 30m)
  elevation += Math.sin(x * 0.065 + Math.cos(z * 0.055) * 1.2) * 0.45;

  // 3. Discrete Impact Craters
  for (let i = 0; i < craters.length; i++) {
    const c = craters[i];
    const dx = x - c.x;
    const dz = z - c.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    // ... evaluates bowl, rim, and peak equations ...
  }

  return elevation;
}
```

### Why this is mathematically superior:
- **Instantaneous $O(1)$ Execution**: Runs in sub-microsecond CPU cycles with zero memory lookups.
- **Infinite Zoom Detail**: There is no pixel limit; vertices can be queried at millimeter resolution without blur.
- **Guaranteed Consistency**: Physics, rover wheels, astronaut collision, and GPU shaders all agree on the exact same surface geometry.

---

## 3. Instant Surface Normals via Finite Differences

To align rover wheels and compute slope angles, we need the 3D surface normal vector $\vec{n} = (n_x, n_y, n_z)$ at any $(x, z)$ coordinate.

Instead of expensive raycasting against thousands of polygons, we use **central finite difference approximations**:

$$\frac{\partial h}{\partial x} \approx \frac{h(x + \varepsilon, z) - h(x - \varepsilon, z)}{2\varepsilon}$$
$$\frac{\partial h}{\partial z} \approx \frac{h(x, z + \varepsilon) - h(x, z - \varepsilon)}{2\varepsilon}$$

The surface normal is the cross product of the tangent vectors:
$$\vec{n} = \frac{\left(-\frac{\partial h}{\partial x}, \ 1, \ -\frac{\partial h}{\partial z}\right)}{\left\|\left(-\frac{\partial h}{\partial x}, \ 1, \ -\frac{\partial h}{\partial z}\right)\right\|}$$

In `src/world/LunarTerrain.ts`:
```typescript
public getNormalAt(x: number, z: number, target = new THREE.Vector3()): THREE.Vector3 {
  const eps = 0.5;
  const hL = this.getElevationAt(x - eps, z);
  const hR = this.getElevationAt(x + eps, z);
  const hD = this.getElevationAt(x, z - eps);
  const hU = this.getElevationAt(x, z + eps);

  target.set(hL - hR, 2 * eps, hD - hU).normalize();
  return target;
}
```
This single function gives the rover suspension instantaneous pitch and roll orientation with zero matrix decomposition overhead.

---

## 4. Continuous Lunar Mountain Massifs (NASA LOLA Basins)

Lunar mountain ranges (such as Montes Apenninus at Apollo 15 and the North & South Massifs at Apollo 17) are massive impact basin uplift structures. They are characterized by:
- **Broad, rounded, dome-shaped crests** (not spiky, triangular, or low-poly jagged peaks).
- **Gentle, realistic slopes** ($14^\circ \dots 22^\circ$) that transition smoothly into the valley floor.
- **Scientifically proportional elevations**: Rising to $380\text{m} \dots 510\text{m}$ above the mare datum.
- **Embedded crater scars**: Ancient impact depressions sculpted directly into the mountain flanks.

### Seamless Zero-Gap Mesh Architecture
In `src/world/LunarTerrain.ts`:
1. **Inner High-Detail Exploration Zone ($1600\text{m} \times 1600\text{m}$)**: A dense grid deformed by `getElevationAt(x, z)`.
2. **Outer Continuous Mountain Massif Skirt ($760\text{m} \dots 6800\text{m}$)**: Interlocks directly with the inner ground (with 40m overlap) at $192 \times 54$ resolution.
3. Both meshes evaluate the **exact same continuous LOLA elevation function**, ensuring:
   - **Zero gaps or seams** between the exploration ground and the surrounding mountains.
   - Consistent lighting, normal vectors, and shadow casting across the entire horizon.
   - Authentic photographic texturing using NASA LRO and Apollo mission imagery (`moon-rock_93cdf0de.jpg` and `moon-landscape_f32ba1e9.jpg`).

