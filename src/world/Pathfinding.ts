import type { Grid } from './Grid';

const NEIGHBORS = [
  { dx: 1, dz: 0 },
  { dx: -1, dz: 0 },
  { dx: 0, dz: 1 },
  { dx: 0, dz: -1 },
];

/**
 * BFS flood-fill along road tiles from a starting point.
 * Returns a Set of "x,z" keys for all reachable road/forum tiles.
 */
export function floodFillRoads(grid: Grid, startX: number, startZ: number): Set<string> {
  const visited = new Set<string>();
  const queue: { x: number; z: number }[] = [{ x: startX, z: startZ }];

  while (queue.length > 0) {
    const { x, z } = queue.shift()!;
    const key = `${x},${z}`;
    if (visited.has(key)) continue;
    if (!grid.isInBounds(x, z)) continue;

    const tile = grid.getTile(x, z);
    if (!tile) continue;
    if (tile.building !== 'road' && tile.building !== 'forum') continue;

    visited.add(key);

    for (const { dx, dz } of NEIGHBORS) {
      queue.push({ x: x + dx, z: z + dz });
    }
  }

  return visited;
}

/**
 * Check if a building at (bx, bz) with given size is adjacent to any tile in the reachable road set.
 */
export function isBuildingConnected(
  grid: Grid,
  bx: number,
  bz: number,
  size: number,
  reachableRoads: Set<string>
): boolean {
  // Check all tiles adjacent to the building's footprint
  for (let dx = 0; dx < size; dx++) {
    for (let dz = 0; dz < size; dz++) {
      for (const { dx: ndx, dz: ndz } of NEIGHBORS) {
        const nx = bx + dx + ndx;
        const nz = bz + dz + ndz;
        if (reachableRoads.has(`${nx},${nz}`)) return true;
      }
    }
  }
  return false;
}

/**
 * Get adjacent road tile coordinates for a building at (x, z) with given size.
 * Checks the full perimeter of the building footprint.
 */
export function getAdjacentRoadTiles(grid: Grid, x: number, z: number, size = 1): { x: number; z: number }[] {
  const result: { x: number; z: number }[] = [];
  const seen = new Set<string>();

  for (let dx = 0; dx < size; dx++) {
    for (let dz = 0; dz < size; dz++) {
      for (const { dx: ndx, dz: ndz } of NEIGHBORS) {
        const nx = x + dx + ndx;
        const nz = z + dz + ndz;
        const key = `${nx},${nz}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Skip tiles that are part of the building itself
        if (nx >= x && nx < x + size && nz >= z && nz < z + size) continue;

        const tile = grid.getTile(nx, nz);
        if (tile && (tile.building === 'road' || tile.building === 'forum')) {
          result.push({ x: nx, z: nz });
        }
      }
    }
  }
  return result;
}

/**
 * Get all neighboring road tiles from a given road tile (for walker movement).
 */
export function getRoadNeighbors(grid: Grid, x: number, z: number): { x: number; z: number }[] {
  const result: { x: number; z: number }[] = [];
  for (const { dx, dz } of NEIGHBORS) {
    const nx = x + dx;
    const nz = z + dz;
    const tile = grid.getTile(nx, nz);
    if (tile && (tile.building === 'road' || tile.building === 'forum')) {
      result.push({ x: nx, z: nz });
    }
  }
  return result;
}
