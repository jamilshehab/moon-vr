import * as THREE from 'three';

export interface PhotographicAssetSpec {
  id: string;
  url: string;
  title: string;
  source: string;
  resolution: string;
  projection: 'equirectangular-dome' | 'circular-disc' | 'cylindrical-tile' | 'ground-plane';
  isColorData: boolean;
  wrapS: THREE.Wrapping;
  wrapT: THREE.Wrapping;
  priority: 'space' | 'surface';
}

/**
 * Authoritative registry of every real photograph used in MoonWalk VR.
 *
 * Every asset is sourced from NASA (Apollo 10, Apollo 11, Apollo 15, Apollo 17, LRO)
 * or astronomical sky surveys, stored locally in public/images/ to avoid CORS errors
 * during WebGL texture upload and guarantee zero external network failures.
 */
export const PHOTOGRAPHIC_MANIFEST = {
  starfield: {
    id: 'starfield',
    url: '/images/space/starfield_8k.jpg',
    title: 'Deep-Sky Starfield & Milky Way Panorama',
    source: 'Tycho-2 / Gaia Astronomical Equirectangular Survey',
    resolution: '8192 × 4096',
    projection: 'equirectangular-dome',
    isColorData: true,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    priority: 'space',
  },
  earth: {
    id: 'earth',
    url: '/images/earth/earth_apollo17_2k.jpg',
    title: 'Earth — The Blue Marble (AS17-148-22727)',
    source: 'NASA Apollo 17 Mission Photography (Public Domain)',
    resolution: '2048 × 2048',
    projection: 'circular-disc',
    isColorData: true,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    priority: 'space',
  },
  moonFar: {
    id: 'moonFar',
    url: '/images/moon/moon_lro_4k.jpg',
    title: 'Lunar Nearside Global Mosaic',
    source: 'NASA Lunar Reconnaissance Orbiter (LRO) WAC (Public Domain)',
    resolution: '4096 × 4096',
    projection: 'circular-disc',
    isColorData: true,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    priority: 'space',
  },
  moonApproach: {
    id: 'moonApproach',
    url: '/images/moon/moon_apollo10_approach_4k.jpg',
    title: 'Crater Schmidt Orbital Close-Up (AS10-34-5162)',
    source: 'NASA Apollo 10 Orbital Photography (Public Domain)',
    resolution: '4072 × 4072',
    projection: 'circular-disc',
    isColorData: true,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    priority: 'space',
  },
  horizonWest: {
    id: 'horizonWest',
    url: '/images/lunar-surface/apollo17_horizon_west.jpg',
    title: 'Taurus-Littrow Valley 360° Panorama (West Tile)',
    source: 'NASA Apollo 17 Station 5 Surface Mosaic (jsc2004e20304)',
    resolution: '4096 × 1024',
    projection: 'cylindrical-tile',
    isColorData: true,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    priority: 'surface',
  },
  horizonEast: {
    id: 'horizonEast',
    url: '/images/lunar-surface/apollo17_horizon_east.jpg',
    title: 'Taurus-Littrow Valley 360° Panorama (East Tile)',
    source: 'NASA Apollo 17 Station 5 Surface Mosaic (jsc2004e20304)',
    resolution: '4096 × 1024',
    projection: 'cylindrical-tile',
    isColorData: true,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    priority: 'surface',
  },
  regolithGround: {
    id: 'regolithGround',
    url: '/images/lunar-surface/apollo11_regolith_ground.jpg',
    title: 'Lunar Regolith & Small Craters (AS11-37-5458)',
    source: 'NASA Apollo 11 Tranquility Base Photography (Public Domain)',
    resolution: '2048 × 1024',
    projection: 'ground-plane',
    isColorData: true,
    wrapS: THREE.MirroredRepeatWrapping,
    wrapT: THREE.MirroredRepeatWrapping,
    priority: 'surface',
  },
  rockyForeground: {
    id: 'rockyForeground',
    url: '/images/lunar-surface/apollo15_rocky_foreground.jpg',
    title: 'Lunar Crater Rim Boulders & Dust (AS15-82-11082)',
    source: 'NASA Apollo 15 Hadley-Apennine Photography (Public Domain)',
    resolution: '2048 × 1024',
    projection: 'ground-plane',
    isColorData: true,
    wrapS: THREE.MirroredRepeatWrapping,
    wrapT: THREE.MirroredRepeatWrapping,
    priority: 'surface',
  },
} as const satisfies Record<string, PhotographicAssetSpec>;

export type PhotographicAssetKey = keyof typeof PHOTOGRAPHIC_MANIFEST;
