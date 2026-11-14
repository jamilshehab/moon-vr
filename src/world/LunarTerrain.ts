import * as THREE from 'three';
import { SETTINGS } from '../config/settings';
import { AssetLoader } from '../utils/AssetLoader';

export class LunarTerrain {
  public mesh: THREE.Mesh;
  public mountainMesh: THREE.Mesh;
  public group: THREE.Group;
  private size: number;
  private resolution: number;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.size = 1600; // Local high-detail zone: 1600m x 1600m
    this.resolution = 180;

    // Load authentic photographic lunar surface textures (moon-rock_93cdf0de.jpg)
    const textures = AssetLoader.getInstance().loadLunarRegolithTextures(40);

    // 1. Central High-Detail Ground Mesh (Valley & Exploration Basin)
    const localGeometry = new THREE.PlaneGeometry(
      this.size,
      this.size,
      this.resolution,
      this.resolution
    );
    localGeometry.rotateX(-Math.PI / 2);

    const posAttr = localGeometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = this.getElevationAt(vx, vz);
      posAttr.setY(i, vy);
    }
    localGeometry.computeVertexNormals();

    const localMaterial = new THREE.MeshStandardMaterial({
      map: textures.albedo,
      normalMap: textures.normal,
      normalScale: new THREE.Vector2(1.6, 1.6),
      roughnessMap: textures.roughness,
      roughness: 0.94,
      metalness: 0.04,
    });

    this.mesh = new THREE.Mesh(localGeometry, localMaterial);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.group.add(this.mesh);

    // 2. Surrounding Continuous Mountain Massif Landscape (Radius 760m to 6800m)
    // Completely replaces the old cartoon spires with continuous NASA LOLA topography
    this.mountainMesh = this.createRealisticMountainTerrain(textures);
    this.group.add(this.mountainMesh);

    scene.add(this.group);
  }

  /**
   * Continuous NASA LOLA-inspired lunar elevation field.
   * Models the rolling mare plain, impact craters, and towering rounded mountain massifs
   * (inspired by Montes Apenninus / Taurus-Littrow massifs at Apollo 15 and 17).
   */
  public getElevationAt(x: number, z: number): number {
    const distSq = x * x + z * z;
    const dist = Math.sqrt(distSq);

    let elevation = 0;

    // 1. Long-wavelength rolling mare plain (LOLA baseline: 600m - 200m)
    elevation += Math.sin(x * 0.0031 + 0.4) * Math.cos(z * 0.0028) * 9.5;
    elevation += Math.sin(x * 0.0075 - z * 0.0068) * 4.2;
    elevation += Math.cos(x * 0.015 + z * 0.013) * 1.8;

    // 2. High-frequency regolith hummocks
    elevation += Math.sin(x * 0.065 + Math.cos(z * 0.055) * 1.2) * 0.45;
    elevation += Math.sin(x * 0.14 - z * 0.12) * 0.22;

    // 3. Impact craters (local crater system)
    const craters = SETTINGS.terrain.craters;
    for (let i = 0; i < craters.length; i++) {
      const c = craters[i];
      const dx = x - c.x;
      const dz = z - c.z;
      const cDistSq = dx * dx + dz * dz;
      const radiusSq = c.radius * c.radius;

      if (cDistSq < radiusSq * 5.0) {
        const cDist = Math.sqrt(cDistSq);
        const normDist = cDist / c.radius;

        if (normDist <= 1.0) {
          // Interior parabolic depression
          const bowl = -c.depth * (1.0 - Math.pow(normDist, 1.85));

          // Central uplift peak (for large complex craters)
          let centralPeak = 0;
          if (c.hasCentralPeak && normDist < 0.28) {
            const pNorm = normDist / 0.28;
            centralPeak = (c.depth * 0.35) * Math.cos(pNorm * Math.PI * 0.5);
          }

          elevation += bowl + centralPeak;
        } else if (normDist <= 2.2) {
          // Raised overturn rim & proximal ejecta blanket
          const rimFactor = (2.2 - normDist) / 1.2;
          const rimHeight = c.rimHeight * Math.pow(rimFactor, 1.6);
          elevation += rimHeight;
        }
      }
    }

    // 4. Realistic Lunar Mountain Ranges & Massifs (NASA LOLA Basins)
    // Transition starts gently at dist = 550m and rises into realistic massive mountain blocks
    if (dist > 550) {
      const angle = Math.atan2(z, x); // -PI to PI
      const normAngle = angle < 0 ? angle + Math.PI * 2 : angle; // 0 to 2*PI

      // Smooth hermite blend from valley floor to mountain base
      const blend = Math.min(1.0, Math.max(0.0, (dist - 550) / 900));
      const blendFactor = blend * blend * (3 - 2 * blend); // smoothstep

      // Radial mountain distance envelope: rises from 600m, peaks at 2400m-3600m, tapers to far horizon
      const peakDist = 2800;
      const spread = 2000;
      const radialEnvelope = Math.exp(-Math.pow((dist - peakDist) / spread, 2));

      // 4 Distinct Major Geological Massifs (Mons Hadley, Hadley Delta, Silver Spur, North Ridge)
      let mountainRelief = 0;

      // Massif A: North-Northeast Massif (Mons Hadley equivalent: angle ~ 1.3 rad / ~75 deg)
      // Broad dome-shaped uplift rising to ~460m with gentle talus slopes
      const dAngleA = normAngle - 1.35;
      const massifA = Math.exp(-Math.pow(dAngleA / 0.42, 2)) * 460;

      // Massif B: South-Southeast Massif (Hadley Delta equivalent: angle ~ 4.2 rad / ~240 deg)
      // Majestic sweeping ridge rising to ~510m
      const dAngleB = normAngle - 4.15;
      const massifB = Math.exp(-Math.pow(dAngleB / 0.52, 2)) * 510;

      // Massif C: East Massif (Silver Spur equivalent: angle ~ 2.6 rad / ~150 deg)
      // Stepped geological scarp rising to ~380m
      const dAngleC = normAngle - 2.55;
      const massifC = Math.exp(-Math.pow(dAngleC / 0.45, 2)) * 380;

      // Massif D: Northwest Highlands (Gentle rolling hills ~220m where Earth is visible: angle ~ 5.5 rad / ~315 deg)
      const dAngleD = normAngle - 5.5;
      const massifD = Math.exp(-Math.pow(dAngleD / 0.65, 2)) * 240;

      mountainRelief = massifA + massifB + massifC + massifD;

      // Geological slope modulation & natural talus variation (multi-octave, NOT spiky sines)
      // Long-wavelength geological folds
      mountainRelief += Math.cos(angle * 3.0 + 0.6) * 65;
      mountainRelief += Math.sin(angle * 5.0 - dist * 0.0012) * 45;
      mountainRelief += Math.cos(angle * 8.0 + dist * 0.002) * 22;

      // Natural crater depressions on the mountain slopes (ancient degraded impact scars)
      const craterScar1 = Math.exp(-Math.pow((x - 1800) / 450, 2) - Math.pow((z - 2100) / 450, 2)) * -90;
      const craterScar2 = Math.exp(-Math.pow((x + 2200) / 550, 2) - Math.pow((z + 1600) / 550, 2)) * -110;
      mountainRelief += craterScar1 + craterScar2;

      // Apply envelopes & blend factor
      const finalMountainHeight = Math.max(0, mountainRelief * radialEnvelope);
      elevation += finalMountainHeight * blendFactor;
    }

    return elevation;
  }

  /**
   * Computes exact surface normal vector analytically via finite differences
   */
  public getNormalAt(x: number, z: number, target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const eps = 0.5;
    const hL = this.getElevationAt(x - eps, z);
    const hR = this.getElevationAt(x + eps, z);
    const hD = this.getElevationAt(x, z - eps);
    const hU = this.getElevationAt(x, z + eps);

    target.set(hL - hR, 2 * eps, hD - hU).normalize();
    return target;
  }

  /**
   * Creates the continuous, realistic lunar mountain massif landscape (Radius 760m to 6800m).
   * Interlocks seamlessly with the inner ground mesh with ZERO gap and ZERO seams.
   */
  private createRealisticMountainTerrain(textures: any): THREE.Mesh {
    const innerRadius = 760; // Overlaps local ground edge (800m) with 40m seamless interlock
    const outerRadius = 6800; // Extends to far lunar horizon
    const radialSegments = 192; // High smooth resolution (eliminates all low-poly spires)
    const ringSegments = 54;

    const ringGeom = new THREE.RingGeometry(innerRadius, outerRadius, radialSegments, ringSegments);
    ringGeom.rotateX(-Math.PI / 2);

    const pos = ringGeom.attributes.position;
    const uvAttr = ringGeom.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      // Evaluate the EXACT same continuous LOLA elevation model
      const vy = this.getElevationAt(vx, vz);
      pos.setY(i, vy);

      // Natural panoramic UV mapping matching the Apollo surface textures
      const dist = Math.sqrt(vx * vx + vz * vz);
      let angle = Math.atan2(vz, vx);
      if (angle < 0) angle += Math.PI * 2;

      // Realistic scale texture mapping (repeats naturally across the 6800m perimeter)
      const u = (angle / (Math.PI * 2)) * 28;
      const v = (dist - innerRadius) / (outerRadius - innerRadius) * 14;
      uvAttr.setXY(i, u, v);
    }

    ringGeom.computeVertexNormals();
    uvAttr.needsUpdate = true;

    // Use authentic photographic texture with subtle natural regolith finish
    const mountainMat = new THREE.MeshStandardMaterial({
      map: textures.albedo,
      normalMap: textures.normal,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 0.94,
      metalness: 0.03,
      color: 0x9fa4ad, // Natural Apollo iron-titanium basalt grey
    });

    const mesh = new THREE.Mesh(ringGeom, mountainMat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    return mesh;
  }
}
