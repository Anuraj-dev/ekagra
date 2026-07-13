export type MutationResult<T> = {
  mutate: (input: T) => void;
  isPending: boolean;
  isError: boolean;
  reset: () => void;
};
