import type { WalkerSystem, Walker } from './WalkerSystem';
import type { InvasionSystem, Invader } from './InvasionSystem';
import { sound } from '../audio/SoundManager';

const SOLDIER_DAMAGE = 4;
const SOLDIER_ENGAGE_RANGE = 5;

export class CombatSystem {
  /** Handles melee combat between soldiers and invaders (movement handled by WalkerSystem) */
  update(walkerSystem: WalkerSystem, invasionSystem: InvasionSystem): void {
    const soldiers = walkerSystem.getSoldiers();

    for (const soldier of soldiers) {
      // Find nearest invader within melee range
      const target = invasionSystem.findNearestInvader(
        soldier.gridX,
        soldier.gridZ,
        SOLDIER_ENGAGE_RANGE
      );

      if (!target) continue;

      const dist = Math.abs(soldier.gridX - target.x) + Math.abs(soldier.gridZ - target.z);

      if (dist <= 1) {
        // In melee range - fight
        target.hp -= SOLDIER_DAMAGE;
        soldier.hp -= target.damage;

        sound.hit();

        // Visual feedback on soldier
        soldier.mesh.scale.set(1.2, 1.2, 1.2);
        setTimeout(() => {
          soldier.mesh.scale.set(1, 1, 1);
        }, 100);

        // Visual feedback on invader
        target.mesh.scale.set(1.3, 1.3, 1.3);
        setTimeout(() => {
          if (target.state !== 'dead') {
            target.mesh.scale.set(1, 1, 1);
          }
        }, 100);

        if (target.hp <= 0) {
          target.state = 'dead';
          sound.kill();
        }

        if (soldier.hp <= 0) {
          // Remove soldier
          const idx = walkerSystem.walkers.indexOf(soldier);
          if (idx >= 0) {
            walkerSystem.removeWalker(idx);
          }
        }
      }
    }
  }
}
