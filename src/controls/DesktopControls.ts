import * as THREE from 'three';
import { MOONWALK_CONFIG } from '../core/config';
import type { PlayerRig } from '../player/PlayerRig';

/** Pre-allocated math helpers outside the render loop to eliminate GC pauses. */
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _wishDir = new THREE.Vector3();

const MIN_PITCH = -Math.PI / 2 + 0.05;
const MAX_PITCH = Math.PI / 2 - 0.05;
const MOUSE_SENSITIVITY = 0.0021;

export interface DesktopControlsOptions {
  playerRig: PlayerRig;
  domElement: HTMLElement;
  onPointerLockChange?: (locked: boolean) => void;
}

/**
 * DesktopControls handles first-person mouse look (Pointer Lock + drag fallback)
 * and WASD / Spacebar movement projected relative to the camera's look direction.
 */
export class DesktopControls {
  private readonly playerRig: PlayerRig;
  private readonly domElement: HTMLElement;
  private readonly onPointerLockChange?: (locked: boolean) => void;

  private readonly keysPressed = new Set<string>();
  private isPointerLocked = false;
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private targetYaw = 0;
  private targetPitch = 0;

  constructor({ playerRig, domElement, onPointerLockChange }: DesktopControlsOptions) {
    this.playerRig = playerRig;
    this.domElement = domElement;
    this.onPointerLockChange = onPointerLockChange;
  }

  public init(): void {
    this.targetYaw = this.playerRig.camera.rotation.y;
    this.targetPitch = this.playerRig.camera.rotation.x;

    this.domElement.addEventListener('click', this.handleCanvasClick);
    this.domElement.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
  }

  public resetOrientation(): void {
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.playerRig.camera.rotation.set(0, 0, 0, 'YXZ');
  }

  private handleCanvasClick = (): void => {
    if (document.pointerLockElement !== this.domElement) {
      try {
        const result = this.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
        if (result && typeof result.catch === 'function') {
          result.catch(() => {
            // Pointer lock may be blocked in embedded previews; drag-to-look remains active.
          });
        }
      } catch {
        // Fallback drag-to-look handles environments without Pointer Lock.
      }
    }
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.isDragging = true;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
  };

  private handlePointerUp = (): void => {
    this.isDragging = false;
  };

  private handlePointerMove = (event: PointerEvent): void => {
    let dx = 0;
    let dy = 0;

    if (this.isPointerLocked) {
      dx = event.movementX;
      dy = event.movementY;
    } else if (this.isDragging) {
      dx = event.clientX - this.lastPointerX;
      dy = event.clientY - this.lastPointerY;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
    } else {
      return;
    }

    this.targetYaw -= dx * MOUSE_SENSITIVITY;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch - dy * MOUSE_SENSITIVITY,
      MIN_PITCH,
      MAX_PITCH,
    );
  };

  private handlePointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
    this.onPointerLockChange?.(this.isPointerLocked);
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    this.keysPressed.add(event.code);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keysPressed.delete(event.code);
  };

  private handleWindowBlur = (): void => {
    this.keysPressed.clear();
    this.isDragging = false;
  };

  /**
   * Updates smooth desktop camera look in all non-VR phases, and processes
   * WASD locomotion + Spacebar jumping once on the lunar surface.
   */
  public update(deltaSeconds: number, allowLocomotion: boolean): void {
    // Smoothly interpolate camera rotation for fluid, motion-sickness-free mouse look
    const cam = this.playerRig.camera;
    const lookAlpha = 1 - Math.exp(-26 * deltaSeconds);
    cam.rotation.y = THREE.MathUtils.lerp(cam.rotation.y, this.targetYaw, lookAlpha);
    cam.rotation.x = THREE.MathUtils.lerp(cam.rotation.x, this.targetPitch, lookAlpha);

    if (!allowLocomotion) {
      this.playerRig.velocity.x = 0;
      this.playerRig.velocity.z = 0;
      return;
    }

    // Read WASD / Arrow directional intent
    const forwardInput =
      (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp') ? 1 : 0) -
      (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown') ? 1 : 0);
    const strafeInput =
      (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight') ? 1 : 0) -
      (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft') ? 1 : 0);

    // Derive horizontal movement basis from the camera's world look direction
    cam.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() > 1e-6) {
      _forward.normalize();
    } else {
      _forward.set(0, 0, -1);
    }
    _right.crossVectors(_forward, _up).normalize();

    _wishDir.set(0, 0, 0);
    _wishDir.addScaledVector(_forward, forwardInput);
    _wishDir.addScaledVector(_right, strafeInput);
    if (_wishDir.lengthSq() > 1) {
      _wishDir.normalize();
    }

    const speed = MOONWALK_CONFIG.player.walkSpeedMetersPerSec;
    const targetVx = _wishDir.x * speed;
    const targetVz = _wishDir.z * speed;

    this.playerRig.velocity.x = THREE.MathUtils.damp(
      this.playerRig.velocity.x,
      targetVx,
      MOONWALK_CONFIG.player.moveDamping,
      deltaSeconds,
    );
    this.playerRig.velocity.z = THREE.MathUtils.damp(
      this.playerRig.velocity.z,
      targetVz,
      MOONWALK_CONFIG.player.moveDamping,
      deltaSeconds,
    );

    if (this.keysPressed.has('Space')) {
      this.playerRig.jump();
    }
  }

  public dispose(): void {
    this.domElement.removeEventListener('click', this.handleCanvasClick);
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);

    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock?.();
    }
  }
}
