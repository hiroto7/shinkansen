import type {
  DistanceBand,
  Facility,
  JourneySelection,
} from "../types";
import {
  calculateFareOptions,
  seasonRules2022_04_01,
  stationExpressFareRules2022_03_12,
} from "../fare-calculation";
import {
  basicFareSection,
  distanceBetween,
  routes,
  type Line,
  type SortedSection,
} from "../routes";
import {
  highestFacility,
  validateJourneySelection,
  valueForDistance,
} from "../types";

export const current2026 = {
  id: "2026-03-14",
  label: "2026年3月14日以降",
  sources: {
    points: "https://www.eki-net.com/top/product/shinkansen/e-tokuten.html",
    shinshuPreDc:
      "https://www.eki-net.com/top/point/pdf/shinshu_predc2026.pdf",
    fareCalculationRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/01_syo/01_setsu/02.html",
    basicFareRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/02_setsu/02.html",
    localFareRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/02_setsu/05.html",
    shortDistanceFareRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/02_setsu/09.html",
    basicFareAppendix:
      "https://www.jreast.co.jp/ryokaku/beppyou/pdf/beppyou02.pdf",
    expressRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/07_setsu/",
    specialVehicleRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/08_setsu/",
    seasonRules:
      "https://www.jreast.co.jp/press/2021/20211005_ho04.pdf",
    specialVehicleSeasonRules:
      "https://www.jreast.co.jp/press/2022/20221026_ho03.pdf",
  },
} as const;

interface PointValues {
  readonly regular: Readonly<Record<Facility, number>>;
  readonly limited: Readonly<
    Record<Exclude<Facility, "granClassWithRefreshments">, number>
  >;
}

const points = ({
  ordinary,
  green,
  granClassNoRefreshments,
  granClassWithRefreshments,
  limitedOrdinary,
  limitedGreen,
  limitedGranClass,
}: {
  readonly ordinary: number;
  readonly green: number;
  readonly granClassNoRefreshments: number;
  readonly granClassWithRefreshments: number;
  readonly limitedOrdinary: number;
  readonly limitedGreen: number;
  readonly limitedGranClass: number;
}): PointValues => ({
  regular: {
    ordinary,
    green,
    granClassNoRefreshments,
    granClassWithRefreshments,
  },
  limited: {
    ordinary: limitedOrdinary,
    green: limitedGreen,
    granClassNoRefreshments: limitedGranClass,
  },
});

const pointBands2026: readonly DistanceBand<PointValues>[] = [
  {
    maxKm: 50,
    value: points({
      ordinary: 2_000,
      green: 3_500,
      granClassNoRefreshments: 6_500,
      granClassWithRefreshments: 10_500,
      limitedOrdinary: 1_300,
      limitedGreen: 2_200,
      limitedGranClass: 4_200,
    }),
  },
  {
    maxKm: 100,
    value: points({
      ordinary: 3_000,
      green: 4_000,
      granClassNoRefreshments: 7_000,
      granClassWithRefreshments: 11_000,
      limitedOrdinary: 1_900,
      limitedGreen: 2_600,
      limitedGranClass: 4_500,
    }),
  },
  {
    maxKm: 150,
    value: points({
      ordinary: 4_500,
      green: 6_500,
      granClassNoRefreshments: 9_500,
      granClassWithRefreshments: 13_500,
      limitedOrdinary: 2_900,
      limitedGreen: 4_200,
      limitedGranClass: 6_100,
    }),
  },
  {
    maxKm: 200,
    value: points({
      ordinary: 5_500,
      green: 7_500,
      granClassNoRefreshments: 10_500,
      granClassWithRefreshments: 14_500,
      limitedOrdinary: 3_500,
      limitedGreen: 4_800,
      limitedGranClass: 6_700,
    }),
  },
  {
    maxKm: 250,
    value: points({
      ordinary: 7_000,
      green: 10_000,
      granClassNoRefreshments: 13_000,
      granClassWithRefreshments: 17_000,
      limitedOrdinary: 4_500,
      limitedGreen: 6_500,
      limitedGranClass: 8_400,
    }),
  },
  {
    maxKm: 300,
    value: points({
      ordinary: 8_000,
      green: 11_000,
      granClassNoRefreshments: 14_000,
      granClassWithRefreshments: 18_000,
      limitedOrdinary: 5_000,
      limitedGreen: 7_000,
      limitedGranClass: 9_000,
    }),
  },
  {
    maxKm: 400,
    value: points({
      ordinary: 9_500,
      green: 13_500,
      granClassNoRefreshments: 16_500,
      granClassWithRefreshments: 20_500,
      limitedOrdinary: 6_000,
      limitedGreen: 8_500,
      limitedGranClass: 10_500,
    }),
  },
  {
    maxKm: 500,
    value: points({
      ordinary: 11_000,
      green: 16_000,
      granClassNoRefreshments: 19_000,
      granClassWithRefreshments: 23_000,
      limitedOrdinary: 7_000,
      limitedGreen: 10_000,
      limitedGranClass: 12_000,
    }),
  },
  {
    maxKm: 600,
    value: points({
      ordinary: 12_500,
      green: 18_500,
      granClassNoRefreshments: 21_500,
      granClassWithRefreshments: 25_500,
      limitedOrdinary: 8_000,
      limitedGreen: 11_500,
      limitedGranClass: 13_500,
    }),
  },
  {
    maxKm: null,
    value: points({
      ordinary: 14_000,
      green: 21_000,
      granClassNoRefreshments: 24_000,
      granClassWithRefreshments: 28_000,
      limitedOrdinary: 9_000,
      limitedGreen: 13_000,
      limitedGranClass: 15_000,
    }),
  },
];

