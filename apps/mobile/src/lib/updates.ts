import type { AppRelease } from '@ekagra/core';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Direct-APK update pipeline (modeled on pomo's in-app updater ADR). The GitHub
 * repo is private, so phones cannot pull release assets from it; instead the
 * release CI publishes each APK (plus a .sha256) to the public Supabase Storage
 * bucket `app-releases` and records a row in `app_releases`. CI signs every
 * build with one stable debug keystore, which is what makes in-place updates
 * possible at all.
 *
 * Flow: check (silent-fail) -> download into the app cache -> verify the
 * SHA-256 recorded by CI -> hand the file to the Android installer via a
 * content:// URI. Every failure is contained: checking never throws, and an
 * install that cannot go through the intent route falls back to opening the
 * APK URL in the browser.
 */

const APP_RELEASE_COLUMNS = 'id, platform, version, apk_url, sha256, notes, created_at';

/** FLAG_GRANT_READ_URI_PERMISSION — lets the installer read our cached APK. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export type AvailableUpdate = {
  version: string;
  apkUrl: string;
  sha256: string | null;
  notes: string | null;
};

export type UpdateErrorReason =
  | 'offline'
  | 'missing-asset'
  | 'hash-mismatch'
  | 'verify-failed'
  | 'install-not-permitted';

/**
 * The pomo-style updater state machine. `idle` -> `checking` ->
 * (`up-to-date` | `update-available`) -> `downloading` -> `verifying` ->
 * `installing`, with `error` reachable from any active state.
 */
export type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'up-to-date' }
  | { phase: 'update-available'; update: AvailableUpdate }
  | { phase: 'downloading'; update: AvailableUpdate }
  | { phase: 'verifying'; update: AvailableUpdate }
  | { phase: 'installing'; update: AvailableUpdate }
  | { phase: 'error'; reason: UpdateErrorReason; update: AvailableUpdate | null };

/** The version of the running build (from app.config.ts via expo-constants). */
export function currentVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/**
 * Parses a dotted numeric version ("1.2.3", optional leading v). Returns null
 * for anything unparseable so callers can fail safe (treat as "no update").
 */
export function parseVersion(value: string): number[] | null {
  const trimmed = value.trim().replace(/^[vV]/, '');
  if (!/^\d+(\.\d+)*$/.test(trimmed)) return null;
  return trimmed.split('.').map((part) => Number.parseInt(part, 10));
}

/**
 * True only when `candidate` is a parseable version strictly newer than
 * `running`. An unparseable version on either side means "no update".
 */
export function isNewer(candidate: string, running: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(running);
  if (!a || !b) return false;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const na = a[i] ?? 0;
    const nb = b[i] ?? 0;
    if (na !== nb) return na > nb;
  }
  return false;
}

/**
 * Fetches the newest Android release and returns it only if it is strictly
 * newer than the running build. Resolves to null on no update, missing config,
 * or any error — never throws, never blocks the app.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  try {
    const { data, error } = await supabase
      .from('app_releases')
      .select(APP_RELEASE_COLUMNS)
      .eq('platform', 'android')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;

    const row = data as {
      version: string;
      apk_url: string;
      sha256: string | null;
      notes: string | null;
    };
    if (!row.version || !row.apk_url) return null;
    if (!isNewer(row.version, currentVersion())) return null;

    return {
      version: row.version,
      apkUrl: row.apk_url,
      sha256: row.sha256 ?? null,
      notes: row.notes ?? null,
    };
  } catch {
    return null;
  }
}

// Base64 sextet values indexed by char code; -1 marks chars to skip (padding,
// whitespace). A lookup table because release APKs are ~30 MB (~42 M chars):
// a per-char indexOf scan over that string can stall the JS thread for minutes.
const B64_LOOKUP = (() => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < alphabet.length; i++) table[alphabet.charCodeAt(i)] = i;
  return table;
})();

/** Decodes base64 to bytes without atob (not guaranteed on every RN runtime). */
export function base64ToBytes(base64: string): Uint8Array {
  const out = new Uint8Array(Math.floor((base64.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (let i = 0; i < base64.length; i++) {
    const value = B64_LOOKUP[base64.charCodeAt(i) & 0x7f] ?? -1;
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (buffer >> bits) & 0xff;
    }
  }
  return out.subarray(0, index);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

/**
 * Reads the file as raw bytes. Prefers the SDK 54 native `File.bytes()` path —
 * the legacy route (base64 string over the bridge, decoded in JS) allocates a
 * ~42 MB string plus two 31 MB buffers for a release APK and can abort
 * mid-verify on low-memory devices. Legacy read is kept as a fallback.
 */
async function readFileBytes(fileUri: string): Promise<Uint8Array> {
  try {
    const bytes = new File(fileUri).bytes();
    if (bytes instanceof Uint8Array && bytes.byteLength > 0) return bytes;
  } catch {
    // fall through to the legacy base64 route
  }
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBytes(base64);
}

/** Returns an ArrayBuffer covering exactly the view's bytes (digest input). */
export function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer as ArrayBuffer;
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function sha256HexOfFile(fileUri: string): Promise<string> {
  const bytes = await readFileBytes(fileUri);
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, exactBuffer(bytes));
  return bytesToHex(new Uint8Array(digest));
}

async function launchInstaller(fileUri: string): Promise<void> {
  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
      data: contentUri,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  } catch {
    // Some OEM builds only accept the generic viewer route for APKs.
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'application/vnd.android.package-archive',
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  }
}

/**
 * Downloads, verifies, and installs an available update, reporting each state
 * transition through `onState`. Any intent failure falls back to opening the
 * APK URL in the browser (Android's downloader + installer take over). Returns
 * the terminal state it reached.
 */
export async function downloadAndInstall(
  update: AvailableUpdate,
  onState: (state: UpdateState) => void,
): Promise<UpdateState> {
  const fail = (reason: UpdateErrorReason): UpdateState => {
    const state: UpdateState = { phase: 'error', reason, update };
    onState(state);
    return state;
  };

  if (Platform.OS !== 'android') {
    return fail('install-not-permitted');
  }

  const targetUri = `${FileSystem.cacheDirectory}updates/ekagra-${update.version}.apk`;

  onState({ phase: 'downloading', update });
  try {
    await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}updates`, {
      intermediates: true,
    });
    const result = await FileSystem.downloadAsync(update.apkUrl, targetUri);
    if (result.status !== 200) return fail('missing-asset');
  } catch {
    return fail('offline');
  }

  if (update.sha256) {
    onState({ phase: 'verifying', update });
    try {
      const actual = await sha256HexOfFile(targetUri);
      if (actual.toLowerCase() !== update.sha256.trim().toLowerCase()) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
        return fail('hash-mismatch');
      }
    } catch {
      // Could not compute the hash at all (read/digest failure) — distinct
      // from a real mismatch so the UI doesn't claim the download is corrupt.
      return fail('verify-failed');
    }
  }

  const installing: UpdateState = { phase: 'installing', update };
  onState(installing);
  try {
    await launchInstaller(targetUri);
    return installing;
  } catch {
    // Last resort: browser handoff. The public bucket URL downloads the APK
    // and the system installer takes over from the notification shade.
    try {
      await Linking.openURL(update.apkUrl);
      return installing;
    } catch {
      return fail('install-not-permitted');
    }
  }
}

// AppRelease is re-exported so screens can reference the canonical row shape.
export type { AppRelease };
