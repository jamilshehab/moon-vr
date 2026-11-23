import * as THREE from 'three';
import { MOONWALK_CONFIG } from '../core/config';

/**
 * PlayerRig represents the user's physical frame of reference in the world.
 *
 * Why do we separate PlayerRig from Camera?
 * In WebXR, the browser overwrites `camera.position` and `camera.quaternion`
 * every frame with the VR headset's real-world tracking pose. If we tried to
 * move `camera.position` directly for walking, falling, or jumping, WebXR
 * would immediately overwrite our values!
 *
 * Instead, we make `camera` a child of `PlayerRig`:
 *   - `PlayerRig.group` handles world locomotion: space falling, walking, jumping, gravity,
 *     and VR comfort snap-turning.
 *   - `camera` handles head look: VR headset tracking OR desktop mouse yaw/pitch.
 */
export class PlayerRig {
  public readonly group: THREE.Group;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly velocity = new THREE.Vector3();
  public isGrounded = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.group = new THREE.Group();
    this.group.name = 'PlayerRig';
    this.camera = camera;
    this.camera.rotation.order = 'YXZ';
    this.group.add(this.camera);
  }

  /**
   * Adjusts camera local height when switching between desktop and WebXR.
   * In desktop mode, the camera sits at eyeHeightMeters (1.65 m) above the rig origin.
   * In WebXR 'local-floor' mode, the headset tracks height from the physical floor (0 m).
   */
  public setVrMode(inVr: boolean): void {
    if (inVr) {
      this.camera.position.set(0, 0, 0);
    } else {
      this.camera.position.set(0, MOONWALK_CONFIG.player.eyeHeightMeters, 0);
    }
  }

  /**
   * Triggers a lunar jump only when the player's feet are resting on the surface.
   */
  public jump(): boolean {
    if (!this.isGrounded) return false;
    this.velocity.y = MOONWALK_CONFIG.player.jumpVelocityMetersPerSec;
    this.isGrounded = false;
    return true;
  }

  public resetToSpaceOrigin(): void {
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.isGrounded = false;
  }
}
