export type Random = () => number;

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed: string): Random {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleNormal(
  random: Random,
  mean: number,
  standardDeviation: number,
): number {
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = random();
  return mean
    + Math.sqrt(-2 * Math.log(u1))
      * Math.cos(2 * Math.PI * u2)
      * standardDeviation;
}

export function randomInt(random: Random, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function shuffle<T>(values: T[], random: Random): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
