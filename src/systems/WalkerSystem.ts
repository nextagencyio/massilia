import * as THREE from 'three';
import type { Grid } from '../world/Grid';
import type { InvasionSystem } from './InvasionSystem';
import { getRoadNeighbors, getAdjacentRoadTiles } from '../world/Pathfinding';
import { TILE_SIZE } from '../constants';

export type WalkerType = 'water' | 'food' | 'soldier' | 'farmer';

const WALKER_COLORS: Record<WalkerType, number> = {
  water: 0x3388dd,
  food: 0xdd8833,
  soldier: 0x4444cc,
  farmer: 0x669933,
};

export interface Walker {
  type: WalkerType;
  gridX: number;
  gridZ: number;
  targetX: number;
  targetZ: number;
  prevX: number;
  prevZ: number;
  progress: number;
  lifespan: number;
  mesh: THREE.Group;
  hp: number;
  homeX: number;
  homeZ: number;
}

const WALKER_SPEED = 2.0; // tiles per second
const WALKER_LIFESPAN = 30; // ticks
const BOB_AMPLITUDE = 0.05;
const BOB_FREQUENCY = 6;
const SOLDIER_PATROL_RADIUS = 4;

const DIRECTIONS = [
  { dx: 1, dz: 0 },
  { dx: -1, dz: 0 },
  { dx: 0, dz: 1 },
  { dx: 0, dz: -1 },
];

export class WalkerSystem {
  private scene: THREE.Scene;
  walkers: Walker[] = [];
  private timeElapsed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(type: WalkerType, x: number, z: number, grid: Grid, buildingSize = 1): void {
    // Find an adjacent road tile to start on (checking full building perimeter)
    const roads = getAdjacentRoadTiles(grid, x, z, buildingSize);

    let startPos: { x: number; z: number };

    if (roads.length > 0) {
      startPos = roads[Math.floor(Math.random() * roads.length)];
    } else if (type === 'soldier') {
      // Soldiers can spawn without roads — find an adjacent empty grass tile
      startPos = this.findAdjacentEmptyTile(grid, x, z, buildingSize);
    } else {
      return;
    }

    const group = this.createWalkerMesh(type);
    group.position.set(
      startPos.x * TILE_SIZE + TILE_SIZE / 2,
      0.05,
      startPos.z * TILE_SIZE + TILE_SIZE / 2
    );

    this.scene.add(group);

    this.walkers.push({
      type,
      gridX: startPos.x,
      gridZ: startPos.z,
      targetX: startPos.x,
      targetZ: startPos.z,
      prevX: x,
      prevZ: z,
      progress: 0,
      lifespan: WALKER_LIFESPAN,
      mesh: group,
      hp: type === 'soldier' ? 20 : 15,
      homeX: x,
      homeZ: z,
    });
  }

  /** Find an empty (no building) tile adjacent to a building's perimeter */
  private findAdjacentEmptyTile(grid: Grid, x: number, z: number, size: number): { x: number; z: number } {
    const candidates: { x: number; z: number }[] = [];
    for (let dx = -1; dx <= size; dx++) {
      for (let dz = -1; dz <= size; dz++) {
        // Only check perimeter tiles (not inside the building footprint)
        if (dx >= 0 && dx < size && dz >= 0 && dz < size) continue;
        const nx = x + dx;
        const nz = z + dz;
        if (!grid.isInBounds(nx, nz)) continue;
        const tile = grid.getTile(nx, nz);
        if (tile && !tile.building) {
          candidates.push({ x: nx, z: nz });
        }
      }
    }
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    // Fallback: spawn at building origin
    return { x, z };
  }

