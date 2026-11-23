import * as THREE from 'three';
import { MOONWALK_CONFIG } from '../core/config';

/**
 * Creates the primary first-person PerspectiveCamera.
 *
 * Notice that the camera's local position starts at (0, eyeHeightMeters, 0) for
 * desktop mode, while in WebXR mode the headset supplies the eye height relative
 * to the 'local-floor' reference space inside the PlayerRig.
 */
export function createCamera(aspect: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    MOONWALK_CONFIG.camera.fov,
    aspect,
    MOONWALK_CONFIG.camera.near,
    MOONWALK_CONFIG.camera.far,
  );

  camera.position.set(0, MOONWALK_CONFIG.player.eyeHeightMeters, 0);
  return camera;
}
