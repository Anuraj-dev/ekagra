export type MutationResult<T> = {
  mutate: (input: T) => void;
  isPending: boolean;
  isError: boolean;
  reset: () => void;
};

export type RetryableMutationResult<T> = MutationResult<T> & {
  /** Re-send the same logical operation with the same client operation id. */
  retry: () => void;
};
