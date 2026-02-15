import type { BuildingDef, BuildingType } from './types';

export const GRID_SIZE = 32;
export const TILE_SIZE = 1;

// Camera
export const CAMERA_FRUSTUM = 16;
export const CAMERA_NEAR = 1;
export const CAMERA_FAR = 1000;
export const CAMERA_DISTANCE = 40;
export const PAN_SPEED = 10;
export const ZOOM_SPEED = 1;
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 20;

// Simulation
export const TICK_INTERVAL = 2; // seconds between sim ticks

// Resources
export const STARTING_GOLD = 500;
export const FARM_FOOD_RATE = 4;
export const FOOD_PER_POP = 0.5;
export const TAX_RATE = 2;
export const WELL_RANGE = 4;
export const MARKET_RANGE = 6;
export const MAX_POP_PER_HOUSE = 10;
export const GROWTH_RATE = 3;
export const TOWER_RANGE = 6;
export const TOWER_DAMAGE = 3;

// Colors (retro palette)
export const COLORS = {
  grassLight: 0x4a7a3a,
  grassDark: 0x3d6b30,
  highlight: 0x66ff66,
  invalid: 0xff4444,
};

// Buildings
export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  road:     { cost: 5,   color: 0x888888, label: 'Road',     size: 1, hp: 10 },
  house:    { cost: 30,  color: 0xcc9966, label: 'House',    size: 1, hp: 20 },
  farm:     { cost: 50,  color: 0x99cc33, label: 'Farm',     size: 2, hp: 15 },
  well:     { cost: 20,  color: 0x6699cc, label: 'Well',     size: 1, hp: 15 },
  market:   { cost: 80,  color: 0xcc6633, label: 'Market',   size: 1, hp: 25 },
  barracks: { cost: 100, color: 0x993333, label: 'Barracks', size: 2, hp: 40 },
  wall:     { cost: 10,  color: 0x999999, label: 'Wall',     size: 1, hp: 50 },
  tower:    { cost: 60,  color: 0x887766, label: 'Tower',    size: 1, hp: 30 },
  forum:    { cost: 0,   color: 0xcccc66, label: 'Forum',    size: 2, hp: 100 },
};
