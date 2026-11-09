import type { DetourConversion } from "./types";

// The backend's limits; it rejects the whole conversion when one field breaks them.
const TEXT_MAX_LENGTH = 255;
const REVENUE_LIMIT = 1_000_000_000_000;
const QUANTITY_MAX = 2_147_483_647;
const REVENUE_TYPES = new Set(["iap", "in_app_ads", "other"]);

const isText = (value: unknown, minLength: number) =>
  typeof value === "string" && value.length >= minLength && value.length <= TEXT_MAX_LENGTH;

/** Why the backend would reject the conversion, or `null` when it is fine. */
export const conversionProblem = (conversion: DetourConversion): string | null => {
  const { name, revenue, currency, revenueType, productId, quantity, transactionId } = conversion;
  if (!isText(name, 1)) return `name must have 1 to ${TEXT_MAX_LENGTH} characters`;
  if (
    typeof revenue !== "number" ||
    !Number.isFinite(revenue) ||
    revenue < 0 ||
    revenue >= REVENUE_LIMIT
  ) {
    return `revenue must be a number from 0, below ${REVENUE_LIMIT}`;
  }
  if (typeof currency !== "string" || !/^[A-Za-z]{3}$/.test(currency)) {
    return "currency must be a three-letter ISO 4217 code, e.g. USD";
  }
  if (!REVENUE_TYPES.has(revenueType)) return "revenueType must be iap, in_app_ads or other";
  if (productId !== undefined && !isText(productId, 0)) {
    return `productId must have at most ${TEXT_MAX_LENGTH} characters`;
  }
  if (
    quantity !== undefined &&
    (!Number.isInteger(quantity) || quantity < 0 || quantity > QUANTITY_MAX)
  ) {
    return "quantity must be a whole number from 0";
  }
  if (transactionId !== undefined && !isText(transactionId, 1)) {
    return `transactionId must have 1 to ${TEXT_MAX_LENGTH} characters`;
  }
  return null;
};
