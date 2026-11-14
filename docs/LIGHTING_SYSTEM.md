# Lunar Lighting & Vacuum Optical Physics

Lighting on the Moon is fundamentally different from lighting on Earth. This document explains the optical physics of the lunar environment and how **MoonWalk VR** achieves photorealism without falling into common tropes.

---

## 1. Why Earth Lighting Rules Fail on the Moon

On Earth, sunlight entering the atmosphere undergoes **Rayleigh scattering**:
- Nitrogen and oxygen molecules scatter high-frequency blue wavelengths across the entire sky, creating a bright blue celestial dome.
- This creates massive **diffuse ambient fill light**. Even when standing in direct shadow on Earth, you receive $\sim 15\% \dots 20\%$ of total illumination from the blue sky!
- Moisture, dust, and aerosols produce **atmospheric perspective** (distant mountains appear hazy, low-contrast, and bluish).

### The Lunar Reality (Vacuum Optics):
1. **Zero Atmosphere**: There is no Rayleigh scattering. The sky is deep, infinite pitch-black (`#000000`), with stars visible even when the Sun is blazing above the horizon.
2. **Extreme Dynamic Contrast**: The boundary between sunlight and shadow (the terminator and rock shadows) is razor-sharp.
3. **Zero Atmospheric Haze**: Distant crater rims $50\text{ km}$ away appear just as sharp and high-contrast as a rock $2\text{ meters}$ in front of you. This is why Apollo astronauts consistently misjudged distances on the Moon!

---

## 2. Why Shadows Aren't Pitch Black: Earthshine & Regolith Bounce

A common misconception is that lunar shadows should be $100\%$ black ($0\text{ lux}$). If that were true, Apollo astronauts standing in the shadow of the Lunar Module would have been completely invisible in NASA photographs!

In reality, two primary physical mechanisms illuminate shadowed regions:

```text
               Sunlight (Direct Key Light)
                     \
                      \
                       ▼
                    [Earth] ──(Earthshine Fill)──▶ [Lunar Shadow]
                                                         ▲
                    [Sunlit Regolith] ──(Diffuse Bounce)─┘
```

1. **Earthshine**:
   The Earth has an albedo of $\sim 0.37$ (highly reflective oceans and bright cloud covers) and has $\approx 3.7$ times the angular diameter of the Moon in our sky. The light reflected by Earth onto the Moon (**Earthshine**) provides between $0.15$ and $0.35\text{ lux}$ of cool bluish fill light.
2. **Regolith Diffuse Backscatter & Opposition Surge**:
   Lunar regolith consists of glassy impact agglutinates that exhibit a strong retroreflective surge, scattering substantial indirect light into adjacent shadows.
3. **Optical Adaptation**:
   Human pupils dilate and camera iris exposures adjust dynamically, allowing details within shadow recesses to remain readable.

---

## 3. Three.js Implementation Architecture

In `src/world/LunarLighting.ts`, we implement this dual-source physical lighting model:

```typescript
// 1. Direct Sun (Key Light)
this.sunLight = new THREE.DirectionalLight(0xfff8ed, SETTINGS.lighting.sunIntensity);
this.sunLight.castShadow = true;

// 2. Earthshine & Regolith Bounce (Hemisphere Fill Light)
this.earthBounceLight = new THREE.HemisphereLight(
  0x1c2b48, // Cool Earthshine (sky color)
  0x101216, // Dark regolith bounce (ground color)
  SETTINGS.lighting.earthLightIntensity
);
```

### Sun Elevation & Apollo Landing Geometries
NASA intentionally scheduled Apollo lunar landings when the Sun was at low elevation angles between **$10^\circ$ and $25^\circ$ above the horizon**:
- Low sun angles cast long, prominent shadows that made craters and boulder obstacles clearly visible to the Commander peering through the LM window during descent.
- High noon on the Moon washes out surface contrast, making crater rims almost invisible (a dangerous optical condition called *washout*).

In MoonWalk VR, default solar elevation is set to **$19.5^\circ$**, replicating Apollo 15's landing geometry. Users can adjust the solar angle in real time using the HUD slider.

---

## 4. Shadow Map Engineering

A common failure mode in open-world Three.js scenes is using a loose shadow frustum that covers the entire $1400\text{m}$ world. This spreads the shadow map texture over a huge area, making shadows blurry and pixelated.

### Dynamic Shadow Caster Tracking
In `src/world/LunarLighting.ts`, we constrain the shadow camera to a tight, high-resolution orthographic box:
```typescript
const d = 160; // 160m half-extent
this.sunLight.shadow.camera.left = -d;
this.sunLight.shadow.camera.right = d;
this.sunLight.shadow.camera.top = d;
this.sunLight.shadow.camera.bottom = -d;
this.sunLight.shadow.mapSize.width = 2048;
this.sunLight.shadow.mapSize.height = 2048;
```

In `src/core/Experience.ts`, we keep this shadow frustum centered dynamically on the active entity (the walking astronaut or driving rover):
```typescript
this.lighting.updateShadowCenter(activePos);
```
This guarantees razor-sharp shadow contours around the player, rover wheels, and adjacent boulders while maintaining smooth 60+ FPS performance.
