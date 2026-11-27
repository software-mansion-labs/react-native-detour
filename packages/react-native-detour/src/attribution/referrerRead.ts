/** A referrer read: "failed" may answer on a later try, "none" never will. */
export type ReferrerRead<T> = { found: T } | "none" | "failed";

export const isFound = <T>(read: ReferrerRead<T> | null): read is { found: T } =>
  typeof read === "object" && read !== null;

export const mapFound = <T, U>(read: ReferrerRead<T>, map: (found: T) => U): ReferrerRead<U> =>
  isFound(read) ? { found: map(read.found) } : read;
