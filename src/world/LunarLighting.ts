import * as THREE from 'three';
import { SETTINGS } from '../config/settings';

export class LunarLighting {
  public sunLight: THREE.DirectionalLight;
  public earthBounceLight: THREE.HemisphereLight;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Direct Sun Light: Unfiltered intense directional light in vacuum
    this.sunLight = new THREE.DirectionalLight(0xfff8ed, SETTINGS.lighting.sunIntensity);
    this.sunLight.castShadow = true;

    // High precision shadow configuration for sharp lunar shadows
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 1200;

    // Orthographic shadow frustum covering local play area
    const d = 160;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.025;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 2. Secondary Earthshine / Regolith diffuse bounce
    // Sky color = cold blue Earthshine (reflected sunlight off Earth's oceans/clouds)
    // Ground color = dark charcoal regolith bounce
    this.earthBounceLight = new THREE.HemisphereLight(
      0x1c2b48, // Earthshine
      0x101216, // Regolith bounce
      SETTINGS.lighting.earthLightIntensity
    );
    this.scene.add(this.earthBounceLight);

    this.updateSunPosition(SETTINGS.lighting.sunElevation, SETTINGS.lighting.sunAzimuth);
  }

  /**
   * Sets sun coordinates based on elevation and azimuth angles in degrees
   */
  public updateSunPosition(elevationDeg: number, azimuthDeg: number): void {
    const radElev = THREE.MathUtils.degToRad(elevationDeg);
    const radAzim = THREE.MathUtils.degToRad(azimuthDeg);

    const distance = 800;
    const x = distance * Math.cos(radElev) * Math.sin(radAzim);
    const y = distance * Math.sin(radElev);
    const z = distance * Math.cos(radElev) * Math.cos(radAzim);

    this.sunLight.position.set(x, y, z);

    // Adjust light intensity based on elevation (dawn vs high noon)
    if (elevationDeg <= 0) {
      this.sunLight.intensity = 0;
    } else {
      const factor = Math.min(1.0, elevationDeg / 25.0);
      this.sunLight.intensity = SETTINGS.lighting.sunIntensity * (0.4 + 0.6 * factor);
    }
  }

  /**
   * Updates sun shadow frustum center to follow player or rover
   */
  public updateShadowCenter(targetPos: THREE.Vector3): void {
    this.sunLight.target.position.copy(targetPos);
  }
}
