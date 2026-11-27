import type { DetourAttributionMatchFields, DetourMetaInstallReferrer } from "../attribution/types";

/**
 * A provider like the attribution package's, with every call recorded. With `metaInstallReferrer`
 * it reads Meta's on its own, as the package does with a Facebook App ID.
 */
export const fakeAttributionProvider = (
  matchFields: () => Promise<DetourAttributionMatchFields> = async () => ({ asa_token: "token" }),
  metaInstallReferrer?: () => Promise<DetourMetaInstallReferrer | null>,
) => ({
  didStart: jest.fn(),
  didLogConversion: jest.fn(),
  matchFields: jest.fn(matchFields),
  ...(metaInstallReferrer && { metaInstallReferrer: jest.fn(metaInstallReferrer) }),
});
