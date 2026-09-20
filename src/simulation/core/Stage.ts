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
    // Gentle atmospheric depth fog seamlessly matching Bauhaus warm paper canvas
    this.scene.fog = new THREE.FogExp2(0xF5F0E6, 0.007);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
    // Tightened isometric studio framing
    this.camera.position.set(9.2, 7.2, 13.6);

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
    this.controls.maxDistance = 30;
    this.controls.target.set(0, 0.7, 0);

    this.controls.addEventListener('start', () => {
      rendererElement.style.cursor = 'grabbing';
    });
    this.controls.addEventListener('end', () => {
      rendererElement.style.cursor = 'auto';
    });

    this.setupLights();
  }

  private setupLights() {
    // 1. Studio ambient daylight for museum-grade clarity & paper warmth
    const ambientLight = new THREE.AmbientLight(0xFFFBF2, 1.4);
    this.scene.add(ambientLight);

    // 2. Primary Warm Gallery Key Light with crisp architectural contact shadows
    const keyLight = new THREE.DirectionalLight(0xFFFDF8, 1.85);
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
    keyLight.shadow.radius = 2.0;
    keyLight.shadow.autoUpdate = true;
    this.scene.add(keyLight);

    // 3. Soft Skylight Fill (illuminates under desks and eliminates muddy dark shadows)
    const fillLight = new THREE.DirectionalLight(0xEAEFF6, 0.95);
    fillLight.position.set(-14, 16, -10);
    this.scene.add(fillLight);

    // 4. Subtle Warm Studio Rim Light (cleanly sculpts avatar silhouettes against light paper background)
    const rimLight = new THREE.DirectionalLight(0xFDF5E6, 0.7);
    rimLight.position.set(-8, 14, 14);
    this.scene.add(rimLight);

    // 5. Warm Bauhaus Incandescent Table Lamp Glows (architectural task lighting)
    const deskGlow1 = new THREE.PointLight(0xF4C430, 0.85, 6, 2);
    deskGlow1.position.set(-2, 2.0, 0.5);
    this.scene.add(deskGlow1);

    const deskGlow2 = new THREE.PointLight(0xF4C430, 0.8, 6, 2);
    deskGlow2.position.set(2.5, 2.0, -1.5);
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
