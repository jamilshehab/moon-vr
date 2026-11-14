import * as THREE from 'three';
import { SETTINGS } from '../config/settings';
import { Time } from './Time';
import { Scene } from './Scene';
import { Camera } from './Camera';
import { Renderer } from './Renderer';
import { ResizeHandler } from '../utils/ResizeHandler';
import { AssetLoader } from '../utils/AssetLoader';
import { AudioManager } from '../audio/AudioManager';
import { LunarLighting } from '../world/LunarLighting';
import { Earth } from '../world/Earth';
import { LunarTerrain } from '../world/LunarTerrain';
import { LunarRocks } from '../world/LunarRocks';
import { LunarEnvironment } from '../world/LunarEnvironment';
import { CollisionSystem } from '../player/CollisionSystem';
import { Player } from '../player/Player';
import { Rover } from '../rover/Rover';
import { VRManager } from '../vr/VRManager';
import { HUD } from '../ui/HUD';
import { MainMenu } from '../ui/MainMenu';
import { SettingsModal } from '../ui/Settings';

export class Experience {
  private static instance: Experience;

  public webglContainer: HTMLElement;
  public uiContainer: HTMLElement;

  // Core
  public time: Time;
  public scene: Scene;
  public camera: Camera;
  public renderer: Renderer;
  public resizeHandler: ResizeHandler;
  public audio: AudioManager;

  // World
  public terrain: LunarTerrain;
  public lighting: LunarLighting;
  public earth: Earth;
  public rocks: LunarRocks;
  public environment: LunarEnvironment;

  // Entities & Physics
  public collision: CollisionSystem;
  public player: Player;
  public rover: Rover;
  public vrManager: VRManager;

  // UI
  public hud: HUD;
  public mainMenu: MainMenu;
  public settingsModal: SettingsModal;

  private isStarted: boolean = false;