export const get2026Points = (
  distanceKm: number,
  facility: Facility,
  campaign: "regular" | "limited35Percent" = "regular",
): number | undefined => {
  const values = valueForDistance(distanceKm, pointBands2026);
  return campaign === "regular"
    ? values.regular[facility]
    : facility === "granClassWithRefreshments"
      ? undefined
      : values.limited[facility];
};

/** 全乗車距離と、行程中で最上位の設備だけで交換ポイントを決める。 */
export const get2026JourneyPoints = (
  distanceKm: number,
  journey: JourneySelection,
  campaign: "regular" | "limited35Percent" = "regular",
) => get2026Points(distanceKm, highestFacility(journey), campaign);

const shinshuPreDcPoints = new Map<string, number>([
  ["東京|軽井沢", 3_000],
  ["東京|佐久平", 4_000],
  ["東京|上田", 4_000],
  ["東京|長野", 4_500],
  ["東京|飯山", 5_000],
  ["上野|軽井沢", 3_000],
  ["上野|佐久平", 4_000],
  ["上野|上田", 4_000],
  ["上野|長野", 4_500],
  ["上野|飯山", 4_500],
  ["大宮|軽井沢", 3_000],
  ["大宮|佐久平", 3_000],
  ["大宮|上田", 4_000],
  ["大宮|長野", 4_000],
  ["大宮|飯山", 4_500],
]);

/** 信州プレDC公式表に掲載された北陸新幹線・普通車指定席の交換ポイント。 */
export const get2026ShinshuPreDcPoints = (
  departure: string,
  arrival: string,
  facility: Facility,
): number | undefined => {
  if (facility !== "ordinary") return undefined;
  return (
    shinshuPreDcPoints.get(`${departure}|${arrival}`) ??
    shinshuPreDcPoints.get(`${arrival}|${departure}`)
  );
};

/**
 * 1枚の指定席特急券に対応する料金を合計する。
 * 特別車両利用時の指定席料金低減は、構成区間ごとではなく全体で1回だけ行う。
 */
export const specialVehicleExpressRules2023_04_01 = {
  effectiveFrom: "2023-04-01",
  reductionAfterSeasonAdjustment: 530,
  source: "https://www.jreast.co.jp/press/2022/20221026_ho03.pdf",
} as const;

export const get2026ExpressFare = (
  tickets: readonly { readonly fare: number }[],
  usesSpecialVehicle: boolean,
) =>
  tickets.reduce((total, ticket) => total + ticket.fare, 0) -
  (usesSpecialVehicle
    ? specialVehicleExpressRules2023_04_01.reductionAfterSeasonAdjustment
    : 0);

interface FareBand {
  readonly minKm: number;
  readonly maxKm: number;
  readonly fare: number;
}

const fare = (minKm: number, maxKm: number, amount: number): FareBand => ({
  minKm,
  maxKm,
  fare: amount,
});

const directFare = (distanceKm: number, bands: readonly FareBand[]) =>
  bands.find(({ minKm, maxKm }) => minKm <= distanceKm && distanceKm <= maxKm)
    ?.fare;

/** 第84条の3に直接定められた10kmまでの普通旅客運賃。 */
const shortTrunkFares = [
  fare(1, 3, 160),
  fare(4, 6, 200),
  fare(7, 10, 210),
] as const;

const shortLocalFares = [
  fare(1, 3, 160),
  fare(4, 6, 200),
  fare(7, 10, 220),
] as const;

