import * as THREE from 'three';
import { SETTINGS } from '../config/settings';
import { Player } from '../player/Player';
import { Rover } from '../rover/Rover';

export class VRControls {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private player: Player;
  private rover: Rover;

  public controller1: THREE.XRTargetRaySpace;
  public controller2: THREE.XRTargetRaySpace;
  public controllerGrip1: THREE.XRGripSpace;
  public controllerGrip2: THREE.XRGripSpace;

  private rayMesh1: THREE.Line;
  private rayMesh2: THREE.Line;
  private lastSnapTime: number = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    player: Player,
    rover: Rover
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.player = player;
    this.rover = rover;

    // 1. Controller 1 (Right Hand)
    this.controller1 = this.renderer.xr.getController(0);
    this.controller1.addEventListener('selectstart', () => this.onSelect(0));
    this.scene.add(this.controller1);

    // 2. Controller 2 (Left Hand)
    this.controller2 = this.renderer.xr.getController(1);
    this.controller2.addEventListener('selectstart', () => this.onSelect(1));
    this.scene.add(this.controller2);

    // Controller visual ray lines
    this.rayMesh1 = this.buildPointerLine();
    this.controller1.add(this.rayMesh1);

    this.rayMesh2 = this.buildPointerLine();
    this.controller2.add(this.rayMesh2);

    // Controller grips
    this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
    this.scene.add(this.controllerGrip1);

    this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
    this.scene.add(this.controllerGrip2);
  }

  private buildPointerLine(): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5),
    ]);
    const material = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
    });
    return new THREE.Line(geometry, material);
  }

  private onSelect(controllerIndex: number): void {
    // Check distance to rover to enter/exit
    const distToRover = this.player.movement.position.distanceTo(this.rover.physics.position);

    if (this.rover.isDriving) {
      // Exit rover
      this.rover.exit(this.player.movement.position);
    } else if (distToRover < 4.5) {
      // Enter rover
      this.rover.enter();
    }
  }

  /**
   * Updates VR locomotion from controller thumbsticks
   */
  public update(delta: number): void {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    const sources = session.inputSources;
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      if (!source.gamepad) continue;

      const axes = source.gamepad.axes;
      // Standard XR gamepad mapping: axes[2] = X, axes[3] = Y
      const thumbX = axes[2] || 0;
      const thumbY = axes[3] || 0;

      if (source.handedness === 'left') {
        // Left hand thumbstick: Locomotion (move forward/back, strafe)
        if (Math.abs(thumbX) > 0.15 || Math.abs(thumbY) > 0.15) {
          if (this.rover.isDriving) {
            this.rover.controls.throttle = -thumbY;
            this.rover.controls.steer = -thumbX;
          } else {
            // Player walking locomotion
            this.player.movement.keys.forward = thumbY < -0.2;
            this.player.movement.keys.backward = thumbY > 0.2;
            this.player.movement.keys.left = thumbX < -0.2;
            this.player.movement.keys.right = thumbX > 0.2;
          }
        } else if (!this.rover.isDriving) {
          this.player.movement.keys.forward = false;
          this.player.movement.keys.backward = false;
          this.player.movement.keys.left = false;
          this.player.movement.keys.right = false;
        }
      } else if (source.handedness === 'right') {
        // Right hand thumbstick: Turning
        const now = performance.now();
        if (SETTINGS.vr.turnMode === 'snap') {
          if (Math.abs(thumbX) > 0.6 && now - this.lastSnapTime > 350) {
            const angle = THREE.MathUtils.degToRad(SETTINGS.vr.snapAngle) * (thumbX > 0 ? -1 : 1);
            if (this.rover.isDriving) {
              this.rover.physics.forwardHeading += angle;
            } else {
              this.player.movement.rotation.y += angle;
            }
            this.lastSnapTime = now;
          }
        } else {
          // Smooth turn
          if (Math.abs(thumbX) > 0.15) {
            const turnRate = 1.8 * thumbX * delta;
            if (this.rover.isDriving) {
              this.rover.physics.forwardHeading -= turnRate;
            } else {
              this.player.movement.rotation.y -= turnRate;
            }
          }
        }
      }
    }
  }
}
