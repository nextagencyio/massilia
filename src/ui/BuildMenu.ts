import { BUILDINGS } from '../constants';
import type { BuildingType } from '../types';
import { PixelIcons } from './PixelIcons';
import { sound } from '../audio/SoundManager';

// Explicit shortcut key per building type
const SHORTCUTS: Record<string, BuildingType> = {
  r: 'road',
  h: 'house',
  f: 'farm',
  e: 'well',
  m: 'market',
  b: 'barracks',
  w: 'wall',
  t: 'tower',
};

// Build a reverse map: building type → shortcut key
const SHORTCUT_FOR: Partial<Record<BuildingType, string>> = {};
for (const [key, type] of Object.entries(SHORTCUTS)) {
  SHORTCUT_FOR[type] = key;
}

/** Format label with shortcut hint, e.g. "W(e)ll", "(B)arracks" */
function hintLabel(label: string, shortcutKey: string): string {
  const idx = label.toLowerCase().indexOf(shortcutKey);
  if (idx < 0) return label;
  const before = label.slice(0, idx);
  const letter = label[idx];
  const after = label.slice(idx + 1);
  return `${before}<span style="text-decoration:underline;font-weight:bold">${letter}</span>${after}`;
}

export class BuildMenu {
  private element: HTMLElement;
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private _selected: BuildingType | null = null;
  private _demolishMode = false;
  private buildable: BuildingType[] = [];
  private onSelectCb: (type: BuildingType | null) => void = () => {};
  private onDemolishCb: (active: boolean) => void = () => {};

  get selected(): BuildingType | null {
    return this._selected;
  }

  get demolishMode(): boolean {
    return this._demolishMode;
  }

  constructor(onSelect: (type: BuildingType | null) => void, onDemolish: (active: boolean) => void) {
    this.element = document.getElementById('build-menu')!;
    this.element.innerHTML = '';
    this.onSelectCb = onSelect;
    this.onDemolishCb = onDemolish;

    const buildable: BuildingType[] = ['road', 'house', 'farm', 'well', 'market', 'barracks', 'wall', 'tower'];
    this.buildable = buildable;

    for (const key of buildable) {
      const def = BUILDINGS[key];
      const btn = document.createElement('button');
      const icon = PixelIcons[key as keyof typeof PixelIcons]();
      const hint = SHORTCUT_FOR[key] ? hintLabel(def.label, SHORTCUT_FOR[key]!) : def.label;
      btn.innerHTML = `<img src="${icon}" style="width:16px;height:16px;image-rendering:pixelated;vertical-align:middle;margin-right:4px">${hint} <span style="color:#8c8;font-size:7px">${def.cost}g</span>`;
      btn.addEventListener('click', () => {
        if (this._selected === key) {
          // Deselect
          this._selected = null;
          this.updateSelection();
          onSelect(null);
          sound.deselect();
        } else {
          this._selected = key;
          this._demolishMode = false;
          this.updateSelection();
          onSelect(key);
          sound.select();
        }
      });
      this.buttons.set(key, btn);
      this.element.appendChild(btn);
    }

    // Demolish button
    const demBtn = document.createElement('button');
    demBtn.classList.add('demolish-btn');
    const demIcon = PixelIcons.demolish();
    demBtn.innerHTML = `<img src="${demIcon}" style="width:16px;height:16px;image-rendering:pixelated;vertical-align:middle;margin-right:4px">${hintLabel('Demolish', 'd')}`;
    demBtn.addEventListener('click', () => {
      if (this._demolishMode) {
        this._demolishMode = false;
        this.updateSelection();
        onDemolish(false);
        sound.deselect();
      } else {
        this._demolishMode = true;
        this._selected = null;
        this.updateSelection();
        onSelect(null);
        onDemolish(true);
        sound.select();
      }
    });
    this.buttons.set('demolish', demBtn);
    this.element.appendChild(demBtn);
  }

  private updateSelection(): void {
    for (const [key, btn] of this.buttons) {
      if (key === 'demolish') {
        btn.classList.toggle('selected', this._demolishMode);
        btn.classList.toggle('demolish-active', this._demolishMode);
      } else {
        btn.classList.toggle('selected', key === this._selected);
      }
    }
  }

  deselect(): void {
    this._selected = null;
    this._demolishMode = false;
    this.updateSelection();
  }

  /** Update building count badges on each button. */
  updateCounts(counts: Partial<Record<BuildingType, number>>): void {
    for (const key of this.buildable) {
      const btn = this.buttons.get(key);
      if (!btn) continue;
      let badge = btn.querySelector('.build-count') as HTMLElement | null;
      const count = counts[key] ?? 0;
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'build-count';
          btn.appendChild(badge);
        }
        badge.textContent = `x${count}`;
      } else if (badge) {
        badge.remove();
      }
    }
  }

  /** Select a building by keyboard shortcut key. */
  selectByKey(key: string): void {
    const letter = key.toLowerCase();

    // 'd' toggles demolish mode
    if (letter === 'd') {
      if (this._demolishMode) {
        this._demolishMode = false;
        this.updateSelection();
        this.onDemolishCb(false);
        sound.deselect();
      } else {
        this._demolishMode = true;
        this._selected = null;
        this.updateSelection();
        this.onSelectCb(null);
        this.onDemolishCb(true);
        sound.select();
      }
      return;
    }

    // Look up building by shortcut key
    const target = SHORTCUTS[letter];
    if (!target || !this.buildable.includes(target)) return;

    // Toggle: pressing the same shortcut again deselects
    if (this._selected === target) {
      this._selected = null;
      this._demolishMode = false;
      this.updateSelection();
      this.onSelectCb(null);
      sound.deselect();
    } else {
      this._selected = target;
      this._demolishMode = false;
      this.updateSelection();
      this.onSelectCb(target);
      sound.select();
    }
  }
}
