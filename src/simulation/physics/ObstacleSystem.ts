import * as THREE from 'three/webgpu';
import { OFFICE_BOUNDS } from './PhysicsTypes';

export interface OfficeObstacle {
  id: string;
  name: string;
  box: THREE.Box3;
  type: 'desk' | 'counter' | 'plant' | 'table' | 'cabinet' | 'board' | 'sofa' | 'prop';
}

/**
 * ObstacleSystem
 *
 * Enforces rigid 3D obstacle avoidance and collision resolution for all
 * characters in the 3D office diorama. Prevents characters from clipping,
 * sinking, or getting stuck inside desks, reception counters, plants,
 * cabinets, and furniture.
 */
export class ObstacleSystem {
  public static readonly AGENT_RADIUS = 0.32;
  public static readonly AGENT_HEIGHT = 1.25;

  private static obstacles: OfficeObstacle[] = [
    // Pre-calibrated obstacles matching office.glb exact geometry
    {
      id: 'static-counter',
      name: 'Reception Counter',
      type: 'counter',
      box: new THREE.Box3(
        new THREE.Vector3(-4.55, 0.0, 3.60),
        new THREE.Vector3(-2.45, 0.85, 4.28)
      ),
    },
    {
      id: 'static-work-desk.001',
      name: 'Work Desk 1',
      type: 'desk',
      box: new THREE.Box3(
        new THREE.Vector3(0.75, 0.0, -3.58),
        new THREE.Vector3(2.18, 0.82, -2.75)
      ),
    },
    {
      id: 'static-work-desk.002',
      name: 'Work Desk 2',
      type: 'desk',
      box: new THREE.Box3(
        new THREE.Vector3(2.52, 0.0, -3.58),
        new THREE.Vector3(3.95, 0.82, -2.75)
      ),
    },
    {
      id: 'static-work-desk.003',
      name: 'Work Desk 3',
      type: 'desk',
      box: new THREE.Box3(
        new THREE.Vector3(0.98, 0.0, -1.48),
        new THREE.Vector3(2.40, 0.82, -0.65)
      ),
    },
    {
      id: 'static-work-desk.004',
      name: 'Work Desk 4',
      type: 'desk',
      box: new THREE.Box3(
        new THREE.Vector3(1.92, 0.0, -1.88),
        new THREE.Vector3(3.36, 0.82, -1.05)
      ),
    },
    {
      id: 'static-cafe-table',
      name: 'Cafe Table',
      type: 'table',
      box: new THREE.Box3(
        new THREE.Vector3(-3.45, 0.0, -3.95),
        new THREE.Vector3(-2.48, 0.80, -2.98)
      ),
    },
    {
      id: 'static-cabinet',
      name: 'Office Cabinet',
      type: 'cabinet',
      box: new THREE.Box3(
        new THREE.Vector3(-5.10, 0.0, -4.18),
        new THREE.Vector3(-3.60, 1.20, -3.55)
      ),
    },
    {
      id: 'static-plant.001',
      name: 'Lush Potted Plant 1',
      type: 'plant',
      box: new THREE.Box3(
        new THREE.Vector3(-2.45, 0.0, 3.60),
        new THREE.Vector3(-1.78, 1.10, 4.20)
      ),
    },
    {
      id: 'static-plant.002',
      name: 'Lush Potted Plant 2',
      type: 'plant',
      box: new THREE.Box3(
        new THREE.Vector3(-4.85, 0.0, -2.40),
        new THREE.Vector3(-4.18, 1.10, -1.80)
      ),
    },
    {
      id: 'static-board',
      name: 'Agile Architecture Whiteboard',
      type: 'board',
      box: new THREE.Box3(
        new THREE.Vector3(1.95, 0.0, 2.22),
        new THREE.Vector3(4.05, 1.45, 2.72)
      ),
    },
    {
      id: 'static-sofa',
      name: 'Designer Lounge Sofa',
      type: 'sofa',
      box: new THREE.Box3(
        new THREE.Vector3(-4.52, 0.0, 0.95),
        new THREE.Vector3(-3.55, 0.70, 1.35)
      ),
    },
  ];

