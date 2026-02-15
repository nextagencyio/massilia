import * as THREE from 'three';
import type { BuildingType } from '../types';
import { BUILDINGS, TILE_SIZE } from '../constants';
import { BuildingFactory } from '../world/BuildingFactory';
import type { Grid } from '../world/Grid';

export interface PlacedBuilding {
  type: BuildingType;
  x: number;
  z: number;
  mesh: THREE.Group;
}

export class BuildingSystem {
  private scene: THREE.Scene;
  placedBuildings: PlacedBuilding[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  canPlace(grid: Grid, type: BuildingType, x: number, z: number): boolean {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.size; dx++) {
      for (let dz = 0; dz < def.size; dz++) {
        if (!grid.isInBounds(x + dx, z + dz)) return false;
        const tile = grid.getTile(x + dx, z + dz);
        if (!tile || tile.building !== null) return false;
      }
    }
    return true;
  }

  place(grid: Grid, type: BuildingType, x: number, z: number, gold: { value: number }): boolean {
    const def = BUILDINGS[type];
    if (gold.value < def.cost) return false;
    if (!this.canPlace(grid, type, x, z)) return false;

    gold.value -= def.cost;

    // Mark tiles as occupied
    for (let dx = 0; dx < def.size; dx++) {
      for (let dz = 0; dz < def.size; dz++) {
        const tile = grid.getTile(x + dx, z + dz);
        if (tile) {
          tile.building = type;
          tile.buildingHp = def.hp;
        }
      }
    }

    // Create and place mesh
    const mesh = this.createMesh(grid, type, x, z);
    this.scene.add(mesh);
    this.placedBuildings.push({ type, x, z, mesh });

    // If wall or tower, update neighboring walls/towers
    if (type === 'wall' || type === 'tower') {
      this.rebuildAdjacentFortifications(grid, x, z);
    }

    return true;
  }

  /** Place a building from saved state (no cost deduction, grid already set) */
  placeFromSave(type: BuildingType, x: number, z: number, grid?: Grid): void {
    const mesh = this.createMesh(grid ?? null, type, x, z);
    this.scene.add(mesh);
    this.placedBuildings.push({ type, x, z, mesh });
  }

  findBuildingAt(x: number, z: number): PlacedBuilding | null {
    return this.placedBuildings.find(b => {
      const def = BUILDINGS[b.type];
      return x >= b.x && x < b.x + def.size && z >= b.z && z < b.z + def.size;
    }) ?? null;
  }

  removeBuildingAt(grid: Grid, x: number, z: number): void {
    const idx = this.placedBuildings.findIndex(b => {
      const def = BUILDINGS[b.type];
      return x >= b.x && x < b.x + def.size && z >= b.z && z < b.z + def.size;
    });
    if (idx === -1) return;
    const building = this.placedBuildings[idx];
    const def = BUILDINGS[building.type];
    const wasFortification = building.type === 'wall' || building.type === 'tower';
    const bx = building.x;
    const bz = building.z;

    // Clear tiles
    for (let dx = 0; dx < def.size; dx++) {
      for (let dz = 0; dz < def.size; dz++) {
        const tile = grid.getTile(building.x + dx, building.z + dz);
        if (tile) {
          tile.building = null;
          tile.buildingHp = 0;
        }
      }
    }

    this.scene.remove(building.mesh);
    this.placedBuildings.splice(idx, 1);

    // If a wall or tower was removed, update neighboring walls/towers
    if (wasFortification) {
      this.rebuildAdjacentFortifications(grid, bx, bz);
    }
  }

  /** Get wall/tower neighbor flags for a given tile position */
  private getWallNeighbors(grid: Grid, x: number, z: number): { n: boolean; s: boolean; e: boolean; w: boolean } {
    const isWallOrTower = (tx: number, tz: number): boolean => {
      const t = grid.getTile(tx, tz);
      return !!t && (t.building === 'wall' || t.building === 'tower');
    };
    return {
      n: isWallOrTower(x, z - 1),
      s: isWallOrTower(x, z + 1),
      e: isWallOrTower(x + 1, z),
      w: isWallOrTower(x - 1, z),
    };
  }

  /** Create the appropriate mesh for a building type at position */
  private createMesh(grid: Grid | null, type: BuildingType, x: number, z: number): THREE.Group {
    const def = BUILDINGS[type];
    let mesh: THREE.Group;

    if (type === 'wall' && grid) {
      mesh = BuildingFactory.createWall(this.getWallNeighbors(grid, x, z));
    } else if (type === 'tower' && grid) {
      mesh = BuildingFactory.createTower(this.getWallNeighbors(grid, x, z));
    } else {
      mesh = BuildingFactory.create(type);
    }

    const offset = (def.size * TILE_SIZE) / 2;
    mesh.position.set(
      x * TILE_SIZE + offset,
      0.05,
      z * TILE_SIZE + offset
    );
    return mesh;
  }

  /** Tint a building's meshes to show damage (hpRatio: 1 = full, 0 = dead) */
  tintDamage(x: number, z: number, hpRatio: number): void {
    const entry = this.placedBuildings.find(b => {
      const def = BUILDINGS[b.type];
      return x >= b.x && x < b.x + def.size && z >= b.z && z < b.z + def.size;
    });
    if (!entry) return;

    // Darken materials: lerp toward a dark red based on damage
    const dmg = 1 - hpRatio; // 0 = no damage, 1 = destroyed
    entry.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
        const mat = child.material as THREE.MeshLambertMaterial;
        // Mix original color toward dark red
        mat.emissive.setRGB(dmg * 0.4, 0, 0);
      }
    });
  }

  /** Rebuild wall/tower meshes adjacent to (x, z) so they connect properly */
  private rebuildAdjacentFortifications(grid: Grid, x: number, z: number): void {
    const dirs = [
      { dx: 0, dz: -1 },
      { dx: 0, dz: 1 },
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
    ];

    for (const { dx, dz } of dirs) {
      const nx = x + dx;
      const nz = z + dz;
      const tile = grid.getTile(nx, nz);
      if (!tile || (tile.building !== 'wall' && tile.building !== 'tower')) continue;

      // Find the placed building entry
      const idx = this.placedBuildings.findIndex(b =>
        (b.type === 'wall' || b.type === 'tower') && b.x === nx && b.z === nz
      );
      if (idx === -1) continue;

      const old = this.placedBuildings[idx];
      this.scene.remove(old.mesh);

      const neighbors = this.getWallNeighbors(grid, nx, nz);
      const newMesh = tile.building === 'tower'
        ? BuildingFactory.createTower(neighbors)
        : BuildingFactory.createWall(neighbors);
      newMesh.position.set(
        nx * TILE_SIZE + TILE_SIZE / 2,
        0.05,
        nz * TILE_SIZE + TILE_SIZE / 2
      );
      this.scene.add(newMesh);
      this.placedBuildings[idx] = { ...old, mesh: newMesh };
    }
  }
}
