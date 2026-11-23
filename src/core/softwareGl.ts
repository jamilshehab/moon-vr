import * as THREE from 'three';

/**
 * Detects whether the browser is using a CPU-based software WebGL rasterizer
 * (such as SwiftShader, llvmpipe, or WARP).
 *
 * We inspect the WebGL GPU renderer string rather than navigator.userAgent.
 * This allows us to keep identical scene content and logic everywhere while
 * gracefully pacing rendering cost (pixelRatio, MSAA, frame pacing) on software GPUs.
 */
export function detectSoftwareWebGL(): boolean {
  const probeCanvas = document.createElement('canvas');
  const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
  if (!gl) return true;

  const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
  const rendererParam = debugExt ? debugExt.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpuString = String(gl.getParameter(rendererParam) || '');

  // Explicitly release the temporary probe WebGL context immediately.
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuString);
}

/**
 * Waits for the GPU command queue to finish drawing on software WebGL
 * before scheduling the next animation tick, preventing CPU main-thread starvation.
 */
export function scheduleAfterDraw(
  renderer: THREE.WebGLRenderer,
  callback: () => void,
  registerTimer: (id: number) => void,
): void {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (typeof gl.fenceSync !== 'function') {
    registerTimer(window.setTimeout(callback, 80));
    return;
  }

  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();

  const poll = () => {
    const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
    if (status === gl.UNSIGNALED) {
      registerTimer(window.setTimeout(poll, 5));
    } else {
      if (sync) gl.deleteSync(sync);
      registerTimer(window.setTimeout(callback, 80));
    }
  };

  registerTimer(window.setTimeout(poll, 5));
}
