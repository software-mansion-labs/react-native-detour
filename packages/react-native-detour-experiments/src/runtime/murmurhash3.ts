/* eslint-disable no-bitwise */
import type { Variant } from "../types";

export function murmurhash3(key: string, seed = 0): number {
  let h1 = seed >>> 0;
  const remainder = key.length & 3;
  const bytes = key.length - remainder;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  let i = 0;
  while (i < bytes) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (Math.imul(h1, 5) + 0xe6546b64) >>> 0;
  }

  let k1 = 0;
  if (remainder === 3) {
    k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
  }
  if (remainder >= 2) {
    k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
  }
  if (remainder >= 1) {
    k1 ^= key.charCodeAt(i) & 0xff;
    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);
    h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

export function getBucket(deviceId: string, experimentKey: string): number {
  return murmurhash3(`${deviceId}:${experimentKey}`) % 100;
}

export function getEnrollmentBucket(deviceId: string, experimentKey: string): number {
  return murmurhash3(`${deviceId}:${experimentKey}:enroll`) % 100;
}

// Weights that add up to nothing split evenly. The dashboard's `variantsByBucket` is a copy.
export function bucketToMultiVariant(
  bucket: number,
  variants: readonly Variant[],
  weights: Readonly<Record<string, number>>,
): Variant {
  if (variants.length === 0) {
    return "A";
  }

  const weightOf = (variant: Variant) => Math.max(0, weights[variant] ?? 0);
  const totalWeight = variants.reduce((sum, variant) => sum + weightOf(variant), 0);
  if (totalWeight > 0) {
    const position = (bucket / 100) * totalWeight;
    let cumulative = 0;
    for (const variant of variants) {
      cumulative += weightOf(variant);
      if (position < cumulative) {
        return variant;
      }
    }
    return variants[variants.length - 1]!;
  }

  const index = Math.floor((bucket * variants.length) / 100);
  return variants[Math.min(index, variants.length - 1)]!;
}