  /**
   * Registers or updates obstacles dynamically extracted from the loaded 3D scene.
   */
  public static registerFromScene(sceneGroup: THREE.Group): void {
    sceneGroup.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        const isObstacle =
          name.includes('desk') ||
          name.includes('counter') ||
          name.includes('table') ||
          name.includes('plant') ||
          name.includes('cabinet') ||
          name.includes('board') ||
          name.includes('sofa');

        if (isObstacle) {
          const worldBox = new THREE.Box3().setFromObject(mesh);
          // Only register if geometry is valid
          if (!worldBox.isEmpty()) {
            const existingIdx = this.obstacles.findIndex(o => o.id === mesh.name);
            const obstacleDef: OfficeObstacle = {
              id: mesh.name,
              name: mesh.name,
              type: name.includes('plant') ? 'plant' : name.includes('counter') ? 'counter' : 'desk',
              box: worldBox,
            };

            if (existingIdx >= 0) {
              this.obstacles[existingIdx] = obstacleDef;
            } else {
              this.obstacles.push(obstacleDef);
            }
          }
        }
      }
    });
  }

  public static getObstacles(): OfficeObstacle[] {
    return this.obstacles;
  }

  /**
   * Checks if a point penetrates any registered obstacle footprint.
   */
  public static isInsideAnyObstacle(
    pos: THREE.Vector3,
    extraMargin: number = 0.05,
    checkHeight: boolean = true
  ): boolean {
    const r = ObstacleSystem.AGENT_RADIUS + extraMargin;
    for (const obs of this.obstacles) {
      const box = obs.box;
      if (checkHeight && pos.y > box.max.y + 0.05) continue;
      if (
        pos.x >= box.min.x - r &&
        pos.x <= box.max.x + r &&
        pos.z >= box.min.z - r &&
        pos.z <= box.max.z + r
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns the obstacle containing the given position, if any.
   */
  public static getObstacleAt(
    pos: THREE.Vector3,
    extraMargin: number = 0.05,
    checkHeight: boolean = true
  ): OfficeObstacle | null {
    const r = ObstacleSystem.AGENT_RADIUS + extraMargin;
    for (const obs of this.obstacles) {
      const box = obs.box;
      if (checkHeight && pos.y > box.max.y + 0.05) continue;
      if (
        pos.x >= box.min.x - r &&
        pos.x <= box.max.x + r &&
        pos.z >= box.min.z - r &&
        pos.z <= box.max.z + r
      ) {
        return obs;
      }
    }
    return null;
  }

  /**
   * Finds the nearest open, walkable floor position strictly outside all obstacle structures.
   * If pos is already outside all obstacles, clamps to room boundaries and returns a copy.
   * If pos is inside or too close to an obstacle, projects to the nearest safe floor position.
   */
  public static findSafeFloorPosition(
    pos: THREE.Vector3,
    radius: number = ObstacleSystem.AGENT_RADIUS,
    navMesh?: { isPointOnNavMesh: (p: THREE.Vector3) => boolean }
  ): THREE.Vector3 {
    const result = pos.clone();
    result.y = OFFICE_BOUNDS.floorY;

    // First clamp within office perimeter
    result.x = THREE.MathUtils.clamp(result.x, OFFICE_BOUNDS.minX + radius, OFFICE_BOUNDS.maxX - radius);
    result.z = THREE.MathUtils.clamp(result.z, OFFICE_BOUNDS.minZ + radius, OFFICE_BOUNDS.maxZ - radius);

    // If already clear of all obstacles and on navmesh (if provided), return immediately
    if (!this.isInsideAnyObstacle(result, 0.02, false)) {
      if (!navMesh || navMesh.isPointOnNavMesh(result)) {
        return result;
      }
    }

    // Identify all obstacles that pos currently penetrates or is dangerously close to
    const clearance = radius + 0.15;
    const penetratingObs = this.obstacles.filter(obs => {
      const box = obs.box;
      return (
        result.x >= box.min.x - clearance &&
        result.x <= box.max.x + clearance &&
        result.z >= box.min.z - clearance &&
        result.z <= box.max.z + clearance
      );
    });

    if (penetratingObs.length === 0) {
      return result;
    }

    // Generate candidate safe escape positions projected outside penetrating obstacle boundaries
    const candidates: THREE.Vector3[] = [];
    for (const obs of penetratingObs) {
      const box = obs.box;
      // 4 cardinal projections with generous clearance
      candidates.push(new THREE.Vector3(box.min.x - clearance, OFFICE_BOUNDS.floorY, result.z));
      candidates.push(new THREE.Vector3(box.max.x + clearance, OFFICE_BOUNDS.floorY, result.z));
      candidates.push(new THREE.Vector3(result.x, OFFICE_BOUNDS.floorY, box.min.z - clearance));
      candidates.push(new THREE.Vector3(result.x, OFFICE_BOUNDS.floorY, box.max.z + clearance));

      // 4 corner diagonal projections
      candidates.push(new THREE.Vector3(box.min.x - clearance, OFFICE_BOUNDS.floorY, box.min.z - clearance));
      candidates.push(new THREE.Vector3(box.max.x + clearance, OFFICE_BOUNDS.floorY, box.min.z - clearance));
      candidates.push(new THREE.Vector3(box.min.x - clearance, OFFICE_BOUNDS.floorY, box.max.z + clearance));
      candidates.push(new THREE.Vector3(box.max.x + clearance, OFFICE_BOUNDS.floorY, box.max.z + clearance));
    }

    // Add radial search around pos if complex multi-obstacle clutter exists
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      for (let dist = 0.5; dist <= 2.5; dist += 0.4) {
        candidates.push(new THREE.Vector3(
          result.x + Math.cos(angle) * dist,
          OFFICE_BOUNDS.floorY,
          result.z + Math.sin(angle) * dist
        ));
      }
    }

    let bestCandidate: THREE.Vector3 | null = null;
    let bestDistSq = Infinity;

    for (const cand of candidates) {
      cand.x = THREE.MathUtils.clamp(cand.x, OFFICE_BOUNDS.minX + radius, OFFICE_BOUNDS.maxX - radius);
      cand.z = THREE.MathUtils.clamp(cand.z, OFFICE_BOUNDS.minZ + radius, OFFICE_BOUNDS.maxZ - radius);

      // Must be strictly clear of all obstacles
      if (this.isInsideAnyObstacle(cand, 0.05, false)) continue;

      const d2 = cand.distanceToSquared(result);
      const isOnNav = navMesh ? navMesh.isPointOnNavMesh(cand) : true;
      const score = isOnNav ? d2 : d2 + 5.0;

      if (score < bestDistSq) {
        bestDistSq = score;
        bestCandidate = cand;
      }
    }

    if (bestCandidate) {
      return bestCandidate;
    }

    // Absolute fallback: known open lobby floor coordinate (0, 0, 0)
    return new THREE.Vector3(0, OFFICE_BOUNDS.floorY, 0);
  }

  /**
   * Resolves horizontal and vertical obstacle collisions for a given character position.
   * If the character penetrates any obstacle, smoothly pushes them outside along the
   * shallowest penetration normal and damps velocity. Multi-pass to handle dense furniture.
   *
   * @param pos World position of character (modified in place)
   * @param vel Optional velocity vector (deflected on collision)
   * @param radius Character collision radius
   * @returns boolean whether a collision was resolved
   */
  public static resolveCollision(
    pos: THREE.Vector3,
    vel?: THREE.Vector3,
    radius: number = ObstacleSystem.AGENT_RADIUS
  ): boolean {
    let resolved = false;

    // 1. Office room boundary containment
    const minX = OFFICE_BOUNDS.minX + radius;
    const maxX = OFFICE_BOUNDS.maxX - radius;
    const minZ = OFFICE_BOUNDS.minZ + radius;
    const maxZ = OFFICE_BOUNDS.maxZ - radius;

    if (pos.x < minX) {
      pos.x = minX;
      if (vel && vel.x < 0) vel.x = Math.abs(vel.x) * 0.3;
      resolved = true;
    } else if (pos.x > maxX) {
      pos.x = maxX;
      if (vel && vel.x > 0) vel.x = -Math.abs(vel.x) * 0.3;
      resolved = true;
    }

    if (pos.z < minZ) {
      pos.z = minZ;
      if (vel && vel.z < 0) vel.z = Math.abs(vel.z) * 0.3;
      resolved = true;
    } else if (pos.z > maxZ) {
      pos.z = maxZ;
      if (vel && vel.z > 0) vel.z = -Math.abs(vel.z) * 0.3;
      resolved = true;
    }

    if (!vel && pos.y < OFFICE_BOUNDS.floorY) {
      pos.y = OFFICE_BOUNDS.floorY;
      resolved = true;
    } else if (pos.y > OFFICE_BOUNDS.ceilY) {
      pos.y = OFFICE_BOUNDS.ceilY;
      if (vel && vel.y > 0) vel.y = -Math.abs(vel.y) * 0.3;
      resolved = true;
    }

    // 2. Solid Furniture & Obstacle Resolution (up to 2 passes for chained furniture)
    for (let pass = 0; pass < 2; pass++) {
      let passResolved = false;

      for (const obs of this.obstacles) {
        const box = obs.box;

        // Vertical clearance check: if character is fully above the obstacle, allow clearance
        if (pos.y > box.max.y + 0.05) {
          continue;
        }

        // Check if character's horizontal footprint overlaps obstacle box
        const expandedMinX = box.min.x - radius;
        const expandedMaxX = box.max.x + radius;
        const expandedMinZ = box.min.z - radius;
        const expandedMaxZ = box.max.z + radius;

        if (
          pos.x >= expandedMinX &&
          pos.x <= expandedMaxX &&
          pos.z >= expandedMinZ &&
          pos.z <= expandedMaxZ
        ) {
          // Calculate penetration depths along all 4 cardinal directions
          const penLeft = pos.x - expandedMinX;
          const penRight = expandedMaxX - pos.x;
          const penBack = pos.z - expandedMinZ;
          const penFront = expandedMaxZ - pos.z;

          const minPen = Math.min(penLeft, penRight, penBack, penFront);

          if (minPen === penLeft) {
            pos.x = expandedMinX;
            if (vel && vel.x > 0) vel.x = -Math.abs(vel.x) * 0.25;
          } else if (minPen === penRight) {
            pos.x = expandedMaxX;
            if (vel && vel.x < 0) vel.x = Math.abs(vel.x) * 0.25;
          } else if (minPen === penBack) {
            pos.z = expandedMinZ;
            if (vel && vel.z > 0) vel.z = -Math.abs(vel.z) * 0.25;
          } else {
            pos.z = expandedMaxZ;
            if (vel && vel.z < 0) vel.z = Math.abs(vel.z) * 0.25;
          }

          passResolved = true;
          resolved = true;
        }
      }

      if (!passResolved) break;
    }

    return resolved;
  }

  /**
   * Resolves mutual collision and push-apart separation between multiple agents.
   * Prevents agents from intersecting or becoming stuck inside each other.
   *
   * @param agentPositions Array of Vector3 positions for each active agent (modified in place)
   * @param agentVelocities Optional array of linear velocities for physical bouncing
   * @param grabbedIndex Index of any currently grabbed agent (grabbable agent is immovable by floor agents)
   * @param seatedIndices Set of agent indices that are seated at desks (immovable)
   */
  public static resolveAgentOverlap(
    agentPositions: THREE.Vector3[],
    agentVelocities?: THREE.Vector3[],
    grabbedIndex: number | null = null,
    seatedIndices: Set<number> = new Set()
  ): boolean {
    let hadOverlap = false;
    const minDistance = 0.65; // Desired distance between agent centers
    const minDistanceSq = minDistance * minDistance;
    const count = agentPositions.length;

    for (let i = 0; i < count; i++) {
      const posA = agentPositions[i];
      if (!posA) continue;

      for (let j = i + 1; j < count; j++) {
        const posB = agentPositions[j];
        if (!posB) continue;

        const dx = posA.x - posB.x;
        const dz = posA.z - posB.z;
        const distSq = dx * dx + dz * dz;

        // If characters are close horizontally and vertically overlapping
        if (distSq < minDistanceSq && Math.abs(posA.y - posB.y) < 1.1) {
          hadOverlap = true;
          let dist = Math.sqrt(distSq);
          let normX = 1.0;
          let normZ = 0.0;

          if (dist > 0.001) {
            normX = dx / dist;
            normZ = dz / dist;
          } else {
            // Degenerate case: exactly on top of each other, separate randomly
            const angle = Math.random() * Math.PI * 2;
            normX = Math.cos(angle);
            normZ = Math.sin(angle);
            dist = 0.001;
          }

          const overlap = minDistance - dist;

          const isASeated = seatedIndices.has(i);
          const isBSeated = seatedIndices.has(j);
          const isAGrabbed = grabbedIndex === i;
          const isBGrabbed = grabbedIndex === j;

          if (isAGrabbed && !isBGrabbed) {
            // A is held by mouse, push B fully away
            posB.x -= normX * overlap;
            posB.z -= normZ * overlap;
            ObstacleSystem.resolveCollision(posB, agentVelocities?.[j]);
          } else if (isBGrabbed && !isAGrabbed) {
            // B is held by mouse, push A fully away
            posA.x += normX * overlap;
            posA.z += normZ * overlap;
            ObstacleSystem.resolveCollision(posA, agentVelocities?.[i]);
          } else if (isASeated && !isBSeated) {
            // A is seated at desk, push B fully away
            posB.x -= normX * overlap;
            posB.z -= normZ * overlap;
            ObstacleSystem.resolveCollision(posB, agentVelocities?.[j]);
          } else if (isBSeated && !isASeated) {
            // B is seated at desk, push A fully away
            posA.x += normX * overlap;
            posA.z += normZ * overlap;
            ObstacleSystem.resolveCollision(posA, agentVelocities?.[i]);
          } else {
            // Both are moving/standing: split separation equally 50/50
            const halfOverlap = overlap * 0.5;
            posA.x += normX * halfOverlap;
            posA.z += normZ * halfOverlap;
            posB.x -= normX * halfOverlap;
            posB.z -= normZ * halfOverlap;

            ObstacleSystem.resolveCollision(posA, agentVelocities?.[i]);
            ObstacleSystem.resolveCollision(posB, agentVelocities?.[j]);

            // If an airborne agent hits another agent, impart a bouncy clumsy elastic impulse
            if (agentVelocities) {
              const velA = agentVelocities[i];
              const velB = agentVelocities[j];
              if (velA && velB) {
                const bounceForce = 0.8;
                velA.x += normX * bounceForce;
                velA.z += normZ * bounceForce;
                velB.x -= normX * bounceForce;
                velB.z -= normZ * bounceForce;
              }
            }
          }
        }
      }
    }

    return hadOverlap;
  }
}
