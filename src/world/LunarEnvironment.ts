import * as THREE from 'three';
import { AssetLoader } from '../utils/AssetLoader';
import { LunarTerrain } from './LunarTerrain';

export class LunarEnvironment {
  public group: THREE.Group;
  public skyDome: THREE.Mesh;

  constructor(scene: THREE.Scene, _terrain: LunarTerrain) {
    this.group = new THREE.Group();

    // 1. Astronomical Deep Space Starfield (Using authentic stars_8820611a.jpg photograph)
    this.skyDome = this.createAstronomicalSkyDome();
    this.group.add(this.skyDome);

    scene.add(this.group);
  }

  /**
   * Astronomical celestial sky dome textured with authentic stars_8820611a.jpg photograph.
   * Keeps the sky pure pitch-black with real astronomical stellar brightness distributions.
   */
  private createAstronomicalSkyDome(): THREE.Mesh {
    const starTexture = AssetLoader.getInstance().loadStarfieldTexture();
    const skyGeom = new THREE.SphereGeometry(9500, 60, 40);
    const skyMat = new THREE.MeshBasicMaterial({
      map: starTexture,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });

    const skyMesh = new THREE.Mesh(skyGeom, skyMat);
    // Orient starfield celestial equator
    skyMesh.rotation.y = THREE.MathUtils.degToRad(40);
    return skyMesh;
  }
}
