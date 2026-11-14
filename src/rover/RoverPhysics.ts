import * as THREE from 'three';
import { SETTINGS } from '../config/settings';
import { LunarTerrain } from '../world/LunarTerrain';
import { CollisionSystem } from '../player/CollisionSystem';

export interface WheelState {
  relX: number; // Offset from chassis center
  relZ: number;
  worldPos: THREE.Vector3;
  groundHeight: number;
  suspensionCompression: number; // 0 to 1
  steerAngle: number;
  spinAngle: number;
}

export class RoverPhysics {
  public position: THREE.Vector3 = new THREE.Vector3(8, 0, 8);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public forwardHeading: number = 0; // Yaw angle in radians
  public pitch: number = 0; // Radians
  public roll: number = 0; // Radians

  public speed: number = 0; // m/s
  public steerAngle: number = 0; // Current front steer angle
  public isBraking: boolean = false;

  public wheels: WheelState[];

  private terrain: LunarTerrain;
  private collision: CollisionSystem;

  constructor(terrain: LunarTerrain, collision: CollisionSystem) {
    this.terrain = terrain;
    this.collision = collision;

    const wb = SETTINGS.rover.wheelBase * 0.5; // Half wheelbase
    const tw = SETTINGS.rover.trackWidth * 0.5; // Half track width

    // Initialize 4 wheels: FL, FR, RL, RR
    this.wheels = [
      { relX: -tw, relZ: -wb, worldPos: new THREE.Vector3(), groundHeight: 0, suspensionCompression: 0, steerAngle: 0, spinAngle: 0 },
      { relX: tw, relZ: -wb, worldPos: new THREE.Vector3(), groundHeight: 0, suspensionCompression: 0, steerAngle: 0, spinAngle: 0 },
      { relX: -tw, relZ: wb, worldPos: new THREE.Vector3(), groundHeight: 0, suspensionCompression: 0, steerAngle: 0, spinAngle: 0 },
      { relX: tw, relZ: wb, worldPos: new THREE.Vector3(), groundHeight: 0, suspensionCompression: 0, steerAngle: 0, spinAngle: 0 },
    ];

    // Spawn rover near Apollo landing site
    this.position.set(8, terrain.getElevationAt(8, 8) + 0.6, 8);
    this.forwardHeading = THREE.MathUtils.degToRad(-35);
  }

  public update(
    delta: number,
    throttle: number, // -1 (reverse) to +1 (forward)
    steerInput: number, // -1 (left) to +1 (right)
    handbrake: boolean
  ): void {
    const cfg = SETTINGS.rover;
    const maxSpeed = cfg.maxSpeedKmh / 3.6; // ~3.75 m/s

    // 1. Steering kinematics (smooth interpolation)
    const targetSteer = steerInput * cfg.maxSteerAngle;
    this.steerAngle += (targetSteer - this.steerAngle) * 8.0 * delta;

    // Apollo LRV had dual 4-wheel Ackermann counter-steering!
    // Front wheels steer targetSteer, rear wheels steer -targetSteer in opposite direction
    this.wheels[0].steerAngle = this.steerAngle; // FL
    this.wheels[1].steerAngle = this.steerAngle; // FR
    this.wheels[2].steerAngle = -this.steerAngle; // RL
    this.wheels[3].steerAngle = -this.steerAngle; // RR

    // 2. Drive & Acceleration
    this.isBraking = handbrake;
    if (handbrake) {
      this.speed += (0 - this.speed) * cfg.brakingForce * delta;
    } else if (throttle !== 0) {
      const targetSpeed = throttle * maxSpeed;
      this.speed += (targetSpeed - this.speed) * cfg.acceleration * delta;
    } else {
      // Natural rolling resistance on lunar regolith
      const rollingResistance = 1.2;
      this.speed += (0 - this.speed) * rollingResistance * delta;
    }

    if (Math.abs(this.speed) < 0.02 && throttle === 0) {
      this.speed = 0;
    }

    // 3. Turn Rate (Yaw change)
    // 4-wheel counter-steering doubles effective turn rate
    if (Math.abs(this.speed) > 0.05) {
      const turnRate = (this.speed / cfg.wheelBase) * Math.tan(this.steerAngle) * 1.8;
      this.forwardHeading += turnRate * delta;
    }

    // 4. Update horizontal position
    const forwardX = Math.sin(this.forwardHeading);
    const forwardZ = Math.cos(this.forwardHeading);

    this.velocity.x = forwardX * this.speed;
    this.velocity.z = forwardZ * this.speed;

    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;

    // 5. Collision against rocks and LM
    this.collision.checkAndResolve(this.position, 1.3, this.velocity);

    // 6. 4-Wheel Ground Contact & Suspension
    const sinH = Math.sin(this.forwardHeading);
    const cosH = Math.cos(this.forwardHeading);

    let avgGroundY = 0;
    let frontGroundY = 0;
    let rearGroundY = 0;
    let leftGroundY = 0;
    let rightGroundY = 0;

    for (let i = 0; i < 4; i++) {
      const w = this.wheels[i];
      // World position of wheel
      const wx = this.position.x + (w.relX * cosH + w.relZ * sinH);
      const wz = this.position.z + (-w.relX * sinH + w.relZ * cosH);
      const gy = this.terrain.getElevationAt(wx, wz);

      w.groundHeight = gy;
      w.worldPos.set(wx, gy + cfg.wheelRadius, wz);

      avgGroundY += gy;
      if (i < 2) frontGroundY += gy;
      else rearGroundY += gy;

      if (i % 2 === 0) leftGroundY += gy;
      else rightGroundY += gy;

      // Wheel spin rotation based on forward distance traveled
      const spinDelta = (this.speed * delta) / cfg.wheelRadius;
      w.spinAngle += spinDelta;
    }

    avgGroundY /= 4;
    frontGroundY /= 2;
    rearGroundY /= 2;
    leftGroundY /= 2;
    rightGroundY /= 2;

    // 7. Chassis height and pitch/roll adaptation
    const targetY = avgGroundY + cfg.wheelRadius + 0.18;
    this.position.y += (targetY - this.position.y) * 12.0 * delta;

    // Calculate terrain slope pitch (front to rear) and roll (left to right)
    const targetPitch = Math.atan2(frontGroundY - rearGroundY, cfg.wheelBase);
    const targetRoll = Math.atan2(leftGroundY - rightGroundY, cfg.trackWidth);

    this.pitch += (targetPitch - this.pitch) * 10.0 * delta;
    this.roll += (targetRoll - this.roll) * 10.0 * delta;
  }
}
