/**
 * Minimal ANSI styling. Disabled when stdout is not a TTY or NO_COLOR is set, so
 * piped output stays clean. Kept dependency-free to keep the CLI fast to install.
 */
const enabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

function wrap(open: number, close: number): (text: string) => string {
  return (text) => (enabled ? `[${open}m${text}[${close}m` : text);
}

export const bold = wrap(1, 22);
export const dim = wrap(2, 22);
export const red = wrap(31, 39);
export const green = wrap(32, 39);
export const yellow = wrap(33, 39);
export const cyan = wrap(36, 39);
