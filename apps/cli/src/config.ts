import { homedir } from 'node:os';
import { join } from 'node:path';

/** Resolved connection settings the CLI needs to reach Supabase. */
export type CliConfig = {
  supabaseUrl: string;
  anonKey: string;
};

/** Directory that holds the CLI's persisted session and optional config file. */
export function configDir(): string {
  const base = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), '.config');
  return join(base, 'ekagra');
}

export function sessionPath(): string {
  return join(configDir(), 'session.json');
}

export function configPath(): string {
  return join(configDir(), 'config.json');
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

async function readFileConfig(): Promise<Partial<CliConfig>> {
  try {
    const file = Bun.file(configPath());
    if (!(await file.exists())) return {};
    const raw = (await file.json()) as Record<string, unknown>;
    return {
      supabaseUrl: typeof raw.supabaseUrl === 'string' ? raw.supabaseUrl : undefined,
      anonKey: typeof raw.anonKey === 'string' ? raw.anonKey : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Resolves the Supabase URL + anon key from (in order) environment variables and
 * then the on-disk config file. Mirrors the web/mobile clients' two required values.
 * Throws a friendly error naming the fix when either is missing.
 */
export async function loadConfig(): Promise<CliConfig> {
  const fileConfig = await readFileConfig();
  const supabaseUrl = firstDefined(
    process.env.EKAGRA_SUPABASE_URL,
    process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_URL,
    fileConfig.supabaseUrl,
  );
  const anonKey = firstDefined(
    process.env.EKAGRA_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    fileConfig.anonKey,
  );

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      [
        'Supabase is not configured.',
        'Set EKAGRA_SUPABASE_URL and EKAGRA_SUPABASE_ANON_KEY in your environment,',
        `or write them to ${configPath()} as {"supabaseUrl":"...","anonKey":"..."}.`,
      ].join('\n'),
    );
  }

  return { supabaseUrl: supabaseUrl.replace(/\/$/, ''), anonKey };
}
