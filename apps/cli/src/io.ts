import { createInterface } from 'node:readline';

/**
 * Injectable terminal I/O seam. Commands depend on this interface rather than the
 * console directly, so tests drive them with a scripted fake (see tests) and assert
 * on captured output.
 */
export type IO = {
  /** Write without a trailing newline (used for in-place countdown re-renders). */
  write(text: string): void;
  /** Write a full line. */
  line(text?: string): void;
  /** Write to the error stream. */
  error(text: string): void;
  /** Prompt for a line of input, returning the trimmed answer. */
  ask(question: string): Promise<string>;
  /** Prompt for a secret: input is masked (never echoed) on a TTY. */
  askSecret(question: string): Promise<string>;
  /** True when stdout is an interactive TTY (gates live countdown rendering). */
  isTty: boolean;
};

function askLine(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Reads a line from a raw-mode TTY without echoing it, printing `*` per keystroke.
 * Handles Enter, backspace, and Ctrl-C (restores the terminal, then exits 130).
 */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';
    const finish = (aborted: boolean) => {
      stdin.setRawMode?.(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
      if (aborted) process.exit(130);
      resolve(value.trim());
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\u0003') return finish(true); // Ctrl-C
        if (char === '\r' || char === '\n') return finish(false);
        if (char === '\u007f' || char === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        value += char;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

/** The real terminal I/O backed by process streams and readline. */
export function terminalIO(): IO {
  return {
    write: (text) => process.stdout.write(text),
    line: (text = '') => process.stdout.write(`${text}\n`),
    error: (text) => process.stderr.write(`${text}\n`),
    isTty: Boolean(process.stdout.isTTY),
    ask: askLine,
    // Piped stdin has no raw mode; fall back to a plain line read so scripted
    // logins (e.g. CI) still work.
    askSecret: (question) => (process.stdin.isTTY ? askHidden(question) : askLine(question)),
  };
}
