import { buildApiUrl } from "../../net/endpoints";
import { SDK_HEADER_VALUE } from "../../version";
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
  const endpoint = buildApiUrl("resolveShort", baseUrl);
  if (endpoint === null) return null;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "X-App-ID": appID,
        "X-SDK": SDK_HEADER_VALUE,
      },
      body: JSON.stringify({ url }),
    });

    if (response.status === 404) return null;
    if (!response.ok) return null;

    return (await response.json()) as ResolveShortLinkResponse;
  } catch {
    return null;
  }
};
