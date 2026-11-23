import * as THREE from 'three';
import type { TextureAssetManager } from '../assets/TextureAssetManager';

/**
 * Custom photographic shader for the 360-degree Apollo 17 Taurus-Littrow horizon tiles.
 * - Keeps the mountains, craters, and sunlit dust crisp in SRGB/ACES Filmic.
 * - Feathers the top black sky edge smoothly into transparency so the distant Earth
 *   and subtle deep-space starfield remain visible overhead.
 * - Supports global uOpacity for the orbital-to-surface transition crossfade.
 */
function createHorizonTileMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    uniforms: {
      uMap: { value: texture },
      uOpacity: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec3 color = texture2D(uMap, vUv).rgb;
        float luma = dot(color, vec3(0.299, 0.587, 0.114));

        // Feather top sky pixels so the black sky above the mountains merges cleanly
        // with the deep-space star dome & Earth photograph overhead.
        float skyKeep = smoothstep(0.015, 0.075, luma);
        float topEdgeFade = smoothstep(1.0, 0.84, vUv.y);
        float bottomBlend = smoothstep(0.0, 0.14, vUv.y);

        // Keep dark crater shadows opaque near the ground, fade only above horizon.
        float alpha = mix(skyKeep, 1.0, 1.0 - smoothstep(0.22, 0.52, vUv.y));
        alpha *= topEdgeFade * bottomBlend * uOpacity;

        if (alpha <= 0.002) discard;

        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Custom photographic shader for the walkable Apollo 11 lunar regolith ground.
 * Blends two rotated, differently scaled samples of the real Apollo 11 photograph
 * to eliminate tiling grids while preserving razor-sharp real dust, pebbles, and shadows.
 */
function createRegolithGroundMaterial(
  groundTex: THREE.Texture,
  rockyTex: THREE.Texture,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uGroundMap: { value: groundTex },
      uRockyMap: { value: rockyTex },
      uOpacity: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uGroundMap;
      uniform sampler2D uRockyMap;
      uniform float uOpacity;
      varying vec3 vWorldPos;

      vec2 rotateUv(vec2 uv, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat2(c, -s, s, c) * uv;
      }

      void main() {
        // Primary close-up Apollo 11 regolith sample (10m x 5m real scale)
        vec2 uvA = vWorldPos.xz * vec2(0.11, 0.22);
        // Secondary rotated sample from the same Apollo 11 photo breaks repetition
        vec2 uvB = rotateUv(vWorldPos.xz, 0.66) * vec2(0.048, 0.096) + vec2(0.37, 0.21);
        // Coarse rocky crater-rim Apollo 15 sample (avoiding bottom 10% film border)
        vec2 uvRockyRaw = fract(rotateUv(vWorldPos.xz, -0.42) * vec2(0.065, 0.13));
        vec2 uvRocky = vec2(uvRockyRaw.x, 0.12 + uvRockyRaw.y * 0.84);

        vec3 sampleA = texture2D(uGroundMap, uvA).rgb;
        vec3 sampleB = texture2D(uGroundMap, uvB).rgb;
        vec3 sampleR = texture2D(uRockyMap, uvRocky).rgb;

        // Blend organically using real photographic luminance variation
        float macroBlend = smoothstep(0.28, 0.62, dot(sampleB, vec3(0.333)));
        vec3 regolith = mix(sampleA, sampleB, 0.42);
        regolith = mix(regolith, sampleR * 1.12, macroBlend * 0.28);

        // Smooth radial horizon fade so the ground merges into the Apollo 17 panorama ring
        float dist = length(vWorldPos.xz);
        float edgeAlpha = smoothstep(138.0, 96.0, dist) * uOpacity;
        if (edgeAlpha <= 0.002) discard;

        gl_FragColor = vec4(regolith, edgeAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Multi-Plane Photographic Depth Ribbons:
 * Projects real cropped Apollo 15 rocky crater-rim photography onto softly feathered
 * depth layers positioned at true metric distances (14m, 26m, 48m) around the player.
 * This provides real stereoscopic depth in VR and natural perspective parallax when walking.
 */
function createDepthRibbonMaterial(
  texture: THREE.Texture,
  cropOffset: THREE.Vector2,
  cropScale: THREE.Vector2,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: texture },
      uCropOffset: { value: cropOffset },
      uCropScale: { value: cropScale },
      uOpacity: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec2 uCropOffset;
      uniform vec2 uCropScale;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec2 sampleUv = uCropOffset + vUv * uCropScale;
        vec3 rockColor = texture2D(uMap, sampleUv).rgb;

        // Feathered silhouette mask: grounded firmly at bottom (vUv.y ~ 0.1),
        // smoothly tapering at sides and undulating top edge with photographic detail.
        float horizMask = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
        float topCurve = 0.62 + 0.26 * sin(vUv.x * 3.14159);
        float luma = dot(rockColor, vec3(0.299, 0.587, 0.114));
        float vertMask = smoothstep(0.0, 0.14, vUv.y) * smoothstep(topCurve + 0.12, topCurve - 0.18, vUv.y);

        // Subtle shadow grounding near the base so rocks sit naturally in the dust.
        float contactShadow = mix(0.76, 1.05, smoothstep(0.0, 0.35, vUv.y));
        float rockDensity = smoothstep(0.04, 0.22, luma + 0.12);

        float alpha = horizMask * vertMask * rockDensity * uOpacity * 0.92;
        if (alpha <= 0.004) discard;

        gl_FragColor = vec4(rockColor * contactShadow, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export interface MoonEnvironmentOptions {
  assetManager: TextureAssetManager;
}

/**
 * MoonEnvironment constructs the photographic lunar surface using
 * multi-layer Image-Based Rendering (zero 3D rock/crater meshes or procedural terrain):
 * 1. Dual 4K Apollo 17 Taurus-Littrow 360-degree panoramic horizon ring.
 * 2. Blended Apollo 11 regolith ground plane directly underfoot.
 * 3. Concentric Apollo 15 rocky crater-rim depth ribbons for real parallax & VR depth.
 */
export class MoonEnvironment {
  public readonly group = new THREE.Group();

  private readonly assetManager: TextureAssetManager;
  private horizonMaterials: THREE.ShaderMaterial[] = [];
  private groundMaterial: THREE.ShaderMaterial | null = null;
  private depthMaterials: THREE.ShaderMaterial[] = [];
  private readonly disposables: { dispose(): void }[] = [];

  constructor({ assetManager }: MoonEnvironmentOptions) {
    this.assetManager = assetManager;
    this.group.name = 'MoonEnvironment';
    this.group.visible = false;
  }

  public async init(): Promise<void> {
    const [westTex, eastTex, groundTex, rockyTex] = await Promise.all([
      this.assetManager.loadManifestAsset('horizonWest'),
      this.assetManager.loadManifestAsset('horizonEast'),
      this.assetManager.loadManifestAsset('regolithGround'),
      this.assetManager.loadManifestAsset('rockyForeground'),
    ]);

    // 1. 360-degree Apollo 17 Taurus-Littrow panoramic horizon cylinder (split into two 4K tiles)
    const horizonRadius = 135;
    const horizonHeight = 36;
    const horizonYOffset = horizonHeight * 0.42;

    const westGeom = new THREE.CylinderGeometry(
      horizonRadius,
      horizonRadius,
      horizonHeight,
      64,
      1,
      true,
      0,
      Math.PI,
    );
    const eastGeom = new THREE.CylinderGeometry(
      horizonRadius,
      horizonRadius,
      horizonHeight,
      64,
      1,
      true,
      Math.PI,
      Math.PI,
    );

    const westMat = createHorizonTileMaterial(westTex);
    const eastMat = createHorizonTileMaterial(eastTex);

    const westMesh = new THREE.Mesh(westGeom, westMat);
    westMesh.position.y = horizonYOffset;
    westMesh.renderOrder = 1;

    const eastMesh = new THREE.Mesh(eastGeom, eastMat);
    eastMesh.position.y = horizonYOffset;
    eastMesh.renderOrder = 1;

    this.group.add(westMesh, eastMesh);
    this.horizonMaterials.push(westMat, eastMat);
    this.disposables.push(westGeom, eastGeom, westMat, eastMat);

    // 2. Walkable photographic Apollo 11 regolith ground plane (y = 0)
    const groundGeom = new THREE.CircleGeometry(140, 96);
    groundGeom.rotateX(-Math.PI / 2);

    this.groundMaterial = createRegolithGroundMaterial(groundTex, rockyTex);
    const groundMesh = new THREE.Mesh(groundGeom, this.groundMaterial);
    groundMesh.position.y = 0;
    groundMesh.renderOrder = 0;
    this.group.add(groundMesh);
    this.disposables.push(groundGeom, this.groundMaterial);

    // 3. Multi-plane photographic depth ribbons (real Apollo 15 crater-rim rocks & boulders)
    //    Arranged in 3 concentric rings so walking/jumping produces genuine motion parallax.
    const ringSpecs = [
      { radius: 16, count: 6, width: 10.5, height: 1.55, yBias: 0.45 },
      { radius: 31, count: 8, width: 16.0, height: 2.6, yBias: 0.85 },
      { radius: 58, count: 8, width: 28.0, height: 4.8, yBias: 1.65 },
    ];

    const ribbonGeom = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.disposables.push(ribbonGeom);

    let seedIndex = 0;
    for (const ring of ringSpecs) {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2 + seedIndex * 0.41;
        const dist = ring.radius + ((seedIndex % 3) - 1) * 2.2;

        // Crop distinct non-bordered sections of Apollo 15 AS15-82-11082 (avoid bottom 10% film mark)
        const cropOffset = new THREE.Vector2(
          (seedIndex * 0.23) % 0.52,
          0.12 + ((seedIndex * 0.17) % 0.35),
        );
        const cropScale = new THREE.Vector2(0.45, 0.38);

        const mat = createDepthRibbonMaterial(rockyTex, cropOffset, cropScale);
        const mesh = new THREE.Mesh(ribbonGeom, mat);

        mesh.position.set(
          Math.cos(angle) * dist,
          ring.yBias,
          Math.sin(angle) * dist,
        );
        mesh.scale.set(ring.width, ring.height, 1);
        // Face inward toward the exploration arena center
        mesh.lookAt(0, ring.yBias, 0);
        mesh.renderOrder = 2;

        this.group.add(mesh);
        this.depthMaterials.push(mat);
        this.disposables.push(mat);
        seedIndex += 1;
      }
    }
  }

  /**
   * Controls visibility and smooth photographic fade-in during landing transition.
   */
  public setVisibilityOpacity(opacity: number): void {
    const clamped = THREE.MathUtils.clamp(opacity, 0, 1);
    this.group.visible = clamped > 0.005;

    for (const mat of this.horizonMaterials) {
      mat.uniforms.uOpacity.value = clamped;
    }
    if (this.groundMaterial) {
      this.groundMaterial.uniforms.uOpacity.value = clamped;
    }
    for (const mat of this.depthMaterials) {
      mat.uniforms.uOpacity.value = clamped;
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
    this.horizonMaterials.length = 0;
    this.depthMaterials.length = 0;
    this.groundMaterial = null;
    this.group.clear();
  }
}