/** 別表第2号イの2に直接定められたJR東日本幹線の特定額。 */
const specificTrunkFares = [
  fare(201, 220, 3_850),
  fare(221, 240, 4_180),
  fare(321, 340, 5_940),
  fare(341, 360, 6_270),
  fare(461, 480, 8_030),
  fare(841, 880, 11_990),
  fare(1_521, 1_560, 17_270),
  fare(1_961, 2_000, 20_680),
  fare(2_401, 2_440, 24_090),
  fare(2_841, 2_880, 27_500),
  fare(3_521, 3_560, 32_780),
  fare(3_961, 4_000, 36_190),
  fare(4_401, 4_440, 39_600),
  fare(4_841, 4_880, 43_010),
] as const;

/** 別表第2号イの6に直接定められたJR東日本地方交通線の特定額。 */
const specificLocalFares = [
  fare(11, 15, 260), fare(16, 20, 350), fare(21, 23, 440),
  fare(24, 28, 530), fare(33, 37, 720), fare(42, 46, 910),
  fare(47, 55, 1_040), fare(56, 64, 1_230), fare(65, 73, 1_410),
  fare(74, 82, 1_600), fare(83, 91, 1_790), fare(101, 110, 2_090),
  fare(129, 146, 2_750), fare(183, 200, 3_850), fare(201, 219, 4_180),
  fare(220, 237, 4_620), fare(292, 310, 5_940), fare(311, 328, 6_270),
  fare(420, 437, 8_030), fare(438, 455, 8_360), fare(547, 582, 10_120),
  fare(583, 619, 10_450), fare(729, 764, 11_660), fare(765, 800, 11_990),
  fare(947, 982, 13_530), fare(1_129, 1_164, 15_070),
] as const;

interface RateBand {
  readonly maxKm: number | null;
  /** 1kmあたりの賃率（銭）。 */
  readonly rateSen: number;
}

const trunkRates: readonly RateBand[] = [
  { maxKm: 300, rateSen: 1_696 },
  { maxKm: 600, rateSen: 1_345 },
  { maxKm: null, rateSen: 705 },
];

const localRates: readonly RateBand[] = [
  { maxKm: 273, rateSen: 1_866 },
  { maxKm: 546, rateSen: 1_480 },
  { maxKm: null, rateSen: 770 },
];

/** 第77条第2項に定められた幹線の中央営業キロ。 */
const trunkCentralKm = (distanceKm: number) =>
  distanceKm <= 50
    ? 8 + Math.ceil((distanceKm - 10) / 5) * 5
    : distanceKm <= 100
      ? 45 + Math.ceil((distanceKm - 50) / 10) * 10
      : distanceKm <= 600
        ? 90 + Math.ceil((distanceKm - 100) / 20) * 20
        : 580 + Math.ceil((distanceKm - 600) / 40) * 40;

/** 別表第2号イの4に定められた地方交通線の中央営業キロ。 */
const localCentralKmBands: readonly DistanceBand<number>[] = [
  { maxKm: 15, value: 13 }, { maxKm: 20, value: 18 },
  { maxKm: 23, value: 22 }, { maxKm: 28, value: 26 },
  { maxKm: 32, value: 30 }, { maxKm: 37, value: 35 },
  { maxKm: 41, value: 39 }, { maxKm: 46, value: 44 },
  { maxKm: 55, value: 51 }, { maxKm: 64, value: 60 },
  { maxKm: 73, value: 69 }, { maxKm: 82, value: 78 },
  { maxKm: 91, value: 87 }, { maxKm: 100, value: 96 },
  { maxKm: 110, value: 105 }, { maxKm: 128, value: 119 },
  { maxKm: 146, value: 137 }, { maxKm: 164, value: 155 },
  { maxKm: 182, value: 173 }, { maxKm: 200, value: 191 },
  { maxKm: 219, value: 210 }, { maxKm: 237, value: 228 },
  { maxKm: 255, value: 246 }, { maxKm: 273, value: 264 },
  { maxKm: 291, value: 282 }, { maxKm: 310, value: 301 },
  { maxKm: 328, value: 319 }, { maxKm: 346, value: 337 },
  { maxKm: 364, value: 355 }, { maxKm: 382, value: 373 },
  { maxKm: 400, value: 391 }, { maxKm: 419, value: 410 },
  { maxKm: 437, value: 428 }, { maxKm: 455, value: 446 },
  { maxKm: 473, value: 464 }, { maxKm: 491, value: 482 },
  { maxKm: 510, value: 501 }, { maxKm: 528, value: 519 },
  { maxKm: 546, value: 537 }, { maxKm: 582, value: 564 },
  { maxKm: 619, value: 601 }, { maxKm: 655, value: 637 },
  { maxKm: 691, value: 673 }, { maxKm: 728, value: 710 },
  { maxKm: 764, value: 746 }, { maxKm: 800, value: 782 },
  { maxKm: 837, value: 819 }, { maxKm: 873, value: 855 },
  { maxKm: 910, value: 892 }, { maxKm: 946, value: 928 },
  { maxKm: 982, value: 964 }, { maxKm: 1_019, value: 1_001 },
  { maxKm: 1_055, value: 1_037 }, { maxKm: 1_091, value: 1_073 },
  { maxKm: 1_128, value: 1_110 }, { maxKm: 1_164, value: 1_146 },
  { maxKm: 1_200, value: 1_182 },
];

