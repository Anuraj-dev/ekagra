import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { $ } from 'bun';

describe('ESP8266 portable host logic', () => {
  test('parser, display, countdown and buzzer harness', async () => {
    if (!existsSync('/usr/bin/g++')) {
      console.warn('Skipping firmware host harness: g++ is not installed.');
      return;
    }
    const binary = '/tmp/ekagra-host-tests';
    await $`g++ -std=c++17 -Wall -Wextra -Werror -Ifirmware/src firmware/src/ekagra_logic.cpp firmware/test/host/main.cpp -o ${binary}`;
    // The harness slices fixtures by exact substrings, so feed it a minified copy
    // regardless of how the checked-in JSON is formatted.
    const fixtures = JSON.parse(await readFile('firmware/test/fixtures.json', 'utf8'));
    const minified = '/tmp/ekagra-host-fixtures.json';
    await writeFile(minified, JSON.stringify(fixtures));
    await $`${binary} ${minified}`;
    expect(true).toBe(true);
  });
});
