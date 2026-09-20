
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three/webgpu';
import { getAgentSet } from '../../data/agents';
import { useTeamStore } from '../../integration/store/teamStore';
import { DRACO_LIB_PATH } from '../constants';
import { NavMeshManager } from '../pathfinding/NavMeshManager';
import { PoiManager } from './PoiManager';
import { ObstacleSystem } from '../physics/ObstacleSystem';

import { getFloorTexture, getWoodDeskTexture, getWhiteboardTexture, getComputerScreenTexture } from './TextureGenerator';

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
    const computerTex = getComputerScreenTexture();

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
              // Modernist solid ink boundary framing perimeter
              matColor = new THREE.Color(0x111111);
              roughness = 0.55;
              metalness = 0.15;
            } else if (isFloor) {
              // Bauhaus studio terrazzo grid floor with tactile limestone aggregate
              matColor = new THREE.Color(0xffffff);
              textureMap = floorTex;
              roughness = 0.65;
              metalness = 0.05;
            } else if (isCounter) {
              // Clean architectural plaster partition divider / low wall
              matColor = new THREE.Color(0xFAF7F0);
              roughness = 0.55;
              metalness = 0.05;
            } else if (isDesk) {
              // Scandinavian blonde birch workstation desks
              matColor = new THREE.Color(0xffffff);
              textureMap = woodTex;
              roughness = 0.40;
              metalness = 0.08;
            } else if (isChair) {
              // Bauhaus Marcel Breuer task chairs (Bauhaus Cobalt Blue upholstery & tubular steel)
              matColor = new THREE.Color(0x2457A6);
              roughness = 0.35;
              metalness = 0.35;
            } else if (isSofa) {
              // Modernist lounge sofa in warm cognac saddle leather
              matColor = new THREE.Color(0xC68B59);
              roughness = 0.50;
              metalness = 0.08;
            } else if (isPlant) {
              // Vibrant emerald botanical foliage
              matColor = new THREE.Color(0x2E7D32);
              roughness = 0.45;
              metalness = 0.05;
            } else if (isBoard) {
              // Interactive sprint whiteboard with agile architecture diagrams
              matColor = new THREE.Color(0xffffff);
              textureMap = boardTex;
              roughness = 0.25;
              metalness = 0.08;
            } else if (isCabinet) {
              // Clean Bauhaus warm cream architectural credenzas
              matColor = new THREE.Color(0xEDE6D8);
              roughness = 0.45;
              metalness = 0.12;
            } else if (isPC) {
              // High-resolution developer IDE & telemetry monitor screen
              matColor = new THREE.Color(0xffffff);
              textureMap = computerTex;
              roughness = 0.22;
              metalness = 0.35;
              emissive = new THREE.Color(0x38bdf8);
              emissiveIntensity = 0.25;
            } else if (isLamp) {
              // Classic Wilhelm Wagenfeld Bauhaus lamp (Bauhaus Red enamel with warm incandescent bulb)
              matColor = new THREE.Color(0xE53935);
              roughness = 0.25;
              metalness = 0.4;
              emissive = new THREE.Color(0xF4C430);
              emissiveIntensity = 0.85;
            }

            mesh.material = new THREE.MeshStandardNodeMaterial({
              color: matColor,
              ...(textureMap ? { map: textureMap } : {}),
              roughness,
              metalness,
              ...(emissive ? { emissive, emissiveIntensity, ...(isPC && textureMap ? { emissiveMap: textureMap } : {}) } : {}),
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
