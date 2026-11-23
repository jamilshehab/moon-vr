import * as THREE from 'three';
import { MOONWALK_CONFIG } from '../core/config';
import type { TextureAssetManager } from '../assets/TextureAssetManager';
import { ExperiencePhase } from '../experience/ExperienceState';
import { SpaceEnvironment } from '../space/SpaceEnvironment';
import { MoonEnvironment } from '../moon/MoonEnvironment';
import { LunarPhysics } from '../physics/LunarPhysics';
import { DesktopControls } from '../controls/DesktopControls';
import { VrControls } from '../controls/VrControls';
import type { PlayerRig } from '../player/PlayerRig';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface WorldCoordinatorOptions {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  playerRig: PlayerRig;
  assetManager: TextureAssetManager;
  onPhaseChange: (phase: ExperiencePhase) => void;
  onPointerLockChange: (locked: boolean) => void;
}

/**
 * WorldCoordinator owns and synchronizes all world subsystems and drives
 * the automatic space-to-lunar-surface experience arc:
 *   SPACE_IDLE -> FALLING -> TRANSITION -> SURFACE_EXPLORATION
 */
export class WorldCoordinator {
  public readonly spaceEnvironment: SpaceEnvironment;
  public readonly moonEnvironment: MoonEnvironment;
  public readonly lunarPhysics: LunarPhysics;
  public readonly desktopControls: DesktopControls;
  public readonly vrControls: VrControls;

  private readonly playerRig: PlayerRig;
  private readonly onPhaseChange: (phase: ExperiencePhase) => void;

  private phaseElapsed = 0;
  private fallProgress = 0;
  private transitionProgress = 0;
  private surfaceInitPromise: Promise<void> | null = null;
  private surfaceReady = false;

  constructor({
    scene,
    renderer,
    playerRig,
    assetManager,
    onPhaseChange,
    onPointerLockChange,
  }: WorldCoordinatorOptions) {
    this.playerRig = playerRig;
    this.onPhaseChange = onPhaseChange;

    this.spaceEnvironment = new SpaceEnvironment({ assetManager });
    this.moonEnvironment = new MoonEnvironment({ assetManager });
    this.lunarPhysics = new LunarPhysics(playerRig);
    this.desktopControls = new DesktopControls({
      playerRig,
      domElement: renderer.domElement,
      onPointerLockChange,
    });
    this.vrControls = new VrControls(renderer, playerRig);

    scene.add(this.spaceEnvironment.group);
    scene.add(this.moonEnvironment.group);
    scene.add(playerRig.group);
  }

  public async init(): Promise<void> {
    await this.spaceEnvironment.init();
    this.lunarPhysics.init();
    this.desktopControls.init();
    this.vrControls.init();

    this.resetToSpaceStart();

    // Pre-build lunar surface environment in the background right after space mounts.
    this.surfaceInitPromise = this.moonEnvironment.init().then(() => {
      this.surfaceReady = true;
    });
  }

  public resetToSpaceStart(): void {
    const start = MOONWALK_CONFIG.space.playerStartPos;
    this.playerRig.resetToSpaceOrigin();
    this.playerRig.group.position.set(start.x, start.y, start.z);
    this.desktopControls.resetOrientation();

    this.phaseElapsed = 0;
    this.fallProgress = 0;
    this.transitionProgress = 0;
    this.moonEnvironment.setVisibilityOpacity(0);
    this.onPhaseChange(ExperiencePhase.SPACE_IDLE);
  }

  public getDescentProgress(): number {
    return this.fallProgress * 0.8 + this.transitionProgress * 0.2;
  }

  public update(
    deltaSeconds: number,
    phase: ExperiencePhase,
    inVr: boolean,
  ): void {
    this.phaseElapsed += deltaSeconds;

    const start = MOONWALK_CONFIG.space.playerStartPos;
    const handoffY = MOONWALK_CONFIG.descent.transitionStartAltitudeY;

    // 1. Always allow free head/mouse look; enable locomotion only once landed
    const canWalk = phase === ExperiencePhase.SURFACE_EXPLORATION;
    if (inVr) {
      this.vrControls.update(deltaSeconds, canWalk);
    } else {
      this.desktopControls.update(deltaSeconds, canWalk);
    }

    // 2. Drive automatic experience state transitions & trajectories
    if (phase === ExperiencePhase.SPACE_IDLE) {
      if (this.phaseElapsed >= MOONWALK_CONFIG.descent.idleHoldSeconds) {
        this.phaseElapsed = 0;
        this.onPhaseChange(ExperiencePhase.FALLING);
      }
    } else if (phase === ExperiencePhase.FALLING) {
      const t = Math.min(
        this.phaseElapsed / MOONWALK_CONFIG.descent.fallDurationSeconds,
        1,
      );
      this.fallProgress = t;
      const eased = easeInOutCubic(t);

      this.playerRig.group.position.set(
        THREE.MathUtils.lerp(start.x, 0, eased),
        THREE.MathUtils.lerp(start.y, handoffY, eased),
        THREE.MathUtils.lerp(start.z, 0, eased),
      );

      // Ensure surface assets have finished GPU upload before transitioning
      if (t >= 1 && this.surfaceReady) {
        this.phaseElapsed = 0;
        this.onPhaseChange(ExperiencePhase.TRANSITION);
      } else if (t >= 1 && !this.surfaceInitPromise) {
        this.surfaceInitPromise = this.moonEnvironment.init().then(() => {
          this.surfaceReady = true;
        });
      }
    } else if (phase === ExperiencePhase.TRANSITION) {
      const t = Math.min(
        this.phaseElapsed / MOONWALK_CONFIG.descent.transitionDurationSeconds,
        1,
      );
      this.transitionProgress = t;
      const eased = easeOutCubic(t);

      // Smoothly decelerate down onto y = 0 at the lunar surface origin
      this.playerRig.group.position.set(0, THREE.MathUtils.lerp(handoffY, 0, eased), 0);

      // Crossfade from orbital approach photograph into multi-plane lunar surface
      const surfaceFade = THREE.MathUtils.smoothstep(t, 0.08, 0.72);
      this.moonEnvironment.setVisibilityOpacity(surfaceFade);

      if (t >= 1) {
        this.playerRig.group.position.set(0, 0, 0);
        this.playerRig.velocity.set(0, 0, 0);
        this.playerRig.isGrounded = true;
        this.moonEnvironment.setVisibilityOpacity(1);
        this.onPhaseChange(ExperiencePhase.SURFACE_EXPLORATION);
      }
    } else if (phase === ExperiencePhase.SURFACE_EXPLORATION) {
      this.fallProgress = 1;
      this.transitionProgress = 1;
      this.moonEnvironment.setVisibilityOpacity(1);
      this.lunarPhysics.update(deltaSeconds);
    }

    // 3. Synchronize space sky dome, Earth, and Moon photographic discs
    this.spaceEnvironment.update(
      this.playerRig.camera,
      this.playerRig.group.position,
      this.fallProgress,
      this.transitionProgress,
      phase === ExperiencePhase.SURFACE_EXPLORATION,
    );
  }

  public dispose(): void {
    this.spaceEnvironment.dispose();
    this.moonEnvironment.dispose();
    this.lunarPhysics.dispose();
    this.desktopControls.dispose();
    this.vrControls.dispose();
  }
}
