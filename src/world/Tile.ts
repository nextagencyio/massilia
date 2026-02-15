import type { BuildingType, TileData } from '../types';

export class Tile {
  x: number;
  z: number;
  building: BuildingType | null = null;
  buildingHp = 0;
  hasWater = false;
  hasFood = false;
  waterTimer = 0;
  foodTimer = 0;

  constructor(x: number, z: number) {
    this.x = x;
    this.z = z;
  }

  toJSON(): TileData {
    return {
      x: this.x,
      z: this.z,
      building: this.building,
      buildingHp: this.buildingHp,
      hasWater: this.hasWater,
      hasFood: this.hasFood,
      waterTimer: this.waterTimer,
      foodTimer: this.foodTimer,
    };
  }

  static fromJSON(data: TileData): Tile {
    const tile = new Tile(data.x, data.z);
    tile.building = data.building;
    tile.buildingHp = data.buildingHp;
    tile.hasWater = data.hasWater;
    tile.hasFood = data.hasFood;
    tile.waterTimer = data.waterTimer;
    tile.foodTimer = data.foodTimer;
    return tile;
  }
}
