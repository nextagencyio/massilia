import { Game } from './Game';
import { SaveSystem } from './systems/SaveSystem';
import { StartScreen } from './ui/StartScreen';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #game-canvas not found');
}

const game = new Game(canvas);
(window as any).__game = game;

const saveSystem = new SaveSystem();

async function init() {
  if (saveSystem.hasSave()) {
    const startScreen = new StartScreen();
    const choice = await startScreen.show();

    if (choice === 'continue') {
      const saveData = saveSystem.load();
      if (saveData) {
        game.loadFromSave(saveData);
        return;
      }
    }

    // New game or failed to load
    saveSystem.clearSave();
  }

  game.start();
}

init();
