import {
  centralLocalKm,
  centralTrunkKm,
  currentFinalize,
  fare,
  roundTo,
  type BasicFareRules,
} from "../basic-fares";
import {
  seasonRules2022_04_01,
  stationExpressFareRules2022_03_12,
} from "../fare-calculation";
import type { FacilityDistances, VersionDefinition } from "../quote";
import type { DistanceBand, Facility } from "../types";
import { valueForDistance } from "../types";

const metadata = {
  id: "2026-03-14",
  label: "2026年3月14日以降",
  sources: {
    points: "https://www.eki-net.com/top/product/shinkansen/e-tokuten.html",
    shinshuPreDc: "https://www.eki-net.com/top/point/pdf/shinshu_predc2026.pdf",
    fareCalculationRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/01_syo/01_setsu/02.html",
    basicFareRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/02_setsu/02.html",
    localFareRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/02_setsu/05.html",
    shortDistanceFareRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/02_setsu/09.html",
    expressFareAppendix:
      "https://www.jreast.co.jp/ryokaku/beppyou/pdf/beppyou02.pdf",
    expressRules: "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/07_setsu/",
    specialVehicleRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/08_setsu/",
    seasonRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/02_syo/07_setsu/05.html",
    specialVehicleSeasonRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/07_setsu/",
  },
} as const;

const pointMaxKm = [50, 100, 150, 200, 250, 300, 400, 500, 600, null] as const;

const pointValues: Readonly<
  Record<
    "regular" | "limited35Percent",
    Partial<Record<Facility, readonly number[]>>
  >
