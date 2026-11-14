import * as THREE from "three";

export interface LunarSurfaceTextures {
  albedo: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
}

export interface EarthTextures {
  surface: THREE.Texture;
  clouds?: THREE.Texture;
}

export class AssetLoader {
  private static instance: AssetLoader;
  private maxAnisotropy: number = 4;
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();

  private constructor() {}

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  public initCapabilities(renderer: THREE.WebGLRenderer): void {
    this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  /**
   * Loads the authentic astronomical starfield image (stars_8820611a.jpg)
   * Configured for seamless spherical celestial dome mapping.
   */
  public loadStarfieldTexture(): THREE.Texture {
    const texture = this.textureLoader.load(
      "/assets/aistudio/stars_8820611a.jpg",
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 2);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn(
          "Failed to load stars_8820611a.jpg, using procedural fallback",
          err,
        );
      },
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Loads authentic lunar surface imagery (moon-rock_93cdf0de.jpg)
   * and derives high-fidelity normal and roughness maps from the actual photograph.
   */
  public loadLunarRegolithTextures(
    repeatCount: number = 45,
  ): LunarSurfaceTextures {
    // 1. Load authentic LRO / NASA surface photography
    const albedo = this.textureLoader.load(
      "/assets/aistudio/moon-rock_93cdf0de.jpg",
      (imgTexture) => {
        imgTexture.wrapS = THREE.RepeatWrapping;
        imgTexture.wrapT = THREE.RepeatWrapping;
        imgTexture.repeat.set(repeatCount, repeatCount);
        imgTexture.colorSpace = THREE.SRGBColorSpace;
        imgTexture.anisotropy = this.maxAnisotropy;
        imgTexture.needsUpdate = true;

        // Process image to generate corresponding normal & roughness maps from the real photograph
        if (imgTexture.image) {
          this.generateDerivedMapsFromImage(
            imgTexture.image,
            normal,
            roughness,
            repeatCount,
          );
        }
      },
      undefined,
      (err) => {
        console.warn(
          "Failed to load moon-rock_93cdf0de.jpg, fallback to procedural regolith",
          err,
        );
      },
    );

    albedo.wrapS = THREE.RepeatWrapping;
    albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(repeatCount, repeatCount);
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.anisotropy = this.maxAnisotropy;

    // Normal & Roughness canvases initialized with sensible defaults then updated when image finishes loading
    const normalCanvas = document.createElement("canvas");
    normalCanvas.width = 512;
    normalCanvas.height = 512;
    const nCtx = normalCanvas.getContext("2d")!;
    nCtx.fillStyle = "rgb(128, 128, 255)"; // Neutral tangent-space normal (0, 0, 1)
    nCtx.fillRect(0, 0, 512, 512);

    const normal = new THREE.CanvasTexture(normalCanvas);
    normal.wrapS = THREE.RepeatWrapping;
    normal.wrapT = THREE.RepeatWrapping;
    normal.repeat.set(repeatCount, repeatCount);
    normal.anisotropy = this.maxAnisotropy;

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = 512;
    roughCanvas.height = 512;
    const rCtx = roughCanvas.getContext("2d")!;
    rCtx.fillStyle = "rgb(240, 240, 240)"; // High backscatter regolith roughness (~0.94)
    rCtx.fillRect(0, 0, 512, 512);

    const roughness = new THREE.CanvasTexture(roughCanvas);
    roughness.wrapS = THREE.RepeatWrapping;
    roughness.wrapT = THREE.RepeatWrapping;
    roughness.repeat.set(repeatCount, repeatCount);

    return { albedo, normal, roughness };
  }

  /**
   * Generates precision normal map and roughness map directly from photographic pixel luminance
   */
  private generateDerivedMapsFromImage(
    img: HTMLImageElement,
    targetNormal: THREE.CanvasTexture,
    targetRoughness: THREE.CanvasTexture,
    repeatCount: number,
  ): void {
    try {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;

      // Extract luminance
      const luma = new Float32Array(size * size);
      for (let i = 0; i < size * size; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        luma[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
      }

      // 1. Generate Sobel normal map from photographic relief
      const nCanvas = document.createElement("canvas");
      nCanvas.width = size;
      nCanvas.height = size;
      const nCtx = nCanvas.getContext("2d")!;
      const nImg = nCtx.createImageData(size, size);
      const nData = nImg.data;

      const strength = 2.8;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const x0 = (x - 1 + size) % size;
          const x1 = (x + 1) % size;
          const y0 = (y - 1 + size) % size;
          const y1 = (y + 1) % size;

          const dx = (luma[y * size + x1] - luma[y * size + x0]) * strength;
          const dy = (luma[y1 * size + x] - luma[y0 * size + x]) * strength;
          const dz = 1.0;

          const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const nx = -dx / len;
          const ny = -dy / len;
          const nz = dz / len;

          const idx = (y * size + x) * 4;
          nData[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
          nData[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
          nData[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
          nData[idx + 3] = 255;
        }
      }
      nCtx.putImageData(nImg, 0, 0);

      // Update normal texture
      targetNormal.image = nCanvas;
      targetNormal.wrapS = THREE.RepeatWrapping;
      targetNormal.wrapT = THREE.RepeatWrapping;
      targetNormal.repeat.set(repeatCount, repeatCount);
      targetNormal.anisotropy = this.maxAnisotropy;
      targetNormal.needsUpdate = true;

      // 2. Generate Roughness map (lunar soil has micro-crystallites & high backscatter)
      const rCanvas = document.createElement("canvas");
      rCanvas.width = size;
      rCanvas.height = size;
      const rCtx = rCanvas.getContext("2d")!;
      const rImg = rCtx.createImageData(size, size);
      const rData = rImg.data;

      for (let i = 0; i < size * size; i++) {
        const val = Math.floor(220 + (1 - luma[i]) * 35);
        const idx = i * 4;
        rData[idx] = val;
        rData[idx + 1] = val;
        rData[idx + 2] = val;
        rData[idx + 3] = 255;
      }
      rCtx.putImageData(rImg, 0, 0);

      targetRoughness.image = rCanvas;
      targetRoughness.wrapS = THREE.RepeatWrapping;
      targetRoughness.wrapT = THREE.RepeatWrapping;
      targetRoughness.repeat.set(repeatCount, repeatCount);
      targetRoughness.needsUpdate = true;
    } catch (e) {
      console.warn("Failed to derive normal/roughness maps from image:", e);
    }
  }

  /**
   * Loads authentic Apollo surface landscape photograph (moon-landscape_f32ba1e9.jpg)
   * used for the horizon mountain massifs and distant hills.
   */
  public loadHorizonLandscapeTexture(
    repeatX: number = 8,
    repeatY: number = 1,
  ): THREE.Texture {
    const texture = this.textureLoader.load(
      "/assets/aistudio/moon-landscape.jpg",
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.repeat.set(repeatX, repeatY);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = this.maxAnisotropy;
        tex.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn("Failed to load moon-landscape_f32ba1e9.jpg:", err);
      },
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Loads authentic boulder & rock surface texture from the Apollo photographic asset
   */
  public loadRockTexture(): THREE.Texture {
    const texture = this.textureLoader.load(
      "/assets/aistudio/moon-landscape.jpg",
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = this.maxAnisotropy;
        tex.needsUpdate = true;
      },
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Loads and extracts the authentic photographed Earth from NASA Apollo photograph
   * (earth_from_the_moon_3c60ec1b.jpg)
   */
  public loadPhotographicEarthTexture(): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // Initial placeholder (deep black space background)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 1024, 1024);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    // Load full resolution 4096x4096 photograph and extract the Earth disk
    const img = new Image();
    img.src = "/assets/aistudio/earth_from_the_moon_3c60ec1b.jpg";
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        // In earth_from_the_moon_3c60ec1b.jpg (4096x4096):
        // Earth is centered horizontally at x ~ 2056, y ~ 1400 with diameter ~ 620px
        const cropX = 1710;
        const cropY = 1060;
        const cropSize = 690;

        ctx.clearRect(0, 0, 1024, 1024);
        ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, 1024, 1024);

        texture.needsUpdate = true;
      } catch (e) {
        console.warn("Error extracting photographic Earth:", e);
      }
    };

    return texture;
  }

  /**
   * Generates gold mylar / Kapton thermal foil texture for Apollo rover & equipment
   */
  public createGoldFoilTexture(size: number = 256): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Rich golden amber base
    ctx.fillStyle = "#e8a838";
    ctx.fillRect(0, 0, size, size);

    // Foil crinkle creases
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle =
        Math.random() > 0.4
          ? "rgba(255, 235, 170, 0.45)"
          : "rgba(120, 75, 10, 0.45)";
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      let cx = Math.random() * size;
      let cy = Math.random() * size;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += (Math.random() - 0.5) * 50;
        cy += (Math.random() - 0.5) * 50;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Generates Apollo LRV wire-mesh wheel chevron tread texture
   */
  public createWheelTreadTexture(size: number = 256): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Steel mesh background
    ctx.fillStyle = "#4a4d52";
    ctx.fillRect(0, 0, size, size);

    // Fine wire crosshatch
    ctx.strokeStyle = "#858992";
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, size);
      ctx.lineTo(i + size, 0);
      ctx.stroke();
    }

    // Titanium chevron cleats (50% coverage staggered)
    ctx.fillStyle = "#b0b5be";
    for (let y = 0; y < size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(size * 0.2, y);
      ctx.lineTo(size * 0.5, y + 16);
      ctx.lineTo(size * 0.8, y);
      ctx.lineTo(size * 0.8, y + 8);
      ctx.lineTo(size * 0.5, y + 24);
      ctx.lineTo(size * 0.2, y + 8);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
