import * as THREE from 'three';
import { SETTINGS } from '../config/settings';
import { Camera } from '../core/Camera';
import { LunarTerrain } from '../world/LunarTerrain';
import { CollisionSystem } from './CollisionSystem';
import { PlayerMovement } from './PlayerMovement';
import { AudioManager } from '../audio/AudioManager';

export class Player {
  public movement: PlayerMovement;
  public headlight: THREE.SpotLight;
  public headlightTarget: THREE.Object3D;
  public avatarGroup: THREE.Group;
  public isHeadlightOn: boolean = true;
  private camera: Camera;
  private audio: AudioManager;

  // Stride bobbing
  private bobCycle: number = 0;

  constructor(
    scene: THREE.Scene,
    camera: Camera,
    terrain: LunarTerrain,
    collision: CollisionSystem,
    audio: AudioManager
  ) {
    this.camera = camera;
    this.audio = audio;

    this.movement = new PlayerMovement(terrain, collision, () => {
      this.audio.playFootstep();
    });

    // 1. Spacesuit Helmet Headlight (SpotLight)
    this.headlight = new THREE.SpotLight(0xfff6e8, SETTINGS.player.headlightIntensity);
    this.headlight.angle = Math.PI / 4.8;
    this.headlight.penumbra = 0.45;
    this.headlight.distance = SETTINGS.player.headlightRange;
    this.headlight.castShadow = true;
    this.headlight.shadow.bias = -0.001;

    this.headlightTarget = new THREE.Object3D();
    scene.add(this.headlight);
    scene.add(this.headlightTarget);
    this.headlight.target = this.headlightTarget;

    // 2. Procedural Apollo A7L Spacesuit Avatar (Visible in 3rd person)
    this.avatarGroup = this.createSpacesuitAvatar();
    scene.add(this.avatarGroup);

    // Keyboard listener for suit functions
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyL') {
        this.toggleHeadlight();
      }
    });
  }

  public toggleHeadlight(): boolean {
    this.isHeadlightOn = !this.isHeadlightOn;
    this.headlight.intensity = this.isHeadlightOn ? SETTINGS.player.headlightIntensity : 0;
    this.audio.playClick();
    return this.isHeadlightOn;
  }

  /**
   * Procedural Apollo A7L Spacesuit Model (Composite 8-part mesh)
   */
  private createSpacesuitAvatar(): THREE.Group {
    const suit = new THREE.Group();

    const suitFabricMat = new THREE.MeshStandardMaterial({
      color: 0xe6e9ef, // Beta cloth woven Teflon/silica fabric
      roughness: 0.88,
      metalness: 0.05,
    });

    const visorGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd4a017, // Vapor-deposited gold solar thermal visor
      metalness: 0.98,
      roughness: 0.08,
    });

    const plssMat = new THREE.MeshStandardMaterial({
      color: 0xd0d5de,
      metalness: 0.5,
      roughness: 0.4,
    });

    // 1. Torso
    const torsoGeom = new THREE.CapsuleGeometry(0.35, 0.65, 8, 16);
    const torsoMesh = new THREE.Mesh(torsoGeom, suitFabricMat);
    torsoMesh.position.y = 1.05;
    torsoMesh.castShadow = true;
    suit.add(torsoMesh);

    // 2. Helmet & Visor
    const helmetGeom = new THREE.SphereGeometry(0.26, 16, 16);
    const helmetMesh = new THREE.Mesh(helmetGeom, suitFabricMat);
    helmetMesh.position.y = 1.62;
    helmetMesh.castShadow = true;
    suit.add(helmetMesh);

    const visorGeom = new THREE.SphereGeometry(0.24, 16, 16, 0, Math.PI, 0, Math.PI * 0.7);
    visorGeom.rotateY(-Math.PI / 2);
    const visorMesh = new THREE.Mesh(visorGeom, visorGoldMat);
    visorMesh.position.set(0, 1.62, 0.04);
    suit.add(visorMesh);

    // 3. PLSS Backpack (Portable Life Support System)
    const plssGeom = new THREE.BoxGeometry(0.48, 0.75, 0.28);
    const plssMesh = new THREE.Mesh(plssGeom, plssMat);
    plssMesh.position.set(0, 1.15, -0.32);
    plssMesh.castShadow = true;
    suit.add(plssMesh);

    // 4. VHF Antenna on PLSS
    const antGeom = new THREE.CylinderGeometry(0.008, 0.008, 0.8, 4);
    const antMesh = new THREE.Mesh(antGeom, plssMat);
    antMesh.position.set(0.18, 1.7, -0.38);
    suit.add(antMesh);

    // 5. Pressurized Legs
    const legGeom = new THREE.CylinderGeometry(0.12, 0.14, 0.75, 8);
    const leftLeg = new THREE.Mesh(legGeom, suitFabricMat);
    leftLeg.position.set(-0.18, 0.45, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeom, suitFabricMat);
    rightLeg.position.set(0.18, 0.45, 0);
    rightLeg.castShadow = true;
    suit.add(leftLeg, rightLeg);

    // 6. Lunar Overshoes
    const bootGeom = new THREE.BoxGeometry(0.22, 0.15, 0.35);
    const leftBoot = new THREE.Mesh(bootGeom, suitFabricMat);
    leftBoot.position.set(-0.18, 0.08, 0.05);
    const rightBoot = new THREE.Mesh(bootGeom, suitFabricMat);
    rightBoot.position.set(0.18, 0.08, 0.05);
    suit.add(leftBoot, rightBoot);

    return suit;
  }

  public update(delta: number, isDrivingRover: boolean): void {
    if (isDrivingRover) {
      // Astronaut is sitting inside rover cockpit
      this.avatarGroup.visible = false;
      this.headlight.visible = false;
      return;
    }

    this.movement.update(delta);

    // Update avatar position and orientation
    this.avatarGroup.position.copy(this.movement.position);
    this.avatarGroup.position.y -= SETTINGS.player.height; // Pivot at bottom-center
    this.avatarGroup.rotation.y = this.movement.rotation.y;

    // Headlight position (attached to helmet)
    this.headlight.visible = this.isHeadlightOn;
    this.headlight.position.set(
      this.movement.position.x,
      this.movement.position.y + 0.1,
      this.movement.position.z
    );

    // Calculate forward look vector
    const lookDir = new THREE.Vector3(0, 0, -1);
    lookDir.applyEuler(this.movement.rotation);
    this.headlightTarget.position
      .copy(this.headlight.position)
      .addScaledVector(lookDir, 20);

    // Update Camera
    if (this.camera.mode === 'first-person') {
      this.avatarGroup.visible = false;

      // Stride bobbing
      let bobY = 0;
      if (this.movement.isGrounded && this.movement.isMoving) {
        this.bobCycle += delta * (this.movement.isSprinting ? 7.0 : 4.5);
        bobY = Math.sin(this.bobCycle) * SETTINGS.player.headBobIntensity;
      }

      this.camera.instance.position.set(
        this.movement.position.x,
        this.movement.position.y + bobY,
        this.movement.position.z
      );
      this.camera.instance.rotation.copy(this.movement.rotation);
    } else if (this.camera.mode === 'third-person') {
      this.avatarGroup.visible = true;

      // Follow behind astronaut
      const offset = new THREE.Vector3(0, 1.4, 3.8);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.movement.rotation.y);
      this.camera.instance.position.copy(this.movement.position).add(offset);
      this.camera.instance.lookAt(
        this.movement.position.x,
        this.movement.position.y + 0.2,
        this.movement.position.z
      );
    }
  }
}