> = {
  regular: {
    ordinary: [
      2_000, 3_000, 4_500, 5_500, 7_000, 8_000, 9_500, 11_000, 12_500, 14_000,
    ],
    green: [
      3_500, 4_000, 6_500, 7_500, 10_000, 11_000, 13_500, 16_000, 18_500,
      21_000,
    ],
    granClassNoRefreshments: [
      6_500, 7_000, 9_500, 10_500, 13_000, 14_000, 16_500, 19_000, 21_500,
      24_000,
    ],
    granClassWithRefreshments: [
      10_500, 11_000, 13_500, 14_500, 17_000, 18_000, 20_500, 23_000, 25_500,
      28_000,
    ],
  },
  limited35Percent: {
    ordinary: [
      1_300, 1_900, 2_900, 3_500, 4_500, 5_000, 6_000, 7_000, 8_000, 9_000,
    ],
    green: [
      2_200, 2_600, 4_200, 4_800, 6_500, 7_000, 8_500, 10_000, 11_500, 13_000,
    ],
    granClassNoRefreshments: [
      4_200, 4_500, 6_100, 6_700, 8_400, 9_000, 10_500, 12_000, 13_500, 15_000,
    ],
  },
};
const getPoints = (
  distanceKm: number,
  facility: Facility,
  campaign: "regular" | "limited35Percent" = "regular",
): number | undefined => {
  const values = pointValues[campaign][facility];
  return values === undefined
    ? undefined
    : valueForDistance(
        distanceKm,
        pointMaxKm.map((maxKm, index) => ({ maxKm, value: values[index]! })),
      );
};

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
const getShinshuPreDcPoints = (
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
const specialVehicleExpressRules2023_04_01 = {
  effectiveFrom: "2023-04-01",
  reductionAfterSeasonAdjustment: 530,
  sources: [
    "https://www.jreast.co.jp/kippu/yakkan/pdf/history230220-3.pdf",
    "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/07_setsu/",
  ],
} as const;

/** 2026年3月14日施行のJR東日本線内普通旅客運賃。 */
const basicFareRules: BasicFareRules = {
  trunk: {
    shortFares: [fare(1, 3, 160), fare(4, 6, 200), fare(7, 10, 210)],
    specificFares: [
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
    ],
    rates: [
      { maxKm: 300, rate: 16.96 },
      { maxKm: 600, rate: 13.45 },
      { maxKm: null, rate: 7.05 },
    ],
    centralKm: centralTrunkKm,
    finalize: currentFinalize,
  },
  local: {
    shortFares: [fare(1, 3, 160), fare(4, 6, 200), fare(7, 10, 220)],
    specificFares: [
      fare(11, 15, 260),
      fare(16, 20, 350),
      fare(21, 23, 440),
      fare(24, 28, 530),
      fare(33, 37, 720),
      fare(42, 46, 910),
      fare(47, 55, 1_040),
      fare(56, 64, 1_230),
      fare(65, 73, 1_410),
      fare(74, 82, 1_600),
      fare(83, 91, 1_790),
      fare(101, 110, 2_090),
      fare(129, 146, 2_750),
      fare(183, 200, 3_850),
      fare(201, 219, 4_180),
      fare(220, 237, 4_620),
      fare(292, 310, 5_940),
      fare(311, 328, 6_270),
      fare(420, 437, 8_030),
      fare(438, 455, 8_360),
      fare(547, 582, 10_120),
      fare(583, 619, 10_450),
      fare(729, 764, 11_660),
      fare(765, 800, 11_990),
      fare(947, 982, 13_530),
      fare(1_129, 1_164, 15_070),
    ],
    rates: [
      { maxKm: 273, rate: 18.66 },
      { maxKm: 546, rate: 14.8 },
      { maxKm: null, rate: 7.7 },
    ],
    centralKm: centralLocalKm,
    finalize: currentFinalize,
  },
  useLocalFareForShortMixed: true,
  mixedCalculationKm: (operatingKm, localKm) =>
    roundTo(operatingKm - localKm + roundTo(localKm * 1.1, 0.1), 0.1),
};

const greenBands: readonly DistanceBand<number>[] = [
  { maxKm: 100, value: 1_300 },
  { maxKm: 200, value: 2_800 },
  { maxKm: 300, value: 4_190 },
  { maxKm: 400, value: 4_190 },
  { maxKm: 500, value: 5_400 },
  { maxKm: 600, value: 5_400 },
  { maxKm: 700, value: 5_600 },
  { maxKm: null, value: 6_600 },
];

const granClassABands: readonly DistanceBand<number>[] = [
  { maxKm: 100, value: 8_300 },
  { maxKm: 200, value: 9_800 },
  { maxKm: 300, value: 11_190 },
  { maxKm: 400, value: 11_190 },
  { maxKm: 500, value: 12_400 },
  { maxKm: 600, value: 12_400 },
  { maxKm: 700, value: 12_600 },
  { maxKm: null, value: 13_600 },
];

const granClassBBands: readonly DistanceBand<number>[] = [
  { maxKm: 100, value: 4_450 },
  { maxKm: 200, value: 5_950 },
  { maxKm: 300, value: 7_340 },
  { maxKm: 400, value: 7_340 },
  { maxKm: 500, value: 8_550 },
  { maxKm: 600, value: 8_550 },
  { maxKm: 700, value: 8_750 },
  { maxKm: null, value: 9_750 },
];

/**
 * 旅客営業規則第130条第2項の「グリーン車全区間 + グランクラス差額」で計算する。
 */
const getSpecialVehicleFare = ({
  greenKm,
  granClassKm,
  includesGranClassA,
}: FacilityDistances): number => {
  if (!(greenKm > 0)) {
    throw new RangeError("グリーン車以上の区間は0kmより大きい必要があります");
  }
  if (granClassKm !== undefined && granClassKm > greenKm) {
    throw new RangeError(
      "グランクラス区間はグリーン車以上の区間以内である必要があります",
    );
  }
  if (includesGranClassA && granClassKm === undefined) {
    throw new RangeError(
      "グランクラス(A)を利用する場合はグランクラス区間が必要です",
    );
  }

  const greenFare = valueForDistance(greenKm, greenBands);
  if (granClassKm === undefined) return greenFare;

  const granClassBands = includesGranClassA
    ? granClassABands
    : granClassBBands;
  return (
    greenFare +
    valueForDistance(granClassKm, granClassBands) -
    valueForDistance(granClassKm, greenBands)
  );
};

export const version2026: VersionDefinition = {
  metadata,
  seasonRules: seasonRules2022_04_01,
  expressFareRules: stationExpressFareRules2022_03_12,
  basicFareRules,
  supportsFacility: () => true,
  getPoints: ({ distanceKm, facility, campaign, departure, arrival }) =>
    campaign === "shinshuPreDc"
      ? getShinshuPreDcPoints(departure, arrival, facility)
      : getPoints(
          distanceKm,
          facility,
          campaign === "limited35Percent" ? "limited35Percent" : "regular",
        ),
  pointExclusionReason: (campaign) =>
    campaign === "shinshuPreDc" ? "shinshuPreDc" : "limitedFacility",
  specialVehicle: {
    expressReduction:
      specialVehicleExpressRules2023_04_01.reductionAfterSeasonAdjustment,
    getFare: getSpecialVehicleFare,
  },
};