const calculateFareFromRates = (
  distanceKm: number,
  calculationKm: number,
  rates: readonly RateBand[],
) => {
  let lowerKm = 0;
  let amountSen = 0;
  for (const { maxKm, rateSen } of rates) {
    const upperKm = maxKm ?? calculationKm;
    amountSen += Math.max(0, Math.min(calculationKm, upperKm) - lowerKm) * rateSen;
    if (calculationKm <= upperKm) break;
    lowerKm = upperKm;
  }

  const amountYen = amountSen / 100;
  const roundedAmount =
    distanceKm <= 100
      ? Math.ceil(amountYen / 10) * 10
      : Math.floor((amountYen + 50) / 100) * 100;
  const tax = Math.ceil((roundedAmount * 0.1) / 10) * 10;
  return roundedAmount + tax;
};

export const get2026TrunkBasicFare = (distanceKm: number) => {
  if (!(distanceKm > 0)) throw new RangeError("営業キロは0kmより大きい必要があります");
  const roundedKm = Math.ceil(distanceKm);
  const shortFare = directFare(roundedKm, shortTrunkFares);
  if (shortFare !== undefined) return shortFare;
  const specificFare = directFare(roundedKm, specificTrunkFares);
  if (specificFare !== undefined) return specificFare;
  return calculateFareFromRates(roundedKm, trunkCentralKm(roundedKm), trunkRates);
};

export const get2026LocalBasicFare = (distanceKm: number) => {
  if (!(distanceKm > 0)) throw new RangeError("営業キロは0kmより大きい必要があります");
  const roundedKm = Math.ceil(distanceKm);
  const shortFare = directFare(roundedKm, shortLocalFares);
  if (shortFare !== undefined) return shortFare;
  const specificFare = directFare(roundedKm, specificLocalFares);
  if (specificFare !== undefined) return specificFare;
  if (roundedKm > 1_200) {
    throw new RangeError(`${distanceKm}kmに対応する地方交通線の中央営業キロがありません`);
  }
  return calculateFareFromRates(
    roundedKm,
    valueForDistance(roundedKm, localCentralKmBands),
    localRates,
  );
};

/**
 * JR東日本線内で幹線と地方交通線を連続利用する普通運賃。
 * 規則第14条の2に従い、地方交通線の営業キロを現行賃率比
 * 第77条の8と第77条の3の第1地帯賃率の比を小数第1位に丸め、
 * その比で地方交通線の営業キロを賃率換算する。
 */
export const get2026EastBasicFare = (
  operatingKm: number,
  localKm = 0,
): number => {
  if (!(localKm > 0)) return get2026TrunkBasicFare(operatingKm);
  if (localKm >= operatingKm) return get2026LocalBasicFare(operatingKm);
  if (operatingKm <= 10) return get2026LocalBasicFare(operatingKm);

  const localRateRatio = Math.round((1_866 / 1_696) * 10) / 10;
  const convertedLocalKm = Math.round(localKm * localRateRatio * 10) / 10;
  const calculationKm =
    Math.round((operatingKm - localKm + convertedLocalKm) * 10) / 10;
  return get2026TrunkBasicFare(calculationKm);
};

