import * as THREE from 'three';

export type CameraMode = 'first-person' | 'rover-cockpit' | 'third-person' | 'cinematic';

export class Camera {
  public instance: THREE.PerspectiveCamera;
  public mode: CameraMode = 'first-person';
  public target: THREE.Vector3 = new THREE.Vector3();

  // Temporary math helpers to eliminate GC
  private static _camOffset = new THREE.Vector3();
  private static _lookTarget = new THREE.Vector3();

  constructor() {
    this.instance = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      14000
    );
    this.instance.position.set(0, 1.82, 0);
  }

  public setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  public toggleMode(isDriving: boolean): CameraMode {
    if (isDriving) {
      this.mode = this.mode === 'rover-cockpit' ? 'third-person' : 'rover-cockpit';
    } else {
      this.mode = this.mode === 'first-person' ? 'third-person' : 'first-person';
    }
    return this.mode;
  }
}
