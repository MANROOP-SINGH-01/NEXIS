
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three/webgpu';
import { getAgentSet } from '../../data/agents';
import { useTeamStore } from '../../integration/store/teamStore';
import { DRACO_LIB_PATH } from '../constants';
import { NavMeshManager } from '../pathfinding/NavMeshManager';
import { PoiManager } from './PoiManager';
import { ObstacleSystem } from '../physics/ObstacleSystem';

import { getFloorTexture, getWoodDeskTexture, getWhiteboardTexture } from './TextureGenerator';

export class WorldManager {
  private office: THREE.Group | null = null;

  constructor(
    private scene: THREE.Scene,
    private navMesh: NavMeshManager,
    private poiManager: PoiManager
  ) {}

  public async load(): Promise<void> {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_LIB_PATH);
    loader.setDRACOLoader(dracoLoader);
    const officeGltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/office.glb`);
    this.office = officeGltf.scene;
    this.scene.add(this.office);

    // Register 3D office geometry obstacles for collision avoidance
    ObstacleSystem.registerFromScene(this.office);

    // Get current AgentSet color
    const { selectedAgentSetId, customSystems } = useTeamStore.getState();
    const activeSet = getAgentSet(selectedAgentSetId, customSystems);
    const themeColor = new THREE.Color(activeSet.color);

    // Prepare procedural architectural textures
    const floorTex = getFloorTexture();
    const woodTex = getWoodDeskTexture();
    const boardTex = getWhiteboardTexture();

    // Extract NavMesh and setup vibrant materials
    this.office.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        if (name.includes('navmesh')) {
          this.navMesh.loadFromGeometry(mesh.geometry);
          mesh.visible = false;
        } else {
          mesh.receiveShadow = true;
          mesh.castShadow = true;

          if (mesh.material) {
            // Semantic mesh detection
            const isColoredMesh = name.startsWith('colored');
            const isPC = name.includes('pc') || name.includes('laptop');
            const isDesk = name.includes('desk') || name.includes('table');
            const isCounter = name.includes('counter');
            const isFloor = name.includes('floor');
            const isLamp = name.includes('flexo');
            const isPlant = name.includes('plant');
            const isChair = name.includes('chair');
            const isSofa = name.includes('sofa');
            const isBoard = name.includes('board');
            const isCabinet = name.includes('cabinet');

            let matColor = new THREE.Color(0x94a3b8);
            let textureMap: THREE.Texture | null = null;
            let roughness = 0.55;
            let metalness = 0.1;
            let emissive: THREE.Color | undefined = undefined;
            let emissiveIntensity = 0.0;

            if (isColoredMesh) {
              // Thematic glowing boundary perimeter
              matColor = themeColor;
              roughness = 0.25;
              metalness = 0.4;
              emissive = themeColor;
              emissiveIntensity = 0.55;
            } else if (isFloor) {
              // Command-center dark grid floor with telemetry dots
              matColor = new THREE.Color(0xffffff);
              textureMap = floorTex;
              roughness = 0.55;
              metalness = 0.15;
            } else if (isCounter) {
              // Dark architectural partition divider / low wall
              matColor = new THREE.Color(0x1a1c24);
              roughness = 0.65;
              metalness = 0.2;
            } else if (isDesk) {
              // Sleek dark walnut workstation desk
              matColor = new THREE.Color(0x282c37);
              textureMap = woodTex;
              roughness = 0.42;
              metalness = 0.12;
            } else if (isChair) {
              // Modern matte charcoal mesh task chairs
              matColor = new THREE.Color(0x16181f);
              roughness = 0.65;
              metalness = 0.25;
            } else if (isSofa) {
              // Executive dark leather lounge sofa
              matColor = new THREE.Color(0x222530);
              roughness = 0.55;
              metalness = 0.15;
            } else if (isPlant) {
              // Lush botanical deep emerald foliage
              matColor = new THREE.Color(0x10b981);
              roughness = 0.45;
              metalness = 0.05;
            } else if (isBoard) {
              // Interactive sprint whiteboard with agile architecture diagrams
              matColor = new THREE.Color(0x1e222d);
              textureMap = boardTex;
              roughness = 0.3;
              metalness = 0.1;
            } else if (isCabinet) {
              // Slate architectural credenza
              matColor = new THREE.Color(0x1c202a);
              roughness = 0.5;
              metalness = 0.25;
            } else if (isPC) {
              // Workstation chassis with glowing telemetry cyan terminal display
              matColor = new THREE.Color(0x0f1117);
              roughness = 0.2;
              metalness = 0.9;
              emissive = new THREE.Color(0x38bdf8);
              emissiveIntensity = 0.95;
            } else if (isLamp) {
              // Architectural matte black flexo lamp with warm incandescent glow
              matColor = new THREE.Color(0x12141a);
              roughness = 0.3;
              metalness = 0.7;
              emissive = new THREE.Color(0xff5c1a);
              emissiveIntensity = 0.75;
            }

            mesh.material = new THREE.MeshStandardNodeMaterial({
              color: matColor,
              ...(textureMap ? { map: textureMap } : {}),
              roughness,
              metalness,
              ...(emissive ? { emissive, emissiveIntensity } : {}),
            });
          }
        }
      }
    });

    // Extract Points of Interest
    this.poiManager.loadFromGlb(this.office);
  }

  public updateThemeColor(color: string): void {
    if (!this.office) return;

    const themeColor = new THREE.Color(color);

    this.office.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        if (name.startsWith('colored') && mesh.material) {
          // Update existing material color if it's a NodeMaterial
          // or replace it if needed. Since we already replaced them in load(),
          // we can just update the color property.
          if ((mesh.material as any).color) {
            (mesh.material as any).color.copy(themeColor);
          }
        }
      }
    });
  }

  public getOffice(): THREE.Group | null {
    return this.office;
  }
}
