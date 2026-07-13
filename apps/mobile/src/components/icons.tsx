/** Line icons transcribed from the web app, reimplemented with react-native-svg. */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color } from '../theme/tokens';

export function TodayIcon({ tint = color.t4 }: { tint?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={6.5} fill="none" stroke={tint} strokeWidth={1.8} />
      <Circle cx={10} cy={10} r={2.4} fill={tint} />
    </Svg>
  );
}

export function GoalsIcon({ tint = color.t4 }: { tint?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d="M5 17 L5 3 L15 6.5 L5 10"
        fill="none"
        stroke={tint}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function InsightsIcon({ tint = color.t4 }: { tint?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Rect x={3} y={10} width={3.4} height={7} rx={1.4} fill={tint} />
      <Rect x={8.3} y={5} width={3.4} height={12} rx={1.4} fill={tint} />
      <Rect x={13.6} y={8} width={3.4} height={9} rx={1.4} fill={tint} />
    </Svg>
  );
}

export function CrewIcon({ tint = color.t4 }: { tint?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx={7} cy={8} r={3.2} fill="none" stroke={tint} strokeWidth={1.8} />
      <Circle cx={14} cy={9.5} r={2.4} fill="none" stroke={tint} strokeWidth={1.8} />
      <Path
        d="M2.5 17 C3.5 13.8 10.5 13.8 11.5 17"
        fill="none"
        stroke={tint}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TasksIcon({ tint = color.t4 }: { tint?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Rect
        x={3}
        y={3}
        width={14}
        height={14}
        rx={3.5}
        fill="none"
        stroke={tint}
        strokeWidth={1.8}
      />
      <Path
        d="M6.5 10 L9 12.5 L13.5 7.5"
        fill="none"
        stroke={tint}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SettingsIcon({ tint = color.t3 }: { tint?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path d="M3 6 L17 6" stroke={tint} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M3 14 L17 14" stroke={tint} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12.5} cy={6} r={2.2} fill={color.bg} stroke={tint} strokeWidth={1.8} />
      <Circle cx={7.5} cy={14} r={2.2} fill={color.bg} stroke={tint} strokeWidth={1.8} />
    </Svg>
  );
}

export function ChevronLeftIcon({ tint = color.t3 }: { tint?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Path
        d="M9.5 3.5 L5 8 L9.5 12.5"
        fill="none"
        stroke={tint}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlayIcon({ size = 16, fill = color.bg }: { size?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M4 2.5 L13 8 L4 13.5 Z" fill={fill} />
    </Svg>
  );
}

export function PauseIcon({ size = 22, tint = color.t1 }: { size?: number; tint?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Path
        d="M7 4 L7 18 M15 4 L15 18"
        fill="none"
        stroke={tint}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ResumeIcon({ fill = color.bg }: { fill?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M7 4 L19 12 L7 20 Z" fill={fill} />
    </Svg>
  );
}

export function CheckIcon({ tint = color.green, size = 18 }: { tint?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        d="M3 9.5 L7.5 14 L15 4.5"
        fill="none"
        stroke={tint}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
