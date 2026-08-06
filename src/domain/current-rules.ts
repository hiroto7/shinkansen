import type { DistanceBand, Facility } from "./types";
import { valueForDistance } from "./types";

export type Campaign = "regular" | "limited35Percent" | "shinshuPreDc";

interface FacilityDistances {
  /** 最初にグリーン車以上へ乗ってから最後に降りるまで */
  readonly greenKm: number;
  /** greenKmに内包されるグランクラス区間 */
  readonly granClassKm?: number;
  /** A/B混在時も第130条第2項によりグランクラス全区間を(A)として計算 */
  readonly includesGranClassA?: boolean;
}

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
const getPointsForDistance = (
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
export const getSpecialVehicleFare = ({
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

/** 2023年4月1日施行。特別車両利用時に指定席料金から全体で1回低減する額。 */
export const specialVehicleExpressReduction = 530;

export const getCurrentPoints = ({
  distanceKm,
  facility,
  campaign,
  departure,
  arrival,
}: {
  readonly distanceKm: number;
  readonly facility: Facility;
  readonly campaign: Campaign;
  readonly departure: string;
  readonly arrival: string;
}): number | undefined =>
  campaign === "shinshuPreDc"
    ? getShinshuPreDcPoints(departure, arrival, facility)
    : getPointsForDistance(
        distanceKm,
        facility,
        campaign === "limited35Percent" ? "limited35Percent" : "regular",
      );
