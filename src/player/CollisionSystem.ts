import * as THREE from 'three';
import { RockObstacle } from '../world/LunarRocks';

export class CollisionSystem {
  private obstacles: RockObstacle[];

  constructor(obstacles: RockObstacle[]) {
    this.obstacles = obstacles;
  }

  /**
   * Resolves horizontal 2D circular collision against boulders
   */
  public checkAndResolve(
    position: THREE.Vector3,
    entityRadius: number,
    velocity?: THREE.Vector3
  ): boolean {
    let hasCollided = false;

    // Check Rock Obstacles
    for (let i = 0; i < this.obstacles.length; i++) {
      const rock = this.obstacles[i];
      // Quick bounding box check
      const totalR = entityRadius + rock.radius;
      const dx = position.x - rock.x;
      const dz = position.z - rock.z;

      if (Math.abs(dx) < totalR && Math.abs(dz) < totalR) {
        if (this.resolveCircle(position, entityRadius, rock, velocity)) {
          hasCollided = true;
        }
      }
    }

    return hasCollided;
  }

  private resolveCircle(
    position: THREE.Vector3,
    entityRadius: number,
    obstacle: RockObstacle,
    velocity?: THREE.Vector3
  ): boolean {
    const dx = position.x - obstacle.x;
    const dz = position.z - obstacle.z;
    const distSq = dx * dx + dz * dz;
    const minSafeDist = entityRadius + obstacle.radius;

    if (distSq < minSafeDist * minSafeDist) {
      const dist = Math.sqrt(distSq) || 0.001;
      const overlap = minSafeDist - dist;

      // Push entity away along normal
      const nx = dx / dist;
      const nz = dz / dist;

      position.x += nx * overlap;
      position.z += nz * overlap;

      // Damp velocity component along collision normal
      if (velocity) {
        const vDotN = velocity.x * nx + velocity.z * nz;
        if (vDotN < 0) {
          velocity.x -= vDotN * nx * 1.2;
          velocity.z -= vDotN * nz * 1.2;
        }
      }

      return true;
    }
    return false;
  }
}
