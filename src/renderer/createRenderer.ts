import * as THREE from 'three';
import { MOONWALK_CONFIG } from '../core/config';

export interface RendererContext {
  renderer: THREE.WebGLRenderer;
  maxAnisotropy: number;
  dispose: () => void;
}

/**
 * Creates and configures the Three.js WebGLRenderer for both desktop and WebXR.
 *
 * Key photographic and VR decisions:
 * 1. SRGBColorSpace output ensures real NASA photographs display with accurate gamma/contrast.
 * 2. ACESFilmicToneMapping preserves highlight roll-off without blowing out sunlit lunar regolith.
 * 3. renderer.xr.enabled = true activates Three.js's built-in WebXR stereo & pose pipeline.
 */
export function createRenderer(
  container: HTMLElement,
  isSoftwareGl: boolean,
  onContextLost?: () => void,
  onContextRestored?: () => void,
): RendererContext {
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    stencil: false,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = MOONWALK_CONFIG.rendering.exposure;

  const pixelRatio = isSoftwareGl
    ? 1
    : Math.min(window.devicePixelRatio || 1, MOONWALK_CONFIG.rendering.maxPixelRatio);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);

  // Enable WebXR session management inside Three.js.
  renderer.xr.enabled = true;
  // Use 'local-floor' reference space so Y=0 maps to the user's real-world floor in VR.
  renderer.xr.setReferenceSpaceType('local-floor');

  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.outline = 'none';

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    onContextLost?.();
  };

  const handleContextRestored = () => {
    onContextRestored?.();
  };

  canvas.addEventListener('webglcontextlost', handleContextLost);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);

  container.appendChild(canvas);

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  return {
    renderer,
    maxAnisotropy,
    dispose: () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    },
  };
}
