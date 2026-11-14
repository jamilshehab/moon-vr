import * as THREE from 'three';
import { SETTINGS } from '../config/settings';
import { AssetLoader } from '../utils/AssetLoader';
import { LunarTerrain } from '../world/LunarTerrain';
import { CollisionSystem } from '../player/CollisionSystem';
import { RoverPhysics } from './RoverPhysics';
import { RoverControls } from './RoverControls';
import { AudioManager } from '../audio/AudioManager';
import { Camera } from '../core/Camera';

export class Rover {
  public group: THREE.Group;
  public physics: RoverPhysics;
  public controls: RoverControls;
  public isDriving: boolean = false;

  private wheelMeshes: THREE.Group[] = [];
  private highGainDish: THREE.Group | null = null;
  private camera: Camera;
  private audio: AudioManager;

  constructor(
    scene: THREE.Scene,
    camera: Camera,
    terrain: LunarTerrain,
    collision: CollisionSystem,
    audio: AudioManager,
    onExitRequest?: () => void
  ) {
    this.camera = camera;
    this.audio = audio;
    this.physics = new RoverPhysics(terrain, collision);

    this.controls = new RoverControls(() => {
      if (this.isDriving && onExitRequest) {
        onExitRequest();
      }
    });

    this.group = this.buildRoverModel();
    scene.add(this.group);
  }

