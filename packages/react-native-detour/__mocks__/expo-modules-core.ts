// The real package is ESM that jest does not transform.
export const requireOptionalNativeModule = jest.fn(() => ({}));
