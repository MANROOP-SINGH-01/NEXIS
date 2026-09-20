
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  atan,
  attribute, cos, float, Fn, If, instanceIndex, mat3,
  mat4, mix, positionLocal, sin, storage, texture, uint, uniform, uv, vec3,
  vec4, vertexColor
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import { getAllAgents, getAllCharacters } from '../../data/agents';
import { getActiveAgentSet } from '../../integration/store/teamStore';
import { AgentBehavior, AnimationName, ExpressionKey } from '../../types';
import { AgentStateBuffer } from '../behavior/AgentStateBuffer';
import { ExpressionBuffer } from '../behavior/ExpressionBuffer';
import { DRACO_LIB_PATH } from '../constants';
import { InteractivePhysicsSystem } from '../physics/InteractivePhysicsSystem';
import { PoiManager, PoiDef } from '../world/PoiManager';
import { AccessoryFactory } from './AccessoryFactory';

export class CharacterManager {
  private instanceCount = getAllAgents(getActiveAgentSet()).length + 1;
  private poiManager: PoiManager | null = null;

  // Compute Buffers (GPU)
  private posAttribute: THREE.StorageInstancedBufferAttribute | null = null;
  private velAttribute: THREE.StorageInstancedBufferAttribute | null = null;
  private colorAttribute: THREE.InstancedBufferAttribute | null = null;
  private accessoryAttribute: THREE.InstancedBufferAttribute | null = null;
  private positionStorage: any;
  private velocityStorage: any;

  // Agent state buffer (CPU+GPU): waypoint + behavior state per instance
  private agentStateBuffer: AgentStateBuffer | null = null;

  // Expression buffer (CPU+GPU): eye and mouth UV offsets per instance
  private expressionBuffer: ExpressionBuffer | null = null;

  // CPU-side mirror of GPU positions (updated via GPU readback each frame)
  private debugPosArray: Float32Array | null = null;

  // Track global time for animation resets (also drives the paused-safe shader uTime uniform)
  private currentTime = 0;
  private uTime = uniform(0);

  // Logic Nodes
  private computeNode: any;

  // Assets & Objects
  private instancedMeshes: THREE.Mesh[] = [];
  private meshData: { name: string; geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }[] = [];

  // Animation Data
  private animationsMeta: { [key: string]: { offset: number; numFrames: number; duration: number; index: number } } = {};
  private bakedAnimationsBuffer: THREE.StorageBufferAttribute | null = null;
  private metaBuffer: THREE.StorageBufferAttribute | null = null;
  private numBones = 0;
  private headBoneIndex = -1;
  private baseSkeleton: THREE.Skeleton | null = null;

  // Interactive Character Physics System
  private camera: THREE.PerspectiveCamera | null = null;
  private physicsSystem: InteractivePhysicsSystem | null = null;

  // Uniforms
  private uSpeed = uniform(0.015);

  public isLoaded = false;

  constructor(private scene: THREE.Scene, camera?: THREE.PerspectiveCamera) {
    if (camera) this.camera = camera;
  }

  public setCamera(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    if (this.baseSkeleton && !this.physicsSystem) {
      this.physicsSystem = new InteractivePhysicsSystem(this.baseSkeleton, this.camera, this.instanceCount);
    }
  }

  public getPhysicsSystem(): InteractivePhysicsSystem | null {
    return this.physicsSystem;
  }

  public setPoiManager(poiManager: PoiManager) {
    this.poiManager = poiManager;
  }

