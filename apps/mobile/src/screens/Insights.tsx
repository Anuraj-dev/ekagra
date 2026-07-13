import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDailyFocusTrend } from '../data/hooks';
import { useTheme } from '../theme/ThemeProvider';
import { display, ui } from '../theme/typography';

type Theme = ReturnType<typeof useTheme>;
type TrendRow = ReturnType<typeof useDailyFocusTrend>['data'][number];

export function Insights() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const trend = useDailyFocusTrend();
  const summary = useMemo(() => summarize(trend.data), [trend.data]);

  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingHorizontal: 20,
          paddingBottom: 112 + insets.bottom,
        }}
      >
        <Text style={display(600, { color: t.ink, fontSize: 32, lineHeight: 38 })}>Insights</Text>
        <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 4 })}>
          The last 7 UTC days, plainly.
        </Text>

        {trend.isLoading ? (
          <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 28 })}>
            Loading this week’s focus…
          </Text>
        ) : trend.isError ? (
          <View
            style={{
              marginTop: 28,
              backgroundColor: t.dangerBg,
              borderWidth: 1,
              borderColor: t.dangerLine,
              borderRadius: t.radii.sm,
              padding: 12,
            }}
          >
            <Text style={ui(500, { color: t.dangerText, fontSize: 13 })}>
              Couldn’t load this week’s focus.
            </Text>
          </View>
        ) : summary.isEmpty ? (
          <View
            style={{
              marginTop: 28,
              backgroundColor: t.surfaceSunk,
              borderRadius: t.radii.card,
              padding: 20,
            }}
          >
            <Text style={display(600, { color: t.ink, fontSize: 19, lineHeight: 26 })}>
              No focus logged yet.
            </Text>
            <Text
              style={ui(400, {
                color: t.textSecondary,
                fontSize: 13,
                lineHeight: 19,
                marginTop: 8,
              })}
            >
              Start a focus session and this week will show up here.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12, marginTop: 28 }}>
            <HeadlineBlock summary={summary} t={t} />
            <TrendBlock rows={trend.data} summary={summary} t={t} />
            <BreakdownBlock summary={summary} t={t} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function HeadlineBlock({ summary, t }: { summary: Summary; t: Theme }) {
  return (
    <View
      accessible
      accessibilityLabel={`This week: ${summary.earnedBlocks} earned blocks and ${summary.honestMinutes} honest minutes`}
      style={{ backgroundColor: t.surfaceSunk, borderRadius: t.radii.card, padding: 20 }}
    >
      <Text style={ui(600, { color: t.textSecondary, fontSize: 11, letterSpacing: 1.1 })}>
        THIS WEEK
      </Text>
      <Text style={display(600, { color: t.ink, fontSize: 19, lineHeight: 26, marginTop: 10 })}>
        {headline(summary)}
      </Text>
      <Text style={ui(500, { color: t.textSecondary, fontSize: 13, marginTop: 14 })}>
        {summary.earnedBlocks} earned {summary.earnedBlocks === 1 ? 'block' : 'blocks'} ·{' '}
        {summary.honestMinutes} honest min
      </Text>
    </View>
  );
}

