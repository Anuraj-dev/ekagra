import { ring, color as tokens } from '../theme/tokens';

export type RingPhase = 'work' | 'break';
export type RingStatus = 'running' | 'paused';

/**
 * The timer ring (DESIGN-SPEC §6/§8). Two circles + self-glow, nothing more.
 * `progress` is 0..1 elapsed. Running work = luminous ember, breathing. Paused =
 * desaturated static stroke with a dashed remaining arc. Break = green.
 */
export function TimerRing({
  progress,
  status,
  phase,
  timeLabel,
  subLabel,
}: {
  progress: number;
  status: RingStatus;
  phase: RingPhase;
  timeLabel: string;
  subLabel: string;
}) {
  const c = ring.circumference;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = c * (1 - clamped);
  const running = status === 'running';
  const strokeColor = running ? (phase === 'break' ? tokens.green : tokens.ember) : tokens.emberDim;
  const glowColor = phase === 'break' ? '91,191,138' : '240,138,62';

  return (
    <div style={{ position: 'relative', width: ring.size, height: ring.size, marginTop: 38 }}>
      <svg
        width={ring.size}
        height={ring.size}
        viewBox={`0 0 ${ring.size} ${ring.size}`}
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', overflow: 'visible' }}
        aria-hidden="true"
      >
        <title>Focus timer</title>
        {/* Track: hairline orbit; dashed when paused so the remaining arc reads as spent. */}
        <circle
          cx={ring.size / 2}
          cy={ring.size / 2}
          r={ring.radius}
          fill="none"
          stroke="#1A1D23"
          strokeWidth={2}
          strokeDasharray={running ? undefined : '3 8'}
        />
        {/* Progress arc. */}
        <circle
          className={running ? 'ring-prog--running' : undefined}
          cx={ring.size / 2}
          cy={ring.size / 2}
          r={ring.radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1s linear, stroke .22s var(--ease)',
            filter: running
              ? `drop-shadow(0 0 5px rgba(${glowColor},.6)) drop-shadow(0 0 16px rgba(${glowColor},.25))`
              : 'none',
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="tabular"
          style={{
            fontSize: 86,
            fontWeight: 800,
            letterSpacing: '-3.2px',
            lineHeight: 1,
            color: running ? tokens.t1 : tokens.t3,
          }}
        >
          {timeLabel}
        </div>
        <div
          className="overline"
          style={{ marginTop: 14, color: running ? tokens.t4 : tokens.ember }}
        >
          {subLabel}
        </div>
      </div>
    </div>
  );
}
