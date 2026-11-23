/**
 * ExperiencePhase models the continuous narrative arc of MoonWalk VR:
 * - BOOTSTRAP: Engine & photographic asset preparation.
 * - SPACE_IDLE: User floats in outer space observing stars, Earth, and Moon.
 * - FALLING: Automatic descent through space toward the Moon.
 * - TRANSITION: Seamless photographic blend from orbital approach into the lunar surface.
 * - SURFACE_EXPLORATION: User has landed and can walk, look around, and jump freely.
 */
export enum ExperiencePhase {
  BOOTSTRAP = 'BOOTSTRAP',
  SPACE_IDLE = 'SPACE_IDLE',
  FALLING = 'FALLING',
  TRANSITION = 'TRANSITION',
  SURFACE_EXPLORATION = 'SURFACE_EXPLORATION',
}

export interface ExperienceSnapshot {
  phase: ExperiencePhase;
  vrSupported: boolean;
  inVr: boolean;
  isSoftwareGl: boolean;
  contextLost: boolean;
  assetsLoaded: number;
  assetsTotal: number;
  maxTextureSize: number;
  pointerLocked: boolean;
  isGrounded: boolean;
  descentProgress: number;
}

type Listener = (snapshot: ExperienceSnapshot) => void;

/**
 * Lightweight observable store bridging the imperative Three.js loop
 * with the declarative React UI overlay without re-mounting WebGL.
 */
export class ExperienceState {
  private snapshot: ExperienceSnapshot;
  private readonly listeners = new Set<Listener>();

  constructor(initial: ExperienceSnapshot) {
    this.snapshot = { ...initial };
  }

  public getSnapshot(): ExperienceSnapshot {
    return this.snapshot;
  }

  public update(patch: Partial<ExperienceSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
