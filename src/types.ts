export type BuildingType =
  | 'road'
  | 'house'
  | 'farm'
  | 'well'
  | 'market'
  | 'barracks'
  | 'wall'
  | 'tower'
  | 'forum';

export interface BuildingDef {
  cost: number;
  color: number;
  label: string;
  size: number;
  hp: number;
}

export interface TileData {
  x: number;
  z: number;
  building: BuildingType | null;
  buildingHp: number;
  hasWater: boolean;
  hasFood: boolean;
  waterTimer: number;
  foodTimer: number;
}

export interface ResourceState {
  gold: number;
  food: number;
  population: number;
  maxPopulation: number;
}

export interface ScoreState {
  peakPopulation: number;
  wavesSurvived: number;
  totalGoldEarned: number;
}

export interface SaveData {
  version: number;
  timestamp: number;
  grid: TileData[][];
  resources: ResourceState;
  score: ScoreState;
  tickCount: number;
  invasion: {
    waveNumber: number;
    ticksUntilNextWave: number;
  };
}
