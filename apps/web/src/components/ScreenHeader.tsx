import type { ReactNode } from 'react';
import { color as tokens } from '../theme/tokens';
import { ChevronLeftIcon } from './icons';
import { CircleButton } from './ui';

/** Editorial screen header with optional back chevron, title, sub, and right slot. */
export function ScreenHeader({
  title,
  sub,
  onBack,
  right,
}: {
  title: string;
  sub?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <div
      className="enter"
      style={{ padding: '58px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}
    >
      {onBack && (
        <CircleButton aria-label="Back" onClick={onBack}>
          <ChevronLeftIcon />
        </CircleButton>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.3px' }}>{title}</div>
        {sub && (
          <div style={{ fontSize: 13, fontWeight: 600, color: tokens.t3, marginTop: 3 }}>{sub}</div>
        )}
      </div>
      {right}
    </div>
  );
}
