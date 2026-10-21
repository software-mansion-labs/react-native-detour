/** A variant's letter: A, B, C, … */
export type VariantLetter = string;

export const SCREEN_MAP_VERSION = 1;

/**
 * Normalised to 0..1 of the shot. `via` says how the element was found: `testId` is exact, `text` is
 * a guess. Optional and additive, so `SCREEN_MAP_VERSION` stays 1; a box without it is drawn as exact.
 */
export type Rect = { x: number; y: number; w: number; h: number; via?: "testId" | "text" };

export type ScreenShot = {
  hash: string;
  width: number;
  height: number;
  focusVariant: VariantLetter;
  pinned: Record<string, VariantLetter>;
  anchors: Record<string, Rect>;
};

/**
 * `variant` and `variantOf` are set only on a trigger in a variant file. A shot draws it only when it
 * shows that arm. Additive: `SCREEN_MAP_VERSION` stays 1, and a trigger without them is in every shot.
 */
type ScreenMapTrigger = {
  id: string;
  metric: string;
  type: "outcome" | "exposure";
  /** The scan's `unknown` is sent as `interaction`: the dashboard's schema accepts only these two. */
  emission: "interaction" | "automatic";
  label: string;
  experimentKey?: string;
  variant?: VariantLetter;
  variantOf?: string;
  sourceFile: string;
  line: number;
};

export type ScreenMapNode = {
  id: string;
  route: string;
  title: string;
  sourceFile: string;
  status: "captured" | "manual" | "unreachable";
  role: "focus" | "neighbour";
  /**
   * `kind` is additive and optional: an older dashboard ignores it, a newer one falls back to
   * "experiment" when absent. `SCREEN_MAP_VERSION` stays 1.
   */
  experiments: Array<{
    key: string;
    variants: VariantLetter[];
    kind?: "experiment" | "flag";
  }>;
  shots: ScreenShot[];
  triggers: ScreenMapTrigger[];
};

/** `variant` and `variantOf` as on a trigger: a link in a variant file shows only with that arm. Additive. */
type ScreenMapEdge = {
  from: string;
  to: string;
  kind: "link" | "imperative";
  trigger?: string;
  experimentKey?: string;
  variant?: VariantLetter;
  variantOf?: string;
  sourceFile: string;
  line: number;
};

export type ScreenMap = {
  version: typeof SCREEN_MAP_VERSION;
  experimentKey: string;
  generatedAt: string;
  consentVersion: number;
  capture: {
    platform: "ios" | "android";
    device: string;
    driver: "argent" | "simctl" | "adb";
    scheme: string;
  };
  screens: ScreenMapNode[];
  edges: ScreenMapEdge[];
};
