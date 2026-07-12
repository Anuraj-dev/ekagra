/** Line icons transcribed from the design reference. `currentColor` drives theming. */

export function TodayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="10" cy="10" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function GoalsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5 17 L5 3 L15 6.5 L5 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InsightsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="3" y="10" width="3.4" height="7" rx="1.4" fill="currentColor" />
      <rect x="8.3" y="5" width="3.4" height="12" rx="1.4" fill="currentColor" />
      <rect x="13.6" y="8" width="3.4" height="9" rx="1.4" fill="currentColor" />
    </svg>
  );
}

export function CrewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="7" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="14" cy="9.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M2.5 17 C3.5 13.8 10.5 13.8 11.5 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TasksIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="14"
        height="14"
        rx="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6.5 10 L9 12.5 L13.5 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 6 L17 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 14 L17 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12.5" cy="6" r="2.2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="7.5" cy="14" r="2.2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M9.5 3.5 L5 8 L9.5 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayIcon({ size = 16, fill = '#0E0F12' }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 2.5 L13 8 L4 13.5 Z" fill={fill} />
    </svg>
  );
}

export function PauseIcon({ color = '#ECEDEF' }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="4" y="3" width="5" height="16" rx="2" fill={color} />
      <rect x="13" y="3" width="5" height="16" rx="2" fill={color} />
    </svg>
  );
}

export function ResumeIcon({ fill = '#0E0F12' }: { fill?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4 L19 12 L7 20 Z" fill={fill} />
    </svg>
  );
}

export function CheckIcon({ color = '#5BBF8A', size = 18 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M3 9.5 L7.5 14 L15 4.5"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
