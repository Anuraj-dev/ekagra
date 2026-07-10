import type { ApiClient } from '../api/client';
import type { IO } from '../io';

/** Everything a command needs, injected so commands stay unit-testable. */
export type CommandDeps = {
  client: ApiClient;
  io: IO;
};
