
import * as THREE from 'three/webgpu';

// Safeguard for WebGL fallback mode in Three.js when storage buffers have itemSize > 4 (e.g. bakedAnimationsBuffer mat4)
try {
  const BAN = (THREE as any).BufferAttributeNode;
  if (BAN && BAN.prototype) {
    const origGetNodeType = BAN.prototype.getNodeType;
    BAN.prototype.getNodeType = function (builder: any) {
      if (this.bufferType === null) {
        if (!this.attribute) {
          if (this.value && this.value.itemSize) {
            const sz = this.value.itemSize;
            const t = sz === 16 ? 'mat4' : (sz === 4 ? 'vec4' : (sz === 3 ? 'vec3' : (sz === 2 ? 'vec2' : 'float')));
            this.bufferType = t;
            return t;
          }
          this.bufferType = 'vec4';
          return 'vec4';
        }
      }
      return origGetNodeType.call(this, builder);
    };
  }
  const threeObj: any = THREE;
  const GNB = threeObj ? threeObj.GLSLNodeBuilder : null;
  if (GNB && GNB.prototype) {
    const origGNB = GNB.prototype.getTypeFromAttribute;
    GNB.prototype.getTypeFromAttribute = function (attribute: any) {
      if (!attribute) return 'vec4';
      return origGNB.call(this, attribute);
    };
  }
} catch (e) {
  console.warn('BufferAttributeNode safeguard skipped:', e);
}

export class Engine {
  public renderer: THREE.WebGPURenderer;
  public timer: THREE.Timer;
  private lowFpsCallback: (() => void) | null = null;
  private lowFpsTimer: number = 0;
  private uptime: number = 0;

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

  private userSuppressedLowFps: boolean = false;

  public suppressLowFps(suppress: boolean = true) {
    this.userSuppressedLowFps = suppress;
    this.lowFpsTimer = 0;
  }

  public onLowFps(callback: () => void) {
    this.lowFpsCallback = callback;
  }

  public render(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const delta = this.timer.getDelta();
    this.uptime += delta;

    // Do not trigger low FPS fallback if user suppressed it, during warmup, or when tab/window is inactive/unfocused
    const isInactive = document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus());

    if (this.userSuppressedLowFps || this.uptime < 10.0 || isInactive) {
      this.lowFpsTimer = 0;
    } else if (delta > 0.10) {
      this.lowFpsTimer += delta;
      if (this.lowFpsTimer >= 10.0) {
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
