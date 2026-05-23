import type { ViolationLevel } from '../types/accountStatus.types';

export function violationLevelLabel(
  level: ViolationLevel,
  count: number,
): string {
  switch (level) {
    case 'clean':
      return 'Good standing';
    case 'warning':
      return `Warning (${count}/3)`;
    case 'restricted':
      return `Restricted (${count} violations)`;
    case 'severe':
      return `Severe (${count} violations)`;
    default:
      return level;
  }
}
