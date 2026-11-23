import * as THREE from 'three';
import { MOONWALK_CONFIG } from '../core/config';
import type { PlayerRig } from '../player/PlayerRig';

const _vrForward = new THREE.Vector3();
const _vrRight = new THREE.Vector3();
const _vrUp = new THREE.Vector3(0, 1, 0);
const _vrWishDir = new THREE.Vector3();

const THUMBSTICK_DEADZONE = 0.16;
const SNAP_TURN_ANGLE = Math.PI / 6; // 30 degrees per discrete snap turn
const SNAP_TURN_COOLDOWN = 0.28;

/**
 * VrControls handles WebXR controller locomotion without ever fighting
 * the headset's real-time head tracking:
 * - Left thumbstick (or single active controller): smooth horizontal movement
 *   aligned with where your VR headset is currently looking.
 * - Right thumbstick X: comfortable 30-degree discrete snap turning on PlayerRig.
 * - Primary button (A / X / Trigger): triggers lunar 1/6g jump.
 */
export class VrControls {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly playerRig: PlayerRig;
  private snapCooldownTimer = 0;

  constructor(renderer: THREE.WebGLRenderer, playerRig: PlayerRig) {
    this.renderer = renderer;
    this.playerRig = playerRig;
  }

  public init(): void {
    // WebXR inputSources are dynamically discovered from renderer.xr.getSession()
  }

  public update(deltaSeconds: number, allowLocomotion: boolean): void {
    if (!allowLocomotion) {
      this.playerRig.velocity.x = 0;
      this.playerRig.velocity.z = 0;
      return;
    }

    const session = this.renderer.xr.getSession();
    if (!session) return;

    if (this.snapCooldownTimer > 0) {
      this.snapCooldownTimer = Math.max(0, this.snapCooldownTimer - deltaSeconds);
    }

    let moveX = 0;
    let moveZ = 0;
    let turnX = 0;
    let jumpPressed = false;

    for (const source of session.inputSources) {
      const gp = source.gamepad;
      if (!gp) continue;

      // Standard WebXR Gamepad mapping: axes[2] = thumbstick X, axes[3] = thumbstick Y
      const stickX = gp.axes.length >= 4 ? gp.axes[2] : (gp.axes[0] ?? 0);
      const stickY = gp.axes.length >= 4 ? gp.axes[3] : (gp.axes[1] ?? 0);

      if (source.handedness === 'left' || source.handedness === 'none') {
        if (Math.abs(stickX) > THUMBSTICK_DEADZONE) moveX = stickX;
        if (Math.abs(stickY) > THUMBSTICK_DEADZONE) moveZ = -stickY;
      } else if (source.handedness === 'right') {
        if (Math.abs(stickX) > 0.55) {
          turnX = stickX;
        }
        // Also allow right-stick Y forward/back if user prefers single-hand locomotion
        if (moveZ === 0 && Math.abs(stickY) > THUMBSTICK_DEADZONE) {
          moveZ = -stickY;
        }
      }

      // Trigger (buttons[0]) or A/X face button (buttons[4]) triggers lunar jump
      const triggerPressed = gp.buttons[0]?.pressed ?? false;
      const primaryFacePressed = gp.buttons[4]?.pressed ?? false;
      if (triggerPressed || primaryFacePressed) {
        jumpPressed = true;
      }
    }

    // Comfort snap-turn rotates PlayerRig around Y without touching headset camera
    if (Math.abs(turnX) > 0.55 && this.snapCooldownTimer === 0) {
      this.playerRig.group.rotation.y -= Math.sign(turnX) * SNAP_TURN_ANGLE;
      this.snapCooldownTimer = SNAP_TURN_COOLDOWN;
    }

    // Align movement with headset's current horizontal look direction
    const xrCamera = this.renderer.xr.getCamera();
    xrCamera.getWorldDirection(_vrForward);
    _vrForward.y = 0;
    if (_vrForward.lengthSq() > 1e-6) {
      _vrForward.normalize();
    } else {
      _vrForward.set(0, 0, -1);
    }
    _vrRight.crossVectors(_vrForward, _vrUp).normalize();

    _vrWishDir.set(0, 0, 0);
    _vrWishDir.addScaledVector(_vrForward, moveZ);
    _vrWishDir.addScaledVector(_vrRight, moveX);
    if (_vrWishDir.lengthSq() > 1) {
      _vrWishDir.normalize();
    }

    const speed = MOONWALK_CONFIG.player.walkSpeedMetersPerSec;
    this.playerRig.velocity.x = THREE.MathUtils.damp(
      this.playerRig.velocity.x,
      _vrWishDir.x * speed,
      MOONWALK_CONFIG.player.moveDamping,
      deltaSeconds,
    );
    this.playerRig.velocity.z = THREE.MathUtils.damp(
      this.playerRig.velocity.z,
      _vrWishDir.z * speed,
      MOONWALK_CONFIG.player.moveDamping,
      deltaSeconds,
    );

    if (jumpPressed) {
      this.playerRig.jump();
    }
  }

  public dispose(): void {
    // No persistent listeners attached.
  }
}
