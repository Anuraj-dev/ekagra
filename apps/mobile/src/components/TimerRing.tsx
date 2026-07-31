import { color, ring } from '@ekagra/tokens';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { overline, tabular, text } from '../theme/typography';

export type RingPhase = 'work' | 'break';
export type RingStatus = 'running' | 'paused';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The timer ring (DESIGN-SPEC §6/§8). Two circles + a soft bloom underlay. Running work
 * = luminous ember, arc breathing opacity .94→1. Paused = desaturated static stroke with
 * a dashed remaining arc. Break = green. The native glow degrades to a low-opacity wide
 * arc (no cross-platform blur filter), per §11.
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
  const running = status === 'running';
  const strokeColor = running ? (phase === 'break' ? color.green : color.ember) : color.emberDim;

  // Animated progress offset — the dash retreats as time elapses (1s linear per tick).
  const offset = useSharedValue(c * (1 - clamped));
  useEffect(() => {
    offset.value = withTiming(c * (1 - clamped), {
      duration: 1000,
      reduceMotion: ReduceMotion.System,
    });
  }, [clamped, offset]);

  // Idle breathing opacity while running (the only idle motion; off when paused/reduced).
  const breath = useSharedValue(1);
  useEffect(() => {
    if (running) {
      breath.value = 0.94;
      breath.value = withRepeat(
        withTiming(1, { duration: 2000, reduceMotion: ReduceMotion.System }),
        -1,
        true,
      );
    } else {
      breath.value = 1;
    }
  }, [running, breath]);

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
    opacity: breath.value,
  }));

  // Glow holds a fixed opacity while running — decoupled from the arc's breath
  // cycle so only one layer moves (DESIGN-SPEC §7: nothing pulses in lockstep).
  const glowProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
    opacity: running ? 0.2 : 0,
  }));

  return (
    <View style={{ width: ring.size, height: ring.size, marginTop: 38 }}>
      <Svg
        width={ring.size}
        height={ring.size}
        viewBox={`0 0 ${ring.size} ${ring.size}`}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        {/* Track: hairline orbit; dashed when paused so remaining arc reads as spent. */}
        <Circle
          cx={ring.size / 2}
          cy={ring.size / 2}
          r={ring.radius}
          fill="none"
          stroke={color.trackHairline}
          strokeWidth={2}
          strokeDasharray={running ? undefined : '3 8'}
        />
        {/* Bloom underlay: wide low-opacity arc approximating the web self-glow. */}
        <AnimatedCircle
          cx={ring.size / 2}
          cy={ring.size / 2}
          r={ring.radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={18}
          strokeLinecap="round"
          strokeDasharray={c}
          animatedProps={glowProps}
        />
        {/* Progress arc. */}
        <AnimatedCircle
          cx={ring.size / 2}
          cy={ring.size / 2}
          r={ring.radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          animatedProps={progressProps}
        />
      </Svg>
      <View
        style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text
          style={[
            tabular,
            text(800, {
              fontSize: 86,
              letterSpacing: -3.2,
              lineHeight: 90,
              color: running ? color.t1 : color.t3,
            }),
          ]}
        >
          {timeLabel}
        </Text>
        <Text style={[overline, { marginTop: 14, color: running ? color.t4 : color.ember }]}>
          {subLabel}
        </Text>
      </View>
    </View>
  );
}
