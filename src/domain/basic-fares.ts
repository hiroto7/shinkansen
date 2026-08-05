import {
  distanceBetween,
  routes,
  type Line,
  type SortedSection,
} from "./routes";

interface FareBand {
  readonly minKm: number;
  readonly maxKm: number;
  readonly fare: number;
}

interface RateBand {
  readonly maxKm: number | null;
  /** 1kmあたりの賃率（円）。 */
  readonly rate: number;
}

interface FareScale {
  readonly shortFares: readonly FareBand[];
  readonly specificFares: readonly FareBand[];
  readonly rates: readonly RateBand[];
  centralKm(distanceKm: number): number;
  finalize(amount: number, distanceKm: number): number;
}

const fare = (minKm: number, maxKm: number, amount: number): FareBand => ({
  minKm,
  maxKm,
  fare: amount,
});

const ceilTo = (amount: number, unit: number) =>
  Math.ceil(amount / unit) * unit;
const roundTo = (amount: number, unit: number) =>
  Math.round(amount / unit) * unit;

const centralTrunkKm = (distanceKm: number) =>
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

const centralLocalKm = (distanceKm: number) => {
  let minKm = 11;
  for (const maxKm of localUpperBounds) {
    if (distanceKm <= maxKm) return Math.floor((minKm + maxKm) / 2);
    minKm = maxKm + 1;
  }
  throw new RangeError(
    `${distanceKm}kmに対応する地方交通線の中央営業キロがありません`,
  );
};

const calculateBasicFare = (scale: FareScale, distanceKm: number) => {
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

const currentFinalize = (amount: number, distanceKm: number) => {
  const beforeTax =
    distanceKm <= 100 ? ceilTo(amount, 10) : roundTo(amount, 100);
  return beforeTax + ceilTo(beforeTax * 0.1, 10);
};

/** 2026年3月14日施行のJR東日本線内普通旅客運賃。 */
const trunkFareScale: FareScale = {
  shortFares: [fare(1, 3, 160), fare(4, 6, 200), fare(7, 10, 210)],
  specificFares: [
    fare(201, 220, 3_850), fare(221, 240, 4_180),
    fare(321, 340, 5_940), fare(341, 360, 6_270),
    fare(461, 480, 8_030), fare(841, 880, 11_990),
    fare(1_521, 1_560, 17_270), fare(1_961, 2_000, 20_680),
    fare(2_401, 2_440, 24_090), fare(2_841, 2_880, 27_500),
    fare(3_521, 3_560, 32_780), fare(3_961, 4_000, 36_190),
    fare(4_401, 4_440, 39_600), fare(4_841, 4_880, 43_010),
  ],
  rates: [
    { maxKm: 300, rate: 16.96 },
    { maxKm: 600, rate: 13.45 },
    { maxKm: null, rate: 7.05 },
  ],
  centralKm: centralTrunkKm,
  finalize: currentFinalize,
};

const localFareScale: FareScale = {
  shortFares: [fare(1, 3, 160), fare(4, 6, 200), fare(7, 10, 220)],
  specificFares: [
    fare(11, 15, 260), fare(16, 20, 350), fare(21, 23, 440),
    fare(24, 28, 530), fare(33, 37, 720), fare(42, 46, 910),
    fare(47, 55, 1_040), fare(56, 64, 1_230), fare(65, 73, 1_410),
    fare(74, 82, 1_600), fare(83, 91, 1_790), fare(101, 110, 2_090),
    fare(129, 146, 2_750), fare(183, 200, 3_850),
    fare(201, 219, 4_180), fare(220, 237, 4_620),
    fare(292, 310, 5_940), fare(311, 328, 6_270),
    fare(420, 437, 8_030), fare(438, 455, 8_360),
    fare(547, 582, 10_120), fare(583, 619, 10_450),
    fare(729, 764, 11_660), fare(765, 800, 11_990),
    fare(947, 982, 13_530), fare(1_129, 1_164, 15_070),
  ],
  rates: [
    { maxKm: 273, rate: 18.66 },
    { maxKm: 546, rate: 14.8 },
    { maxKm: null, rate: 7.7 },
  ],
  centralKm: centralLocalKm,
  finalize: currentFinalize,
};

export const calculateTrunkBasicFare = (distanceKm: number) =>
  calculateBasicFare(trunkFareScale, distanceKm);

export const calculateLocalBasicFare = (distanceKm: number) =>
  calculateBasicFare(localFareScale, distanceKm);

export const calculateEastBasicFare = (
  operatingKm: number,
  localKm = 0,
) => {
  if (!(localKm > 0)) return calculateTrunkBasicFare(operatingKm);
  if (localKm >= operatingKm || operatingKm <= 10) {
    return calculateLocalBasicFare(operatingKm);
  }
  const calculationKm = roundTo(
    operatingKm - localKm + roundTo(localKm * 1.1, 0.1),
    0.1,
  );
  return calculateTrunkBasicFare(calculationKm);
};

export const getBasicFareForSection = (
  line: Line,
  section: SortedSection,
) => {
  const distanceKm = distanceBetween(section.departure, section.arrival);
  if (line !== routes.akitaLine)
    return calculateTrunkBasicFare(distanceKm);

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
  return calculateEastBasicFare(distanceKm, localKm);
};
