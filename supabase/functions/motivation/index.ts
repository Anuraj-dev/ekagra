import { json, method } from '../_shared/http.ts';
import { databaseApiError, handle, requireUser } from '../_shared/supabase.ts';

Deno.serve((request) =>
  handle(request, async () => {
    method(request, ['GET']);
    const { client } = await requireUser(request);
    const [rates, status] = await Promise.all([
      client
        .from('rolling_rates')
        .select('window_days,window_start,closed_days,met_days,earned_blocks,completion_rate'),
      client
        .from('motivation_status')
        .select('streak_days,never_miss_twice,days_silent,welcome_back')
        .single(),
    ]);
    if (rates.error) throw databaseApiError(rates.error, 'Could not load motivation rates.');
    if (status.error) throw databaseApiError(status.error, 'Could not load motivation status.');
    return json({
      rates: (rates.data ?? []).map((row) => ({
        windowDays: row.window_days,
        windowStart: row.window_start,
        closedDays: row.closed_days,
        metDays: row.met_days,
        earnedBlocks: row.earned_blocks,
        completionRate: row.completion_rate,
      })),
      streakDays: status.data.streak_days,
      neverMissTwice: status.data.never_miss_twice,
      daysSilent: status.data.days_silent,
      welcomeBack: status.data.welcome_back,
    });
  }),
);
