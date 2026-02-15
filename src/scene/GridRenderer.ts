import * as THREE from 'three';
import { GRID_SIZE, TILE_SIZE, COLORS } from '../constants';
import type { Grid } from '../world/Grid';

export class GridRenderer {
  private scene: THREE.Scene;
  private grid: Grid;
  private mesh: THREE.InstancedMesh | null = null;

  constructor(scene: THREE.Scene, grid: Grid) {
    this.scene = scene;
    this.grid = grid;
  }

  buildMesh(): void {
    const count = GRID_SIZE * GRID_SIZE;
    const geometry = new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.1, TILE_SIZE * 0.98);
    const material = new THREE.MeshLambertMaterial();

    this.mesh = new THREE.InstancedMesh(geometry, material, count);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    let index = 0;
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        dummy.position.set(
          x * TILE_SIZE + TILE_SIZE / 2,
          0,
          z * TILE_SIZE + TILE_SIZE / 2
        );
        dummy.updateMatrix();
        this.mesh.setMatrixAt(index, dummy.matrix);

        // Checkerboard with slight random variation
        const isLight = (x + z) % 2 === 0;
        const baseColor = isLight ? COLORS.grassLight : COLORS.grassDark;
        const variation = (Math.random() - 0.5) * 0.02;
        color.setHex(baseColor);
        color.r += variation;
        color.g += variation;
        color.b += variation;
        this.mesh.setColorAt(index, color);

        index++;
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }

    this.scene.add(this.mesh);
  }
}
