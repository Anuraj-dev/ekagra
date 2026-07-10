import { describe, expect, it } from 'bun:test';
import { fakeClient, fakeIO, session } from '../test-helpers';
import { runLiveTimer } from './live';

const serverNow = '2026-07-10T06:00:00.000Z';
const serverNowMs = Date.parse(serverNow);

describe('runLiveTimer', () => {
  it('ticks down locally and auto-completes when the timer hits zero', async () => {
    let clock = serverNowMs;
    const client = fakeClient({
      commandResults: [
        {
          session: session({ status: 'completed', earnedBlock: true, honestMinutes: 25 }),
          serverNow,
        },
      ],
    });
    const io = fakeIO();
    const ended = await runLiveTimer(
      client,
      io,
      // 3 seconds left on a 25-minute block.
      { session: session({ elapsedSeconds: 1497 }), serverNow },
      {
        tickMs: 1000,
        pollMs: 60_000,
        now: () => clock,
        wait: (ms) => {
          clock += ms;
          return Promise.resolve();
        },
      },
    );
    expect(ended.status).toBe('completed');
    const text = io.text();
    expect(text).toContain('00:03');
    expect(text).toContain('00:01');
    expect(client.calls.at(-1)).toEqual({
      method: 'sessionCommand',
      args: [{ action: 'complete' }],
    });
  });

  it('reconciles with the server and stops when the session ended elsewhere', async () => {
    let clock = serverNowMs;
    const client = fakeClient({
      current: { session: null, serverNow: '2026-07-10T06:00:02.000Z' },
    });
    const io = fakeIO();
    const ended = await runLiveTimer(
      client,
      io,
      { session: session({ elapsedSeconds: 60 }), serverNow },
      {
        tickMs: 1000,
        pollMs: 2000,
        now: () => clock,
        wait: (ms) => {
          clock += ms;
          return Promise.resolve();
        },
      },
    );
    // Returned the last known session instead of spinning forever.
    expect(ended.status).toBe('running');
    expect(io.text()).toContain('ended elsewhere');
    expect(client.calls.some((c) => c.method === 'currentSession')).toBe(true);
  });
});
