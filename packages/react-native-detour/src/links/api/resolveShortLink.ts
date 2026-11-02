import { detourFetch } from "../../net/client";
import type { RequiredConfig } from "../types";

export type ResolveShortLinkResponse = {
  link: string;
  route: string;
  parameters: string;
};

export const resolveShortLink = async ({
  apiKey: API_KEY,
  appID,
  url,
  baseUrl,
}: Pick<RequiredConfig, "apiKey" | "appID" | "baseUrl"> & {
  url: string;
}): Promise<ResolveShortLinkResponse | null> => {
  try {
    const response = await detourFetch("resolveShort", {
      config: { apiKey: API_KEY, appID, baseUrl },
      body: { url },
    });

    if (response === null || !response.ok) return null;

    return (await response.json()) as ResolveShortLinkResponse;
  } catch {
    return null;
  }
};
