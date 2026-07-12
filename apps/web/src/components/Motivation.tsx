import type { MotivationRates, MotivationStatus } from '@ekagra/core';
import { color as tokens } from '../theme/tokens';

export function RateRings({ rates }: { rates: MotivationRates[] }) {
  const ordered = [7, 30]
    .map((days) => rates.find((rate) => rate.windowDays === days))
    .filter(Boolean) as MotivationRates[];
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {ordered.map((rate) => (
        <RateRing key={rate.windowDays} rate={rate} />
      ))}
    </div>
  );
}

function RateRing({ rate }: { rate: MotivationRates }) {
  const value = Math.max(0, Math.min(1, rate.completionRate));
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 58, height: 58 }}>
        <svg
          width="58"
          height="58"
          viewBox="0 0 58 58"
          style={{ transform: 'rotate(-90deg)' }}
          aria-label={`${rate.windowDays}-day completion rate`}
        >
          <circle cx="29" cy="29" r={radius} fill="none" stroke={tokens.lineSoft} strokeWidth="5" />
          <circle
            cx="29"
            cy="29"
            r={radius}
            fill="none"
            stroke={tokens.ember}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - value)}
          />
        </svg>
        <span
          className="tabular"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {Math.round(value * 100)}%
        </span>
      </div>
      <div>
        <div className="overline" style={{ color: tokens.t4 }}>
          {rate.windowDays} days
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.t3, marginTop: 3 }}>
          {rate.metDays} of {rate.closedDays || 0} days met
        </div>
      </div>
    </div>
  );
}

export function MotivationPanel({
  status,
  onPlan,
}: {
  status: MotivationStatus;
  onPlan: () => void;
}) {
  const nudge = status.welcomeBack
    ? { title: 'Welcome back.', body: 'The next useful step is simply to plan today.' }
    : status.daysSilent !== null && status.daysSilent >= 2
      ? {
          title: 'A small restart counts.',
          body: `It has been ${status.daysSilent} quiet days. One block is enough to return.`,
        }
      : status.neverMissTwice
        ? { title: 'Keep the thread.', body: 'Yesterday was a miss. Today is a clean page.' }
        : null;
  if (!nudge) return null;
  return (
    <div
      style={{
        margin: '16px 16px 0',
        padding: '14px 16px',
        borderRadius: 16,
        background: status.welcomeBack ? tokens.emberWash : tokens.surface2,
        border: `1px solid ${status.welcomeBack ? tokens.emberLine : tokens.lineSoft}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: tokens.t1 }}>{nudge.title}</div>
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.45,
            fontWeight: 600,
            color: tokens.t3,
            marginTop: 3,
          }}
        >
          {nudge.body}
        </div>
      </div>
      {status.welcomeBack && (
        <button
          type="button"
          onClick={onPlan}
          style={{ color: tokens.ember, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}
        >
          Plan today
        </button>
      )}
    </div>
  );
}
