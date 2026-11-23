import * as THREE from 'three';
import { createScene } from '../scene/createScene';
import { createCamera } from '../camera/createCamera';
import { createRenderer, type RendererContext } from '../renderer/createRenderer';
import { PlayerRig } from '../player/PlayerRig';
import { TextureAssetManager } from '../assets/TextureAssetManager';
import {
  ExperiencePhase,
  ExperienceState,
} from '../experience/ExperienceState';
import { WorldCoordinator } from '../world/WorldCoordinator';
import { detectSoftwareWebGL, scheduleAfterDraw } from './softwareGl';

/**
 * MoonWalkEngine is the top-level orchestrator for the 3D/VR runtime.
 *
 * Responsibilities:
 * - Initialize WebGLRenderer (with WebXR enabled), Scene, Camera, and PlayerRig.
 * - Manage the render loop using `renderer.setAnimationLoop` for WebXR compatibility
 *   and `scheduleAfterDraw` pacing when running under software WebGL.
 * - Track WebXR availability and handle VR session entry/exit cleanly.
 * - Keep React UI decoupled through `ExperienceState`.
 */
export class MoonWalkEngine {
  public readonly state: ExperienceState;
  public readonly assetManager: TextureAssetManager;

  private readonly container: HTMLElement;
  private readonly isSoftwareGl: boolean;
  private readonly rendererCtx: RendererContext;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly playerRig: PlayerRig;
  private readonly world: WorldCoordinator;
  private readonly clock = new THREE.Clock();

  private activeSession: XRSession | null = null;
  private softwareTimerId: number | null = null;
  private hudSyncAccumulator = 0;
  private disposed = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.scene = createScene();
    const aspect =
      container.clientWidth > 0 && container.clientHeight > 0
        ? container.clientWidth / container.clientHeight
        : 16 / 9;
    this.camera = createCamera(aspect);
    this.playerRig = new PlayerRig(this.camera);

    this.rendererCtx = createRenderer(
      container,
      this.isSoftwareGl,
      () => this.state.update({ contextLost: true }),
      () => this.state.update({ contextLost: false }),
    );

    const maxTextureSize = this.rendererCtx.renderer.capabilities.maxTextureSize;

    this.state = new ExperienceState({
      phase: ExperiencePhase.BOOTSTRAP,
      vrSupported: false,
      inVr: false,
      isSoftwareGl: this.isSoftwareGl,
      contextLost: false,
      assetsLoaded: 0,
      assetsTotal: 8,
      maxTextureSize,
      pointerLocked: false,
      isGrounded: false,
      descentProgress: 0,
    });

    this.assetManager = new TextureAssetManager(
      this.rendererCtx.maxAnisotropy,
      maxTextureSize,
    );
    this.assetManager.onProgress = (progress) => {
      if (!this.disposed) {
        this.state.update({
          assetsLoaded: progress.loaded,
          assetsTotal: Math.max(progress.total, 8),
        });
      }
    };