function TrendBlock({ rows, summary, t }: { rows: TrendRow[]; summary: Summary; t: Theme }) {
  const maxBlocks = Math.max(...rows.map((row) => row.earnedBlocks), 1);
  const today = utcDateKey(new Date());
  return (
    <View
      accessible
      accessibilityLabel={`Earned blocks over the last 7 days: ${summary.earnedBlocks} total`}
      style={{
        ...t.elevationNative.low,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.line,
        borderRadius: t.radii.card,
        padding: 18,
      }}
    >
      <Text style={ui(600, { color: t.textSecondary, fontSize: 11, letterSpacing: 1.1 })}>
        EARNED BLOCKS · 7 DAYS
      </Text>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-end', height: 104, gap: 8, marginTop: 18 }}
      >
        {rows.map((row) => {
          const height = row.earnedBlocks === 0 ? 4 : 8 + (row.earnedBlocks / maxBlocks) * 76;
          const isToday = row.focusDate === today;
          return (
            <View
              key={row.focusDate}
              style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' }}
            >
              <View
                style={{
                  width: '100%',
                  height,
                  minHeight: 4,
                  borderRadius: t.radii.pill,
                  backgroundColor: isToday ? t.accent : t.lineSoft,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {rows.map((row) => (
          <Text
            key={row.focusDate}
            style={ui(500, {
              flex: 1,
              color: row.focusDate === today ? t.ink : t.textSecondary,
              fontSize: 10,
              textAlign: 'center',
            })}
          >
            {weekday(row.focusDate)}
          </Text>
        ))}
      </View>
      <Text style={ui(400, { color: t.textSecondary, fontSize: 12, marginTop: 12 })}>
        Today is highlighted · bars show earned blocks
      </Text>
    </View>
  );
}

function BreakdownBlock({ summary, t }: { summary: Summary; t: Theme }) {
  const total = summary.completedSessions + summary.abandonedSessions;
  const completedRatio = total > 0 ? summary.completedSessions / total : 0;
  const abandonedRatio = total > 0 ? summary.abandonedSessions / total : 0;
  return (
    <View
      accessible
      accessibilityLabel={`Session outcomes: ${summary.completedSessions} completed and ${summary.abandonedSessions} abandoned`}
      style={{
        ...t.elevationNative.low,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.line,
        borderRadius: t.radii.card,
        padding: 18,
      }}
    >
      <Text style={ui(600, { color: t.textSecondary, fontSize: 11, letterSpacing: 1.1 })}>
        SESSION OUTCOMES · 7 DAYS
      </Text>
      {total === 0 ? (
        <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 16 })}>
          No sessions ended in this window.
        </Text>
      ) : (
        <View style={{ gap: 14, marginTop: 16 }}>
          <OutcomeRow
            label="Completed"
            count={summary.completedSessions}
            ratio={completedRatio}
            fill={t.ink}
            t={t}
          />
          <OutcomeRow
            label="Abandoned"
            count={summary.abandonedSessions}
            ratio={abandonedRatio}
            fill={t.lineStrong}
            t={t}
          />
        </View>
      )}
    </View>
  );
}

function OutcomeRow({
  label,
  count,
  ratio,
  fill,
  t,
}: {
  label: string;
  count: number;
  ratio: number;
  fill: string;
  t: Theme;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={ui(500, { color: t.ink, flex: 1, fontSize: 14 })}>{label}</Text>
        <Text style={ui(600, { color: t.textSecondary, fontSize: 13 })}>{count}</Text>
      </View>
      <View
        style={{
          height: 7,
          borderRadius: t.radii.pill,
          backgroundColor: t.lineSoft,
          overflow: 'hidden',
          marginTop: 7,
        }}
      >
        <View
          style={{
            width: `${Math.round(ratio * 100)}%`,
            height: '100%',
            borderRadius: t.radii.pill,
            backgroundColor: fill,
          }}
        />
      </View>
    </View>
  );
}

type Summary = {
  earnedBlocks: number;
  honestMinutes: number;
  completedSessions: number;
  abandonedSessions: number;
  isEmpty: boolean;
};

function summarize(rows: TrendRow[]): Summary {
  const summary = rows.reduce(
    (result, row) => ({
      earnedBlocks: result.earnedBlocks + row.earnedBlocks,
      honestMinutes: result.honestMinutes + row.honestMinutes,
      completedSessions: result.completedSessions + row.completedSessions,
      abandonedSessions: result.abandonedSessions + row.abandonedSessions,
    }),
    { earnedBlocks: 0, honestMinutes: 0, completedSessions: 0, abandonedSessions: 0 },
  );
  return { ...summary, isEmpty: Object.values(summary).every((value) => value === 0) };
}

function headline(summary: Summary): string {
  if (summary.honestMinutes === 0) {
    return `${summary.earnedBlocks} earned ${summary.earnedBlocks === 1 ? 'block' : 'blocks'} this week.`;
  }
  return `You focused ${formatHours(summary.honestMinutes)} this week.`;
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function weekday(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
    .format(date)
    .slice(0, 2);
}