  constructor(webglContainer: HTMLElement, uiContainer: HTMLElement) {
    Experience.instance = this;

    this.webglContainer = webglContainer;
    this.uiContainer = uiContainer;

    // 1. Core Systems
    this.time = new Time();
    this.scene = new Scene();
    this.camera = new Camera();
    this.renderer = new Renderer(this.webglContainer);

    AssetLoader.getInstance().initCapabilities(this.renderer.instance);
    this.scene.initEnvironment(this.renderer.instance);

    this.resizeHandler = new ResizeHandler(
      this.camera.instance,
      this.renderer.instance,
      this.renderer.isSoftwareGl
    );

    this.audio = new AudioManager();

    // 2. World Elements
    this.lighting = new LunarLighting(this.scene.instance);
    this.earth = new Earth(this.scene.instance);
    this.terrain = new LunarTerrain(this.scene.instance);
    this.rocks = new LunarRocks(this.scene.instance, this.terrain);
    this.environment = new LunarEnvironment(this.scene.instance, this.terrain);

    // 3. Collision & Entities
    this.collision = new CollisionSystem(this.rocks.obstacles);

    this.player = new Player(
      this.scene.instance,
      this.camera,
      this.terrain,
      this.collision,
      this.audio
    );

    this.rover = new Rover(
      this.scene.instance,
      this.camera,
      this.terrain,
      this.collision,
      this.audio,
      () => this.toggleLocomotion()
    );

    // 4. WebXR Manager
    this.vrManager = new VRManager(
      this.renderer.instance,
      this.scene.instance,
      this.player,
      this.rover,
      (isSupported, isPresenting) => {
        this.hud?.updateVRStatus(isSupported, isPresenting);
      }
    );

    // 5. Settings Modal
    this.settingsModal = new SettingsModal(this.uiContainer, () => {
      // Configuration applied
    });

    // 6. HUD Overlay
    this.hud = new HUD(this.uiContainer, {
      onToggleLocomotion: () => this.toggleLocomotion(),
      onCycleCamera: () => this.cycleCamera(),
      onToggleHeadlight: () => {
        const isOn = this.player.toggleHeadlight();
        this.hud.setHeadlightState(isOn);
      },
      onSunElevationChange: (elev) => {
        SETTINGS.lighting.sunElevation = elev;
        this.lighting.updateSunPosition(elev, SETTINGS.lighting.sunAzimuth);
      },
      onToggleAudio: () => {
        const isMuted = this.audio.toggleMute();
        this.hud.setAudioState(isMuted);
      },
      onLaunchVR: () => {
        if (this.vrManager.isSupported) {
          this.vrManager.toggleVR();
        } else {
          this.settingsModal.open();
        }
      },
      onOpenSettings: () => {
        this.settingsModal.open();
      },
      onTeleportToLandmark: (name) => {
        this.teleportToLandmark(name);
      },
    });

    // 7. Initial Main Menu & Mission Briefing
    this.mainMenu = new MainMenu(
      this.uiContainer,
      () => this.startExploration(),
      () => this.settingsModal.open()
    );

    // Pre-warm shaders if hardware GL
    if (!this.renderer.isSoftwareGl) {
      this.renderer.instance.compile(this.scene.instance, this.camera.instance);
    }

    // 8. Start Animation Loop (WebXR compliant)
    this.renderer.instance.setAnimationLoop(() => this.update());

    // Keyboard listener for Boarding / Dismounting rover
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') {
        const dist = this.player.movement.position.distanceTo(this.rover.physics.position);
        if (this.rover.isDriving || dist < 4.5) {
          this.toggleLocomotion();
        }
      }
    });
  }

  public static getInstance(): Experience {
    return Experience.instance;
  }

  public startExploration(): void {
    this.isStarted = true;
    this.audio.init();
    this.audio.resume();
    this.player.movement.requestPointerLock();
  }

  public toggleLocomotion(): void {
    if (this.rover.isDriving) {
      // Exit Rover
      this.rover.exit(this.player.movement.position);
      this.camera.setMode('first-person');
    } else {
      // Enter Rover
      const dist = this.player.movement.position.distanceTo(this.rover.physics.position);
      if (dist < 5.0) {
        this.rover.enter();
        this.camera.setMode('rover-cockpit');
      }
    }
  }

  public cycleCamera(): void {
    const newMode = this.camera.toggleMode(this.rover.isDriving);
    this.hud.updateTelemetry(
      0, 0, 0, 0, 0, 0, 0,
      this.rover.isDriving,
      newMode
    );
  }

  public teleportToLandmark(name: string): void {
    let targetX = 0;
    let targetZ = 0;

    switch (name) {
      case 'landing-site': // Central Exploration Valley
        targetX = -2;
        targetZ = -4;
        break;
      case 'armstrong-crater': // Rim of major crater
        targetX = 120;
        targetZ = -14;
        break;
      case 'rover-depot': // LRV location
        targetX = this.rover.physics.position.x - 2;
        targetZ = this.rover.physics.position.z - 2;
        break;
      case 'boulder-field': // Megabreccia
        targetX = -120;
        targetZ = 140;
        break;
      case 'overlook': // Apennine mountain ridge
        targetX = -180;
        targetZ = -220;
        break;
    }

    const groundY = this.terrain.getElevationAt(targetX, targetZ);

    if (this.rover.isDriving) {
      this.rover.physics.position.set(targetX, groundY + 0.6, targetZ);
      this.rover.physics.speed = 0;
    } else {
      this.player.movement.position.set(targetX, groundY + SETTINGS.player.height, targetZ);
      this.player.movement.velocity.set(0, 0, 0);
    }
  }

  private update(): void {
    this.time.update();
    const delta = this.time.delta;

    // 1. Celestial updates
    this.earth.update(delta);

    // 2. Entities & Locomotion
    const isDriving = this.rover.isDriving;
    this.player.update(delta, isDriving);
    this.rover.update(delta);

    // 3. VR Controller updates
    this.vrManager.update(delta);

    // 4. Update lighting shadow caster focus
    const activePos = isDriving ? this.rover.physics.position : this.player.movement.position;
    this.lighting.updateShadowCenter(activePos);

    // 5. Check Rover interaction proximity prompt
    const distToRover = this.player.movement.position.distanceTo(this.rover.physics.position);
    if (isDriving) {
      this.hud.setPrompt(true, 'DISMOUNT LUNAR ROVER (E)');
    } else if (distToRover < 4.2) {
      this.hud.setPrompt(true, 'BOARD LUNAR ROVING VEHICLE (E)');
    } else {
      this.hud.setPrompt(false);
    }

    // 6. Update HUD Telemetry
    const speed = isDriving
      ? Math.abs(this.rover.physics.speed) * 3.6
      : Math.sqrt(
          this.player.movement.velocity.x * this.player.movement.velocity.x +
          this.player.movement.velocity.z * this.player.movement.velocity.z
        ) * 3.6;

    const heading = isDriving
      ? THREE.MathUtils.radToDeg(this.rover.physics.forwardHeading)
      : THREE.MathUtils.radToDeg(this.player.movement.rotation.y);

    this.hud.updateTelemetry(
      activePos.x,
      activePos.y,
      activePos.z,
      speed,
      heading,
      this.time.elapsed,
      this.time.fps,
      isDriving,
      this.camera.mode
    );

    // 7. Render scene
    this.renderer.render(this.scene.instance, this.camera.instance);
  }
}
