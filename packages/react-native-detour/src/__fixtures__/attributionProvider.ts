/** A provider like the attribution package's, with every call recorded. */
export const fakeAttributionProvider = (
  attributionToken: () => Promise<string | null> = async () => "token",
) => ({
  didStart: jest.fn(),
  didLogConversion: jest.fn(),
  attributionToken: jest.fn(attributionToken),
  metaInstallReferrer: jest.fn(async () => null),
});
