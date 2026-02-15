import * as THREE from 'three';
import type { Grid } from '../world/Grid';
import { TILE_SIZE, GRID_SIZE, BUILDINGS } from '../constants';
import { sound } from '../audio/SoundManager';

export interface Invader {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  progress: number;
  hp: number;
  maxHp: number;
  damage: number;
  mesh: THREE.Group;
  state: 'moving' | 'attacking' | 'dead';
  attackCooldown: number;
  path: { x: number; z: number }[];
  pathIndex: number;
}

// Invasion constants
const FIRST_WAVE_DELAY = 30;      // ticks (~1 minute)
const BASE_WAVE_INTERVAL = 25;
const WAVE_ACCELERATION = 1;
const MIN_WAVE_INTERVAL = 12;
const BASE_INVADERS = 1;
const INVADER_SCALING = 1.5;       // fractional, floored at spawn time
const BARBARIAN_BASE_HP = 8;
const BARBARIAN_HP_SCALING = 3;
const BARBARIAN_BASE_DAMAGE = 2;
const BARBARIAN_DAMAGE_SCALING = 0.5; // +0.5 per wave, floored
const INVADER_SPEED = 1.2;
const ATTACK_COOLDOWN = 3;

export class InvasionSystem {
  private scene: THREE.Scene;
  invaders: Invader[] = [];
  waveNumber = 0;
  ticksUntilNextWave: number = FIRST_WAVE_DELAY;
  private forumPos: { x: number; z: number };
  warningActive = false;
  activeWave = false;

  constructor(scene: THREE.Scene, forumPos: { x: number; z: number }) {
    this.scene = scene;
    this.forumPos = forumPos;
  }

  tick(grid: Grid): {
    buildingsDestroyed: { x: number; z: number; type: string }[];
    forumDestroyed?: boolean;
    damages: { x: number; z: number; hpRatio: number }[];
  } | null {
    this.ticksUntilNextWave--;
    const wasWarning = this.warningActive;
    this.warningActive = this.ticksUntilNextWave <= 5 && this.ticksUntilNextWave > 0;
    if (this.warningActive && !wasWarning) sound.warning();

    if (this.ticksUntilNextWave <= 0) {
      this.spawnWave(grid);
      sound.waveStart();
      this.waveNumber++;
      this.ticksUntilNextWave = Math.max(
        MIN_WAVE_INTERVAL,
        BASE_WAVE_INTERVAL - this.waveNumber * WAVE_ACCELERATION
      );
    }

    // Process attacking invaders
    let result: {
      buildingsDestroyed: { x: number; z: number; type: string }[];
      forumDestroyed?: boolean;
      damages: { x: number; z: number; hpRatio: number }[];
    } | null = null;

    for (const inv of this.invaders) {
      if (inv.state === 'attacking') {
        inv.attackCooldown--;
        if (inv.attackCooldown <= 0) {
          inv.attackCooldown = ATTACK_COOLDOWN;
          const dmgResult = this.attackBuilding(inv, grid);
          if (dmgResult) {
            if (!result) result = { buildingsDestroyed: [], damages: [] };
            if (dmgResult.forumDestroyed) {
              result.forumDestroyed = true;
            } else if (dmgResult.buildingDestroyed) {
              result.buildingsDestroyed.push(dmgResult.buildingDestroyed);
              inv.state = 'moving';
              this.computePath(inv, grid);
            } else if (dmgResult.buildingDamaged) {
              result.damages.push(dmgResult.buildingDamaged);
            }
          }
        }
      }
    }

    // Clean up dead invaders
    for (let i = this.invaders.length - 1; i >= 0; i--) {
      if (this.invaders[i].state === 'dead') {
        this.scene.remove(this.invaders[i].mesh);
        this.invaders.splice(i, 1);
      }
    }

    this.activeWave = this.invaders.length > 0;
    return result;
  }

