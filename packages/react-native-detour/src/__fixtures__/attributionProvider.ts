import type { DetourAttributionMatchFields } from "../attribution/types";

/** A provider like the attribution package's, with every call recorded. */
export const fakeAttributionProvider = (
  matchFields: () => Promise<DetourAttributionMatchFields> = async () => ({ asa_token: "token" }),
) => ({
  didStart: jest.fn(),
  didLogConversion: jest.fn(),
  matchFields: jest.fn(matchFields),
});
