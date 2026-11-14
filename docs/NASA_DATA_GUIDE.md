# NASA Planetary Data Guide & Lunar Science Reference

This document provides authentic citations, dataset origins, and replacement instructions for developers wishing to ingest raw NASA planetary data products into **MoonWalk VR**.

---

## 1. Primary NASA Datasets & Instrument Provenance

Never invent NASA datasets. The lunar simulation in MoonWalk VR is inspired by real public data products from the following active and historical NASA missions:

### 1. Lunar Reconnaissance Orbiter (LRO)
Launched in June 2009, LRO remains in active polar lunar orbit:
- **LOLA (Lunar Orbiter Laser Altimeter)**:
  - *Data Product*: **SLDEM2015** (Shape and Lunar Elevation Model combining LOLA laser profiles and Kaguya terrain camera stereo).
  - *Resolution*: Up to $512\text{ pixels/degree}$ ($\sim 59\text{ meters/pixel}$ at the equator).
  - *Data Access*: NASA Planetary Data System (PDS) Geosciences Node: `https://pds-geosciences.wustl.edu/missions/lro/lola.htm`
- **LROC (Lunar Reconnaissance Orbiter Camera)**:
  - *Instrument*: Dual Narrow Angle Cameras (NAC) and one Wide Angle Camera (WAC).
  - *Resolution*: High-resolution NAC imagery up to **$0.5\text{ meters/pixel}$**, capable of resolving Apollo descent stages, rover tire tracks, and astronaut footpaths.
  - *Interactive Explorer*: Arizona State University LROC QuickMap: `https://quickmap.lroc.asu.edu/`

### 2. Apollo Lunar Surface Journals (ALSJ)
Maintained by NASA history offices:
- *Landing Site Coordinates*:
  - **Apollo 11 (Mare Tranquillitatis)**: $0.6741^\circ\text{N}, 23.4730^\circ\text{E}$
  - **Apollo 15 (Hadley-Apennine)**: $26.1322^\circ\text{N}, 3.6339^\circ\text{E}$
  - **Apollo 17 (Taurus-Littrow)**: $20.1908^\circ\text{N}, 30.7717^\circ\text{E}$
- *Documentation*: Complete audio recordings, telemetry logs, photographic archives, and LRV technical operational handbooks: `https://www.hq.nasa.gov/alsj/`

---

## 2. Lunar Regolith Spectral Reflectance & Albedo

A frequent mistake in lunar games is making the Moon bright white or light grey. In reality, the Moon is one of the darkest celestial bodies in the solar system:

| Planetary Surface | Geometric Albedo | Comparison Material |
| :--- | :--- | :--- |
| **Lunar Maria (Basalt)** | **$0.07 \dots 0.10$** | Worn asphalt, charcoal |
| **Lunar Highlands (Anorthosite)** | **$0.18 \dots 0.24$** | Weathered concrete |
| **Earth Average** | $0.37$ | Blue oceans + bright cloud deck |
| **Fresh Terrestrial Snow** | $0.85 \dots 0.90$ | White magnesium oxide |

### Mineral Composition
- **Mare Basalts**: Rich in ilmenite ($FeTiO_3$), pyroxene, and olivine. High titanium content gives mare surfaces a distinct dark brownish-charcoal appearance.
- **Glassy Agglutinates**: Micro-meteorite bombardment melts microscopic beads of impact glass into the regolith, producing strong **retroreflective backscattering** (the *Opposition Surge*, where surfaces directly opposite the Sun appear dramatically brighter than sideways glances).

In `src/utils/AssetLoader.ts`, our procedural albedo generator explicitly sets base grey values between $105$ and $150$ (out of $255$) with titanium tint shifts, matching laboratory spectra of Apollo returned samples.

---

## 3. How to Replace Procedural Data with Raw NASA GeoTIFF DEMs

MoonWalk VR intentionally generates its elevation fields analytically to maintain zero 404 dependencies and sub-millisecond execution. If you wish to import a raw NASA digital elevation model:

1. **Download the DEM**:
   Visit [LROC QuickMap](https://quickmap.lroc.asu.edu/), navigate to the Apollo 15 landing site ($26.13^\circ\text{N}, 3.63^\circ\text{E}$), select the *Tools > Export > Elevation (DEM)* tool, and download a $2048 \times 2048$ 16-bit GeoTIFF.
2. **Convert GeoTIFF to 16-bit PNG or Raw Buffer**:
   Use `GDAL` or `ImageMagick`:
   ```bash
   gdal_translate -of PNG -ot UInt16 hadley_dem.tif hadley_elevation.png
   ```
3. **Parse in Three.js**:
   Load the PNG via an `HTMLCanvasElement` using 16-bit channel decoding, normalize heights by the NASA elevation scale (typically $0.5\text{m}$ per count), and sample the pixel array in `getElevationAt(x, z)`:
   ```typescript
   const pixelX = Math.floor(((x + worldSize / 2) / worldSize) * demWidth);
   const pixelZ = Math.floor(((z + worldSize / 2) / worldSize) * demHeight);
   const height = (demPixels[pixelZ * demWidth + pixelX] - datumOffset) * scale;
   ```
This provides an immediate drop-in path for laboratory-grade mission replays.

---

## 4. Authentic Photographic Assets Implemented in MoonWalk VR

The simulation actively maps four authentic photographic assets located in `/public/assets/aistudio/`:

| Asset File | Photographic Origin | Three.js Implementation & Mapping |
| :--- | :--- | :--- |
| **`stars_8820611a.jpg`** | Real astronomical deep-space starfield photograph | Inverted celestial sky sphere (`SphereGeometry(9500)`, `THREE.BackSide`) in `LunarEnvironment.ts`. Replaces artificial point particles with genuine stellar magnitude distributions and pure black vacuum. |
| **`moon-rock_93cdf0de.jpg`** | NASA / LROC high-resolution overhead impact crater photograph | Applied to `LunarTerrain.ts` exploration ground mesh (`albedo`) with repeat calibration. In `AssetLoader.ts`, pixel luminance is processed via Sobel filter to generate dynamic high-precision normal and roughness maps. |
| **`moon-landscape_f32ba1e9.jpg`** | Apollo surface Hasselblad surface photograph (Apollo 16/17) | 1. **Horizon Mountains**: Cylindrical panoramic UV mapping on `mountainRingMesh` in `LunarTerrain.ts`.<br>2. **Surface Rocks**: Mapped onto `largeBouldersMesh` and `smallRocksMesh` in `LunarRocks.ts`. |
| **`earth_from_the_moon_3c60ec1b.jpg`** | NASA Apollo "Earthrise" authentic color photograph | In `Earth.ts`, high-resolution Earth disc extracted with authentic oceanic colors, cyclone clouds, and natural atmospheric limb, rendered as a realistic astronomical object oriented toward the landing site. |

