import * as THREE from 'three';
import { AssetLoader } from '../utils/AssetLoader';
import { LunarTerrain } from './LunarTerrain';

export interface RockObstacle {
  x: number;
  z: number;
  radius: number;
}

export class LunarRocks {
  public largeBouldersMesh: THREE.InstancedMesh;
  public smallRocksMesh: THREE.InstancedMesh;
  public obstacles: RockObstacle[] = [];

  constructor(scene: THREE.Scene, terrain: LunarTerrain) {
    // 1. Natural Organic Lunar Boulder Geometry (Subdivided smooth mesh, not low-poly flat-shaded)
    const baseGeom = new THREE.IcosahedronGeometry(1.0, 3);
    const pos = baseGeom.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);

      // Multi-scale organic displacement mimicking impact abrasion and vesicular basalt porosity
      let noise = 1.0;
      // Macro asymmetry (elongated, naturally weathered boulder block)
      noise += Math.sin(vx * 1.8 + vz * 1.2) * 0.18;
      noise += Math.cos(vy * 2.2 - vx * 1.5) * 0.12;
      // Secondary micro-pits and impact fractures
      noise += Math.sin(vx * 4.5 + vy * 4.0 + vz * 3.8) * 0.06;

      // Natural rounded boulder shape (slightly flattened bottom and rounded crown)
      const roundedY = vy > 0 ? vy * (0.85 + Math.sin(vx * 2.0) * 0.08) : vy * 0.7;

      pos.setXYZ(i, vx * noise, roundedY * noise, vz * noise);
    }
    baseGeom.computeVertexNormals();

    const rockTex = AssetLoader.getInstance().loadRockTexture();
    const rockMaterial = new THREE.MeshStandardMaterial({
      map: rockTex,
      roughness: 0.94,
      metalness: 0.04,
      flatShading: false, // Smoothly interpolated normals - NO low-poly cartoon facets
    });

    // 2. Large & Medium Boulders (45 instances)
    const largeCount = 45;
    this.largeBouldersMesh = new THREE.InstancedMesh(baseGeom, rockMaterial, largeCount);
    this.largeBouldersMesh.castShadow = true;
    this.largeBouldersMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const spawnRange = 400;

    for (let i = 0; i < largeCount; i++) {
      // Natural clustering near crater rims and ejecta lobes
      const angle = Math.random() * Math.PI * 2;
      const dist = 35 + Math.pow(Math.random(), 1.4) * spawnRange;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const y = terrain.getElevationAt(x, z);

      const scale = 1.1 + Math.random() * 2.2;
      const scaleX = scale * (0.85 + Math.random() * 0.3);
      const scaleY = scale * (0.65 + Math.random() * 0.25);
      const scaleZ = scale * (0.85 + Math.random() * 0.3);

      // Embed the lower 30% of the boulder into the regolith dust naturally (no floating or perching)
      dummy.position.set(x, y + scaleY * 0.25, z);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.5
      );
      dummy.scale.set(scaleX, scaleY, scaleZ);
      dummy.updateMatrix();

      this.largeBouldersMesh.setMatrixAt(i, dummy.matrix);

      // Register collision obstacle for player & rover
      this.obstacles.push({
        x,
        z,
        radius: Math.max(scaleX, scaleZ) * 0.85,
      });
    }

    this.largeBouldersMesh.instanceMatrix.needsUpdate = true;
    this.largeBouldersMesh.computeBoundingSphere();
    scene.add(this.largeBouldersMesh);

    // 3. Small Surface Rocks & Gravel (280 instances)
    const smallCount = 280;
    this.smallRocksMesh = new THREE.InstancedMesh(baseGeom, rockMaterial, smallCount);
    this.smallRocksMesh.castShadow = false;
    this.smallRocksMesh.receiveShadow = true;

    for (let i = 0; i < smallCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 480;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = terrain.getElevationAt(x, z);

      const scale = 0.2 + Math.random() * 0.55;
      const scaleY = scale * (0.6 + Math.random() * 0.3);

      // Partially embedded in soil
      dummy.position.set(x, y + scaleY * 0.2, z);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.4,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.4
      );
      dummy.scale.set(scale, scaleY, scale);
      dummy.updateMatrix();

      this.smallRocksMesh.setMatrixAt(i, dummy.matrix);
    }

    this.smallRocksMesh.instanceMatrix.needsUpdate = true;
    this.smallRocksMesh.computeBoundingSphere();
    scene.add(this.smallRocksMesh);
  }
}
