import * as THREE from 'three';
import { MOONWALK_CONFIG } from '../core/config';
import type { TextureAssetManager } from '../assets/TextureAssetManager';

/**
 * Reusable module-scope math vectors to avoid per-frame garbage collection.
 */
const _camWorldPos = new THREE.Vector3();

/**
 * Circular photographic disc shader.
 * Samples an authentic NASA photograph (Earth or Moon) on a flat plane,
 * masks out the square black borders around the circular planetary limb,
 * and applies Three.js tone mapping + sRGB output color encoding.
 */
function createCircularPhotoMaterial(
  texture: THREE.Texture,
  discRadiusUv = 0.472,
  edgeSoftness = 0.014,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uMap: { value: texture },
      uOpacity: { value: 1.0 },
      uRadius: { value: discRadiusUv },
      uSoftness: { value: edgeSoftness },
      uZoom: { value: 1.0 },
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
      uniform float uRadius;
      uniform float uSoftness;
      uniform float uZoom;
      varying vec2 vUv;

      void main() {
        vec2 centered = (vUv - 0.5) / uZoom + 0.5;
        float dist = length(vUv - 0.5);
        float alpha = smoothstep(uRadius + uSoftness, uRadius - uSoftness, dist) * uOpacity;
        if (alpha <= 0.002) discard;

        vec4 texel = texture2D(uMap, clamp(centered, 0.0, 1.0));
        gl_FragColor = vec4(texel.rgb, alpha);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Black-keyed additive star-layer shader for photographic parallax sleeves.
 * Extracts genuine stars from slices of the 8K astronomical starfield image
 * while leaving dark sky pixels completely transparent.
 */
function createStarParallaxMaterial(
  texture: THREE.Texture,
  uvOffset: THREE.Vector2,
  uvScale: THREE.Vector2,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: texture },
      uUvOffset: { value: uvOffset },
      uUvScale: { value: uvScale },
      uOpacity: { value: 0.85 },
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
      uniform vec2 uUvOffset;
      uniform vec2 uUvScale;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec2 sampleUv = fract(vUv * uUvScale + uUvOffset);
        vec3 starColor = texture2D(uMap, sampleUv).rgb;

        // Key out dark cosmic background so only crisp photographic stars appear.
        float luma = dot(starColor, vec3(0.299, 0.587, 0.114));
        float starMask = smoothstep(0.06, 0.28, luma);

        // Radial fade near tunnel center/edges so parallax layers never show plane borders.
        vec2 edge = abs(vUv - 0.5) * 2.0;
        float vignette = smoothstep(1.0, 0.65, max(edge.x, edge.y));
        float centerHole = smoothstep(0.08, 0.28, length(vUv - 0.5));

        vec3 finalRgb = starColor * starMask * vignette * centerHole * uOpacity * 1.45;
        if (dot(finalRgb, finalRgb) < 0.0001) discard;

        gl_FragColor = vec4(finalRgb, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export interface SpaceEnvironmentOptions {
  assetManager: TextureAssetManager;
}

/**
 * SpaceEnvironment builds the 100% photographic outer-space experience:
 * - 8K 360-degree equirectangular starfield sky dome.
 * - Intermediate photographic star-parallax curtains along the descent path.
 * - Distant Earth photographic disc (Apollo 17 Blue Marble).
 * - Approaching Moon global disc (LRO 4K) + orbital close-up (Apollo 10 Crater Schmidt).
 *
 * Strictly zero 3D planetary spheres or procedural star dots.
 */
export class SpaceEnvironment {
  public readonly group = new THREE.Group();

  private readonly assetManager: TextureAssetManager;
  private starDomeMesh: THREE.Mesh | null = null;
  private starDomeMaterial: THREE.MeshBasicMaterial | null = null;
  private parallaxLayers: THREE.Mesh[] = [];
  private parallaxMaterials: THREE.ShaderMaterial[] = [];

  private earthMesh: THREE.Mesh | null = null;
  private earthMaterial: THREE.ShaderMaterial | null = null;

  private moonDiscMesh: THREE.Mesh | null = null;
  private moonDiscMaterial: THREE.ShaderMaterial | null = null;

  private moonApproachMesh: THREE.Mesh | null = null;
  private moonApproachMaterial: THREE.ShaderMaterial | null = null;

  private readonly disposables: { dispose(): void }[] = [];

  constructor({ assetManager }: SpaceEnvironmentOptions) {
    this.assetManager = assetManager;
    this.group.name = 'SpaceEnvironment';
  }

  public async init(): Promise<void> {
    const [starTex, earthTex, moonFarTex, moonApproachTex] = await Promise.all([
      this.assetManager.loadManifestAsset('starfield'),
      this.assetManager.loadManifestAsset('earth'),
      this.assetManager.loadManifestAsset('moonFar'),
      this.assetManager.loadManifestAsset('moonApproach'),
    ]);

    // 1. 360-degree equirectangular starfield sky dome (surrounds user in VR & desktop)
    const domeGeom = new THREE.SphereGeometry(MOONWALK_CONFIG.space.starDomeRadius, 64, 32);
    this.starDomeMaterial = new THREE.MeshBasicMaterial({
      map: starTex,
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      opacity: 1.0,
    });
    this.starDomeMesh = new THREE.Mesh(domeGeom, this.starDomeMaterial);
    this.starDomeMesh.name = 'PhotographicStarDome';
    this.starDomeMesh.renderOrder = -10;
    this.group.add(this.starDomeMesh);
    this.disposables.push(domeGeom, this.starDomeMaterial);

    // 2. Photographic star-parallax curtains along the descent corridor
    //    These carry cropped regions of the real 8K starfield so stars stream past
    //    with genuine binocular VR depth as PlayerRig falls toward the Moon.
    const curtainConfigs = [
      { z: 215, y: 20, size: 110, offset: new THREE.Vector2(0.12, 0.25), scale: new THREE.Vector2(0.32, 0.45) },
      { z: 175, y: 19, size: 135, offset: new THREE.Vector2(0.48, 0.18), scale: new THREE.Vector2(0.35, 0.48) },
      { z: 135, y: 18, size: 155, offset: new THREE.Vector2(0.73, 0.42), scale: new THREE.Vector2(0.30, 0.44) },
      { z: 95, y: 17, size: 175, offset: new THREE.Vector2(0.24, 0.60), scale: new THREE.Vector2(0.36, 0.50) },
      { z: 55, y: 15, size: 195, offset: new THREE.Vector2(0.61, 0.30), scale: new THREE.Vector2(0.34, 0.46) },
    ];

    const curtainGeom = new THREE.PlaneGeometry(1, 1);
    this.disposables.push(curtainGeom);

    for (const cfg of curtainConfigs) {
      const mat = createStarParallaxMaterial(starTex, cfg.offset, cfg.scale);
      const mesh = new THREE.Mesh(curtainGeom, mat);
      mesh.position.set(0, cfg.y, cfg.z);
      mesh.scale.set(cfg.size, cfg.size, 1);
      mesh.renderOrder = -5;
      this.group.add(mesh);
      this.parallaxLayers.push(mesh);
      this.parallaxMaterials.push(mat);
      this.disposables.push(mat);
    }

    // 3. Distant Earth photographic disc (Apollo 17 Blue Marble, AS17-148-22727)
    const earthGeom = new THREE.PlaneGeometry(
      MOONWALK_CONFIG.space.earthDiscDiameter,
      MOONWALK_CONFIG.space.earthDiscDiameter,
    );
    this.earthMaterial = createCircularPhotoMaterial(earthTex, 0.455, 0.015);
    this.earthMesh = new THREE.Mesh(earthGeom, this.earthMaterial);
    this.earthMesh.position.set(
      MOONWALK_CONFIG.space.earthPos.x,
      MOONWALK_CONFIG.space.earthPos.y,
      MOONWALK_CONFIG.space.earthPos.z,
    );
    this.earthMesh.name = 'PhotographicEarthDisc';
    this.earthMesh.renderOrder = -2;
    this.group.add(this.earthMesh);
    this.disposables.push(earthGeom, this.earthMaterial);

    // 4. Approaching Moon global photographic disc (LRO 4K mosaic)
    //    Radius 0.468 cleanly trims out the tiny bottom-left NASA caption in the source mosaic.
    const moonGeom = new THREE.PlaneGeometry(
      MOONWALK_CONFIG.space.moonDiscDiameter,
      MOONWALK_CONFIG.space.moonDiscDiameter,
    );
    this.moonDiscMaterial = createCircularPhotoMaterial(moonFarTex, 0.468, 0.012);
    this.moonDiscMesh = new THREE.Mesh(moonGeom, this.moonDiscMaterial);
    this.moonDiscMesh.position.set(
      MOONWALK_CONFIG.space.moonPos.x,
      MOONWALK_CONFIG.space.moonPos.y,
      MOONWALK_CONFIG.space.moonPos.z,
    );
    this.moonDiscMesh.name = 'PhotographicMoonDisc';
    this.moonDiscMesh.renderOrder = -1;
    this.group.add(this.moonDiscMesh);
    this.disposables.push(moonGeom, this.moonDiscMaterial);

    // 5. Close Orbital Approach Crater Photograph (Apollo 10 AS10-34-5162)
    //    Layered directly in front of the global Moon disc to resolve razor-sharp
    //    craters as the user plunges down toward the lunar surface.
    const approachGeom = new THREE.PlaneGeometry(
      MOONWALK_CONFIG.space.moonDiscDiameter * 1.15,
      MOONWALK_CONFIG.space.moonDiscDiameter * 1.15,
    );
    this.moonApproachMaterial = createCircularPhotoMaterial(moonApproachTex, 0.475, 0.06);
    this.moonApproachMaterial.uniforms.uOpacity.value = 0.0;
    this.moonApproachMesh = new THREE.Mesh(approachGeom, this.moonApproachMaterial);
    this.moonApproachMesh.position.set(
      MOONWALK_CONFIG.space.moonPos.x,
      MOONWALK_CONFIG.space.moonPos.y,
      MOONWALK_CONFIG.space.moonPos.z + 1.5,
    );
    this.moonApproachMesh.name = 'PhotographicMoonApproachLayer';
    this.moonApproachMesh.renderOrder = 0;
    this.group.add(this.moonApproachMesh);
    this.disposables.push(approachGeom, this.moonApproachMaterial);
  }

  /**
   * Keeps the infinite star dome centered on the player while orienting
   * the flat Earth and Moon photographic planes cleanly toward the viewer.
   */
  public update(
    camera: THREE.Camera,
    playerWorldPos: THREE.Vector3,
    fallProgress: number,
    transitionProgress: number,
    surfaceMode: boolean,
  ): void {
    camera.getWorldPosition(_camWorldPos);

    if (this.starDomeMesh && this.starDomeMaterial) {
      // Lock infinite starfield dome to the viewer's position so it never moves closer.
      this.starDomeMesh.position.copy(playerWorldPos);
      // Keep deep-space stars subtle overhead once standing on the sunlit lunar surface,
      // matching Apollo camera exposure where the sky looks mostly black.
      this.starDomeMaterial.opacity = surfaceMode
        ? 0.22
        : 1.0 - transitionProgress * 0.78;
    }

    // Parallax star curtains fade out before touchdown so they never clip the lunar floor.
    const parallaxOpacity = surfaceMode
      ? 0
      : Math.max(0, 1 - THREE.MathUtils.smoothstep(fallProgress, 0.72, 0.96)) * 0.85;
    for (let i = 0; i < this.parallaxLayers.length; i++) {
      const layer = this.parallaxLayers[i];
      const mat = this.parallaxMaterials[i];
      layer.visible = parallaxOpacity > 0.01;
      mat.uniforms.uOpacity.value = parallaxOpacity;
    }

    // Orient flat Earth photograph toward camera; smoothly elevate it into the lunar sky during transition.
    if (this.earthMesh && this.earthMaterial) {
      const earthBlend = surfaceMode ? 1 : transitionProgress;
      this.earthMesh.position.set(
        THREE.MathUtils.lerp(MOONWALK_CONFIG.space.earthPos.x, -180, earthBlend),
        THREE.MathUtils.lerp(MOONWALK_CONFIG.space.earthPos.y, 138, earthBlend),
        THREE.MathUtils.lerp(MOONWALK_CONFIG.space.earthPos.z, -350, earthBlend),
      );
      this.earthMesh.scale.setScalar(THREE.MathUtils.lerp(1.0, 0.36, earthBlend));
      this.earthMaterial.uniforms.uOpacity.value = 0.95;
      this.earthMesh.lookAt(_camWorldPos);
    }

    // Approaching Moon photographic discs grow naturally as the camera descends,
    // crossfading into the high-resolution Apollo 10 orbital crater photograph.
    const spaceFadeOut = surfaceMode ? 0 : 1 - transitionProgress;

    if (this.moonDiscMesh && this.moonDiscMaterial) {
      this.moonDiscMesh.visible = spaceFadeOut > 0.01;
      if (this.moonDiscMesh.visible) {
        this.moonDiscMesh.lookAt(_camWorldPos);
        const approachScale = 1 + fallProgress * 1.45 + transitionProgress * 2.2;
        this.moonDiscMesh.scale.setScalar(approachScale);
        this.moonDiscMaterial.uniforms.uOpacity.value = spaceFadeOut;
      }
    }

    if (this.moonApproachMesh && this.moonApproachMaterial) {
      const approachBlend = THREE.MathUtils.smoothstep(fallProgress, 0.42, 0.92);
      const approachOpacity = approachBlend * spaceFadeOut;
      this.moonApproachMesh.visible = approachOpacity > 0.01;
      if (this.moonApproachMesh.visible) {
        this.moonApproachMesh.lookAt(_camWorldPos);
        const scale = 0.92 + fallProgress * 1.9 + transitionProgress * 3.1;
        this.moonApproachMesh.scale.setScalar(scale);
        this.moonApproachMaterial.uniforms.uZoom.value =
          1.0 + approachBlend * 0.55 + transitionProgress * 0.85;
        this.moonApproachMaterial.uniforms.uOpacity.value = approachOpacity;
      }
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
    this.parallaxLayers.length = 0;
    this.parallaxMaterials.length = 0;
    this.group.clear();
  }
}
