/**
 * Tiny canvas-drawn pixel art icons for the retro UI.
 * Each icon is drawn on a small canvas and exported as a data-URL.
 */

type DrawFn = (ctx: CanvasRenderingContext2D, s: number) => void;

function makeIcon(size: number, draw: DrawFn): string {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx, size);
  return c.toDataURL();
}

/* ---------- Building icons (16×16) ---------- */

const B = 16; // building icon size

const drawRoad: DrawFn = (ctx, s) => {
  ctx.fillStyle = '#888';
  ctx.fillRect(2, 6, 12, 4);
  // dashed center line
  ctx.fillStyle = '#cc4';
  ctx.fillRect(4, 7, 2, 2);
  ctx.fillRect(8, 7, 2, 2);
  ctx.fillRect(12, 7, 2, 2);
};

const drawHouse: DrawFn = (ctx) => {
  // walls
  ctx.fillStyle = '#cc9966';
  ctx.fillRect(3, 7, 10, 7);
  // roof
  ctx.fillStyle = '#993333';
  ctx.fillRect(2, 5, 12, 3);
  ctx.fillRect(4, 3, 8, 2);
  // door
  ctx.fillStyle = '#664422';
  ctx.fillRect(7, 10, 3, 4);
  // window
  ctx.fillStyle = '#aaddff';
  ctx.fillRect(4, 9, 2, 2);
};

const drawFarm: DrawFn = (ctx) => {
  // soil
  ctx.fillStyle = '#775533';
  ctx.fillRect(1, 8, 14, 7);
  // crop rows
  ctx.fillStyle = '#99cc33';
  ctx.fillRect(2, 6, 2, 4);
  ctx.fillRect(5, 5, 2, 5);
  ctx.fillRect(8, 4, 2, 6);
  ctx.fillRect(11, 5, 2, 5);
  // wheat tops
  ctx.fillStyle = '#ccdd55';
  ctx.fillRect(2, 5, 2, 1);
  ctx.fillRect(5, 4, 2, 1);
  ctx.fillRect(8, 3, 2, 1);
  ctx.fillRect(11, 4, 2, 1);
};

const drawWell: DrawFn = (ctx) => {
  // stone base
  ctx.fillStyle = '#999';
  ctx.fillRect(3, 9, 10, 5);
  ctx.fillRect(4, 8, 8, 1);
  // water
  ctx.fillStyle = '#6699cc';
  ctx.fillRect(5, 10, 6, 3);
  // roof posts
  ctx.fillStyle = '#775533';
  ctx.fillRect(4, 4, 1, 5);
  ctx.fillRect(11, 4, 1, 5);
  // roof
  ctx.fillStyle = '#993333';
  ctx.fillRect(3, 3, 10, 2);
};

const drawMarket: DrawFn = (ctx) => {
  // awning
  ctx.fillStyle = '#cc6633';
  ctx.fillRect(1, 4, 14, 3);
  ctx.fillStyle = '#ee8844';
  ctx.fillRect(1, 4, 3, 3);
  ctx.fillRect(7, 4, 3, 3);
  ctx.fillRect(13, 4, 2, 3);
  // table
  ctx.fillStyle = '#aa8855';
  ctx.fillRect(2, 7, 12, 2);
  // legs
  ctx.fillStyle = '#775533';
  ctx.fillRect(3, 9, 1, 5);
  ctx.fillRect(12, 9, 1, 5);
  // goods
  ctx.fillStyle = '#cc4444';
  ctx.fillRect(4, 6, 2, 1);
  ctx.fillStyle = '#cccc33';
  ctx.fillRect(7, 6, 2, 1);
  ctx.fillStyle = '#44aa44';
  ctx.fillRect(10, 6, 2, 1);
};

const drawBarracks: DrawFn = (ctx) => {
  // base
  ctx.fillStyle = '#993333';
  ctx.fillRect(2, 6, 12, 8);
  // battlements
  ctx.fillStyle = '#aa4444';
  ctx.fillRect(2, 4, 3, 2);
  ctx.fillRect(7, 4, 3, 2);
  ctx.fillRect(12, 4, 2, 2);
  // door
  ctx.fillStyle = '#552222';
  ctx.fillRect(6, 9, 4, 5);
  // door arch
  ctx.fillStyle = '#aa4444';
  ctx.fillRect(6, 8, 4, 1);
  // shield emblem
  ctx.fillStyle = '#ccaa33';
  ctx.fillRect(7, 10, 2, 2);
};

const drawWall: DrawFn = (ctx) => {
  // main wall
  ctx.fillStyle = '#999';
  ctx.fillRect(3, 5, 10, 9);
  // brick lines
  ctx.fillStyle = '#777';
  ctx.fillRect(3, 7, 10, 1);
  ctx.fillRect(3, 10, 10, 1);
  ctx.fillRect(7, 5, 1, 9);
  // battlements
  ctx.fillStyle = '#aaa';
  ctx.fillRect(3, 3, 3, 2);
  ctx.fillRect(8, 3, 2, 2);
  ctx.fillRect(12, 3, 1, 2);
};

