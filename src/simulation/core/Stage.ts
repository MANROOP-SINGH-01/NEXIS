import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three/webgpu';
import { SCENE_BACKGROUND_COLOR } from '../constants';

export class Stage {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;

  private followTarget: THREE.Vector3 | null = null;
  private readonly defaultTarget = new THREE.Vector3(0, 0.8, 0);

  constructor(rendererElement: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE_BACKGROUND_COLOR);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(10, 8, 15);

    this.controls = new OrbitControls(this.camera, rendererElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.8;
    this.controls.enableRotate = true;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.minPolarAngle = Math.PI / 4.5;
    this.controls.maxPolarAngle = Math.PI / 2.4;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0.8, 0);

    this.controls.addEventListener('start', () => {
      rendererElement.style.cursor = 'grabbing';
    });
    this.controls.addEventListener('end', () => {
      rendererElement.style.cursor = 'auto';
    });

    this.setupLights();
    // Environment is initialized with a default, but updated via updateDimensions immediately in SceneManager
  }

  private setupLights() {
    // 1. Soft neutral ambient light for baseline visibility without washing out contrast
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 0.45);
    this.scene.add(ambientLight);

    // 2. Primary Warm Key Light with crisp directional shadows
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.25);
    keyLight.position.set(12, 22, 12);
    keyLight.castShadow = true;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 100;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.radius = 2;
    keyLight.shadow.autoUpdate = true;
    this.scene.add(keyLight);

    // 3. Cool Ambient Fill Light (prevents harsh black shadow contrast)
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.35);
    fillLight.position.set(-14, 15, -10);
    this.scene.add(fillLight);

    // 4. Studio Rim/Silhouette Light (highlights character shoulders, hair, and edges)
    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.45);
    rimLight.position.set(-10, 14, 16);
    this.scene.add(rimLight);

    // 5. Practical Desk Workspace Accent Lights (subtle monitor & lamp glow)
    const deskGlow1 = new THREE.PointLight(0x38bdf8, 0.6, 6, 2);
    deskGlow1.position.set(-2, 2.2, 0.5);
    this.scene.add(deskGlow1);

    const deskGlow2 = new THREE.PointLight(0xfef08a, 0.5, 6, 2);
    deskGlow2.position.set(2.5, 2.2, -1.5);
    this.scene.add(deskGlow2);
  }

  public onResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Call every frame with the character's world position to follow, or null to return to origin. */
  public setFollowTarget(pos: THREE.Vector3 | null) {
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z)) {
      this.followTarget = pos.clone();
    } else {
      this.followTarget = null;
    }
  }

  public update() {
    const lerpTarget = (this.followTarget && Number.isFinite(this.followTarget.x) && Number.isFinite(this.followTarget.z))
      ? new THREE.Vector3(this.followTarget.x, 0.8, this.followTarget.z)
      : this.defaultTarget;
    if (Number.isFinite(lerpTarget.x) && Number.isFinite(lerpTarget.y) && Number.isFinite(lerpTarget.z)) {
      this.controls.target.lerp(lerpTarget, 0.06);
    }
    this.controls.update();
  }

  /**
   * Drive camera behavior based on chat state.
   * Call every frame from the animation loop.
   *
   * @param isChatting  True while a conversation is active.
   * @param playerMoving True while player is walking toward the NPC (GOTO state).
   */
  public setChatMode(isChatting: boolean, playerMoving: boolean): void {
    if (!this.controls) return;

    if (isChatting) {
      if (playerMoving) {
        // Lock controls and zoom in while walking
        this.controls.enabled = false;
        this.controls.minDistance = THREE.MathUtils.lerp(this.controls.minDistance, 4, 0.05);
        this.controls.maxDistance = THREE.MathUtils.lerp(this.controls.maxDistance, 6, 0.05);
      } else {
        // Arrived — re-enable controls, stay slightly zoomed
        this.controls.enabled = true;
        this.controls.minDistance = THREE.MathUtils.lerp(this.controls.minDistance, 3, 0.05);
        this.controls.maxDistance = THREE.MathUtils.lerp(this.controls.maxDistance, 10, 0.05);
      }
    } else {
      // Free roam
      this.controls.enabled = true;
      this.controls.minDistance = THREE.MathUtils.lerp(this.controls.minDistance, 3, 0.05);
      this.controls.maxDistance = THREE.MathUtils.lerp(this.controls.maxDistance, 50, 0.05);
    }
  }
}
