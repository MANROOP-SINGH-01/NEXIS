
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three/webgpu';
import { getAgentSet } from '../../data/agents';
import { useTeamStore } from '../../integration/store/teamStore';
import { DRACO_LIB_PATH } from '../constants';
import { NavMeshManager } from '../pathfinding/NavMeshManager';
import { PoiManager } from './PoiManager';

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

    // Extract NavMesh and setup
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

          // Apply specific material for WebGPU shadow compatibility as requested
          if (mesh.material) {
            const oldMat = mesh.material as THREE.MeshStandardMaterial;

            // Check if mesh name starts with "colored" to apply thematic color
            const isColoredMesh = name.startsWith('colored');
            const isPC = name.includes('pc') || name.includes('laptop');
            const isDesk = name.includes('desk') || name.includes('table') || name.includes('counter');
            const isFloor = name.includes('floor');
            const isLamp = name.includes('flexo');
            const isPlant = name.includes('plant');
            const isSeating = name.includes('chair') || name.includes('sofa');

            let roughness = 0.58;
            let metalness = 0.15;
            let emissive: THREE.Color | undefined = undefined;
            let emissiveIntensity = 0.0;

            if (isPC) {
              // Sleek workstation chassis with subtle terminal screen glow
              roughness = 0.28;
              metalness = 0.75;
              emissive = new THREE.Color(0x0284c7);
              emissiveIntensity = 0.45;
            } else if (isLamp) {
              // Architectural desk flexo lamp with warm glow
              roughness = 0.32;
              metalness = 0.6;
              emissive = new THREE.Color(0xfef08a);
              emissiveIntensity = 0.55;
            } else if (isDesk) {
              // Modern satin studio desk
              roughness = 0.52;
              metalness = 0.05;
            } else if (isFloor) {
              // Clean architectural studio floor with gentle specular reflection
              roughness = 0.55;
              metalness = 0.02;
            } else if (isPlant) {
              roughness = 0.52;
              metalness = 0.05;
            } else if (isSeating) {
              roughness = 0.82;
              metalness = 0.02;
            }

            mesh.material = new THREE.MeshStandardNodeMaterial({
              color: isColoredMesh ? themeColor : oldMat.color,
              map: oldMat.map,
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
