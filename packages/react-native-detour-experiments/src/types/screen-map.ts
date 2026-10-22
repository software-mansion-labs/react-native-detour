export type VariantLetter = string;

export const SCREEN_MAP_VERSION = 1;

export type Rect = { x: number; y: number; w: number; h: number; via?: "testId" | "text" };

export type ScreenShot = {
  hash: string;
  width: number;
  height: number;
  focusVariant: VariantLetter;
  pinned: Record<string, VariantLetter>;
  anchors: Record<string, Rect>;
};

type ScreenMapTrigger = {
  id: string;
  metric: string;
  type: "outcome" | "exposure";
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
  experiments: Array<{
    key: string;
    variants: VariantLetter[];
    kind?: "experiment" | "flag";
  }>;
  shots: ScreenShot[];
  triggers: ScreenMapTrigger[];
};

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
