import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { color as tokens } from '../theme/tokens';

/** Filled ember pill; disabled → the hard-block "well" treatment. */
export function PrimaryButton({
  children,
  disabled,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        borderRadius: 999,
        padding: 17,
        width: '100%',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 800,
        background: disabled ? tokens.lineSoft : tokens.ember,
        color: disabled ? tokens.t4 : '#0E0F12',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background .2s',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Text-only ember action, no chrome. */
export function GhostButton({ children, style, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      style={{ fontSize: 13, fontWeight: 700, color: tokens.ember, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** 38–40px circular header/close control (settings, back chevron). */
export function CircleButton({
  children,
  size = 40,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: number }) {
  return (
    <button
      type="button"
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: tokens.surface,
        border: `1px solid ${tokens.line}`,
        color: tokens.t3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        transition:
          'border-color .18s var(--ease), color .18s var(--ease), background .18s var(--ease)',
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Section overline row with an optional right-aligned action. */
export function SectionRow({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 20px 12px',
      }}
    >
      <span className="overline" style={{ color: tokens.t3 }}>
        {label}
      </span>
      {action}
    </div>
  );
}
