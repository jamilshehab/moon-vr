import * as THREE from 'three';
import { SETTINGS } from '../config/settings';
import { LunarTerrain } from '../world/LunarTerrain';
import { CollisionSystem } from './CollisionSystem';

export class PlayerMovement {
  public position: THREE.Vector3 = new THREE.Vector3(0, 5, 5);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  public isGrounded: boolean = false;
  public isMoving: boolean = false;
  public isSprinting: boolean = false;
  public stepDistanceAccum: number = 0;

  // Key states
  public keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  };

  private terrain: LunarTerrain;
  private collision: CollisionSystem;
  private isPointerLocked: boolean = false;
  private onStepCallback?: () => void;

  // Reusable vectors for zero GC
  private static _moveDir = new THREE.Vector3();
  private static _forward = new THREE.Vector3();
  private static _right = new THREE.Vector3();

  constructor(
    terrain: LunarTerrain,
    collision: CollisionSystem,
    onStep?: () => void
  ) {
    this.terrain = terrain;
    this.collision = collision;
    this.onStepCallback = onStep;

    // Spawn astronaut near Lunar Module
    this.position.set(0, terrain.getElevationAt(0, 0) + SETTINGS.player.height, 0);

    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement !== null;
    });
  }

  public requestPointerLock(): void {
    if (!this.isPointerLocked) {
      document.body.requestPointerLock().catch(() => {});
    }
  }

  public exitPointerLock(): void {
    if (this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (['ArrowUp', 'KeyW'].includes(e.code)) this.keys.forward = true;
    if (['ArrowDown', 'KeyS'].includes(e.code)) this.keys.backward = true;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) this.keys.left = true;
    if (['ArrowRight', 'KeyD'].includes(e.code)) this.keys.right = true;
    if (e.code === 'Space') this.keys.jump = true;
    if (e.shiftKey) this.keys.sprint = true;
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (['ArrowUp', 'KeyW'].includes(e.code)) this.keys.forward = false;
    if (['ArrowDown', 'KeyS'].includes(e.code)) this.keys.backward = false;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) this.keys.left = false;
    if (['ArrowRight', 'KeyD'].includes(e.code)) this.keys.right = false;
    if (e.code === 'Space') this.keys.jump = false;
    if (!e.shiftKey) this.keys.sprint = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isPointerLocked) return;

    const sens = SETTINGS.player.mouseSensitivity;
    this.rotation.y -= e.movementX * sens;
    this.rotation.x -= e.movementY * sens;

    // Clamp vertical pitch (-85 to +85 degrees)
    const maxPitch = Math.PI * 0.47;
    this.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.rotation.x));
  }

  public update(delta: number): void {
    const pSettings = SETTINGS.player;
    const g = SETTINGS.physics.lunarGravity; // 1.622 m/s^2

    // 1. Calculate intent direction in local space
    PlayerMovement._moveDir.set(0, 0, 0);

    if (this.keys.forward) PlayerMovement._moveDir.z -= 1;
    if (this.keys.backward) PlayerMovement._moveDir.z += 1;
    if (this.keys.left) PlayerMovement._moveDir.x -= 1;
    if (this.keys.right) PlayerMovement._moveDir.x += 1;

    this.isMoving = PlayerMovement._moveDir.lengthSq() > 0;
    this.isSprinting = this.isMoving && this.keys.sprint;

    if (this.isMoving) {
      PlayerMovement._moveDir.normalize();

      // Transform direction into world space based on yaw
      const sinY = Math.sin(this.rotation.y);
      const cosY = Math.cos(this.rotation.y);

      const worldX = PlayerMovement._moveDir.x * cosY + PlayerMovement._moveDir.z * sinY;
      const worldZ = -PlayerMovement._moveDir.x * sinY + PlayerMovement._moveDir.z * cosY;

      const targetSpeed = this.isSprinting ? pSettings.sprintSpeed : pSettings.walkSpeed;

      // Smooth horizontal acceleration (spacesuit inertia)
      const accelRate = this.isGrounded ? 8.0 : 2.5; // Less control when floating in lunar air
      this.velocity.x += (worldX * targetSpeed - this.velocity.x) * accelRate * delta;
      this.velocity.z += (worldZ * targetSpeed - this.velocity.z) * accelRate * delta;
    } else {
      // Ground friction
      const friction = this.isGrounded ? 10.0 : 0.8;
      this.velocity.x += (0 - this.velocity.x) * friction * delta;
      this.velocity.z += (0 - this.velocity.z) * friction * delta;
    }

    // 2. Jump & Lunar Gravity
    if (this.isGrounded && this.keys.jump) {
      this.velocity.y = pSettings.jumpVelocity;
      this.isGrounded = false;
    } else if (!this.isGrounded) {
      this.velocity.y -= g * delta;
    }

    // 3. Integrate position
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.position.y += this.velocity.y * delta;

    // 4. Ground collision resolution
    const groundHeight = this.terrain.getElevationAt(this.position.x, this.position.z);
    const targetY = groundHeight + pSettings.height;

    if (this.position.y <= targetY) {
      // Just landed
      if (!this.isGrounded && this.velocity.y < -1.0 && this.onStepCallback) {
        this.onStepCallback();
      }
      this.position.y = targetY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // 5. Obstacle collision resolution (boulders, LM)
    this.collision.checkAndResolve(this.position, 0.45, this.velocity);

    // 6. Footstep rhythm tracking
    if (this.isGrounded && this.isMoving) {
      const horizontalDist = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z) * delta;
      this.stepDistanceAccum += horizontalDist;
      // Step cadence: ~1.4 meters per stride
      if (this.stepDistanceAccum >= 1.4) {
        this.stepDistanceAccum = 0;
        if (this.onStepCallback) {
          this.onStepCallback();
        }
      }
    }
  }
}