export const get2026BasicFareForSection = (
  line: Line,
  section: SortedSection,
): number => {
  const fareSection = basicFareSection(section);
  const distanceKm = distanceBetween(
    fareSection.departure,
    fareSection.arrival,
  );
  if (line !== routes.akitaLine) {
    return get2026EastBasicFare(distanceKm);
  }

  const morioka = line.find(({ name }) => name === "盛岡")!;
  const omagari = line.find(({ name }) => name === "大曲")!;
  if (
    morioka.index <= fareSection.departure.index &&
    fareSection.arrival.index <= omagari.index
  ) {
    return get2026EastBasicFare(distanceKm, distanceKm);
  }

  const localStart =
    fareSection.departure.index < morioka.index
      ? morioka
      : fareSection.departure;
  const localEnd =
    fareSection.arrival.index > omagari.index
      ? omagari
      : fareSection.arrival;
  const localKm =
    localStart.index < localEnd.index
      ? distanceBetween(localStart, localEnd)
      : 0;
  return get2026EastBasicFare(distanceKm, localKm);
};

const greenBands: readonly DistanceBand<number>[] = [
  { maxKm: 100, value: 1_300 }, { maxKm: 200, value: 2_800 },
  { maxKm: 300, value: 4_190 }, { maxKm: 400, value: 4_190 },
  { maxKm: 500, value: 5_400 }, { maxKm: 600, value: 5_400 },
  { maxKm: 700, value: 5_600 }, { maxKm: null, value: 6_600 },
];

const granClassABands: readonly DistanceBand<number>[] = [
  { maxKm: 100, value: 8_300 }, { maxKm: 200, value: 9_800 },
  { maxKm: 300, value: 11_190 }, { maxKm: 400, value: 11_190 },
  { maxKm: 500, value: 12_400 }, { maxKm: 600, value: 12_400 },
  { maxKm: 700, value: 12_600 }, { maxKm: null, value: 13_600 },
];

const granClassBBands: readonly DistanceBand<number>[] = [
  { maxKm: 100, value: 4_450 }, { maxKm: 200, value: 5_950 },
  { maxKm: 300, value: 7_340 }, { maxKm: 400, value: 7_340 },
  { maxKm: 500, value: 8_550 }, { maxKm: 600, value: 8_550 },
  { maxKm: 700, value: 8_750 }, { maxKm: null, value: 9_750 },
];

export interface FacilityDistances {
  /** 最初にG以上へ乗ってから最後に降りるまで */
  readonly greenKm: number;
  /** greenKmに内包されるGC区間 */
  readonly granClassKm?: number;
  /** 指定時はGC(A)を利用。A/B混在時も規則第130条第2項によりAとして計算 */
  readonly granClassWithRefreshmentsKm?: number;
}

/**
 * 旅客営業規則第130条第2項の「G全区間 + GC差額」で特別車両料金を計算する。
 */
export const get2026SpecialVehicleFare = ({
  greenKm,
  granClassKm,
  granClassWithRefreshmentsKm,
}: FacilityDistances): number => {
  if (!(greenKm > 0)) {
    throw new RangeError("G区間は0kmより大きい必要があります");
  }
  if (granClassKm !== undefined && granClassKm > greenKm) {
    throw new RangeError("GC区間はG区間以内である必要があります");
  }
  if (
    granClassWithRefreshmentsKm !== undefined &&
    (granClassKm === undefined || granClassWithRefreshmentsKm > granClassKm)
  ) {
    throw new RangeError("飲料・軽食ありGC区間はGC区間以内である必要があります");
  }

  const greenFare = valueForDistance(greenKm, greenBands);
  if (granClassKm === undefined) return greenFare;

  const granClassBands =
    granClassWithRefreshmentsKm === undefined
      ? granClassBBands
      : granClassABands;
  return (
    greenFare +
    valueForDistance(granClassKm, granClassBands) -
    valueForDistance(granClassKm, greenBands)
  );
};

export { validateJourneySelection };

export const calculator2026 = {
  metadata: current2026,
  supportedSeasons: seasonRules2022_04_01.supportedSeasons,
  expressFareRules: stationExpressFareRules2022_03_12,
  specialVehicleExpressRules: specialVehicleExpressRules2023_04_01,
  getBasicFare: get2026EastBasicFare,
  getBasicFareForSection: get2026BasicFareForSection,
  getFares: (
    input: Omit<
      Parameters<typeof calculateFareOptions>[0],
      "seasonRules" | "stationExpressFareRules" | "getBasicFare"
    >,
  ) =>
    calculateFareOptions({
      ...input,
      seasonRules: seasonRules2022_04_01,
      stationExpressFareRules: stationExpressFareRules2022_03_12,
      getBasicFare: get2026BasicFareForSection,
    }),
  getExpressFare: get2026ExpressFare,
  getJourneyPoints: get2026JourneyPoints,
  getShinshuPreDcPoints: get2026ShinshuPreDcPoints,
  getSpecialVehicleFare: get2026SpecialVehicleFare,
} as const;
