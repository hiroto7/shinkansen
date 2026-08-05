import {
  distanceBetween,
  routes,
  type Line,
  type SortedSection,
} from "./routes";

export interface FareBand {
  readonly minKm: number;
  readonly maxKm: number;
  readonly fare: number;
}

export interface RateBand {
  readonly maxKm: number | null;
  /** 1kmあたりの賃率（円）。 */
  readonly rate: number;
}

export interface FareScale {
  readonly shortFares: readonly FareBand[];
  readonly specificFares: readonly FareBand[];
  readonly rates: readonly RateBand[];
  centralKm(distanceKm: number): number;
  finalize(amount: number, distanceKm: number): number;
}

export interface BasicFareRules {
  readonly trunk: FareScale;
  readonly local: FareScale;
  readonly electric?: FareScale;
  mixedCalculationKm(operatingKm: number, localKm: number): number;
  useLocalFareForShortMixed?: boolean;
}

export const fare = (minKm: number, maxKm: number, amount: number): FareBand => ({
  minKm,
  maxKm,
  fare: amount,
});

const ceilTo = (amount: number, unit: number) =>
  Math.ceil(amount / unit) * unit;
export const roundTo = (amount: number, unit: number) =>
  Math.round(amount / unit) * unit;

export const centralTrunkKm = (distanceKm: number) =>
  distanceKm <= 50
    ? 8 + Math.ceil((distanceKm - 10) / 5) * 5
    : distanceKm <= 100
      ? 45 + Math.ceil((distanceKm - 50) / 10) * 10
      : distanceKm <= 600
        ? 90 + Math.ceil((distanceKm - 100) / 20) * 20
        : 580 + Math.ceil((distanceKm - 600) / 40) * 40;

/** 別表第2号イの4。2022年3月12日時点から2026年3月14日まで同じ区分。 */
const localUpperBounds = [
  15, 20, 23, 28, 32, 37, 41, 46, 55, 64, 73, 82, 91, 100, 110, 128, 146, 164,
  182, 200, 219, 237, 255, 273, 291, 310, 328, 346, 364, 382, 400, 419, 437,
  455, 473, 491, 510, 528, 546, 582, 619, 655, 691, 728, 764, 800, 837, 873,
  910, 946, 982, 1_019, 1_055, 1_091, 1_128, 1_164, 1_200,
] as const;

export const centralLocalKm = (distanceKm: number) => {
  let minKm = 11;
  for (const maxKm of localUpperBounds) {
    if (distanceKm <= maxKm) return Math.floor((minKm + maxKm) / 2);
    minKm = maxKm + 1;
  }
  throw new RangeError(
    `${distanceKm}kmに対応する地方交通線の中央営業キロがありません`,
  );
};

export const calculateBasicFare = (scale: FareScale, distanceKm: number) => {
  if (!(distanceKm > 0)) {
    throw new RangeError("営業キロは0kmより大きい必要があります");
  }
  const roundedKm = Math.ceil(distanceKm);
  const directFare = [...scale.shortFares, ...scale.specificFares].find(
    ({ minKm, maxKm }) => minKm <= roundedKm && roundedKm <= maxKm,
  )?.fare;
  if (directFare !== undefined) return directFare;

  const calculationKm = scale.centralKm(roundedKm);
  let lowerKm = 0;
  let amount = 0;
  for (const { maxKm, rate } of scale.rates) {
    const upperKm = maxKm ?? calculationKm;
    amount += Math.max(0, Math.min(calculationKm, upperKm) - lowerKm) * rate;
    if (calculationKm <= upperKm) break;
    lowerKm = upperKm;
  }
  return scale.finalize(amount, roundedKm);
};

export const calculateEastBasicFare = (
  rules: BasicFareRules,
  operatingKm: number,
  localKm = 0,
) => {
  if (!(localKm > 0)) return calculateBasicFare(rules.trunk, operatingKm);
  if (
    localKm >= operatingKm ||
    (rules.useLocalFareForShortMixed && operatingKm <= 10)
  ) {
    return calculateBasicFare(rules.local, operatingKm);
  }
  return calculateBasicFare(
    rules.trunk,
    rules.mixedCalculationKm(operatingKm, localKm),
  );
};

export const oldFinalize =
  (mode: "round" | "ceil" = "round") =>
  (amount: number, distanceKm: number) => {
    const beforeTax =
      distanceKm <= 100 ? ceilTo(amount, 10) : roundTo(amount, 100);
    return (mode === "ceil" ? ceilTo : roundTo)(beforeTax * 1.1, 10);
  };

export const currentFinalize = (amount: number, distanceKm: number) => {
  const beforeTax =
    distanceKm <= 100 ? ceilTo(amount, 10) : roundTo(amount, 100);
  return beforeTax + ceilTo(beforeTax * 0.1, 10);
};

export const getBasicFareForSection = (
  rules: BasicFareRules,
  line: Line,
  section: SortedSection,
) => {
  const distanceKm = distanceBetween(section.departure, section.arrival);
  const omiyaIndex = line.findIndex(({ name }) => name === "大宮");
  if (rules.electric && section.arrival.index <= omiyaIndex) {
    return calculateBasicFare(rules.electric, distanceKm);
  }
  if (line !== routes.akitaLine)
    return calculateBasicFare(rules.trunk, distanceKm);

  const morioka = line.find(({ name }) => name === "盛岡")!;
  const omagari = line.find(({ name }) => name === "大曲")!;
  const localStart =
    section.departure.index < morioka.index ? morioka : section.departure;
  const localEnd =
    section.arrival.index > omagari.index ? omagari : section.arrival;
  const localKm =
    localStart.index < localEnd.index
      ? distanceBetween(localStart, localEnd)
      : 0;
  return calculateEastBasicFare(rules, distanceKm, localKm);
};
