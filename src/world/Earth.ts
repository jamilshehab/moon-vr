import * as THREE from 'three';
import { AssetLoader } from '../utils/AssetLoader';

export class Earth {
  public group: THREE.Group;
  public earthMesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();

    // 1. Load authentic NASA Apollo Earth photograph texture
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      '/assets/aistudio/earth_photo_transparent.png',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
      },
      undefined,
      () => {
        // Fallback to non-transparent version if needed
        textureLoader.load('/assets/aistudio/earth_photo_disc.png', (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          if (this.earthMesh && this.earthMesh.material) {
            (this.earthMesh.material as THREE.MeshBasicMaterial).map = tex;
            (this.earthMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
          }
        });
      }
    );
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    // 2. Realistic Astronomical Geometry & Scale
    // Earth apparent angular diameter from lunar surface is ~1.9 to 2.2 degrees
    // At distance 1800m, diameter ~ 70m (radius = 35m)
    const earthSize = 72;
    const earthGeom = new THREE.PlaneGeometry(earthSize, earthSize);

    const earthMat = new THREE.MeshBasicMaterial({
      map: earthTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.earthMesh = new THREE.Mesh(earthGeom, earthMat);
    this.group.add(this.earthMesh);

    // 3. Position Earth in lunar sky (Authentic Apollo Earthrise coordinates)
    // Elevation ~32 degrees, East-South-East (azimuth ~ -65 deg), distance 1800m
    const distance = 1800;
    const elev = THREE.MathUtils.degToRad(32);
    const azim = THREE.MathUtils.degToRad(-65);

    const posX = distance * Math.cos(elev) * Math.sin(azim);
    const posY = distance * Math.sin(elev);
    const posZ = distance * Math.cos(elev) * Math.cos(azim);

    this.group.position.set(posX, posY, posZ);

    // Orient the Earth photograph to face the central lunar landing area
    this.group.lookAt(0, 0, 0);

    scene.add(this.group);
  }

  public update(_delta: number): void {
    // Keep Earth oriented toward viewer without artificial wobble
    // Earth stays stationary relative to the lunar horizon due to tidal locking!
  }
}
