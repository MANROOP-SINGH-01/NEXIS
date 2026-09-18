
import * as THREE from 'three/webgpu';

export class Engine {
  public renderer: THREE.WebGPURenderer;
  public timer: THREE.Timer;
  private lowFpsCallback: (() => void) | null = null;
  private lowFpsTimer: number = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGPURenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight, false);

    // Ensure the canvas is sized by CSS so physical resizing is fluid
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';

    // Use default shadow map (PCF) as VSM support in WebGPU/NodeMaterial can be sensitive
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    container.appendChild(this.renderer.domElement);
    this.timer = new THREE.Timer();
  }

  public async init() {
    try {
      await this.renderer.init();
    } catch (e) {
      console.error("WebGPU initialization failed:", e);
    }
  }

  public onResize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
  }

  public onLowFps(callback: () => void) {
    this.lowFpsCallback = callback;
  }

  public render(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const delta = this.timer.getDelta();
    // Use smoothed delta to check if we're consistently under 30FPS (delta > 0.033)
    if (delta > 0.0333) {
      this.lowFpsTimer += delta;
      if (this.lowFpsTimer >= 3.0) {
        if (this.lowFpsCallback) this.lowFpsCallback();
        this.lowFpsTimer = 0;
      }
    } else {
      this.lowFpsTimer = Math.max(0, this.lowFpsTimer - delta * 2); // Recover faster
    }
    
    this.renderer.render(scene, camera);
  }

  public dispose() {
    this.renderer.dispose();
  }
}
