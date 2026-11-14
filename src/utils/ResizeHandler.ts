import * as THREE from 'three';

export class ResizeHandler {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean;
  private onResizeCallback?: (width: number, height: number) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    isSoftwareGl: boolean,
    onResize?: (width: number, height: number) => void
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;
    this.onResizeCallback = onResize;

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  public onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );

    if (this.onResizeCallback) {
      this.onResizeCallback(width, height);
    }
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
  }
}
