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
  | {
      phase: 'error';
      reason: UpdateErrorReason;
      update: AvailableUpdate | null;
      /** Underlying error message, surfaced in the UI so failures are diagnosable in the field. */
      detail?: string;
    };

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
    // Live 0.1.2 run showed the native path can fail on-device even though the
    // File constructs fine, so ANY native failure falls back to the legacy
    // base64 read — slow for a 31 MB APK, but it completes.
    const bytes = await new File(fileUri).bytes();
    if (bytes.byteLength > 0) return bytes;
  } catch {
    // fall through to the legacy route
  }
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBytes(base64);
}

/** Returns an ArrayBuffer covering exactly the view's bytes (digest input). */
export function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  const backing = bytes.buffer;
  if (!(backing instanceof ArrayBuffer)) {
    // SharedArrayBuffer-backed views can't be handed to Crypto.digest.
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer as ArrayBuffer;
  }
  if (bytes.byteOffset === 0 && bytes.byteLength === backing.byteLength) {
    return backing;
  }
  return backing.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

// SHA-256 round constants (FIPS 180-4).
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/**
 * Pure-JS SHA-256 (FIPS 180-4), the last-resort verifier when expo-crypto's
 * native digest throws. Slow for a 31 MB APK (seconds on Hermes) but it always
 * completes, and a slow verify beats an update pipeline that cannot verify.
 */
export function sha256HexJs(bytes: Uint8Array): string {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const len = bytes.length;
  const bitLenHi = Math.floor(len / 0x20000000);
  const bitLenLo = (len << 3) >>> 0;
  const paddedLen = (((len + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(paddedLen - 8, bitLenHi);
  dv.setUint32(paddedLen - 4, bitLenLo);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 =
        ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
        ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^
        (w[i - 15] >>> 3);
      const s1 =
        ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
        ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^
        (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as unknown as number[];
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }
  let hex = '';
  for (const word of h) hex += word.toString(16).padStart(8, '0');
  return hex;
}

async function sha256HexOfFile(fileUri: string): Promise<string> {
  const bytes = await readFileBytes(fileUri);
  try {
    const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, exactBuffer(bytes));
    return bytesToHex(new Uint8Array(digest));
  } catch {
    // Native digest can reject large buffers on some runtimes.
    return sha256HexJs(bytes);
  }
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
  const fail = (reason: UpdateErrorReason, cause?: unknown): UpdateState => {
    const detail = cause instanceof Error ? cause.message.slice(0, 120) : undefined;
    const state: UpdateState = { phase: 'error', reason, update, detail };
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
    } catch (err) {
      // Could not compute the hash at all (read/digest failure) — distinct
      // from a real mismatch so the UI doesn't claim the download is corrupt.
      return fail('verify-failed', err);
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
