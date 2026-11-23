import * as THREE from 'three';
import { MOONWALK_CONFIG } from '../core/config';

/**
 * Creates the root Three.js Scene.
 *
 * Unlike traditional 3D games that use directional/ambient studio lights on 3D geometry,
 * MoonWalk VR renders authentic photographic imagery. The scene background starts as
 * deep space black (#020307) and will host our photographic starfield, Earth, Moon,
 * and lunar surface layers in subsequent stages.
 */
export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(MOONWALK_CONFIG.rendering.spaceBackgroundColor);
  return scene;
}
