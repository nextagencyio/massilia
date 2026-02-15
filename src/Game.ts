import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager';
import { CameraController } from './scene/CameraController';
import { GridRenderer } from './scene/GridRenderer';
import { Grid } from './world/Grid';
import { BuildingSystem } from './systems/BuildingSystem';
import { WalkerSystem } from './systems/WalkerSystem';
import { InvasionSystem } from './systems/InvasionSystem';
import { CombatSystem } from './systems/CombatSystem';
import { BuildMenu } from './ui/BuildMenu';
import { HUD } from './ui/HUD';
import { floodFillRoads, isBuildingConnected } from './world/Pathfinding';
import {
  GRID_SIZE,
  TILE_SIZE,
  BUILDINGS,
  STARTING_GOLD,
  TICK_INTERVAL,
  FARM_FOOD_RATE,
  FOOD_PER_POP,
  TAX_RATE,
  MAX_POP_PER_HOUSE,
  GROWTH_RATE,
  TOWER_RANGE,
  TOWER_DAMAGE,
} from './constants';
import { SaveSystem } from './systems/SaveSystem';
import { sound } from './audio/SoundManager';
import type { BuildingType, ResourceState, ScoreState, SaveData } from './types';

const WELL_SPAWN_INTERVAL = 4;
const MARKET_SPAWN_INTERVAL = 4;
const BARRACKS_SPAWN_INTERVAL = 6;
const FARM_SPAWN_INTERVAL = 5;

export class Game {
  sceneManager: SceneManager;
  cameraController: CameraController;
  grid: Grid;
  gridRenderer: GridRenderer;
  buildingSystem: BuildingSystem;
  walkerSystem: WalkerSystem;
  invasionSystem!: InvasionSystem;
  combatSystem: CombatSystem;
  buildMenu: BuildMenu;
  hud: HUD;
  clock: THREE.Clock;

  resources: ResourceState = {
    gold: STARTING_GOLD,
    food: 0,
    population: 0,
    maxPopulation: 0,
  };

  score: ScoreState = {
    peakPopulation: 0,
    wavesSurvived: 0,
    totalGoldEarned: 0,
  };

  private goldRef = { value: STARTING_GOLD };
  private selectedBuilding: BuildingType | null = null;
  private demolishMode = false;
  private paused = false;
  private pauseOverlay: HTMLElement | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private highlightMesh: THREE.Mesh;
  private hoveredTile: { x: number; z: number } | null = null;
  private demolishHoveredMesh: THREE.Group | null = null;
  private dragging = false;
  private lastDragTile: string | null = null;
  private tickAccumulator = 0;
  tickCount = 0;
  reachableRoads: Set<string> = new Set();
  roadsDirty = true;
  forumPos: { x: number; z: number } = { x: 0, z: 0 };
  private gameOver = false;
  private canvas: HTMLCanvasElement;
  saveSystem: SaveSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.sceneManager = new SceneManager(canvas);
    this.cameraController = new CameraController(this.sceneManager);
    this.grid = new Grid(GRID_SIZE);
    this.gridRenderer = new GridRenderer(this.sceneManager.scene, this.grid);
    this.buildingSystem = new BuildingSystem(this.sceneManager.scene);
    this.walkerSystem = new WalkerSystem(this.sceneManager.scene);
    this.combatSystem = new CombatSystem();
    this.saveSystem = new SaveSystem();
    this.hud = new HUD();

    this.buildMenu = new BuildMenu(
      (type) => {
        this.selectedBuilding = type;
        this.demolishMode = false;
      },
      (active) => {
        this.demolishMode = active;
        this.selectedBuilding = null;
      }
    );

    // Hover highlight mesh
    const hlGeo = new THREE.BoxGeometry(TILE_SIZE, 0.12, TILE_SIZE);
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0x66ff66,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.highlightMesh = new THREE.Mesh(hlGeo, hlMat);
    this.highlightMesh.visible = false;
    this.sceneManager.scene.add(this.highlightMesh);