  public async load() {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_LIB_PATH);
    loader.setDRACOLoader(dracoLoader);
    try {
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/character.glb`);
      const model = gltf.scene;

      const skinnedMeshes: THREE.SkinnedMesh[] = [];
      const allMeshes: THREE.Mesh[] = [];
      model.traverse((child) => {
        if ((child as any).isMesh) {
          allMeshes.push(child as THREE.Mesh);
          if ((child as any).isSkinnedMesh) {
            skinnedMeshes.push(child as THREE.SkinnedMesh);
          }
        }
      });

      if (allMeshes.length === 0) {
        console.warn("CharacterManager: No meshes found.");
        return;
      }

      const coreMeshes = allMeshes.filter(m => {
        // Keep body, eyes, mouth, cap, headphones
        return true;
      });

      this.meshData = coreMeshes.map(m => {
        const n = m.name.toLowerCase();
        let geom = m.geometry;
        if (n.includes('cap')) {
          geom = AccessoryFactory.cleanCapGeometry(m.geometry);
        }
        return {
          name: m.name,
          geometry: geom,
          material: m.material as THREE.MeshStandardMaterial
        };
      });

      // Add signature procedural accessories
      this.meshData.push({
        name: 'accessory_glasses',
        geometry: AccessoryFactory.createGlassesGeometry(),
        material: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.18, metalness: 0.15 })
      });
      this.meshData.push({
        name: 'accessory_fedora',
        geometry: AccessoryFactory.createFedoraGeometry(),
        material: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.55, metalness: 0.2 })
      });
      this.meshData.push({
        name: 'accessory_antenna',
        geometry: AccessoryFactory.createAntennaGeometry(),
        material: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.9 })
      });
      this.meshData.push({
        name: 'accessory_crown',
        geometry: AccessoryFactory.createCrownGeometry(),
        material: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22, metalness: 0.85 })
      });

      const firstSkinnedMesh = skinnedMeshes[0];
      if (firstSkinnedMesh) {
        this.baseSkeleton = firstSkinnedMesh.skeleton;
        this.numBones = firstSkinnedMesh.skeleton.bones.length;
        const headBone = firstSkinnedMesh.skeleton.bones.find(b => b.name.toLowerCase() === 'head');
        this.headBoneIndex = headBone ? firstSkinnedMesh.skeleton.bones.indexOf(headBone) : -1;

        if (this.camera && !this.physicsSystem) {
          this.physicsSystem = new InteractivePhysicsSystem(this.baseSkeleton, this.camera, this.instanceCount);
        }
      }

      const animations = gltf.animations;
      const animNames = Object.values(AnimationName);
      const bakedDataList: Float32Array[] = [];
      const metaArray = new Float32Array(animNames.length * 4);
      let currentOffset = 0;

      animNames.forEach((name, i) => {
        let clip = animations.find(a => a.name === name);
        // Fallback for essential animations
        if (!clip) {
          if (name === AnimationName.IDLE) clip = animations[0];
          else clip = animations.find(a => a.name === AnimationName.IDLE) || animations[0];
        }

        const baked = this.bakeAnimation(firstSkinnedMesh, clip!, model);
        bakedDataList.push(baked.data);

        this.animationsMeta[name] = {
          offset: currentOffset,
          numFrames: baked.numFrames,
          duration: baked.duration,
          index: i
        };

        metaArray[i * 4 + 0] = currentOffset;
        metaArray[i * 4 + 1] = baked.numFrames;
        metaArray[i * 4 + 2] = baked.duration;
        metaArray[i * 4 + 3] = 0;

        currentOffset += baked.numFrames * this.numBones;
      });

      const totalSize = bakedDataList.reduce((acc, data) => acc + data.length, 0);
      const combinedData = new Float32Array(totalSize);
      let seek = 0;
      for (const data of bakedDataList) {
        combinedData.set(data, seek);
        seek += data.length;
      }

      this.bakedAnimationsBuffer = new THREE.StorageBufferAttribute(combinedData, 16);
      this.metaBuffer = new THREE.StorageBufferAttribute(metaArray, 4);

      this.initInstances();
      this.isLoaded = true;
    } catch (err) {
      console.error("Failed to load character:", err);
    }
  }

  public setInstanceCount(count: number) {
    if (this.instanceCount === count) return;
    this.instanceCount = count;
    if (this.baseSkeleton && this.camera) {
      this.physicsSystem?.dispose();
      this.physicsSystem = new InteractivePhysicsSystem(this.baseSkeleton, this.camera, this.instanceCount);
    }
    if (this.isLoaded) {
      this.cleanupInstances();
      this.initInstances();
    }
  }

  /**
   * Reads back the GPU position buffer to CPU.
   * Must be called after renderer.compute() each frame.
   * Returns the updated positions (1-frame GPU lag).
   */
  public async syncFromGPU(renderer: any): Promise<Float32Array | null> {
    if (!this.posAttribute) return null;
    // WebGL fallback mode does not have GPU compute passes; preserve authoritative CPU positions
    if (renderer?.backend?.isWebGLBackend) {
      return this.debugPosArray;
    }
    try {
      const buffer = await renderer.getArrayBufferAsync(this.posAttribute);
      this.debugPosArray = new Float32Array(buffer);
      if (this.physicsSystem) {
        for (let i = 0; i < this.instanceCount; i++) {
          if (this.physicsSystem.isCharacterPhysical(i)) {
            const ctrl = this.physicsSystem.getController(i);
            if (ctrl) {
              const clampedX = Math.max(-5.20, Math.min(5.20, ctrl.physics.position.x));
              const clampedZ = Math.max(-5.20, Math.min(5.20, ctrl.physics.position.z));
              const clampedY = Math.max(0.0, Math.min(3.20, ctrl.physics.position.y));
              this.debugPosArray[i * 4 + 0] = clampedX;
              this.debugPosArray[i * 4 + 1] = clampedY;
              this.debugPosArray[i * 4 + 2] = clampedZ;
            }
          }
        }
      }
      (this.posAttribute.array as Float32Array).set(this.debugPosArray);
    } catch {
      // WebGPU readback not available – fall back to stale data
    }
    return this.debugPosArray;
  }

  public update(delta: number, renderer: any) {
    this.currentTime += delta;
    this.uTime.value = this.currentTime;

    if (this.expressionBuffer) {
      this.expressionBuffer.update(delta);
    }

    if (this.physicsSystem) {
      // Continuously sync idle/un-grabbed positions from CPU pos array so physics controller position is never stale
      if (this.debugPosArray) {
        for (let i = 0; i < this.instanceCount; i++) {
          if (!this.physicsSystem.isCharacterPhysical(i)) {
            const p = new THREE.Vector3(
              this.debugPosArray[i * 4 + 0],
              this.debugPosArray[i * 4 + 1],
              this.debugPosArray[i * 4 + 2]
            );
            this.physicsSystem.syncExternalPosition(i, p);
          }
        }
      }

      this.physicsSystem.update(delta);

      if (this.posAttribute) {
        const arr = this.posAttribute.array as Float32Array;
        let dirty = false;
        for (let i = 0; i < this.instanceCount; i++) {
          if (this.physicsSystem.isCharacterPhysical(i)) {
            const ctrl = this.physicsSystem.getController(i);
            if (ctrl) {
              const clampedX = Math.max(-5.20, Math.min(5.20, ctrl.physics.position.x));
              const clampedZ = Math.max(-5.20, Math.min(5.20, ctrl.physics.position.z));
              const clampedY = Math.max(0.0, Math.min(3.20, ctrl.physics.position.y));
              arr[i * 4 + 0] = clampedX;
              arr[i * 4 + 1] = clampedY;
              arr[i * 4 + 2] = clampedZ;
              if (this.debugPosArray) {
                this.debugPosArray[i * 4 + 0] = clampedX;
                this.debugPosArray[i * 4 + 1] = clampedY;
                this.debugPosArray[i * 4 + 2] = clampedZ;
              }
              dirty = true;
            }
          }
        }
        if (dirty) {
          this.posAttribute.needsUpdate = true;
        }
      }
    }

    if (this.computeNode && !renderer.backend?.isWebGLBackend) {
      try {
        renderer.compute(this.computeNode);
      } catch {
        // WebGL fallback mode does not support GPU compute passes
      }
    }
  }

  private cleanupInstances() {
    for (const mesh of this.instancedMeshes) {
      this.scene.remove(mesh);
    }
    this.instancedMeshes = [];
    this.computeNode = null;
    this.expressionBuffer = null;
  }

  private initInstances() {
    if (this.meshData.length === 0) return;

    const posArray = new Float32Array(this.instanceCount * 4);
    const velArray = new Float32Array(this.instanceCount * 4);
    const colorArray = new Float32Array(this.instanceCount * 3);
    const accessoryArray = new Float32Array(this.instanceCount);

    const tempColor = new THREE.Color();
    const spawnRadius = 8; // Default spawn area

    const spawnPois = this.poiManager?.getFreePoisByPrefix('spawn') || [];
    let spawnIndex = 0;

    const agentsBuffer = []; // Temporary to store POIs for orientation

    const system = getActiveAgentSet();
    const allCharacters = getAllCharacters(system);

    for (let i = 0; i < this.instanceCount; i++) {
      const agentNode = allCharacters.find(a => a.index === i) || system.leadAgent;
      const colorOverride = agentNode.color;
      tempColor.set(colorOverride);

      if (i === system.user.index) {
        // Player spawns at (0,0,0)
        posArray[i * 4 + 0] = 0;
        posArray[i * 4 + 1] = 0;
        posArray[i * 4 + 2] = 0;
        agentsBuffer[i] = null;
      } else {
        // Look for dedicated workstation desk first: sit_work-${i}
        let poi: PoiDef | null = this.poiManager?.getPoi(`sit_work-${i}`) || null;
        if (!poi) {
          poi = this.poiManager?.getPoi(`sit_idle-${((i - 1) % 4) + 1}`) || null;
        }
        if (!poi && spawnPois.length > 0) {
          poi = spawnPois[spawnIndex % spawnPois.length];
          spawnIndex++;
        }

        if (poi) {
          this.poiManager?.occupy(poi.id, i);
          posArray[i * 4 + 0] = poi.position.x;
          posArray[i * 4 + 1] = poi.position.y || 0;
          posArray[i * 4 + 2] = poi.position.z;
          agentsBuffer[i] = poi;
        } else {
          posArray[i * 4 + 0] = (Math.random() - 0.5) * spawnRadius * 2;
          posArray[i * 4 + 1] = 0;
          posArray[i * 4 + 2] = (Math.random() - 0.5) * spawnRadius * 2;
          agentsBuffer[i] = null;
        }
        posArray[i * 4 + 3] = 1;
        velArray[i * 4 + 0] = 0;
        velArray[i * 4 + 1] = 0;
        velArray[i * 4 + 2] = 0;
        velArray[i * 4 + 3] = 0;
      }

      colorArray[i * 3 + 0] = tempColor.r;
      colorArray[i * 3 + 1] = tempColor.g;
      colorArray[i * 3 + 2] = tempColor.b;

      // Accessory assignment:
      // 0 = None
      // 1 = Headphones (Agent 3 - Nexus-Strategist)
      // 2 = Cap (Agent 4 - Nexus-Writer)
      // 3 = Glasses (Agent 2 - Nexus-Vision & User 0)
      // 4 = Fedora (Agent 1 - Nexus-Director)
      // 5 = Antenna (Agent 5 - Nexus-Hunter)
      // 6 = Crown (Agent 6 - Nexus-Mirror)
      if (i === 0) {
        accessoryArray[i] = 3; // User wears developer nerd glasses
      } else if (i === 1) {
        accessoryArray[i] = 4; // Director wears executive fedora
      } else if (i === 2) {
        accessoryArray[i] = 3; // Vision wears glasses
      } else if (i === 3) {
        accessoryArray[i] = 1; // Strategist wears headphones
      } else if (i === 4) {
        accessoryArray[i] = 2; // Writer wears cap
      } else if (i === 5) {
        accessoryArray[i] = 5; // Hunter wears robot antenna
      } else if (i === 6) {
        accessoryArray[i] = 6; // Mirror wears golden crown
      } else {
        accessoryArray[i] = ((i - 1) % 6) + 1;
      }
    }


    this.debugPosArray = new Float32Array(posArray);

    this.posAttribute = new THREE.StorageInstancedBufferAttribute(posArray, 4);
    this.velAttribute = new THREE.StorageInstancedBufferAttribute(velArray, 4);
    this.colorAttribute = new THREE.InstancedBufferAttribute(colorArray, 3);
    this.accessoryAttribute = new THREE.InstancedBufferAttribute(accessoryArray, 1);

    this.positionStorage = storage(this.posAttribute, 'vec4', this.instanceCount);
    this.velocityStorage = storage(this.velAttribute, 'vec4', this.instanceCount);

    // Physics & state buffer — initialize seated at desks for agents
    this.agentStateBuffer = new AgentStateBuffer(this.instanceCount);
    for (let i = 0; i < this.instanceCount; i++) {
      const poi = agentsBuffer[i];
      const isSeated = poi && (poi.id.includes('sit') || poi.arrivalState === 'sit_work' || poi.arrivalState === 'sit_idle');

      if (isSeated) {
        this.setPhysicsMode(i, AgentBehavior.SEATED);
        const animName = poi.id.includes('work') ? AnimationName.SIT_WORK : AnimationName.SIT_IDLE;
        const meta = this.animationsMeta[animName] || this.animationsMeta[AnimationName.IDLE];
        if (meta) {
          this.agentStateBuffer.setAnimation(i, meta.index, true, -Math.random() * 10);
        }
      } else {
        this.setPhysicsMode(i, AgentBehavior.IDLE);
        const meta = this.animationsMeta[AnimationName.IDLE];
        if (meta) {
          this.agentStateBuffer.setAnimation(i, meta.index, true, -Math.random() * 10);
        }
      }

      // APPLY POI ORIENTATION
      if (poi && (poi.id.includes('spawn') || poi.id.includes('sit'))) {
        this.setOrientation(i, poi.quaternion);
      }
    }

    if (this.physicsSystem) {
      for (let i = 0; i < this.instanceCount; i++) {
        const initPos = new THREE.Vector3(posArray[i * 4 + 0], posArray[i * 4 + 1], posArray[i * 4 + 2]);
        this.physicsSystem.syncExternalPosition(i, initPos);
      }
    }

    this.expressionBuffer = new ExpressionBuffer(this.instanceCount);

    this.initComputeNode();
    this.createInstancedMesh();
  }

  private initComputeNode() {
    const agentStorage = this.agentStateBuffer!.storageNode;

    this.computeNode = Fn(() => {
      const index = instanceIndex;

      const posElement = this.positionStorage.element(index);
      const velElement = this.velocityStorage.element(index);
      const agentData = agentStorage.element(index.mul(2));   // Buffer 0: (wpX, anim, wpZ, state)
      const agentState = agentData.w;                         // float: 0=IDLE 1=GOTO 2=SEATED 3=PHYSICAL

      const pos = posElement.xyz.toVar();

      // ── Physical Logic ──────────────────────────────────────

      // GOTO = 1  |  IDLE = 0  |  SEATED = 2 (treated as IDLE on GPU)  |  PHYSICAL = 3
      const isGoto = agentState.greaterThan(float(0.5)).and(agentState.lessThan(float(1.5)));
      const isPhysical = agentState.greaterThan(float(2.5));

      If(isPhysical, () => {
        // CPU physics has full authority over position & velocity — do not overwrite
      }).ElseIf(isGoto, () => {
        const waypointXZ = vec3(agentData.x, float(0), agentData.z);
        const toTarget = waypointXZ.sub(pos);
        const dist = toTarget.length();
        If(dist.greaterThan(float(0.2)), () => {
          const gotoVel = toTarget.normalize().mul(this.uSpeed.mul(3.0));
          velElement.assign(vec4(gotoVel, 0.0));
          const nextPos = pos.add(gotoVel);
          const clampedX = nextPos.x.clamp(float(-4.20), float(4.20));
          const clampedZ = nextPos.z.clamp(float(-4.20), float(4.20));
          posElement.assign(vec4(clampedX, nextPos.y, clampedZ, 1.0));
        }).Else(() => {
          // Snap X,Z to exact waypoint — CPU will transition to IDLE this frame
          const clampedWpX = agentData.x.clamp(float(-4.20), float(4.20));
          const clampedWpZ = agentData.z.clamp(float(-4.20), float(4.20));
          posElement.assign(vec4(clampedWpX, pos.y, clampedWpZ, 1.0));
        });

      }).Else(() => {
        // ── IDLE / SEATED (0 or 2) ───────────────────────────────
        // Zero velocity so the vertex shader uses facingOverride (setFacing/setOrientation)
        // instead of the stale walk velocity for rotation.
        // SEATED (2) is handled identically on the GPU — the semantic difference is CPU-only.
        velElement.assign(vec4(float(0), float(0), float(0), float(0)));
        posElement.assign(vec4(pos, 1.0));
      });

    })().compute(this.instanceCount);
  }

  private createInstancedMesh() {
    // Reorder meshData: Body FIRST, then features (eyes/mouth)
    // This ensures body writes to depth buffer before features are drawn over it.
    const sortedMeshData = [...this.meshData].sort((a, b) => {
      const aIsBody = a.name.toLowerCase().includes('body');
      const bIsBody = b.name.toLowerCase().includes('body');
      if (aIsBody && !bIsBody) return -1;
      if (!aIsBody && bIsBody) return 1;
      return 0;
    });

    for (const { name, geometry, material: baseMaterial } of sortedMeshData) {
      const instancedGeometry = new THREE.InstancedBufferGeometry();
      instancedGeometry.copy(geometry as any);
      instancedGeometry.instanceCount = this.instanceCount;

      // Solo dejamos el atributo que NO se calcula en el Compute Shader
      instancedGeometry.setAttribute('instanceColor', this.colorAttribute);
      if (this.accessoryAttribute) {
        instancedGeometry.setAttribute('accessoryType', this.accessoryAttribute);
      } else {
        instancedGeometry.setAttribute('accessoryType', new THREE.InstancedBufferAttribute(new Float32Array(this.instanceCount), 1));
      }

      if (this.physicsSystem) {
        instancedGeometry.setAttribute('procWeight', this.physicsSystem.proceduralWeightAttribute);
        instancedGeometry.setAttribute('instanceOrientation', this.physicsSystem.orientationAttribute);
      } else {
        instancedGeometry.setAttribute('procWeight', new THREE.InstancedBufferAttribute(new Float32Array(this.instanceCount), 1));
        const defaultOrientations = new Float32Array(this.instanceCount * 4);
        for (let i = 0; i < this.instanceCount; i++) defaultOrientations[i * 4 + 3] = 1.0;
        instancedGeometry.setAttribute('instanceOrientation', new THREE.InstancedBufferAttribute(defaultOrientations, 4));
      }

      const material = new THREE.MeshStandardNodeMaterial();
      const isEyes = name.toLowerCase().includes('eyes');
      const isMouth = name.toLowerCase().includes('mouth');
      const isHeadphones = name.toLowerCase().includes('headphones');
      const isCap = name.toLowerCase().includes('cap');
      const isGlasses = name.toLowerCase().includes('glasses');
      const isFedora = name.toLowerCase().includes('fedora');
      const isAntenna = name.toLowerCase().includes('antenna');
      const isCrown = name.toLowerCase().includes('crown');

      const isAccessory = isHeadphones || isCap || isGlasses || isFedora || isAntenna || isCrown;
      const isBody = name.toLowerCase().includes('body');
      material.roughness = isBody ? 0.40 : (isAccessory ? 0.30 : 0.85);
      material.metalness = isAccessory ? 0.65 : 0.08;

      const instanceColor = attribute('instanceColor', 'vec3');
      const map = (baseMaterial as any).map;

      const expressionData = this.expressionBuffer!.storageNode.element(instanceIndex);
      const animParams = this.agentStateBuffer!.storageNode.element(instanceIndex.mul(2).add(1));
      const instanceAlpha = animParams.z;
      const accessoryType = attribute('accessoryType', 'float');

      if (isEyes) {
        material.uvNode = uv().add(expressionData.xy);
      } else if (isMouth) {
        material.uvNode = uv().add(expressionData.zw);
      }

      // Transparency & Visibility: only facial features (eyes/mouth) use transparency decal blending
      material.transparent = isEyes || isMouth;

      let isVisible = float(1.0);
      if (isHeadphones) {
        isVisible = accessoryType.equal(float(1));
      } else if (isCap) {
        isVisible = accessoryType.equal(float(2));
      } else if (isGlasses) {
        isVisible = accessoryType.equal(float(3));
      } else if (isFedora) {
        isVisible = accessoryType.equal(float(4));
      } else if (isAntenna) {
        isVisible = accessoryType.equal(float(5));
      } else if (isCrown) {
        isVisible = accessoryType.equal(float(6));
      }

      if (isBody || isAccessory) {
        material.depthWrite = true;
        material.depthTest = true;

        if (isGlasses) {
          const vCol = vertexColor().rgb;
          material.colorNode = vec4(vCol, instanceAlpha);
          // Glint luminescence: white glints emit crisp light so the meme shine is vivid under all angles/shadows
          const isWhiteGlint = vCol.r.greaterThan(float(0.5));
          material.emissiveNode = isWhiteGlint.select(vec3(0.9, 0.9, 0.9), vec3(0.0));
          material.roughness = 0.18;
          material.metalness = 0.15;
        } else if (isFedora) {
          material.colorNode = vec4(vec3(0.18, 0.20, 0.26), instanceAlpha);
          material.roughness = 0.55;
          material.metalness = 0.2;
        } else if (isAntenna) {
          material.colorNode = vec4(vec3(0.95, 0.60, 0.15), instanceAlpha);
          material.roughness = 0.2;
          material.metalness = 0.9;
        } else if (isCrown) {
          material.colorNode = vec4(vec3(0.98, 0.78, 0.12), instanceAlpha);
          material.roughness = 0.22;
          material.metalness = 0.85;
        } else if (isHeadphones) {
          material.colorNode = vec4(vec3(0.14, 0.16, 0.24), instanceAlpha);
          material.roughness = 0.3;
          material.metalness = 0.65;
        } else if (isCap) {
          material.colorNode = vec4(vec3(0.15, 0.65, 0.45), instanceAlpha);
          material.roughness = 0.5;
          material.metalness = 0.1;
        } else if (map) {
          const texColor = texture(map);
          material.colorNode = vec4(texColor.rgb.mul(instanceColor), texColor.a.mul(instanceAlpha));
        } else {
          material.colorNode = vec4(instanceColor, instanceAlpha);
        }
      } else {
        // Eyes / mouth: rendered on top of the body surface with polygon offset
        material.depthWrite = false;
        material.depthTest = true;
        material.polygonOffset = true;
        material.polygonOffsetFactor = -1;
        material.polygonOffsetUnits = -1;

        if (map) {
          const texColor = isEyes || isMouth ? texture(map, material.uvNode) : texture(map);
          material.colorNode = vec4(texColor.rgb, texColor.a.mul(instanceAlpha));
        } else {
          material.opacityNode = float(0);
        }
      }

      // Guarantee skinIndex and skinWeight exist on all character geometries so GLSLNodeBuilder attribute('skinIndex') never encounters null
      if (!instancedGeometry.attributes.skinIndex) {
        const posCount = geometry.attributes.position ? geometry.attributes.position.count : 0;
        const targetBone = (isAccessory || isEyes || isMouth) && this.headBoneIndex !== -1 ? this.headBoneIndex : 0;
        const skinIndices = new Float32Array(posCount * 4).fill(targetBone);
        const skinWeights = new Float32Array(posCount * 4).fill(0);
        for (let i = 0; i < posCount; i++) skinWeights[i * 4] = 1.0;
        instancedGeometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
        instancedGeometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
      }

      const vertexNode = this.createVertexNode(isVisible.and(instanceAlpha.greaterThan(0)));
      material.positionNode = vertexNode;
      (material as any).castShadowPositionNode = vertexNode;

      const instancedMesh = new THREE.Mesh(instancedGeometry, material);
      instancedMesh.frustumCulled = false;
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      // Body renders first (renderOrder 0), features after (renderOrder 1)
      instancedMesh.renderOrder = name.toLowerCase().includes('body') ? 0 : 1;
      this.scene.add(instancedMesh);
      this.instancedMeshes.push(instancedMesh);
    }
  }

  private createVertexNode(isVisibleNode: any) {
    return Fn(() => {
      const instancePos = this.positionStorage.element(instanceIndex).xyz;
      const rawVel = this.velocityStorage.element(instanceIndex).xyz;
      const agentData = this.agentStateBuffer!.storageNode.element(instanceIndex.mul(2));
      const animParams = this.agentStateBuffer!.storageNode.element(instanceIndex.mul(2).add(1));

      // 1. Determine local rotation (facing)
      const isMoving = rawVel.length().greaterThan(float(0.01));
      const facingOverride = vec3(agentData.x, float(0), agentData.z);
      const hasFacingOverride = facingOverride.length().greaterThan(float(0));

      const facing = vec3(0, 0, 1).toVar(); // Default: Forward

      If(isMoving, () => {
        facing.assign(rawVel);
      }).ElseIf(hasFacingOverride, () => {
        facing.assign(facingOverride);
      });

      const angle = atan(facing.z, facing.x).negate().add(float(Math.PI / 2));
      const defaultRotMat = mat3(
        vec3(cos(angle), float(0), sin(angle).negate()),
        vec3(float(0), float(1), float(0)),
        vec3(sin(angle), float(0), cos(angle))
      );

      // Quat rotation node from instanceOrientation attribute
      const q = attribute('instanceOrientation', 'vec4');
      const x2 = q.x.add(q.x);
      const y2 = q.y.add(q.y);
      const z2 = q.z.add(q.z);
      const xx = q.x.mul(x2);
      const xy = q.x.mul(y2);
      const xz = q.x.mul(z2);
      const yy = q.y.mul(y2);
      const yz = q.y.mul(z2);
      const zz = q.z.mul(z2);
      const wx = q.w.mul(x2);
      const wy = q.w.mul(y2);
      const wz = q.w.mul(z2);

      const quatRotMat = mat3(
        vec3(float(1.0).sub(yy.add(zz)), xy.add(wz), xz.sub(wy)),
        vec3(xy.sub(wz), float(1.0).sub(xx.add(zz)), yz.add(wx)),
        vec3(xz.add(wy), yz.sub(wx), float(1.0).sub(xx.add(yy)))
      );

      const procWeight = attribute('procWeight', 'float');
      const rotationMat = defaultRotMat.toVar();
      If(procWeight.greaterThan(0.01), () => {
        rotationMat.assign(quatRotMat);
      });

      const finalPosition = positionLocal.toVar();

      if (this.bakedAnimationsBuffer && this.metaBuffer) {
        const animBuffer = storage(this.bakedAnimationsBuffer, 'mat4', this.bakedAnimationsBuffer.count);
        const metaStorage = storage(this.metaBuffer, 'vec4', this.metaBuffer.count);

        const animIndex = agentData.y.toUint();

        const meta = metaStorage.element(animIndex);
        const animOffset = uint(meta.x);
        const numFrames = uint(meta.y);
        const duration = float(meta.z);

        const startTime = animParams.x;
        const loopMode = animParams.y;

        const animTime = this.uTime.sub(startTime).max(0);
        const t = loopMode.greaterThan(0.5) ? animTime.div(duration).fract() : animTime.div(duration).clamp(0, 1);

        const currentFrame = t.mul(numFrames.toFloat()).toUint();
        const safeFrame = currentFrame.min(numFrames.sub(uint(1)));

        const skinIndex = attribute('skinIndex');
        const skinWeight = attribute('skinWeight');
        const skinMat = mat4(0).toVar();

        const addInfluence = (boneIdxNode: any, weightNode: any) => {
          If(weightNode.greaterThan(0), () => {
            const bakedAddress = animOffset.add(safeFrame.mul(uint(this.numBones))).add(boneIdxNode.toUint());
            const bakedMat = animBuffer.element(bakedAddress);
            skinMat.addAssign(bakedMat.mul(weightNode));
          });
        };

        addInfluence(skinIndex.x, skinWeight.x);
        addInfluence(skinIndex.y, skinWeight.y);
        addInfluence(skinIndex.z, skinWeight.z);
        addInfluence(skinIndex.w, skinWeight.w);

        finalPosition.assign(skinMat.mul(vec4(positionLocal, 1.0)).xyz);
      }

      const visiblePos = isVisibleNode.select(finalPosition, vec3(0, 0, 0));
      const worldPos = rotationMat.mul(visiblePos).add(instancePos);
      return worldPos;
    })();
  }

  private bakeAnimation(mesh: THREE.SkinnedMesh, clip: THREE.AnimationClip, root: THREE.Object3D) {
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(clip).play();
    const skeleton = mesh.skeleton;
    const duration = clip.duration;
    const numFrames = Math.ceil(duration * 60);
    const numBones = skeleton.bones.length;
    const data = new Float32Array(numFrames * numBones * 16);
    for (let f = 0; f < numFrames; f++) {
      mixer.setTime((f / numFrames) * duration);
      root.updateMatrixWorld(true);
      skeleton.update();
      for (let b = 0; b < numBones; b++) {
        const i = (f * numBones + b) * 16;
        for (let k = 0; k < 16; k++) data[i + k] = skeleton.boneMatrices[b * 16 + k];
      }
    }
    return {
      data,
      numFrames,
      duration,
    };
  }

  public getCount() { return this.instanceCount; }

  /** Exposes the agent state buffer so BehaviorManager can read/write states. */
  public getAgentStateBuffer(): AgentStateBuffer | null {
    return this.agentStateBuffer;
  }

  /** Returns the current CPU-tracked positions buffer (vec4 stride). Updated each simulateOnCPU call. */
  public getCPUPositions(): Float32Array | null {
    return this.debugPosArray;
  }

  /** Returns the world position of a single character from the CPU buffer. */
  public getCPUPosition(index: number): THREE.Vector3 | null {
    if (!this.debugPosArray || index < 0 || index >= this.instanceCount) return null;
    const i = index * 4;
    return new THREE.Vector3(this.debugPosArray[i], this.debugPosArray[i + 1], this.debugPosArray[i + 2]);
  }

  public setPhysicsMode(index: number, mode: AgentBehavior) {
    if (!this.agentStateBuffer || index < 0 || index >= this.instanceCount) return;
    this.agentStateBuffer.setState(index, mode);
  }

  /** Teleport an agent to an exact world position by writing directly to the CPU→GPU buffer. */
  public setPosition(index: number, position: THREE.Vector3): void {
    if (!this.posAttribute || index < 0 || index >= this.instanceCount) return;
    const arr = this.posAttribute.array as Float32Array;
    const cx = Math.max(-5.20, Math.min(5.20, position.x));
    const cy = Math.max(0.0, Math.min(3.20, position.y));
    const cz = Math.max(-5.20, Math.min(5.20, position.z));
    arr[index * 4 + 0] = cx;
    arr[index * 4 + 1] = cy;
    arr[index * 4 + 2] = cz;
    this.posAttribute.needsUpdate = true;
    // Also update the CPU mirror so getCPUPosition() is immediately accurate
    if (this.debugPosArray) {
      this.debugPosArray[index * 4 + 0] = cx;
      this.debugPosArray[index * 4 + 1] = cy;
      this.debugPosArray[index * 4 + 2] = cz;
    }
  }

  /** Teleport an agent and zero their current velocity to avoid sliding. */
  public setPositionAndZeroVelocity(index: number, position: THREE.Vector3): void {
    this.setPosition(index, position);
    if (this.velAttribute && index >= 0 && index < this.instanceCount) {
      const arr = this.velAttribute.array as Float32Array;
      arr[index * 4 + 0] = 0;
      arr[index * 4 + 1] = 0;
      arr[index * 4 + 2] = 0;
      arr[index * 4 + 3] = 0;
      this.velAttribute.needsUpdate = true;
    }
  }

  /** Force a specific facing direction when IDLE. */
  public setFacing(index: number, x: number, z: number) {
    if (!this.agentStateBuffer || index < 0 || index >= this.instanceCount) return;
    this.agentStateBuffer.setFacing(index, x, z);
  }

  /** Force a specific orientation based on a quaternion. */
  public setOrientation(index: number, quaternion: THREE.Quaternion) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
    this.setFacing(index, forward.x, forward.z);
  }

  public getAgentState(index: number): AgentBehavior {
    if (!this.agentStateBuffer || index < 0 || index >= this.instanceCount) return AgentBehavior.IDLE;
    return this.agentStateBuffer.getState(index) as AgentBehavior;
  }

  public setAnimation(index: number, name: AnimationName, loop: boolean = true) {
    if (this.agentStateBuffer && index >= 0 && index < this.instanceCount) {
      const meta = this.animationsMeta[name];
      if (meta) {
        this.agentStateBuffer.setAnimation(index, meta.index, loop, this.currentTime);
      }
    }
  }

  public getAnimationIndex(index: number): number {
    if (!this.agentStateBuffer || index < 0 || index >= this.instanceCount) return 0;
    return this.agentStateBuffer.getAnimation(index);
  }

  public getAnimationMeta(name: AnimationName) {
    return this.animationsMeta[name];
  }

  /** Returns the baked clip duration in seconds. Returns 1.0 if the animation is not found. */
  public getAnimationDuration(name: AnimationName): number {
    return this.animationsMeta[name]?.duration ?? 1.0;
  }

  public setExpression(index: number, name: ExpressionKey) {
    if (this.expressionBuffer) {
      this.expressionBuffer.setExpression(index, name);
    }
  }

  public setSpeaking(index: number, isSpeaking: boolean) {
    if (this.expressionBuffer) {
      this.expressionBuffer.setSpeaking(index, isSpeaking);
    }
    // Note: External logic should handle TALK/IDLE animations
  }

  public setColors() {
    if (this.isLoaded) {
      this.cleanupInstances();
      this.initInstances();
    }
  }
}
