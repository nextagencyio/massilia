import * as THREE from 'three';
import type { BuildingType } from '../types';
import { TILE_SIZE, BUILDINGS } from '../constants';

export class BuildingFactory {
  static create(type: BuildingType): THREE.Group {
    switch (type) {
      case 'road': return BuildingFactory.createRoad();
      case 'house': return BuildingFactory.createHouse();
      case 'farm': return BuildingFactory.createFarm();
      case 'well': return BuildingFactory.createWell();
      case 'market': return BuildingFactory.createMarket();
      case 'barracks': return BuildingFactory.createBarracks();
      case 'wall': return BuildingFactory.createWall();
      case 'tower': return BuildingFactory.createTower();
      case 'forum': return BuildingFactory.createForum();
    }
  }

  private static mat(color: number): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color });
  }

  private static box(w: number, h: number, d: number, color: number): THREE.Mesh {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), BuildingFactory.mat(color));
  }

  static createRoad(): THREE.Group {
    const g = new THREE.Group();
    const slab = BuildingFactory.box(TILE_SIZE * 0.9, 0.05, TILE_SIZE * 0.9, 0x777766);
    slab.position.y = 0.075;
    g.add(slab);
    return g;
  }

  static createHouse(): THREE.Group {
    const g = new THREE.Group();
    // Base
    const base = BuildingFactory.box(0.7, 0.5, 0.7, 0xcc9966);
    base.position.y = 0.3;
    g.add(base);
    // Roof
    const roof = BuildingFactory.box(0.8, 0.15, 0.8, 0x993333);
    roof.position.y = 0.625;
    g.add(roof);
    // Door
    const door = BuildingFactory.box(0.15, 0.25, 0.05, 0x664422);
    door.position.set(0, 0.175, 0.36);
    g.add(door);
    return g;
  }

  static createFarm(): THREE.Group {
    const g = new THREE.Group();
    const s = TILE_SIZE * 2;
    // Field
    const field = BuildingFactory.box(s * 0.85, 0.08, s * 0.85, 0x88aa22);
    field.position.y = 0.09;
    g.add(field);
    // Rows of crops
    for (let i = -3; i <= 3; i++) {
      const row = BuildingFactory.box(s * 0.7, 0.12, 0.06, 0x669900);
      row.position.set(0, 0.16, i * 0.22);
      g.add(row);
    }
    // Small barn
    const barn = BuildingFactory.box(0.4, 0.35, 0.4, 0xaa7744);
    barn.position.set(-0.55, 0.25, -0.55);
    g.add(barn);
    const barnRoof = BuildingFactory.box(0.5, 0.1, 0.5, 0x884422);
    barnRoof.position.set(-0.55, 0.475, -0.55);
    g.add(barnRoof);
    return g;
  }

  static createWell(): THREE.Group {
    const g = new THREE.Group();
    // Stone base
    const base = BuildingFactory.box(0.5, 0.3, 0.5, 0x888899);
    base.position.y = 0.2;
    g.add(base);
    // Water inside (slightly recessed)
    const water = BuildingFactory.box(0.35, 0.05, 0.35, 0x3366cc);
    water.position.y = 0.35;
    g.add(water);
    // Posts
    for (const xOff of [-0.2, 0.2]) {
      const post = BuildingFactory.box(0.06, 0.35, 0.06, 0x886644);
      post.position.set(xOff, 0.525, 0);
      g.add(post);
    }
    // Crossbar
    const bar = BuildingFactory.box(0.5, 0.06, 0.06, 0x886644);
    bar.position.set(0, 0.7, 0);
    g.add(bar);
    return g;
  }

  static createMarket(): THREE.Group {
    const g = new THREE.Group();
    // Stall base
    const base = BuildingFactory.box(0.8, 0.25, 0.7, 0xaa7744);
    base.position.y = 0.175;
    g.add(base);
    // Awning
    const awning = BuildingFactory.box(0.9, 0.06, 0.8, 0xcc4444);
    awning.position.set(0, 0.55, 0);
    g.add(awning);
    // Posts for awning
    for (const [x, z] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]] as [number, number][]) {
      const post = BuildingFactory.box(0.05, 0.3, 0.05, 0x886644);
      post.position.set(x, 0.4, z);
      g.add(post);
    }
    // Goods on counter
    for (let i = 0; i < 3; i++) {
      const crate = BuildingFactory.box(0.12, 0.12, 0.12, 0xddaa33);
      crate.position.set(-0.25 + i * 0.25, 0.36, 0);
      g.add(crate);
    }
    return g;
  }

  static createBarracks(): THREE.Group {
    const g = new THREE.Group();
    const s = TILE_SIZE * 2;
    // Main building
    const main = BuildingFactory.box(s * 0.7, 0.55, s * 0.7, 0x884444);
    main.position.y = 0.325;
    g.add(main);
    // Flat roof with battlements
    const roof = BuildingFactory.box(s * 0.75, 0.08, s * 0.75, 0x663333);
    roof.position.y = 0.64;
    g.add(roof);
    // Corner towers
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]] as [number, number][]) {
      const tower = BuildingFactory.box(0.25, 0.75, 0.25, 0x774444);
      tower.position.set(x, 0.425, z);
      g.add(tower);
      const cap = BuildingFactory.box(0.3, 0.08, 0.3, 0x553333);
      cap.position.set(x, 0.84, z);
      g.add(cap);
    }
    // Gate
    const gate = BuildingFactory.box(0.3, 0.35, 0.08, 0x553322);
    gate.position.set(0, 0.225, s * 0.35 + 0.01);
    g.add(gate);
    return g;
  }

  /**
   * Creates a wall mesh that connects to neighboring walls.
   * @param neighbors - { n, s, e, w } booleans indicating adjacent walls
   */
  static createWall(neighbors?: { n: boolean; s: boolean; e: boolean; w: boolean }): THREE.Group {
    const g = new THREE.Group();
    const n = neighbors ?? { n: false, s: false, e: false, w: false };
    const wallH = 0.6;
    const wallW = 0.35; // wall thickness
    const half = TILE_SIZE / 2;

    // Central pillar (always present)
    const pillar = BuildingFactory.box(wallW, wallH, wallW, 0x999999);
    pillar.position.y = wallH / 2 + 0.05;
    g.add(pillar);

    // Extend wall segments toward each neighbor
    if (n.n) {
      const seg = BuildingFactory.box(wallW, wallH, half, 0x999999);
      seg.position.set(0, wallH / 2 + 0.05, -half / 2);
      g.add(seg);
    }
    if (n.s) {
      const seg = BuildingFactory.box(wallW, wallH, half, 0x999999);
      seg.position.set(0, wallH / 2 + 0.05, half / 2);
      g.add(seg);
    }
    if (n.e) {
      const seg = BuildingFactory.box(half, wallH, wallW, 0x999999);
      seg.position.set(half / 2, wallH / 2 + 0.05, 0);
      g.add(seg);
    }
    if (n.w) {
      const seg = BuildingFactory.box(half, wallH, wallW, 0x999999);
      seg.position.set(-half / 2, wallH / 2 + 0.05, 0);
      g.add(seg);
    }

    // Battlements on top of each segment
    const merlonH = 0.15;
    const merlonW = 0.12;
    const topY = wallH + 0.05 + merlonH / 2;

    // Center merlon
    const cm = BuildingFactory.box(merlonW + 0.04, merlonH, merlonW + 0.04, 0xaaaaaa);
    cm.position.y = topY;
    g.add(cm);

    // Merlons along each direction
    if (n.n) {
      const m = BuildingFactory.box(merlonW, merlonH, merlonW, 0xaaaaaa);
      m.position.set(0, topY, -half + 0.08);
      g.add(m);
    }
    if (n.s) {
      const m = BuildingFactory.box(merlonW, merlonH, merlonW, 0xaaaaaa);
      m.position.set(0, topY, half - 0.08);
      g.add(m);
    }
    if (n.e) {
      const m = BuildingFactory.box(merlonW, merlonH, merlonW, 0xaaaaaa);
      m.position.set(half - 0.08, topY, 0);
      g.add(m);
    }
    if (n.w) {
      const m = BuildingFactory.box(merlonW, merlonH, merlonW, 0xaaaaaa);
      m.position.set(-half + 0.08, topY, 0);
      g.add(m);
    }

    return g;
  }

  static createTower(neighbors?: { n: boolean; s: boolean; e: boolean; w: boolean }): THREE.Group {
    const g = new THREE.Group();
    const nb = neighbors ?? { n: false, s: false, e: false, w: false };
    const half = TILE_SIZE / 2;
    const wallH = 0.6; // match wall height
    const wallW = 0.35; // match wall thickness

    // Stone base (wider than tower body)
    const base = BuildingFactory.box(0.6, 0.3, 0.6, 0x888877);
    base.position.y = 0.2;
    g.add(base);
    // Tower body (tall)
    const body = BuildingFactory.box(0.45, 0.7, 0.45, 0x999988);
    body.position.y = 0.7;
    g.add(body);

    // Wall-height segments extending toward adjacent walls/towers
    if (nb.n) {
      const seg = BuildingFactory.box(wallW, wallH, half, 0x999999);
      seg.position.set(0, wallH / 2 + 0.05, -half / 2);
      g.add(seg);
    }
    if (nb.s) {
      const seg = BuildingFactory.box(wallW, wallH, half, 0x999999);
      seg.position.set(0, wallH / 2 + 0.05, half / 2);
      g.add(seg);
    }
    if (nb.e) {
      const seg = BuildingFactory.box(half, wallH, wallW, 0x999999);
      seg.position.set(half / 2, wallH / 2 + 0.05, 0);
      g.add(seg);
    }
    if (nb.w) {
      const seg = BuildingFactory.box(half, wallH, wallW, 0x999999);
      seg.position.set(-half / 2, wallH / 2 + 0.05, 0);
      g.add(seg);
    }

    // Crenellations on top
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]] as [number, number][]) {
      const merlon = BuildingFactory.box(0.1, 0.15, 0.1, 0xaaa999);
      merlon.position.set(x, 1.12, z);
      g.add(merlon);
    }
    // Archer platform (darker top)
    const platform = BuildingFactory.box(0.5, 0.05, 0.5, 0x776655);
    platform.position.y = 1.025;
    g.add(platform);
    // Small archer figure on top
    const archerBody = BuildingFactory.box(0.08, 0.15, 0.08, 0x664422);
    archerBody.position.set(0, 1.15, 0);
    g.add(archerBody);
    const archerHead = BuildingFactory.box(0.06, 0.06, 0.06, 0xddaa77);
    archerHead.position.set(0, 1.26, 0);
    g.add(archerHead);
    return g;
  }

  static createForum(): THREE.Group {
    const g = new THREE.Group();
    const s = TILE_SIZE * 2;
    // Platform
    const platform = BuildingFactory.box(s * 0.85, 0.15, s * 0.85, 0xddcc88);
    platform.position.y = 0.125;
    g.add(platform);
    // Main structure
    const building = BuildingFactory.box(s * 0.5, 0.6, s * 0.5, 0xccbb77);
    building.position.y = 0.5;
    g.add(building);
    // Columns
    for (const [x, z] of [
      [-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55],
      [0, -0.55], [0, 0.55], [-0.55, 0], [0.55, 0],
    ] as [number, number][]) {
      const col = BuildingFactory.box(0.1, 0.7, 0.1, 0xeeddaa);
      col.position.set(x, 0.55, z);
      g.add(col);
    }
    // Roof/pediment
    const roof = BuildingFactory.box(s * 0.6, 0.12, s * 0.6, 0xbbaa66);
    roof.position.y = 0.92;
    g.add(roof);
    // SPQR banner (small colored box)
    const banner = BuildingFactory.box(0.3, 0.2, 0.05, 0xcc3333);
    banner.position.set(0, 0.7, s * 0.25 + 0.03);
    g.add(banner);
    return g;
  }
}