  update(dt: number, grid: Grid): void {
    for (const inv of this.invaders) {
      if (inv.state !== 'moving') continue;

      inv.progress += dt * INVADER_SPEED;
      if (inv.progress >= 1) {
        inv.x = inv.targetX;
        inv.z = inv.targetZ;
        inv.progress = 0;

        // Check if we've reached a building
        const tile = grid.getTile(inv.x, inv.z);
        if (tile && tile.building && tile.building !== 'road') {
          inv.state = 'attacking';
          inv.attackCooldown = 1;
          continue;
        }

        // Advance along path
        inv.pathIndex++;
        if (inv.pathIndex < inv.path.length) {
          inv.targetX = inv.path[inv.pathIndex].x;
          inv.targetZ = inv.path[inv.pathIndex].z;
        }
      }

      // Interpolate position
      const lerpX = inv.x + (inv.targetX - inv.x) * inv.progress;
      const lerpZ = inv.z + (inv.targetZ - inv.z) * inv.progress;
      inv.mesh.position.set(
        lerpX * TILE_SIZE + TILE_SIZE / 2,
        0.05,
        lerpZ * TILE_SIZE + TILE_SIZE / 2
      );
    }
  }

  private spawnWave(grid: Grid): void {
    const count = Math.floor(BASE_INVADERS + this.waveNumber * INVADER_SCALING);
    const edge = Math.floor(Math.random() * 4); // 0=north, 1=south, 2=east, 3=west

    for (let i = 0; i < count; i++) {
      let sx: number, sz: number;
      const spread = Math.floor(GRID_SIZE / 4);
      const center = Math.floor(GRID_SIZE / 2);
      const offset = center - Math.floor(spread / 2) + Math.floor(Math.random() * spread);

      switch (edge) {
        case 0: sx = offset; sz = 0; break;       // north
        case 1: sx = offset; sz = GRID_SIZE - 1; break; // south
        case 2: sx = GRID_SIZE - 1; sz = offset; break; // east
        case 3: sx = 0; sz = offset; break;        // west
        default: sx = 0; sz = 0;
      }

      const mesh = this.createBarbarianMesh();
      mesh.position.set(
        sx * TILE_SIZE + TILE_SIZE / 2,
        0.05,
        sz * TILE_SIZE + TILE_SIZE / 2
      );
      this.scene.add(mesh);

      const hp = BARBARIAN_BASE_HP + this.waveNumber * BARBARIAN_HP_SCALING;
      const damage = Math.floor(BARBARIAN_BASE_DAMAGE + this.waveNumber * BARBARIAN_DAMAGE_SCALING);
      const invader: Invader = {
        x: sx,
        z: sz,
        targetX: sx,
        targetZ: sz,
        progress: 0,
        hp,
        maxHp: hp,
        damage,
        mesh,
        state: 'moving',
        attackCooldown: 0,
        path: [],
        pathIndex: 0,
      };

      this.computePath(invader, grid);
      this.invaders.push(invader);
    }
  }

  private computePath(invader: Invader, grid: Grid): void {
    // BFS from invader position to forum, walking through any tile
    const start = { x: invader.x, z: invader.z };
    const target = this.forumPos;
    const visited = new Map<string, { x: number; z: number } | null>();
    const queue: { x: number; z: number }[] = [start];
    visited.set(`${start.x},${start.z}`, null);

    while (queue.length > 0) {
      const curr = queue.shift()!;

      // Check if we reached any forum tile
      const forumSize = BUILDINGS['forum'].size;
      let reachedForum = false;
      for (let dx = 0; dx < forumSize; dx++) {
        for (let dz = 0; dz < forumSize; dz++) {
          if (curr.x === target.x + dx && curr.z === target.z + dz) {
            reachedForum = true;
          }
        }
      }

      if (reachedForum) {
        // Reconstruct path
        const path: { x: number; z: number }[] = [];
        let node: { x: number; z: number } | null = curr;
        while (node) {
          path.unshift(node);
          node = visited.get(`${node.x},${node.z}`) || null;
        }
        invader.path = path;
        invader.pathIndex = 1;
        if (path.length > 1) {
          invader.targetX = path[1].x;
          invader.targetZ = path[1].z;
        }
        return;
      }

      const dirs = [
        { x: curr.x + 1, z: curr.z },
        { x: curr.x - 1, z: curr.z },
        { x: curr.x, z: curr.z + 1 },
        { x: curr.x, z: curr.z - 1 },
      ];

      for (const next of dirs) {
        const key = `${next.x},${next.z}`;
        if (visited.has(key)) continue;
        if (!grid.isInBounds(next.x, next.z)) continue;

        const tile = grid.getTile(next.x, next.z);
        // Walls block path, invaders must destroy them first
        if (tile && tile.building === 'wall') {
          // Can go here but will attack when arriving
          visited.set(key, curr);
          queue.push(next);
          continue;
        }

        visited.set(key, curr);
        queue.push(next);
      }
    }

    // No path found, just walk toward forum
    invader.path = [{ x: invader.x, z: invader.z }, { x: this.forumPos.x, z: this.forumPos.z }];
    invader.pathIndex = 1;
    invader.targetX = this.forumPos.x;
    invader.targetZ = this.forumPos.z;
  }

