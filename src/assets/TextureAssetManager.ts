import * as THREE from 'three';
import {
  PHOTOGRAPHIC_MANIFEST,
  type PhotographicAssetKey,
  type PhotographicAssetSpec,
} from './photographicManifest';

export interface TextureLoadOptions {
  /** Use SRGBColorSpace for photographic color images; NoColorSpace for data/depth maps. */
  isColorData?: boolean;
  /** ClampToEdge prevents visible edge seams on celestial billboards & panoramas. */
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
  /** Override anisotropy (defaults to renderer max anisotropy for crisp grazing angles). */
  anisotropy?: number;
}

export interface LoadProgressSnapshot {
  loaded: number;
  total: number;
  ratio: number;
  activeUrl: string | null;
}

/**
 * TextureAssetManager centralizes photographic asset loading and GPU quality settings.
 *
 * Every photograph loaded into MoonWalk VR passes through here so that:
 * - Color photographs always use THREE.SRGBColorSpace (no washed-out linear gamma).
 * - Trilinear mipmapping (LinearMipmapLinearFilter) prevents shimmering stars/dust.
 * - Maximum anisotropic filtering keeps lunar ground photos sharp at shallow grazing angles.
 * - Priority tiers load space imagery first, then stream surface imagery seamlessly.
 */
export class TextureAssetManager {
  private readonly manager: THREE.LoadingManager;
  private readonly loader: THREE.TextureLoader;
  private readonly cache = new Map<string, THREE.Texture>();
  private readonly maxAnisotropy: number;
  private readonly maxTextureSize: number;

  public onProgress?: (snapshot: LoadProgressSnapshot) => void;

  constructor(maxAnisotropy: number, maxTextureSize = 8192) {
    this.maxAnisotropy = Math.max(1, maxAnisotropy);
    this.maxTextureSize = maxTextureSize;
    this.manager = new THREE.LoadingManager();
    this.loader = new THREE.TextureLoader(this.manager);

    this.manager.onProgress = (url, loaded, total) => {
      this.onProgress?.({
        loaded,
        total,
        ratio: total > 0 ? loaded / total : 1,
        activeUrl: url,
      });
    };
  }

  public getMaxTextureSize(): number {
    return this.maxTextureSize;
  }

  public async loadManifestAsset(key: PhotographicAssetKey): Promise<THREE.Texture> {
    const spec: PhotographicAssetSpec = PHOTOGRAPHIC_MANIFEST[key];
    return this.loadTexture(spec.url, {
      isColorData: spec.isColorData,
      wrapS: spec.wrapS,
      wrapT: spec.wrapT,
    });
  }

  public async preloadPriority(
    priority: 'space' | 'surface',
  ): Promise<Record<string, THREE.Texture>> {
    const entries = (
      Object.entries(PHOTOGRAPHIC_MANIFEST) as [
        PhotographicAssetKey,
        PhotographicAssetSpec,
      ][]
    ).filter(([, spec]) => spec.priority === priority);

    const results = await Promise.all(
      entries.map(async ([key]) => [key, await this.loadManifestAsset(key)] as const),
    );
    return Object.fromEntries(results);
  }

  public getCached(key: PhotographicAssetKey): THREE.Texture | undefined {
    return this.cache.get(PHOTOGRAPHIC_MANIFEST[key].url);
  }

  public loadTexture(url: string, options: TextureLoadOptions = {}): Promise<THREE.Texture> {
    const existing = this.cache.get(url);
    if (existing) {
      return Promise.resolve(existing);
    }

    const {
      isColorData = true,
      wrapS = THREE.ClampToEdgeWrapping,
      wrapT = THREE.ClampToEdgeWrapping,
      anisotropy = this.maxAnisotropy,
    } = options;

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          texture.colorSpace = isColorData ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          texture.wrapS = wrapS;
          texture.wrapT = wrapT;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = Math.min(anisotropy, this.maxAnisotropy);
          texture.needsUpdate = true;

          this.cache.set(url, texture);
          resolve(texture);
        },
        undefined,
        (err) => {
          reject(new Error(`Failed to load photographic texture at "${url}": ${String(err)}`));
        },
      );
    });
  }

  public disposeAll(): void {
    this.cache.forEach((texture) => texture.dispose());
    this.cache.clear();
  }
}
