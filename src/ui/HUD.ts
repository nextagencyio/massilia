import type { ResourceState, ScoreState } from '../types';
import { PixelIcons } from './PixelIcons';

export interface InvasionInfo {
  warningActive: boolean;
  activeWave: boolean;
  invaderCount: number;
  waveNumber: number;
}

export class HUD {
  private element: HTMLElement;
  private gameOverOverlay: HTMLElement | null = null;

  constructor() {
    this.element = document.getElementById('hud')!;
  }

  private icon(src: string): string {
    return `<img src="${src}" style="width:12px;height:12px;image-rendering:pixelated">`;
  }

  private span(content: string, color?: string): string {
    const style = color ? `color:${color}` : '';
    return `<span class="hud-item" style="${style}">${content}</span>`;
  }

  private rate(value: number, decimals = 0): string {
    const color = value >= 0 ? '#8c8' : '#f88';
    const sign = value >= 0 ? '+' : '';
    const text = decimals > 0 ? value.toFixed(decimals) : String(value);
    return `<span class="hud-rate" style="color:${color}">${sign}${text}</span>`;
  }

  update(resources: ResourceState, invasion?: InvasionInfo, rates?: { goldPerTick: number; foodPerTick: number }, scoreInfo?: { score: number; highScore: number }): void {
    const foodColor = resources.food < 0 ? '#ff6666' : '#e0e0e0';
    const goldRate = rates ? rates.goldPerTick : 0;
    const foodRate = rates ? rates.foodPerTick : 0;
    const goldRateStr = goldRate > 0 ? this.rate(goldRate) : '';
    const foodRateStr = rates ? this.rate(foodRate, 1) : '';

    let html =
      this.span(`${this.icon(PixelIcons.gold())}Gold: ${Math.floor(resources.gold)}${goldRateStr}`) +
      this.span(`${this.icon(PixelIcons.food())}Food: ${Math.floor(resources.food)}${foodRateStr}`, foodColor) +
      this.span(`${this.icon(PixelIcons.pop())}Pop: ${resources.population}/${resources.maxPopulation}`);

    if (invasion) {
      html += this.span(`${this.icon(PixelIcons.wave())}Wave: ${invasion.waveNumber}`);

      if (invasion.warningActive) {
        html += `<span class="hud-item" style="color:#ff4444;animation:blink 0.5s infinite">BARBARIANS APPROACHING!</span>`;
      } else if (invasion.activeWave) {
        html += this.span(`Invaders: ${invasion.invaderCount}`, '#ff6644');
      }
    }

    if (scoreInfo) {
      html += this.span(`${this.icon(PixelIcons.trophy())}Score: ${scoreInfo.score}`, '#ffcc44');
      html += this.span(`Best: ${scoreInfo.highScore}`, '#aaa');
    }

    this.element.innerHTML = html;
  }

  showGameOver(score: ScoreState, onRestart: () => void, highScore?: number): void {
    if (this.gameOverOverlay) return;

    this.gameOverOverlay = document.createElement('div');
    this.gameOverOverlay.id = 'game-over';
    this.gameOverOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85); display: flex; flex-direction: column;
      align-items: center; justify-content: center; z-index: 100;
      font-family: 'Press Start 2P', monospace; color: #cc3333;
    `;
    this.gameOverOverlay.innerHTML = `
      <h1 style="font-size:24px;margin-bottom:30px;text-shadow:0 0 20px #ff0000">MASSILIA HAS FALLEN</h1>
      <div style="color:#ccc;font-size:10px;line-height:2.5">
        <div>Peak Population: ${score.peakPopulation}</div>
        <div>Waves Survived: ${score.wavesSurvived}</div>
        <div>Total Gold Earned: ${Math.floor(score.totalGoldEarned)}</div>
        <div style="margin-top:10px;color:#ffcc44;font-size:12px">
          Score: ${score.peakPopulation * 10 + score.wavesSurvived * 50 + Math.floor(score.totalGoldEarned / 10)}
        </div>
        ${highScore !== undefined ? `<div style="margin-top:6px;color:#aaa;font-size:9px">Best: ${highScore}</div>` : ''}
      </div>
      <button id="restart-btn" style="
        margin-top:30px; padding:12px 24px; font-family:'Press Start 2P',monospace;
        font-size:10px; background:#2a2a4a; color:#8c8; border:2px solid #555;
        cursor:pointer;
      ">NEW GAME</button>
    `;
    document.body.appendChild(this.gameOverOverlay);

    document.getElementById('restart-btn')!.addEventListener('click', () => {
      this.hideGameOver();
      onRestart();
    });
  }

  hideGameOver(): void {
    if (this.gameOverOverlay) {
      this.gameOverOverlay.remove();
      this.gameOverOverlay = null;
    }
  }
}
