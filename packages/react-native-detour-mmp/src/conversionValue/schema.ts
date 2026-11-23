import type { DetourConversion } from "@swmansion/react-native-detour";

import type { CoarseValue } from "../native";

/** A rule from `GET /api/sdk/conversion-value-schema`. */
export type ConversionValueRule = {
  /** The conversion `name` the rule applies to. */
  event: string;
  condition?: {
    revenue_gte?: number;
    // PROVISIONAL: each rule's condition has its own currency; one currency for the whole schema
    // is still possible.
    currency?: string;
    count_gte?: number;
  };
  fine: number;
  coarse?: CoarseValue;
  lock?: boolean;
  priority?: number;
};

export type ConversionValueSchema = { version: number | null; rules: ConversionValueRule[] };

export const EMPTY_SCHEMA: ConversionValueSchema = { version: null, rules: [] };

const COARSE_VALUES: readonly unknown[] = ["low", "medium", "high"] satisfies CoarseValue[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOptional = (value: unknown, check: (value: unknown) => boolean) =>
  value === undefined || value === null || check(value);

const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);

const isRule = (value: unknown): value is ConversionValueRule => {
  if (!isRecord(value)) return false;
  const { condition } = value;
  return (
    typeof value.event === "string" &&
    Number.isInteger(value.fine) &&
    isOptional(value.coarse, (coarse) => COARSE_VALUES.includes(coarse)) &&
    isOptional(value.lock, (lock) => typeof lock === "boolean") &&
    isOptional(value.priority, Number.isInteger) &&
    isOptional(
      condition,
      (raw) =>
        isRecord(raw) &&
        isOptional(raw.revenue_gte, isNumber) &&
        isOptional(raw.currency, (currency) => typeof currency === "string") &&
        isOptional(raw.count_gte, Number.isInteger),
    )
  );
};

/** The schema in a response body, or null when the body is not one, so the last schema stays. */
export const parseSchema = (body: unknown): ConversionValueSchema | null => {
  if (!isRecord(body) || !Array.isArray(body.rules) || !body.rules.every(isRule)) return null;
  if (!isOptional(body.version, Number.isInteger)) return null;
  return { version: (body.version as number | null | undefined) ?? null, rules: body.rules };
};

/** `count` includes this conversion. */
const matches = (rule: ConversionValueRule, conversion: DetourConversion, count: number) => {
  if (rule.event !== conversion.name || rule.fine < 0 || rule.fine > 63) return false;
  const condition = rule.condition;
  if (!condition) return true;
  if (condition.revenue_gte != null) {
    if (condition.currency != null && condition.currency !== conversion.currency) return false;
    if (conversion.revenue < condition.revenue_gte) return false;
  }
  return condition.count_gte == null || count >= condition.count_gte;
};

/** The rule with the highest `fine` among those the conversion matches; `priority` breaks a tie. */
export const bestRule = (
  schema: ConversionValueSchema,
  conversion: DetourConversion,
  count: number,
): ConversionValueRule | null => {
  let best: ConversionValueRule | null = null;
  for (const rule of schema.rules) {
    if (!matches(rule, conversion, count)) continue;
    if (
      !best ||
      rule.fine > best.fine ||
      (rule.fine === best.fine && (rule.priority ?? 0) > (best.priority ?? 0))
    ) {
      best = rule;
    }
  }
  return best;
};
