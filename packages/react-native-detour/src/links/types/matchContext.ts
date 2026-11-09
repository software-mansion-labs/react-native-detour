import type { RequestIdentity } from "../../identity/requestIdentity";

// getInstallReferrerAsync returns only the referrer string, so the click and install
// timestamps that the native Android SDK sends are missing here.
export type InstallReferrer = {
  raw: string;
  utm?: Partial<Record<"source" | "medium" | "campaign" | "content" | "term", string>>;
  gclid?: string;
};

/** Fields every match-link body carries next to its match variant. */
export type MatchContext = RequestIdentity & { install_referrer?: InstallReferrer };
