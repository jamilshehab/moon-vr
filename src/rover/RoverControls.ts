export class RoverControls {
  public throttle: number = 0; // -1 to 1
  public steer: number = 0; // -1 to 1
  public handbrake: boolean = false;

  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
  };

  private onExitCallback?: () => void;

  constructor(onExit?: () => void) {
    this.onExitCallback = onExit;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (['ArrowUp', 'KeyW'].includes(e.code)) this.keys.forward = true;
    if (['ArrowDown', 'KeyS'].includes(e.code)) this.keys.backward = true;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) this.keys.left = true;
    if (['ArrowRight', 'KeyD'].includes(e.code)) this.keys.right = true;
    if (e.code === 'Space') this.keys.brake = true;

    if (e.code === 'KeyE' || e.code === 'Enter') {
      if (this.onExitCallback) {
        this.onExitCallback();
      }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (['ArrowUp', 'KeyW'].includes(e.code)) this.keys.forward = false;
    if (['ArrowDown', 'KeyS'].includes(e.code)) this.keys.backward = false;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) this.keys.left = false;
    if (['ArrowRight', 'KeyD'].includes(e.code)) this.keys.right = false;
    if (e.code === 'Space') this.keys.brake = false;
  }

  public update(): void {
    // Throttle
    if (this.keys.forward) this.throttle = 1;
    else if (this.keys.backward) this.throttle = -0.7; // Lower speed in reverse
    else this.throttle = 0;

    // Steering
    if (this.keys.left) this.steer = 1; // Left turn (counter-clockwise)
    else if (this.keys.right) this.steer = -1; // Right turn
    else this.steer = 0;

    this.handbrake = this.keys.brake;
  }
}
