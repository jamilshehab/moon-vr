import { MOONWALK_CONFIG } from '../core/config';
import type { PlayerRig } from '../player/PlayerRig';

/**
 * LunarPhysics simulates authentic lunar gravity (1.62 m/s^2) and invisible
 * ground/arena collision so the player never falls below the photographic lunar
 * surface or walks through the distant horizon cylinder.
 *
 * Note: All collision bounds are purely mathematical (zero visible 3D geometry).
 */
export class LunarPhysics {
  private readonly playerRig: PlayerRig;

  constructor(playerRig: PlayerRig) {
    this.playerRig = playerRig;
  }

  public init(): void {
    // Ground plane rests at y = 0.0m in lunar surface exploration space.
  }

  /**
   * Returns the invisible ground elevation at world (x, z).
   * Kept at 0.0m so it aligns seamlessly with the photographic ground plane
   * and WebXR 'local-floor' tracking.
   */
  public getGroundHeightAt(_x: number, _z: number): number {
    return 0;
  }

  /**
   * Integrates horizontal and vertical velocity and resolves lunar ground collision.
   * Should only run during SURFACE_EXPLORATION after touchdown.
   */
  public update(deltaSeconds: number): void {
    const pos = this.playerRig.group.position;
    const vel = this.playerRig.velocity;

    // 1. Apply horizontal movement from keyboard or VR thumbstick
    pos.x += vel.x * deltaSeconds;
    pos.z += vel.z * deltaSeconds;

    // 2. Keep player inside the safe high-resolution photographic exploration zone
    const maxR = MOONWALK_CONFIG.player.explorationRadiusMeters;
    const distSq = pos.x * pos.x + pos.z * pos.z;
    if (distSq > maxR * maxR) {
      const dist = Math.sqrt(distSq);
      pos.x = (pos.x / dist) * maxR;
      pos.z = (pos.z / dist) * maxR;
    }

    // 3. Integrate lunar gravity (1.62 m/s^2) on vertical velocity
    const groundY = this.getGroundHeightAt(pos.x, pos.z);
    if (!this.playerRig.isGrounded || vel.y > 0) {
      vel.y -= MOONWALK_CONFIG.physics.lunarGravity * deltaSeconds;
      pos.y += vel.y * deltaSeconds;
    }

    // 4. Resolve ground collision so the player never sinks below the lunar surface
    if (pos.y <= groundY) {
      pos.y = groundY;
      vel.y = 0;
      this.playerRig.isGrounded = true;
    }
  }

  public dispose(): void {
    // No GPU resources held.
  }
}
