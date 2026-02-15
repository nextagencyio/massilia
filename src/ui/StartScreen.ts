export class StartScreen {
  private overlay: HTMLElement;
  private resolve!: (choice: 'continue' | 'new') => void;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'start-screen';
    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: #1a1a2e; display: flex; flex-direction: column;
      align-items: center; justify-content: center; z-index: 200;
      font-family: 'Press Start 2P', monospace;
    `;
    this.overlay.innerHTML = `
      <h1 style="color:#cccc66;font-size:28px;margin-bottom:10px;text-shadow:0 0 20px #cccc44">MASSILIA</h1>
      <p style="color:#888;font-size:8px;margin-bottom:40px">A Roman City Builder</p>
      <p style="color:#aaa;font-size:10px;margin-bottom:30px">A saved game was found. What would you like to do?</p>
      <div style="display:flex;gap:16px">
        <button id="continue-btn" style="
          padding:14px 28px; font-family:'Press Start 2P',monospace;
          font-size:10px; background:#3a5a3a; color:#8c8; border:2px solid #6a6;
          cursor:pointer;
        ">CONTINUE</button>
        <button id="new-game-btn" style="
          padding:14px 28px; font-family:'Press Start 2P',monospace;
          font-size:10px; background:#2a2a4a; color:#aaa; border:2px solid #555;
          cursor:pointer;
        ">NEW GAME</button>
      </div>
    `;
  }

  show(): Promise<'continue' | 'new'> {
    document.body.appendChild(this.overlay);

    return new Promise((resolve) => {
      this.resolve = resolve;

      document.getElementById('continue-btn')!.addEventListener('click', () => {
        this.hide();
        resolve('continue');
      });

      document.getElementById('new-game-btn')!.addEventListener('click', () => {
        this.hide();
        resolve('new');
      });
    });
  }

  hide(): void {
    this.overlay.remove();
  }
}
