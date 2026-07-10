#!/usr/bin/env bun

import { ApiError, createHttpClient } from './api/client';
import { AuthError } from './auth/gotrue';
import { createTokenProvider } from './auth/session';
import { login, logout, whoami } from './commands/auth';
import { capture } from './commands/capture';
import type { CommandDeps } from './commands/context';
import { plan } from './commands/plan';
import { abandon, done, pause, resume, start } from './commands/session';
import { today } from './commands/today';
import { week } from './commands/week';
import { loadConfig } from './config';
import { type IO, terminalIO } from './io';
import { bold, dim, red, yellow } from './style';

const USAGE = `${bold('ekagra')} — focus, from the terminal.

  ${bold('capture')} "..."     drop a task into the inbox, zero friction
  ${bold('plan')}              morning commit: triage inbox, pick 1–3 tasks
  ${bold('start')} [n|id]      start a focus block on a planned task
  ${bold('pause')}             pause the active block
  ${bold('resume')}            resume a paused block (live countdown)
  ${bold('done')}              complete the block (must reach zero — server enforced)
  ${bold('abandon')} [tag]     abandon with a reason (distraction · interruption · done-early · energy)
  ${bold('today')}             today's plan, active session, blocks, 7-day rate
  ${bold('week')}              weekly review + Crew standings
  ${bold('login')} [email]     sign in (session saved under ~/.config/ekagra/)
  ${bold('logout')}            sign out
  ${bold('whoami')}            show the signed-in account

When stdout is not a terminal (piped/scripted), ${bold('start')} and ${bold('resume')} print one
status line and exit instead of running the live countdown; the session keeps
running on the server.
`;

function printError(io: IO, error: unknown): void {
  if (error instanceof ApiError) {
    if (error.code === 'conflict') {
      io.error(`${yellow('blocked:')} ${error.message}`);
    } else if (error.code === 'unauthorized') {
      io.error(`${red('auth:')} ${error.message} ${dim('Try `ekagra login`.')}`);
    } else {
      io.error(`${red('error:')} ${error.message}`);
    }
    return;
  }
  if (error instanceof AuthError) {
    io.error(`${red('auth:')} ${error.message}`);
    return;
  }
  io.error(`${red('error:')} ${error instanceof Error ? error.message : String(error)}`);
}

export async function run(argv: string[], io: IO): Promise<number> {
  const [command, ...args] = argv;
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    io.line(USAGE);
    return command ? 0 : 1;
  }

  try {
    // logout/whoami only touch the local session file — keep them working even
    // when Supabase env/config is absent.
    if (command === 'logout') return await logout(io);
    if (command === 'whoami') return await whoami(io);

    const config = await loadConfig();

    if (command === 'login') return await login(config, io, args);

    const client = createHttpClient(config, createTokenProvider(config));
    const deps: CommandDeps = { client, io };

    switch (command) {
      case 'capture':
        return await capture(deps, args);
      case 'plan':
        return await plan(deps);
      case 'start':
        return await start(deps, args);
      case 'pause':
        return await pause(deps);
      case 'resume':
        return await resume(deps);
      case 'done':
        return await done(deps);
      case 'abandon':
        return await abandon(deps, args);
      case 'today':
        return await today(deps);
      case 'week':
        return await week(deps);
      default:
        io.error(`Unknown command: ${command}`);
        io.line(USAGE);
        return 1;
    }
  } catch (error) {
    printError(io, error);
    return 1;
  }
}

if (import.meta.main) {
  const io = terminalIO();
  process.exitCode = await run(process.argv.slice(2), io);
}
