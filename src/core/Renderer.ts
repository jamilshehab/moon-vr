import * as THREE from 'three';

export class Renderer {
  public instance: THREE.WebGLRenderer;
  public isSoftwareGl: boolean;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch (e) {
        return false;
      }
    })();

    this.instance = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });

    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );

    // Color and exposure pipeline
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1.1;

    // Shadow mapping
    this.instance.shadowMap.enabled = !this.isSoftwareGl;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;

    // WebXR capability
    this.instance.xr.enabled = true;

    this.container.appendChild(this.instance.domElement);
  }

  public render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.instance.render(scene, camera);
  }

  public dispose(): void {
    this.instance.dispose();
    if (this.instance.domElement && this.instance.domElement.parentNode) {
      this.instance.domElement.parentNode.removeChild(this.instance.domElement);
    }
  }
}
