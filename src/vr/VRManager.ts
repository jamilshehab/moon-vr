import * as THREE from 'three';
import { VRControls } from './VRControls';
import { Player } from '../player/Player';
import { Rover } from '../rover/Rover';

export class VRManager {
  public isSupported: boolean = false;
  public isPresenting: boolean = false;
  public vrControls: VRControls | null = null;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private player: Player;
  private rover: Rover;
  private currentSession: XRSession | null = null;
  private onStateChangeCallback?: (isSupported: boolean, isPresenting: boolean) => void;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    player: Player,
    rover: Rover,
    onStateChange?: (isSupported: boolean, isPresenting: boolean) => void
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.player = player;
    this.rover = rover;
    this.onStateChangeCallback = onStateChange;

    this.checkSupport();
  }

  private async checkSupport(): Promise<void> {
    if ('xr' in navigator && navigator.xr) {
      try {
        this.isSupported = await navigator.xr.isSessionSupported('immersive-vr');
      } catch (e) {
        this.isSupported = false;
      }
    } else {
      this.isSupported = false;
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.isSupported, this.isPresenting);
    }
  }

  public async toggleVR(): Promise<void> {
    if (!this.isSupported || !navigator.xr) {
      return;
    }

    if (this.isPresenting && this.currentSession) {
      await this.currentSession.end();
      return;
    }

    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });

      this.currentSession = session;
      await this.renderer.xr.setSession(session);

      this.isPresenting = true;
      if (!this.vrControls) {
        this.vrControls = new VRControls(this.renderer, this.scene, this.player, this.rover);
      }

      session.addEventListener('end', () => {
        this.isPresenting = false;
        this.currentSession = null;
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(this.isSupported, this.isPresenting);
        }
      });

      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(this.isSupported, this.isPresenting);
      }
    } catch (err) {
      console.warn('Failed to start WebXR session:', err);
      this.isPresenting = false;
    }
  }

  public update(delta: number): void {
    if (this.isPresenting && this.vrControls) {
      this.vrControls.update(delta);
    }
  }
}
