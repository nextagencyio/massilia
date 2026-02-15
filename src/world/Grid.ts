import { GRID_SIZE } from '../constants';
import type { TileData } from '../types';
import { Tile } from './Tile';

export class Grid {
  size: number;
  tiles: Tile[][];

  constructor(size: number = GRID_SIZE) {
    this.size = size;
    this.tiles = Array.from({ length: size }, (_, x) =>
      Array.from({ length: size }, (_, z) => new Tile(x, z))
    );
  }

  getTile(x: number, z: number): Tile | null {
    if (!this.isInBounds(x, z)) return null;
    return this.tiles[x][z];
  }

  isInBounds(x: number, z: number): boolean {
    return x >= 0 && x < this.size && z >= 0 && z < this.size;
  }

  isRoad(x: number, z: number): boolean {
    const tile = this.getTile(x, z);
    return tile !== null && tile.building === 'road';
  }

  toJSON(): TileData[][] {
    return this.tiles.map(row => row.map(tile => tile.toJSON()));
  }

  static fromJSON(data: TileData[][]): Grid {
    const size = data.length;
    const grid = new Grid(size);
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < data[x].length; z++) {
        grid.tiles[x][z] = Tile.fromJSON(data[x][z]);
      }
    }
    return grid;
  }
}