const drawTower: DrawFn = (ctx) => {
  // stone base
  ctx.fillStyle = '#888';
  ctx.fillRect(3, 10, 10, 4);
  // tower body
  ctx.fillStyle = '#999';
  ctx.fillRect(4, 3, 8, 8);
  // crenellations
  ctx.fillStyle = '#aaa';
  ctx.fillRect(4, 1, 2, 2);
  ctx.fillRect(7, 1, 2, 2);
  ctx.fillRect(10, 1, 2, 2);
  // window slit
  ctx.fillStyle = '#555';
  ctx.fillRect(7, 6, 2, 3);
  // archer on top
  ctx.fillStyle = '#664422';
  ctx.fillRect(6, 2, 2, 1);
};

const drawDemolish: DrawFn = (ctx) => {
  // handle
  ctx.fillStyle = '#775533';
  ctx.fillRect(3, 8, 2, 6);
  // head
  ctx.fillStyle = '#999';
  ctx.fillRect(1, 4, 6, 4);
  ctx.fillRect(2, 3, 4, 1);
  // pick point
  ctx.fillStyle = '#ccc';
  ctx.fillRect(7, 4, 3, 2);
  ctx.fillRect(10, 5, 2, 1);
  // debris
  ctx.fillStyle = '#886644';
  ctx.fillRect(10, 10, 2, 2);
  ctx.fillRect(12, 12, 2, 2);
  ctx.fillRect(13, 9, 2, 2);
};

/* ---------- HUD icons (12×12) ---------- */

const H = 12;

const drawGold: DrawFn = (ctx) => {
  // coin body
  ctx.fillStyle = '#ccaa33';
  ctx.fillRect(3, 2, 6, 8);
  ctx.fillRect(2, 3, 8, 6);
  // shine
  ctx.fillStyle = '#eedd55';
  ctx.fillRect(4, 3, 2, 2);
  // symbol
  ctx.fillStyle = '#aa8822';
  ctx.fillRect(5, 4, 2, 4);
  ctx.fillRect(4, 5, 4, 1);
  ctx.fillRect(4, 7, 4, 1);
};

const drawFood: DrawFn = (ctx) => {
  // wheat stalk
  ctx.fillStyle = '#99cc33';
  ctx.fillRect(5, 4, 2, 7);
  // wheat head
  ctx.fillStyle = '#ccbb44';
  ctx.fillRect(4, 1, 4, 4);
  ctx.fillRect(3, 2, 6, 2);
  // grain dots
  ctx.fillStyle = '#ddcc55';
  ctx.fillRect(4, 2, 1, 1);
  ctx.fillRect(7, 2, 1, 1);
  ctx.fillRect(5, 1, 2, 1);
};

const drawPop: DrawFn = (ctx) => {
  // head
  ctx.fillStyle = '#ddbb88';
  ctx.fillRect(4, 1, 4, 4);
  // body
  ctx.fillStyle = '#cc9966';
  ctx.fillRect(3, 5, 6, 5);
  // toga
  ctx.fillStyle = '#ddd';
  ctx.fillRect(3, 5, 6, 3);
  ctx.fillRect(2, 6, 2, 2);
};

const drawTrophy: DrawFn = (ctx) => {
  // cup
  ctx.fillStyle = '#ccaa33';
  ctx.fillRect(3, 2, 6, 5);
  ctx.fillRect(2, 2, 8, 2);
  // shine
  ctx.fillStyle = '#eedd55';
  ctx.fillRect(4, 3, 2, 1);
  // handles
  ctx.fillStyle = '#aa8822';
  ctx.fillRect(1, 3, 1, 3);
  ctx.fillRect(10, 3, 1, 3);
  // stem
  ctx.fillStyle = '#aa8822';
  ctx.fillRect(5, 7, 2, 2);
  // base
  ctx.fillStyle = '#ccaa33';
  ctx.fillRect(3, 9, 6, 2);
};

const drawWave: DrawFn = (ctx) => {
  // sword blade
  ctx.fillStyle = '#ccc';
  ctx.fillRect(5, 1, 2, 7);
  ctx.fillRect(4, 1, 4, 1);
  // cross guard
  ctx.fillStyle = '#aa8833';
  ctx.fillRect(3, 7, 6, 1);
  // handle
  ctx.fillStyle = '#775533';
  ctx.fillRect(5, 8, 2, 3);
  // pommel
  ctx.fillStyle = '#aa8833';
  ctx.fillRect(5, 11, 2, 1);
};

/* ---------- Cache & export ---------- */

const cache: Record<string, string> = {};

function get(key: string, size: number, draw: DrawFn): string {
  if (!cache[key]) cache[key] = makeIcon(size, draw);
  return cache[key];
}

export const PixelIcons = {
  // building (16×16)
  road:     () => get('road', B, drawRoad),
  house:    () => get('house', B, drawHouse),
  farm:     () => get('farm', B, drawFarm),
  well:     () => get('well', B, drawWell),
  market:   () => get('market', B, drawMarket),
  barracks: () => get('barracks', B, drawBarracks),
  wall:     () => get('wall', B, drawWall),
  tower:    () => get('tower', B, drawTower),
  demolish: () => get('demolish', B, drawDemolish),

  // hud (12×12)
  gold:   () => get('gold', H, drawGold),
  food:   () => get('food', H, drawFood),
  pop:    () => get('pop', H, drawPop),
  wave:   () => get('wave', H, drawWave),
  trophy: () => get('trophy', H, drawTrophy),
};