    // Recenter button
    document.getElementById('recenter-btn')!.addEventListener('click', () => {
      this.cameraController.centerOnGrid();
    });

    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.buildMenu.deselect();
      this.selectedBuilding = null;
      this.demolishMode = false;
    });

    // Keyboard shortcuts for building selection
    // A, S, D have no matching buildings so only W conflicts with camera pan.
    // We allow W for building selection (Wall/Well) — users have arrow keys and edge scroll for panning.
    const CAMERA_ONLY_KEYS = new Set<string>();
    window.addEventListener('keydown', (e) => {
      // Prevent arrow keys from scrolling the page
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
      }

      if (this.gameOver) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Spacebar toggles pause
      if (e.key === ' ') {
        e.preventDefault();
        this.togglePause();
        return;
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        this.buildMenu.deselect();
        this.selectedBuilding = null;
        this.demolishMode = false;
        return;
      }

      // C to recenter camera
      if (e.key.toLowerCase() === 'c') {
        this.cameraController.centerOnGrid();
        return;
      }

      // Single letter keys select buildings (A/S/D reserved for camera only)
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key) && !CAMERA_ONLY_KEYS.has(e.key.toLowerCase())) {
        this.buildMenu.selectByKey(e.key);
        this.selectedBuilding = this.buildMenu.selected;
        this.demolishMode = this.buildMenu.demolishMode;
      }

      // Number keys 1-8 select buildings by position
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8) {
        const buildable: BuildingType[] = ['road', 'house', 'farm', 'well', 'market', 'barracks', 'wall', 'tower'];
        const type = buildable[num - 1];
        this.buildMenu.selectByKey(BUILDINGS[type].label[0]);
        this.selectedBuilding = this.buildMenu.selected;
        this.demolishMode = this.buildMenu.demolishMode;
      }
    });
  }

  start(): void {
    this.gridRenderer.buildMesh();

    const center = Math.floor(GRID_SIZE / 2) - 1;
    this.forumPos = { x: center, z: center };
    this.buildingSystem.place(this.grid, 'forum', center, center, { value: Infinity });
    this.goldRef.value = STARTING_GOLD;
    this.resources.gold = STARTING_GOLD;

    this.invasionSystem = new InvasionSystem(this.sceneManager.scene, this.forumPos);

    this.rebuildRoadNetwork();
    this.saveSystem.resetTimer();
    this.hud.update(this.resources);

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      if (!this.gameOver) this.doSave();
    });

    this.loop();
  }

  loadFromSave(saveData: SaveData): void {
    // Reconstruct grid from save
    this.grid = Grid.fromJSON(saveData.grid);
    this.gridRenderer = new GridRenderer(this.sceneManager.scene, this.grid);
    this.gridRenderer.buildMesh();

    // Find forum position
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const tile = this.grid.getTile(x, z);
        if (tile && tile.building === 'forum') {
          // Check if this is the origin (top-left corner of the 2x2)
          const isOrigin = (x === 0 || this.grid.getTile(x - 1, z)?.building !== 'forum')
            && (z === 0 || this.grid.getTile(x, z - 1)?.building !== 'forum');
          if (isOrigin) {
            this.forumPos = { x, z };
          }
        }
      }
    }

    // Rebuild building meshes from grid state
    this.buildingSystem = new BuildingSystem(this.sceneManager.scene);
    const visited = new Set<string>();
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const tile = this.grid.getTile(x, z);
        if (!tile || !tile.building) continue;
        const key = `${x},${z}`;
        if (visited.has(key)) continue;

        const type = tile.building;
        const def = BUILDINGS[type];

        // For multi-tile buildings (size > 1), skip non-origin tiles
        if (def.size > 1) {
          const isOrigin = (x === 0 || this.grid.getTile(x - 1, z)?.building !== type)
            && (z === 0 || this.grid.getTile(x, z - 1)?.building !== type);
          if (!isOrigin) continue;

          // Mark all tiles of this building as visited
          for (let dx = 0; dx < def.size; dx++) {
            for (let dz = 0; dz < def.size; dz++) {
              visited.add(`${x + dx},${z + dz}`);
            }
          }
        }

        this.buildingSystem.placeFromSave(type, x, z, this.grid);
      }
    }

    // Restore state
    this.resources = { ...saveData.resources };
    this.score = { ...saveData.score };
    this.goldRef.value = this.resources.gold;
    this.tickCount = saveData.tickCount;

    // Restore invasion state
    this.invasionSystem = new InvasionSystem(this.sceneManager.scene, this.forumPos);
    this.invasionSystem.waveNumber = saveData.invasion.waveNumber;
    this.invasionSystem.ticksUntilNextWave = saveData.invasion.ticksUntilNextWave;

    this.rebuildRoadNetwork();
    this.saveSystem.resetTimer();
    this.hud.update(this.resources);

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      if (!this.gameOver) this.doSave();
    });

    this.loop();
  }

  doSave(): void {
    this.saveSystem.save(
      this.grid,
      this.resources,
      this.score,
      this.tickCount,
      {
        waveNumber: this.invasionSystem.waveNumber,
        ticksUntilNextWave: this.invasionSystem.ticksUntilNextWave,
      }
    );
  }

  restart(): void {
    // Clear everything
    this.walkerSystem.removeAll();
    this.invasionSystem.removeAll();
    for (const b of [...this.buildingSystem.placedBuildings]) {
      this.sceneManager.scene.remove(b.mesh);
    }
    this.buildingSystem.placedBuildings = [];
    this.gridRenderer.buildMesh();

    // Reset grid
    this.grid = new Grid(GRID_SIZE);
    this.gridRenderer = new GridRenderer(this.sceneManager.scene, this.grid);
    this.gridRenderer.buildMesh();

    // Reset state
    this.resources = { gold: STARTING_GOLD, food: 0, population: 0, maxPopulation: 0 };
    this.score = { peakPopulation: 0, wavesSurvived: 0, totalGoldEarned: 0 };
    this.goldRef.value = STARTING_GOLD;
    this.tickCount = 0;
    this.tickAccumulator = 0;
    this.gameOver = false;

    // Re-place forum
    const center = Math.floor(GRID_SIZE / 2) - 1;
    this.forumPos = { x: center, z: center };
    this.buildingSystem = new BuildingSystem(this.sceneManager.scene);
    this.buildingSystem.place(this.grid, 'forum', center, center, { value: Infinity });
    this.goldRef.value = STARTING_GOLD;
    this.resources.gold = STARTING_GOLD;

    this.invasionSystem = new InvasionSystem(this.sceneManager.scene, this.forumPos);
    this.rebuildRoadNetwork();
    this.hud.update(this.resources);
  }

  private demolishAt(x: number, z: number): void {
    const tile = this.grid.getTile(x, z);
    if (!tile || !tile.building) return;
    const type = tile.building;

    this.clearDemolishHover();
    this.buildingSystem.removeBuildingAt(this.grid, x, z);
    this.roadsDirty = true;
    sound.demolish();

    // Spawn rubble mesh at the demolished location
    this.spawnRubble(x, z, BUILDINGS[type].size);
    this.hud.update(this.resources);
  }

  private spawnRubble(x: number, z: number, size: number): void {
    const group = new THREE.Group();
    const rubbleMat = new THREE.MeshLambertMaterial({ color: 0x886655 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x665544 });

    // Scatter small debris cubes
    for (let i = 0; i < 5 + size * 3; i++) {
      const s = 0.08 + Math.random() * 0.12;
      const geo = new THREE.BoxGeometry(s, s, s);
      const piece = new THREE.Mesh(geo, Math.random() > 0.5 ? rubbleMat : darkMat);
      piece.position.set(
        (Math.random() - 0.5) * size * 0.8,
        s / 2,
        (Math.random() - 0.5) * size * 0.8
      );
      piece.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      group.add(piece);
    }

    const offset = (size * TILE_SIZE) / 2;
    group.position.set(x * TILE_SIZE + offset, 0.02, z * TILE_SIZE + offset);
    this.sceneManager.scene.add(group);

    // Remove rubble after 3 seconds
    setTimeout(() => {
      this.sceneManager.scene.remove(group);
    }, 3000);
  }

  /** Clear tiles that have building data but no corresponding mesh (ghost tiles). */
  private cleanGhostTiles(): void {
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const tile = this.grid.getTile(x, z);
        if (!tile || !tile.building) continue;

        // Check if any placed building covers this tile
        const hasMesh = this.buildingSystem.placedBuildings.some(b => {
          const def = BUILDINGS[b.type];
          return x >= b.x && x < b.x + def.size && z >= b.z && z < b.z + def.size;
        });

        if (!hasMesh) {
          tile.building = null;
          tile.buildingHp = 0;
        }
      }
    }
  }

  private spawnArrow(fromX: number, fromZ: number, toX: number, toZ: number): void {
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xaa8833 })
    );
    arrow.add(shaft);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.04, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xcccccc })
    );
    head.position.z = -0.15;
    arrow.add(head);

    const startPos = new THREE.Vector3(
      fromX * TILE_SIZE + TILE_SIZE / 2,
      1.2, // fire from top of tower
      fromZ * TILE_SIZE + TILE_SIZE / 2
    );
    const endPos = new THREE.Vector3(
      toX * TILE_SIZE + TILE_SIZE / 2,
      0.3,
      toZ * TILE_SIZE + TILE_SIZE / 2
    );

    arrow.position.copy(startPos);
    arrow.lookAt(endPos);
    this.sceneManager.scene.add(arrow);

    // Animate the arrow
    const duration = 300; // ms
    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      arrow.position.lerpVectors(startPos, endPos, t);
      // Arc upward in the middle
      arrow.position.y += Math.sin(t * Math.PI) * 0.8;
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.sceneManager.scene.remove(arrow);
      }
    };
    requestAnimationFrame(animate);
  }

  private rebuildRoadNetwork(): void {
    this.cleanGhostTiles();
    this.reachableRoads = new Set();
    const forumDef = BUILDINGS['forum'];
    for (let dx = 0; dx < forumDef.size; dx++) {
      for (let dz = 0; dz < forumDef.size; dz++) {
        const roads = floodFillRoads(this.grid, this.forumPos.x + dx, this.forumPos.z + dz);
        for (const key of roads) {
          this.reachableRoads.add(key);
        }
      }
    }
    this.roadsDirty = false;
  }

  private getGridCoords(event: MouseEvent): { x: number; z: number } | null {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
    if (!hit) return null;
    const gx = Math.floor(intersection.x / TILE_SIZE);
    const gz = Math.floor(intersection.z / TILE_SIZE);
    if (!this.grid.isInBounds(gx, gz)) return null;
    return { x: gx, z: gz };
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (this.gameOver) return;
    const coords = this.getGridCoords(event);
    if (!coords) {
      this.highlightMesh.visible = false;
      this.hoveredTile = null;
      this.clearDemolishHover();
      return;
    }

    this.hoveredTile = coords;

    // Drag placement for roads/walls
    if (this.dragging && this.selectedBuilding && this.isDraggable(this.selectedBuilding)) {
      const key = `${coords.x},${coords.z}`;
      if (key !== this.lastDragTile) {
        this.tryPlace(coords.x, coords.z);
        this.lastDragTile = key;
      }
    }

    if (this.demolishMode) {
      const tile = this.grid.getTile(coords.x, coords.z);
      const hasDemolishable = tile?.building && tile.building !== 'forum';
      if (hasDemolishable) {
        // Highlight the building mesh red
        const building = this.buildingSystem.findBuildingAt(coords.x, coords.z);
        if (building && building.mesh !== this.demolishHoveredMesh) {
          this.clearDemolishHover();
          this.demolishHoveredMesh = building.mesh;
          building.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
              child.material.emissive.setHex(0x661111);
            }
          });
        }
        this.highlightMesh.visible = false;
      } else {
        this.clearDemolishHover();
        this.highlightMesh.visible = false;
      }
    } else {
      this.clearDemolishHover();
      if (this.selectedBuilding) {
        const def = BUILDINGS[this.selectedBuilding];
        const canPlace = this.buildingSystem.canPlace(this.grid, this.selectedBuilding, coords.x, coords.z)
          && this.resources.gold >= def.cost;

        this.highlightMesh.scale.set(def.size, 1, def.size);
        const offset = (def.size * TILE_SIZE) / 2;
        this.highlightMesh.position.set(
          coords.x * TILE_SIZE + offset,
          0.07,
          coords.z * TILE_SIZE + offset
        );

        const mat = this.highlightMesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(canPlace ? 0x66ff66 : 0xff4444);
        this.highlightMesh.visible = true;
      } else {
        // Nothing selected — hide highlight
        this.highlightMesh.visible = false;
      }
    }
  };

  private isDraggable(type: BuildingType): boolean {
    return type === 'road' || type === 'wall';
  }

  private clearDemolishHover(): void {
    if (this.demolishHoveredMesh) {
      this.demolishHoveredMesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.emissive.setHex(0x000000);
        }
      });
      this.demolishHoveredMesh = null;
    }
  }

  private tryPlace(x: number, z: number): boolean {
    if (!this.selectedBuilding) return false;
    this.goldRef.value = this.resources.gold;
    const placed = this.buildingSystem.place(
      this.grid,
      this.selectedBuilding,
      x,
      z,
      this.goldRef
    );
    if (placed) {
      this.resources.gold = this.goldRef.value;
      if (this.selectedBuilding === 'road') {
        this.roadsDirty = true;
      }
      this.hud.update(this.resources);
      sound.place();
      return true;
    }
    return false;
  }

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return; // left click only
    if (this.gameOver) return;
    const coords = this.getGridCoords(event);
    if (!coords) return;

    // Demolish mode
    if (this.demolishMode) {
      const tile = this.grid.getTile(coords.x, coords.z);
      if (!tile || !tile.building || tile.building === 'forum') {
        sound.invalid();
        return;
      }
      this.demolishAt(coords.x, coords.z);
      return;
    }

    if (!this.selectedBuilding) return;

    // Start drag for roads/walls
    if (this.isDraggable(this.selectedBuilding)) {
      this.dragging = true;
      this.lastDragTile = `${coords.x},${coords.z}`;
      this.tryPlace(coords.x, coords.z);
    } else {
      // Single-click placement for other buildings
      if (!this.tryPlace(coords.x, coords.z)) {
        sound.invalid();
      }
    }
  };

  private onMouseUp = (): void => {
    this.dragging = false;
    this.lastDragTile = null;
  };

  private simulationTick(): void {
    if (this.gameOver) return;
    this.tickCount++;

    if (this.roadsDirty) {
      this.rebuildRoadNetwork();
    }

    // Count farms and find service/military buildings
    let foodProduction = 0;
    const wells: { x: number; z: number }[] = [];
    const markets: { x: number; z: number }[] = [];
    const barracks: { x: number; z: number }[] = [];
    const farms: { x: number; z: number }[] = [];
    const towers: { x: number; z: number }[] = [];

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const tile = this.grid.getTile(x, z);
        if (!tile) continue;

        if (tile.waterTimer > 0) tile.waterTimer--;
        if (tile.foodTimer > 0) tile.foodTimer--;
        tile.hasWater = tile.waterTimer > 0;
        tile.hasFood = tile.foodTimer > 0;

        if (tile.building === 'farm') {
          const isOrigin = (x === 0 || this.grid.getTile(x - 1, z)?.building !== 'farm')
            && (z === 0 || this.grid.getTile(x, z - 1)?.building !== 'farm');
          if (isOrigin && isBuildingConnected(this.grid, x, z, BUILDINGS['farm'].size, this.reachableRoads)) {
            foodProduction += FARM_FOOD_RATE;
            farms.push({ x, z });
          }
        }

        if (tile.building === 'well' && isBuildingConnected(this.grid, x, z, 1, this.reachableRoads)) {
          wells.push({ x, z });
        }
        if (tile.building === 'market' && isBuildingConnected(this.grid, x, z, 1, this.reachableRoads)) {
          markets.push({ x, z });
        }
        if (tile.building === 'tower') {
          towers.push({ x, z });
        }
        if (tile.building === 'barracks') {
          const isOrigin = (x === 0 || this.grid.getTile(x - 1, z)?.building !== 'barracks')
            && (z === 0 || this.grid.getTile(x, z - 1)?.building !== 'barracks');
          if (isOrigin) {
            barracks.push({ x, z });
          }
        }
      }
    }

    // Food
    const foodConsumption = this.resources.population * FOOD_PER_POP;
    this.resources.food += foodProduction - foodConsumption;

    // Spawn service walkers
    for (const well of wells) {
      if (this.tickCount % WELL_SPAWN_INTERVAL === 0) {
        this.walkerSystem.spawn('water', well.x, well.z, this.grid);
      }
    }
    for (const market of markets) {
      if (this.tickCount % MARKET_SPAWN_INTERVAL === 0 && this.resources.food > 0) {
        this.walkerSystem.spawn('food', market.x, market.z, this.grid);
      }
    }

    // Spawn soldier walkers from barracks
    for (const b of barracks) {
      if (this.tickCount % BARRACKS_SPAWN_INTERVAL === 0) {
        this.walkerSystem.spawn('soldier', b.x, b.z, this.grid, BUILDINGS['barracks'].size);
      }
    }

    // Spawn farmer walkers from farms
    for (const f of farms) {
      if (this.tickCount % FARM_SPAWN_INTERVAL === 0) {
        this.walkerSystem.spawn('farmer', f.x, f.z, this.grid, BUILDINGS['farm'].size);
      }
    }

    this.walkerSystem.tick();

    // Invasion tick
    const invasionResult = this.invasionSystem.tick(this.grid);
    if (invasionResult) {
      if (invasionResult.forumDestroyed) {
        this.handleGameOver();
        return;
      }
      for (const destroyed of invasionResult.buildingsDestroyed) {
        this.buildingSystem.removeBuildingAt(this.grid, destroyed.x, destroyed.z);
        this.roadsDirty = true;
        sound.destroy();
      }
      for (const dmg of invasionResult.damages) {
        this.buildingSystem.tintDamage(dmg.x, dmg.z, dmg.hpRatio);
      }
    }

    // Combat (tick-based, not per-frame)
    this.combatSystem.update(this.walkerSystem, this.invasionSystem);

    // Tower attacks — each tower fires at nearest invader in range
    for (const tower of towers) {
      const target = this.invasionSystem.findNearestInvader(tower.x, tower.z, TOWER_RANGE);
      if (target) {
        this.invasionSystem.damageInvader(target, TOWER_DAMAGE);
        this.spawnArrow(tower.x, tower.z, target.x, target.z);
        sound.arrow();
      }
    }

    // Population
    let maxPop = 0;
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const tile = this.grid.getTile(x, z);
        if (tile && tile.building === 'house' && tile.hasWater && tile.hasFood) {
          maxPop += MAX_POP_PER_HOUSE;
        }
      }
    }
    this.resources.maxPopulation = maxPop;

    if (this.resources.population > maxPop) {
      // Population exceeds housing capacity — people leave
      this.resources.population = Math.max(maxPop, this.resources.population - GROWTH_RATE);
    } else if (this.resources.food <= 0 && this.resources.population > 0) {
      // Starvation — population declines
      this.resources.population = Math.max(0, this.resources.population - GROWTH_RATE);
    } else if (this.resources.food > 0 && this.resources.population < maxPop) {
      // Growth — food available and room in housing
      this.resources.population = Math.min(this.resources.population + GROWTH_RATE, maxPop);
    }

    // Tax income
    const taxIncome = this.resources.population * TAX_RATE;
    this.resources.gold += taxIncome;
    if (taxIncome > 0) sound.coin();

    const netFood = foodProduction - foodConsumption;

    // Track score
    this.score.peakPopulation = Math.max(this.score.peakPopulation, this.resources.population);
    this.score.totalGoldEarned += taxIncome;
    this.score.wavesSurvived = this.invasionSystem.waveNumber;

    const currentScore = this.score.peakPopulation * 10
      + this.score.wavesSurvived * 50
      + Math.floor(this.score.totalGoldEarned / 10);

    this.hud.update(this.resources, {
      warningActive: this.invasionSystem.warningActive,
      activeWave: this.invasionSystem.activeWave,
      invaderCount: this.invasionSystem.invaders.length,
      waveNumber: this.invasionSystem.waveNumber,
    }, {
      goldPerTick: taxIncome,
      foodPerTick: netFood,
    }, {
      score: currentScore,
      highScore: Math.max(currentScore, this.saveSystem.getHighScore()),
    });

    // Update building counts on menu
    const counts: Partial<Record<BuildingType, number>> = {};
    for (const b of this.buildingSystem.placedBuildings) {
      counts[b.type] = (counts[b.type] ?? 0) + 1;
    }
    this.buildMenu.updateCounts(counts);

    // Auto-save periodically
    if (this.saveSystem.shouldAutoSave()) {
      this.doSave();
    }
  }

  private togglePause(): void {
    if (this.gameOver) return;
    this.paused = !this.paused;

    if (this.paused) {
      // Create pause overlay
      const overlay = document.createElement('div');
      overlay.id = 'pause-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.4); display: flex; align-items: center;
        justify-content: center; z-index: 1000; pointer-events: none;
      `;
      overlay.innerHTML = `<div style="
        font-family: 'Press Start 2P', monospace; font-size: 32px;
        color: #fff; text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
        animation: pauseBlink 1s step-end infinite;
      ">PAUSED</div>`;
      // Add blinking animation
      const style = document.createElement('style');
      style.textContent = `@keyframes pauseBlink { 50% { opacity: 0.3; } }`;
      overlay.appendChild(style);
      document.body.appendChild(overlay);
      this.pauseOverlay = overlay;
    } else {
      // Remove pause overlay
      if (this.pauseOverlay) {
        this.pauseOverlay.remove();
        this.pauseOverlay = null;
      }
      // Reset clock so dt doesn't spike after unpause
      this.clock.getDelta();
    }
  }

  private handleGameOver(): void {
    this.gameOver = true;
    this.highlightMesh.visible = false;
    this.saveSystem.clearSave();
    const finalScore = this.score.peakPopulation * 10
      + this.score.wavesSurvived * 50
      + Math.floor(this.score.totalGoldEarned / 10);
    this.saveSystem.saveHighScore(finalScore);
    sound.gameOver();
    this.hud.showGameOver(this.score, () => {
      this.restart();
      this.saveSystem.resetTimer();
    }, this.saveSystem.getHighScore());
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    const dt = this.clock.getDelta();

    if (!this.paused) {
      // Simulation tick
      this.tickAccumulator += dt;
      if (this.tickAccumulator >= TICK_INTERVAL) {
        this.tickAccumulator -= TICK_INTERVAL;
        this.simulationTick();
      }

      // Update walkers and invaders (smooth movement each frame)
      if (!this.gameOver) {
        this.walkerSystem.update(dt, this.grid, this.invasionSystem);
        this.invasionSystem.update(dt, this.grid);
      }
    }

    this.cameraController.update(dt);
    this.sceneManager.render();
  };
}