  private createWalkerMesh(type: WalkerType): THREE.Group {
    const group = new THREE.Group();
    const bodyColor = WALKER_COLORS[type];

    if (type === 'soldier') {
      // Armored body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.4, 0.28),
        new THREE.MeshLambertMaterial({ color: 0x555588 })
      );
      body.position.y = 0.28;
      group.add(body);

      // Helmet
      const helmet = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.2, 0.22),
        new THREE.MeshLambertMaterial({ color: 0x777799 })
      );
      helmet.position.y = 0.58;
      group.add(helmet);

      // Helmet crest (red plume)
      const crest = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.12, 0.2),
        new THREE.MeshLambertMaterial({ color: 0xcc2222 })
      );
      crest.position.set(0, 0.72, 0);
      group.add(crest);

      // Shield (left side)
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.3, 0.22),
        new THREE.MeshLambertMaterial({ color: 0xcc3333 })
      );
      shield.position.set(-0.18, 0.32, 0);
      group.add(shield);

      // Sword (right side)
      const sword = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.3, 0.04),
        new THREE.MeshLambertMaterial({ color: 0xcccccc })
      );
      sword.position.set(0.18, 0.35, 0);
      group.add(sword);

    } else if (type === 'farmer') {
      // Body (brown tunic)
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.38, 0.24),
        new THREE.MeshLambertMaterial({ color: 0x886644 })
      );
      body.position.y = 0.27;
      group.add(body);

      // Head with straw hat
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.16, 0.18),
        new THREE.MeshLambertMaterial({ color: 0xddbb88 })
      );
      head.position.y = 0.54;
      group.add(head);

      const hat = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.06, 0.3),
        new THREE.MeshLambertMaterial({ color: 0xccbb55 })
      );
      hat.position.y = 0.65;
      group.add(hat);

      // Pitchfork
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.45, 0.03),
        new THREE.MeshLambertMaterial({ color: 0x664422 })
      );
      handle.position.set(0.16, 0.35, 0);
      group.add(handle);

    } else {
      // Standard walker (water / food carrier)
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.38, 0.24),
        new THREE.MeshLambertMaterial({ color: bodyColor })
      );
      body.position.y = 0.27;
      group.add(body);

      // Head
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.16, 0.18),
        new THREE.MeshLambertMaterial({ color: 0xddbb88 })
      );
      head.position.y = 0.54;
      group.add(head);

      // Carried item
      if (type === 'water') {
        // Water bucket
        const bucket = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.12, 0.12),
          new THREE.MeshLambertMaterial({ color: 0x6699cc })
        );
        bucket.position.set(0.16, 0.25, 0);
        group.add(bucket);
      } else if (type === 'food') {
        // Food basket
        const basket = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.1, 0.14),
          new THREE.MeshLambertMaterial({ color: 0xcc9933 })
        );
        basket.position.set(0.16, 0.25, 0);
        group.add(basket);

        // Food peeking out
        const apple = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.06, 0.06),
          new THREE.MeshLambertMaterial({ color: 0xcc3333 })
        );
        apple.position.set(0.16, 0.33, 0);
        group.add(apple);
      }
    }

    return group;
  }

  /** Called each simulation tick to age walkers */
  tick(): void {
    for (let i = this.walkers.length - 1; i >= 0; i--) {
      this.walkers[i].lifespan--;
      if (this.walkers[i].lifespan <= 0) {
        this.removeWalker(i);
      }
    }
  }

  /** Called each frame for smooth movement */
  update(dt: number, grid: Grid, invasionSystem?: InvasionSystem): void {
    this.timeElapsed += dt;

    for (const walker of this.walkers) {
      walker.progress += dt * WALKER_SPEED;

      if (walker.progress >= 1) {
        // Arrived at target
        walker.prevX = walker.gridX;
        walker.prevZ = walker.gridZ;
        walker.gridX = walker.targetX;
        walker.gridZ = walker.targetZ;
        walker.progress = 0;

        // Service adjacent houses
        this.serviceNearbyHouses(walker, grid);

        // Choose next tile
        this.chooseNextTile(walker, grid, invasionSystem);
      }

      // Interpolate position
      const lerpX = walker.gridX + (walker.targetX - walker.gridX) * walker.progress;
      const lerpZ = walker.gridZ + (walker.targetZ - walker.gridZ) * walker.progress;

      // Bob up and down
      const bob = Math.sin(this.timeElapsed * BOB_FREQUENCY + walker.gridX * 3) * BOB_AMPLITUDE;

      walker.mesh.position.set(
        lerpX * TILE_SIZE + TILE_SIZE / 2,
        0.05 + bob,
        lerpZ * TILE_SIZE + TILE_SIZE / 2
      );
    }
  }

  private chooseNextTile(walker: Walker, grid: Grid, invasionSystem?: InvasionSystem): void {
    // Soldiers move freely on any terrain
    if (walker.type === 'soldier') {
      // Chase invaders — if any exist on the map, all soldiers mobilize (no range limit)
      if (invasionSystem && invasionSystem.invaders.length > 0) {
        const target = invasionSystem.findNearestInvader(
          walker.gridX, walker.gridZ, Infinity
        );
        if (target) {
          this.moveSoldierToward(walker, target.x, target.z, grid);
          return;
        }
      }

      // No enemy — patrol: random walk on grass near home barracks
      this.soldierPatrol(walker, grid);
      return;
    }

    // Non-soldier walkers: road-based movement
    const neighbors = getRoadNeighbors(grid, walker.gridX, walker.gridZ)
      .filter(n => !(n.x === walker.prevX && n.z === walker.prevZ));

    if (neighbors.length === 0) {
      const allNeighbors = getRoadNeighbors(grid, walker.gridX, walker.gridZ);
      if (allNeighbors.length > 0) {
        // Dead end - turn around
        walker.targetX = walker.prevX;
        walker.targetZ = walker.prevZ;
      } else {
        walker.targetX = walker.gridX;
        walker.targetZ = walker.gridZ;
      }
    } else {
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      walker.targetX = pick.x;
      walker.targetZ = pick.z;
    }
  }

  /** Check if a tile is walkable for soldiers (empty or road/forum) */
  private isSoldierWalkable(grid: Grid, x: number, z: number): boolean {
    if (!grid.isInBounds(x, z)) return false;
    const tile = grid.getTile(x, z);
    if (!tile) return false;
    // Soldiers can walk on empty grass, roads, and forum tiles
    return !tile.building || tile.building === 'road' || tile.building === 'forum';
  }

  /** Move a soldier one tile toward a target position, avoiding buildings */
  private moveSoldierToward(walker: Walker, tx: number, tz: number, grid: Grid): void {
    const dx = Math.sign(tx - walker.gridX);
    const dz = Math.sign(tz - walker.gridZ);

    // Try the preferred axis first, then the other
    const options: { x: number; z: number }[] = [];
    if (Math.abs(tx - walker.gridX) >= Math.abs(tz - walker.gridZ)) {
      if (dx !== 0) options.push({ x: walker.gridX + dx, z: walker.gridZ });
      if (dz !== 0) options.push({ x: walker.gridX, z: walker.gridZ + dz });
    } else {
      if (dz !== 0) options.push({ x: walker.gridX, z: walker.gridZ + dz });
      if (dx !== 0) options.push({ x: walker.gridX + dx, z: walker.gridZ });
    }

    for (const opt of options) {
      if (this.isSoldierWalkable(grid, opt.x, opt.z)) {
        walker.targetX = opt.x;
        walker.targetZ = opt.z;
        return;
      }
    }

    // Stuck — stay in place
    walker.targetX = walker.gridX;
    walker.targetZ = walker.gridZ;
  }

  /** Soldiers wander randomly on walkable tiles near their barracks */
  private soldierPatrol(walker: Walker, grid: Grid): void {
    const candidates: { x: number; z: number }[] = [];
    for (const { dx, dz } of DIRECTIONS) {
      const nx = walker.gridX + dx;
      const nz = walker.gridZ + dz;
      if (nx === walker.prevX && nz === walker.prevZ) continue;
      if (!this.isSoldierWalkable(grid, nx, nz)) continue;
      // Stay within patrol radius of home barracks
      if (Math.abs(nx - walker.homeX) + Math.abs(nz - walker.homeZ) > SOLDIER_PATROL_RADIUS) continue;
      candidates.push({ x: nx, z: nz });
    }

    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      walker.targetX = pick.x;
      walker.targetZ = pick.z;
    } else {
      // Turn around if previous tile is walkable, otherwise stay put
      if (this.isSoldierWalkable(grid, walker.prevX, walker.prevZ)) {
        walker.targetX = walker.prevX;
        walker.targetZ = walker.prevZ;
      } else {
        walker.targetX = walker.gridX;
        walker.targetZ = walker.gridZ;
      }
    }
  }

  private serviceNearbyHouses(walker: Walker, grid: Grid): void {
    const SERVICE_DURATION = 10; // ticks
    const dirs = [
      { dx: 0, dz: 0 }, { dx: 1, dz: 0 }, { dx: -1, dz: 0 },
      { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
    ];
    for (const { dx, dz } of dirs) {
      const tile = grid.getTile(walker.gridX + dx, walker.gridZ + dz);
      if (tile && tile.building === 'house') {
        if (walker.type === 'water') {
          tile.waterTimer = SERVICE_DURATION;
        } else if (walker.type === 'food') {
          tile.foodTimer = SERVICE_DURATION;
        }
      }
    }
  }

  removeWalker(index: number): void {
    const walker = this.walkers[index];
    this.scene.remove(walker.mesh);
    this.walkers.splice(index, 1);
  }

  getSoldiers(): Walker[] {
    return this.walkers.filter(w => w.type === 'soldier');
  }

  removeAll(): void {
    for (const walker of this.walkers) {
      this.scene.remove(walker.mesh);
    }
    this.walkers = [];
  }
}
