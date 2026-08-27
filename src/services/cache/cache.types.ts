export type TCacheKey = string;

export type TCacheRecord<T = unknown> = {
  key: TCacheKey;
  value: T;
  /** Epoch ms after which the record is stale. Absent means "never expires". */
  expiry?: number | undefined;
};
