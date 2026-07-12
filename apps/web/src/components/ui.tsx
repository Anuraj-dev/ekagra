import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
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
        minHeight: 52,
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

/** Outline pill: transparent bg, 1px `line` border, text `t2` (DESIGN-SPEC §6). Mirrors PrimaryButton. */
export function SecondaryButton({
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
        minHeight: 52,
        width: '100%',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 700,
        background: 'transparent',
        border: `1px solid ${tokens.line}`,
        color: disabled ? tokens.t4 : tokens.t2,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'border-color .18s var(--ease)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Compact selectable chip; ember tint by default when active (DESIGN-SPEC §6). */
export function Chip({
  label,
  active = false,
  tint = tokens.ember,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; tint?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        background: active ? tokens.emberWash : tokens.surface,
        border: `1px solid ${active ? tokens.emberLine : tokens.line}`,
        color: active ? tint : tokens.t3,
        cursor: 'pointer',
        transition: 'border-color .18s var(--ease), background .18s var(--ease)',
      }}
      {...rest}
    >
      {label}
    </button>
  );
}

/** Recessed row shell: surface2 bg, 1px lineSoft border, r-md (settings-style rows, DESIGN-SPEC §6). */
export function EntryRow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: tokens.surface2,
        border: `1px solid ${tokens.lineSoft}`,
        borderRadius: 16,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
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
export function SectionRow({
  label,
  action,
  paddingHorizontal = 20,
}: {
  label: string;
  action?: ReactNode;
  paddingHorizontal?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `24px ${paddingHorizontal}px 12px`,
      }}
    >
      <span className="overline" style={{ color: tokens.t3 }}>
        {label}
      </span>
      {action}
    </div>
  );
}
