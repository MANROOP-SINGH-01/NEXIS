
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three/webgpu';
import { getAgentSet } from '../../data/agents';
import { useTeamStore } from '../../integration/store/teamStore';
import { DRACO_LIB_PATH } from '../constants';
import { NavMeshManager } from '../pathfinding/NavMeshManager';
import { PoiManager } from './PoiManager';

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
              emissiveIntensity = 0.45;
            } else if (isFloor) {
              // Architectural concrete/tile floor with procedural grid & terrazzo
              matColor = new THREE.Color(0xffffff);
              textureMap = floorTex;
              roughness = 0.65;
              metalness = 0.04;
            } else if (isCounter) {
              // Modern architectural acoustic partition divider / low wall
              matColor = new THREE.Color(0x334155);
              roughness = 0.82;
              metalness = 0.06;
            } else if (isDesk) {
              // Warm Scandinavian light oak with realistic wood grain
              matColor = new THREE.Color(0xf1dfc6);
              textureMap = woodTex;
              roughness = 0.45;
              metalness = 0.02;
            } else if (isChair) {
              // Modern Herman Miller matte charcoal mesh task chairs
              matColor = new THREE.Color(0x27272a);
              roughness = 0.72;
              metalness = 0.18;
            } else if (isSofa) {
              // Designer modern cognac leather lounge sofa
              matColor = new THREE.Color(0xb45309);
              roughness = 0.58;
              metalness = 0.06;
            } else if (isPlant) {
              // Lush botanical emerald green foliage
              matColor = new THREE.Color(0x15803d);
              roughness = 0.48;
              metalness = 0.04;
            } else if (isBoard) {
              // Interactive sprint whiteboard with agile architecture diagrams
              matColor = new THREE.Color(0xffffff);
              textureMap = boardTex;
              roughness = 0.22;
              metalness = 0.08;
            } else if (isCabinet) {
              // Modern slate architectural credenza
              matColor = new THREE.Color(0x475569);
              roughness = 0.52;
              metalness = 0.15;
            } else if (isPC) {
              // Space gray workstation chassis with glowing active terminal display
              matColor = new THREE.Color(0x18181b);
              roughness = 0.26;
              metalness = 0.85;
              emissive = new THREE.Color(0x0ea5e9);
              emissiveIntensity = 0.75;
            } else if (isLamp) {
              // Architectural matte black flexo lamp with warm incandescent bulb
              matColor = new THREE.Color(0x18181b);
              roughness = 0.32;
              metalness = 0.65;
              emissive = new THREE.Color(0xfef08a);
              emissiveIntensity = 0.85;
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
