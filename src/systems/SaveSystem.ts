import type { SaveData, ResourceState, ScoreState } from '../types';
import type { Grid } from '../world/Grid';

const SAVE_KEY = 'massilia-save';
const HIGH_SCORE_KEY = 'massilia-highscore';
const SAVE_VERSION = 1;
const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds in ms

export class SaveSystem {
  private lastSaveTime = 0;

  save(
    grid: Grid,
    resources: ResourceState,
    score: ScoreState,
    tickCount: number,
    invasion: { waveNumber: number; ticksUntilNextWave: number }
  ): void {
    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      grid: grid.toJSON(),
      resources: { ...resources },
      score: { ...score },
      tickCount,
      invasion: { ...invasion },
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  }

  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== SAVE_VERSION) return null;
      return data;
    } catch (e) {
      console.warn('Failed to load save:', e);
      return null;
    }
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  /** Returns true if enough time has passed for an auto-save */
  shouldAutoSave(): boolean {
    const now = Date.now();
    if (now - this.lastSaveTime >= AUTO_SAVE_INTERVAL) {
      this.lastSaveTime = now;
      return true;
    }
    return false;
  }

  resetTimer(): void {
    this.lastSaveTime = Date.now();
  }

  getHighScore(): number {
    try {
      return parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  saveHighScore(score: number): void {
    try {
      const current = this.getHighScore();
      if (score > current) {
        localStorage.setItem(HIGH_SCORE_KEY, String(score));
      }
    } catch (e) {
      console.warn('Failed to save high score:', e);
    }
  }
}