  /**
   * Procedural Apollo Lunar Roving Vehicle (LRV) 3D Model (Composite 16-part mesh)
   */
  private buildRoverModel(): THREE.Group {
    const lrv = new THREE.Group();
    const assets = AssetLoader.getInstance();

    const goldFoilTex = assets.createGoldFoilTexture(256);
    const wheelTreadTex = assets.createWheelTreadTexture(256);

    // Materials
    const chassisAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x98a0ab, // Apollo tubular aluminum alloy 2219
      metalness: 0.9,
      roughness: 0.22,
    });

    const goldThermalMat = new THREE.MeshStandardMaterial({
      map: goldFoilTex,
      metalness: 0.95,
      roughness: 0.15,
      color: 0xffd068,
    });

    const seatMeshMat = new THREE.MeshStandardMaterial({
      color: 0x22262c, // Woven nylon strap webbing
      roughness: 0.92,
      metalness: 0.1,
    });

    const fenderOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xc85a17, // Fiberglass fender with Apollo 17 orange duct-tape repair accent!
      roughness: 0.6,
      metalness: 0.1,
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      map: wheelTreadTex,
      roughness: 0.5,
      metalness: 0.85,
    });

    // 1. Tubular Chassis Bed (3.1m length, 1.8m width)
    const chassisGeom = new THREE.BoxGeometry(1.6, 0.12, 2.7);
    const chassisMesh = new THREE.Mesh(chassisGeom, chassisAlloyMat);
    chassisMesh.position.y = 0.25;
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    lrv.add(chassisMesh);

    // Frame roll bars
    const rollBarGeom = new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8);
    rollBarGeom.rotateZ(Math.PI / 2);
    const rollBar = new THREE.Mesh(rollBarGeom, chassisAlloyMat);
    rollBar.position.set(0, 0.85, 0.1);
    rollBar.castShadow = true;
    lrv.add(rollBar);

    // 2. Forward Battery & Electronics Compartment
    const batteryGeom = new THREE.BoxGeometry(1.2, 0.42, 0.7);
    const batteryMesh = new THREE.Mesh(batteryGeom, goldThermalMat);
    batteryMesh.position.set(0, 0.48, -1.05);
    batteryMesh.castShadow = true;
    lrv.add(batteryMesh);

    // 3. Two Fold-Down Astronaut Mesh Seats
    for (let s = -1; s <= 1; s += 2) {
      const seatGroup = new THREE.Group();
      seatGroup.position.set(s * 0.42, 0.32, 0.1);

      // Seat cushion
      const cushionGeom = new THREE.BoxGeometry(0.52, 0.08, 0.5);
      const cushion = new THREE.Mesh(cushionGeom, seatMeshMat);
      cushion.castShadow = true;
      seatGroup.add(cushion);

      // Backrest
      const backGeom = new THREE.BoxGeometry(0.52, 0.65, 0.06);
      const back = new THREE.Mesh(backGeom, seatMeshMat);
      back.position.set(0, 0.35, 0.25);
      back.rotation.x = THREE.MathUtils.degToRad(12);
      back.castShadow = true;
      seatGroup.add(back);

      lrv.add(seatGroup);
    }

    // 4. Center T-Handle Hand Controller (Apollo steering joystick)
    const stickGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8);
    const stick = new THREE.Mesh(stickGeom, chassisAlloyMat);
    stick.position.set(0, 0.48, -0.2);
    stick.rotation.x = THREE.MathUtils.degToRad(-20);
    lrv.add(stick);

    const tHandleGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.24, 8);
    tHandleGeom.rotateZ(Math.PI / 2);
    const tHandle = new THREE.Mesh(tHandleGeom, chassisAlloyMat);
    tHandle.position.set(0, 0.65, -0.28);
    lrv.add(tHandle);

    // 5. High-Gain Parabolic Umbrella Antenna (pointing towards Earth)
    this.highGainDish = new THREE.Group();
    this.highGainDish.position.set(-0.65, 0.45, -1.1);

    const dishMastGeom = new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8);
    const dishMast = new THREE.Mesh(dishMastGeom, chassisAlloyMat);
    dishMast.position.y = 0.6;
    dishMast.castShadow = true;
    this.highGainDish.add(dishMast);

    // Parabolic dish mesh (0.85m diameter)
    const dishGeom = new THREE.ConeGeometry(0.48, 0.2, 16, 1, true);
    dishGeom.rotateX(Math.PI);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xddaa44,
      metalness: 0.9,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const dishMesh = new THREE.Mesh(dishGeom, dishMat);
    dishMesh.position.set(0, 1.2, 0);
    dishMesh.rotation.x = THREE.MathUtils.degToRad(32); // Point toward sky
    dishMesh.castShadow = true;
    this.highGainDish.add(dishMesh);
    lrv.add(this.highGainDish);

    // 6. RCA Color TV Camera Unit (Front right corner)
    const tvGroup = new THREE.Group();
    tvGroup.position.set(0.65, 0.45, -1.15);
    const tvBoxGeom = new THREE.BoxGeometry(0.22, 0.22, 0.32);
    const tvBox = new THREE.Mesh(tvBoxGeom, goldThermalMat);
    tvBox.position.y = 0.45;
    tvBox.castShadow = true;
    tvGroup.add(tvBox);

    const tvLensGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12);
    tvLensGeom.rotateX(Math.PI / 2);
    const tvLens = new THREE.Mesh(tvLensGeom, chassisAlloyMat);
    tvLens.position.set(0, 0.45, -0.2);
    tvGroup.add(tvLens);
    lrv.add(tvGroup);

    // 7. Aft Scientific Payload Pallet (Sample bags, core drill rack)
    const palletGeom = new THREE.BoxGeometry(1.4, 0.35, 0.65);
    const pallet = new THREE.Mesh(palletGeom, chassisAlloyMat);
    pallet.position.set(0, 0.42, 1.15);
    pallet.castShadow = true;
    lrv.add(pallet);

    // 8. Four Wire-Mesh Wheels with Steering Pivots and Fenders
    const r = SETTINGS.rover.wheelRadius;
    const wheelWidth = 0.25;

    for (let i = 0; i < 4; i++) {
      const wState = this.physics.wheels[i];
      const wheelMount = new THREE.Group();
      wheelMount.position.set(wState.relX, 0.18, wState.relZ);

      // Fender
      const fenderGeom = new THREE.CylinderGeometry(r + 0.07, r + 0.07, wheelWidth + 0.04, 16, 1, true, 0, Math.PI);
      fenderGeom.rotateZ(Math.PI / 2);
      const fender = new THREE.Mesh(fenderGeom, fenderOrangeMat);
      fender.position.y = 0.05;
      wheelMount.add(fender);

      // Rotating Wheel (Spin group)
      const spinGroup = new THREE.Group();

      // Open wire mesh rim
      const tireGeom = new THREE.CylinderGeometry(r, r, wheelWidth, 24);
      tireGeom.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeom, wheelMat);
      tire.castShadow = true;
      spinGroup.add(tire);

      // Hub cap
      const hubGeom = new THREE.CylinderGeometry(0.12, 0.12, wheelWidth + 0.02, 12);
      hubGeom.rotateZ(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeom, chassisAlloyMat);
      spinGroup.add(hub);

      wheelMount.add(spinGroup);
      lrv.add(wheelMount);

      this.wheelMeshes.push(wheelMount);
    }

    return lrv;
  }

  public update(delta: number): void {
    if (this.isDriving) {
      this.controls.update();
      this.physics.update(
        delta,
        this.controls.throttle,
        this.controls.steer,
        this.controls.handbrake
      );

      // Update engine audio
      const normSpeed = Math.abs(this.physics.speed) / (SETTINGS.rover.maxSpeedKmh / 3.6);
      this.audio.updateRoverAudio(normSpeed, true);
    } else {
      // Natural settling when parked
      this.physics.update(delta, 0, 0, true);
      this.audio.updateRoverAudio(0, false);
    }

    // 1. Update chassis transform
    this.group.position.copy(this.physics.position);
    this.group.rotation.set(0, 0, 0);
    this.group.rotateY(this.physics.forwardHeading);
    this.group.rotateX(this.physics.pitch);
    this.group.rotateZ(this.physics.roll);

    // 2. Update wheel steering and spinning
    for (let i = 0; i < 4; i++) {
      const wState = this.physics.wheels[i];
      const mount = this.wheelMeshes[i];
      // Steer yaw
      mount.rotation.y = wState.steerAngle;

      // Wheel spin
      const spinGroup = mount.children[1];
      if (spinGroup) {
        spinGroup.rotation.x = wState.spinAngle;
      }
    }

    // 3. Update Camera when driving
    if (this.isDriving) {
      if (this.camera.mode === 'rover-cockpit') {
        // Astronaut driver's seat (left side, slightly elevated)
        const driverOffset = new THREE.Vector3(-0.42, 1.25, -0.1);
        driverOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.physics.forwardHeading);

        this.camera.instance.position.copy(this.physics.position).add(driverOffset);
        this.camera.instance.rotation.set(this.physics.pitch * 0.4, this.physics.forwardHeading, 0, 'YXZ');
      } else if (this.camera.mode === 'third-person') {
        // Chase camera behind rover
        const chaseOffset = new THREE.Vector3(0, 2.2, 5.0);
        chaseOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.physics.forwardHeading);

        this.camera.instance.position.copy(this.physics.position).add(chaseOffset);
        this.camera.instance.lookAt(
          this.physics.position.x,
          this.physics.position.y + 0.8,
          this.physics.position.z
        );
      }
    }
  }

  public enter(): void {
    this.isDriving = true;
    this.camera.setMode('rover-cockpit');
    this.audio.playQuindarTone(true);
  }

  public exit(playerPos: THREE.Vector3): void {
    this.isDriving = false;
    // Dismount astronaut to the left of the rover
    const dismountOffset = new THREE.Vector3(-1.8, 0, 0);
    dismountOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.physics.forwardHeading);

    playerPos.copy(this.physics.position).add(dismountOffset);
    playerPos.y += SETTINGS.player.height;

    this.camera.setMode('first-person');
    this.audio.playQuindarTone(false);
  }
}
