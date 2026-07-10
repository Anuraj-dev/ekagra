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
  /** True when stdout is an interactive TTY (gates live countdown rendering). */
  isTty: boolean;
};

/** The real terminal I/O backed by process streams and readline. */
export function terminalIO(): IO {
  return {
    write: (text) => process.stdout.write(text),
    line: (text = '') => process.stdout.write(`${text}\n`),
    error: (text) => process.stderr.write(`${text}\n`),
    isTty: Boolean(process.stdout.isTTY),
    ask: (question) =>
      new Promise((resolve) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      }),
  };
}
