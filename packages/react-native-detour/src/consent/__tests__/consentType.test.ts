import type { DetourConsent } from "../../index";

// Clients type their consent against this public type. A map of purpose IDs takes new purposes
// without a new SDK version; named booleans in its place would break every client's build.
type IsExactly<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const purposesIsAMap: IsExactly<DetourConsent["purposes"], Record<string, boolean>> = true;

it("keeps purposes a map of purpose IDs to booleans", () => {
  const consent: DetourConsent = {
    purposes: { analytics: true, attribution: false, a_purpose_added_later: true },
  };
  // @ts-expect-error a purpose is granted or not, nothing else
  const notBoolean: DetourConsent = { purposes: { analytics: "yes" } };

  void notBoolean;

  expect(purposesIsAMap).toBe(true);
  expect(Object.keys(consent.purposes)).toHaveLength(3);
});
