import { describe, expect, it, mock } from 'bun:test';
import { createHash, randomBytes } from 'node:crypto';

// updates.ts pulls in Expo native modules and the supabase client at module
// scope; back them with inert mocks so the pure helpers can be tested.
mock.module('expo-constants', () => ({ default: { expoConfig: { version: '0.1.0' } } }));
mock.module('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digest: async (_alg: string, data: ArrayBuffer) =>
    createHash('sha256').update(new Uint8Array(data)).digest().buffer,
}));
mock.module('expo-file-system', () => ({
  File: class {
    constructor(_uri: string) {}
    bytes(): Uint8Array {
      throw new Error('native File API not available in tests');
    }
  },
}));
mock.module('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: async () => '',
  deleteAsync: async () => {},
  makeDirectoryAsync: async () => {},
  downloadAsync: async () => ({ status: 200 }),
  getContentUriAsync: async (uri: string) => uri,
}));
mock.module('expo-intent-launcher', () => ({ startActivityAsync: async () => {} }));
mock.module('react-native', () => ({
  Platform: { OS: 'android' },
  Linking: { openURL: async () => {} },
}));
mock.module('./supabase', () => ({ supabase: {} }));

const { base64ToBytes, exactBuffer, isNewer, parseVersion } = await import('./updates');

describe('base64ToBytes', () => {
  // Every length mod 3 (0/1/2 padding chars) must round-trip byte-for-byte.
  it('round-trips all padding remainders', () => {
    for (const len of [0, 1, 2, 3, 30, 31, 32, 100_000, 100_001, 100_002]) {
      const data = randomBytes(len);
      const decoded = base64ToBytes(data.toString('base64'));
      expect(Buffer.from(decoded).equals(data)).toBe(true);
    }
  });

  it('ignores whitespace and padding characters', () => {
    const data = randomBytes(1000);
    const wrapped = data.toString('base64').replace(/(.{76})/g, '$1\r\n');
    expect(Buffer.from(base64ToBytes(wrapped)).equals(data)).toBe(true);
  });
});

describe('exactBuffer', () => {
  // The updater digests exactBuffer(view); a stray over-allocated tail here is
  // exactly the failure mode that would brick every in-app update.
  it('covers exactly the view bytes for a subarray view', () => {
    const backing = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const view = backing.subarray(2, 5);
    const buf = new Uint8Array(exactBuffer(view));
    expect(Array.from(buf)).toEqual([3, 4, 5]);
  });

  it('reuses the backing buffer for a full view', () => {
    const bytes = new Uint8Array([9, 9, 9]);
    expect(exactBuffer(bytes)).toBe(bytes.buffer as ArrayBuffer);
  });

  it('hash of exactBuffer matches hash of source data after base64 round-trip', () => {
    for (const len of [31_600_631 % 4096, 3070, 3071, 3072]) {
      const data = randomBytes(len);
      const decoded = base64ToBytes(data.toString('base64'));
      const hashed = createHash('sha256')
        .update(new Uint8Array(exactBuffer(decoded)))
        .digest('hex');
      const expected = createHash('sha256').update(data).digest('hex');
      expect(hashed).toBe(expected);
    }
  });
});

describe('parseVersion / isNewer', () => {
  it('parses dotted versions with optional v prefix', () => {
    expect(parseVersion('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseVersion(' 0.1.1 ')).toEqual([0, 1, 1]);
    expect(parseVersion('1.2.beta')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });

  it('compares strictly newer versions only', () => {
    expect(isNewer('0.1.1', '0.1.0')).toBe(true);
    expect(isNewer('0.1.0', '0.1.0')).toBe(false);
    expect(isNewer('0.1.0', '0.1.1')).toBe(false);
    expect(isNewer('0.2', '0.1.9')).toBe(true);
    expect(isNewer('1.0.0', '0.9.9')).toBe(true);
    expect(isNewer('garbage', '0.1.0')).toBe(false);
  });
});
