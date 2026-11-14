export class Time {
  public start: number;
  public current: number;
  public elapsed: number;
  public delta: number;
  public fps: number = 60;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  constructor() {
    this.start = performance.now();
    this.current = this.start;
    this.elapsed = 0;
    this.delta = 0.016;
  }

  public update(): void {
    const now = performance.now();
    this.delta = Math.min((now - this.current) / 1000, 0.1); // Cap delta at 100ms to avoid physics explosions
    this.current = now;
    this.elapsed = (this.current - this.start) / 1000;

    // Calculate rolling FPS
    this.frameCount++;
    if (this.current - this.lastFpsUpdate >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (this.current - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = this.current;
    }
  }
}