  private attackBuilding(inv: Invader, grid: Grid): { buildingDestroyed?: { x: number; z: number; type: string }; forumDestroyed?: boolean; buildingDamaged?: { x: number; z: number; hpRatio: number } } | null {
    const tile = grid.getTile(inv.x, inv.z);
    if (!tile || !tile.building) return null;

    const def = BUILDINGS[tile.building];
    tile.buildingHp -= inv.damage;

    // Flash the invader mesh red briefly
    this.flashMesh(inv.mesh, 0xff0000);

    if (tile.buildingHp <= 0) {
      const type = tile.building;
      const isForum = type === 'forum';

      if (isForum) {
        return { forumDestroyed: true };
      }

      return { buildingDestroyed: { x: inv.x, z: inv.z, type } };
    }

    // Return damage info so the game can tint the building mesh
    return { buildingDamaged: { x: inv.x, z: inv.z, hpRatio: tile.buildingHp / def.hp } };
  }

  private flashMesh(group: THREE.Group, _color: number): void {
    // Quick visual feedback: scale up briefly
    group.scale.set(1.3, 1.3, 1.3);
    setTimeout(() => {
      group.scale.set(1, 1, 1);
    }, 150);
  }

  private createBarbarianMesh(): THREE.Group {
    const group = new THREE.Group();

    // Body - red
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.4, 0.25),
      new THREE.MeshLambertMaterial({ color: 0xcc2222 })
    );
    body.position.y = 0.25;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshLambertMaterial({ color: 0xddaa77 })
    );
    head.position.y = 0.54;
    group.add(head);

    // Horns
    for (const xOff of [-0.1, 0.1]) {
      const horn = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.15, 0.04),
        new THREE.MeshLambertMaterial({ color: 0xccccaa })
      );
      horn.position.set(xOff, 0.68, 0);
      horn.rotation.z = xOff > 0 ? -0.3 : 0.3;
      group.add(horn);
    }

    // Weapon (axe handle)
    const weapon = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.35, 0.04),
      new THREE.MeshLambertMaterial({ color: 0x664422 })
    );
    weapon.position.set(0.18, 0.3, 0);
    weapon.rotation.z = -0.3;
    group.add(weapon);

    return group;
  }

  findNearestInvader(x: number, z: number, range: number): Invader | null {
    let nearest: Invader | null = null;
    let nearestDist = Infinity;

    for (const inv of this.invaders) {
      if (inv.state === 'dead') continue;
      const dist = Math.abs(inv.x - x) + Math.abs(inv.z - z);
      if (dist <= range && dist < nearestDist) {
        nearestDist = dist;
        nearest = inv;
      }
    }

    return nearest;
  }

  damageInvader(invader: Invader, damage: number): void {
    invader.hp -= damage;
    this.flashMesh(invader.mesh, 0xffffff);
    if (invader.hp <= 0) {
      invader.state = 'dead';
    }
  }

  removeAll(): void {
    for (const inv of this.invaders) {
      this.scene.remove(inv.mesh);
    }
    this.invaders = [];
  }
}