    this.world = new WorldCoordinator({
      scene: this.scene,
      renderer: this.rendererCtx.renderer,
      playerRig: this.playerRig,
      assetManager: this.assetManager,
      onPhaseChange: (phase) => this.state.update({ phase }),
      onPointerLockChange: (pointerLocked) =>
        this.state.update({ pointerLocked }),
    });
  }

  public async start(): Promise<void> {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleGlobalShortcut);
    await this.checkVrSupport();

    // Load space photographs first so the user enters space immediately,
    // then preload lunar surface textures in the background.
    await this.assetManager.preloadPriority('space');
    if (this.disposed) return;

    await this.world.init();
    if (this.disposed) return;

    this.assetManager.preloadPriority('surface').catch((err) => {
      console.error('Background lunar surface preload failed:', err);
    });

    if (!this.isSoftwareGl) {
      this.rendererCtx.renderer.compile(this.scene, this.camera);
    }

    this.startLoop();
  }

  public restartDescent(): void {
    if (this.disposed) return;
    this.world.resetToSpaceStart();
  }

  private handleGlobalShortcut = (event: KeyboardEvent): void => {
    if (
      event.code === 'KeyR' &&
      this.state.getSnapshot().phase === ExperiencePhase.SURFACE_EXPLORATION
    ) {
      this.restartDescent();
    }
  };

  private async checkVrSupport(): Promise<void> {
    if (typeof navigator === 'undefined' || !('xr' in navigator) || !navigator.xr) {
      this.state.update({ vrSupported: false });
      return;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      if (!this.disposed) {
        this.state.update({ vrSupported: supported });
      }
    } catch {
      if (!this.disposed) {
        this.state.update({ vrSupported: false });
      }
    }
  }

  public async toggleVrSession(): Promise<void> {
    if (this.activeSession) {
      await this.activeSession.end();
      return;
    }

    if (!navigator.xr) return;

    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor'],
      });

      this.activeSession = session;
      session.addEventListener('end', this.handleVrSessionEnd);

      this.playerRig.setVrMode(true);
      await this.rendererCtx.renderer.xr.setSession(session);
      this.state.update({ inVr: true });

      this.rendererCtx.renderer.setAnimationLoop(this.renderFrame);
    } catch (error) {
      console.error('Unable to start WebXR immersive-vr session:', error);
    }
  }

  private handleVrSessionEnd = (): void => {
    if (this.activeSession) {
      this.activeSession.removeEventListener('end', this.handleVrSessionEnd);
      this.activeSession = null;
    }
    this.playerRig.setVrMode(false);
    this.state.update({ inVr: false });

    if (this.isSoftwareGl && !this.disposed) {
      this.rendererCtx.renderer.setAnimationLoop(null);
      this.scheduleSoftwareTick();
    }
  };

  private startLoop(): void {
    this.clock.start();

    if (this.isSoftwareGl) {
      this.scheduleSoftwareTick();
    } else {
      // Three.js requires setAnimationLoop for WebXR headset frame pacing.
      this.rendererCtx.renderer.setAnimationLoop(this.renderFrame);
    }
  }

  private scheduleSoftwareTick(): void {
    if (this.disposed) return;

    this.renderFrame();
    scheduleAfterDraw(
      this.rendererCtx.renderer,
      () => this.scheduleSoftwareTick(),
      (id) => {
        this.softwareTimerId = id;
      },
    );
  }

  private renderFrame = (): void => {
    if (this.disposed || this.state.getSnapshot().contextLost) return;

    // Clamp delta to avoid physics spikes when switching browser tabs.
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const { phase, inVr, isGrounded } = this.state.getSnapshot();

    this.world.update(delta, phase, inVr);
    this.rendererCtx.renderer.render(this.scene, this.camera);

    // Sync subtle HUD state (descent progress / grounded flag) at ~10 Hz to keep React idle.
    this.hudSyncAccumulator += delta;
    if (this.hudSyncAccumulator >= 0.1 || this.playerRig.isGrounded !== isGrounded) {
      this.hudSyncAccumulator = 0;
      this.state.update({
        isGrounded: this.playerRig.isGrounded,
        descentProgress: this.world.getDescentProgress(),
      });
    }
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.rendererCtx.renderer.setSize(width, height);
  };

  public dispose(): void {
    this.disposed = true;
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleGlobalShortcut);

    if (this.softwareTimerId !== null) {
      window.clearTimeout(this.softwareTimerId);
      this.softwareTimerId = null;
    }

    this.rendererCtx.renderer.setAnimationLoop(null);

    if (this.activeSession) {
      this.activeSession.removeEventListener('end', this.handleVrSessionEnd);
      this.activeSession.end().catch(() => undefined);
      this.activeSession = null;
    }

    this.world.dispose();
    this.assetManager.disposeAll();
    this.rendererCtx.dispose();
  }
}
