/** A promise and the call that resolves it. Not `Promise.withResolvers`: Hermes may not have it. */
export const createSignal = <T = void>() => {
  let resolve!: (value: T) => void;
  const done = new Promise<T>((res) => {
    resolve = res;
  });
  return { done, resolve };
};
