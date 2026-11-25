// The Info.plist keys that tell Apple where to send copies of winning postbacks: SKAdNetwork, then
// AdAttributionKit. Apple uses only the registrable domain of the URL.
const POSTBACK_COPY_KEYS = ["NSAdvertisingAttributionReportEndpoint", "AttributionCopyEndpoint"];
const DETOUR_ENDPOINT = "https://godetour.dev";

/**
 * Sets each postback copy key the app does not set yet. A key the app already sets, for example
 * for another attribution provider, wins: each key takes one URL.
 * @returns {{ infoPlist: Record<string, unknown>, keptKeys: string[] }}
 */
const addPostbackCopyEndpoints = (infoPlist) => {
  const next = { ...infoPlist };
  const keptKeys = [];
  for (const key of POSTBACK_COPY_KEYS) {
    if (typeof next[key] === "string" && next[key] !== "") {
      if (next[key] !== DETOUR_ENDPOINT) keptKeys.push(key);
    } else {
      next[key] = DETOUR_ENDPOINT;
    }
  }
  return { infoPlist: next, keptKeys };
};

module.exports = { DETOUR_ENDPOINT, POSTBACK_COPY_KEYS, addPostbackCopyEndpoints };
