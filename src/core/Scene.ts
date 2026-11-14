import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export class Scene {
  public instance: THREE.Scene;

  constructor() {
    this.instance = new THREE.Scene();
    // In space on the Moon, there is no atmospheric sky or fog
    this.instance.background = new THREE.Color(0x000000);
  }

  /**
   * Initializes procedural PBR studio environment reflection texture
   */
  public initEnvironment(renderer: THREE.WebGLRenderer): void {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.instance.environment = envTexture;
    pmremGenerator.dispose();
  }
}
