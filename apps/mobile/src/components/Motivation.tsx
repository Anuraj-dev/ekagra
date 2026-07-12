import type { MotivationRates, MotivationStatus } from '@ekagra/core';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { color } from '../theme/tokens';
import { overline, tabular, text } from '../theme/typography';

export function RateRings({ rates }: { rates: MotivationRates[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {[7, 30].map((days) => {
        const rate = rates.find((r) => r.windowDays === days);
        return rate ? <RateRing key={days} rate={rate} /> : null;
      })}
    </View>
  );
}
function RateRing({ rate }: { rate: MotivationRates }) {
  const value = Math.max(0, Math.min(1, rate.completionRate));
  const radius = 24;
  const c = 2 * Math.PI * radius;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 58, height: 58 }}>
        <Svg width={58} height={58} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={29} cy={29} r={radius} fill="none" stroke={color.lineSoft} strokeWidth={5} />
          <Circle
            cx={29}
            cy={29}
            r={radius}
            fill="none"
            stroke={color.ember}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - value)}
          />
        </Svg>
        <Text
          style={[
            tabular,
            text(800, {
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              textAlign: 'center',
              lineHeight: 58,
              fontSize: 12,
              color: color.t1,
            }),
          ]}
        >
          {Math.round(value * 100)}%
        </Text>
      </View>
      <View>
        <Text style={[overline, { color: color.t4 }]}>{rate.windowDays} days</Text>
        <Text style={text(600, { fontSize: 11, color: color.t3, marginTop: 3 })}>
          {rate.metDays} of {rate.closedDays || 0} days met
        </Text>
      </View>
    </View>
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
    ? ['Welcome back.', 'The next useful step is simply to plan today.']
    : status.daysSilent !== null && status.daysSilent >= 2
      ? [
          'A small restart counts.',
          `It has been ${status.daysSilent} quiet days. One block is enough to return.`,
        ]
      : status.neverMissTwice
        ? ['Keep the thread.', 'Yesterday was a miss. Today is a clean page.']
        : null;
  if (!nudge) return null;
  return (
    <View
      style={{
        marginTop: 16,
        marginHorizontal: 16,
        padding: 14,
        borderRadius: 16,
        backgroundColor: status.welcomeBack ? color.emberWash : color.surface2,
        borderWidth: 1,
        borderColor: status.welcomeBack ? color.emberLine : color.lineSoft,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={text(800, { fontSize: 14, color: color.t1 })}>{nudge[0]}</Text>
        <Text style={text(600, { fontSize: 12, lineHeight: 18, color: color.t3, marginTop: 3 })}>
          {nudge[1]}
        </Text>
      </View>
      {status.welcomeBack && (
        <Pressable onPress={onPlan}>
          <Text style={text(800, { fontSize: 12, color: color.ember })}>Plan today</Text>
        </Pressable>
      )}
    </View>
  );
}
