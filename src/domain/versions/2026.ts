import type {
  DistanceBand,
  Facility,
  JourneySelection,
} from "../types";
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
    fares: "https://www.jreast.co.jp/2026unchin-kaitei/",
    expressRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/07_setsu/",
    specialVehicleRules:
      "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/08_setsu/",
  },
} as const;

interface PointValues {
  readonly regular: Readonly<Record<Facility, number>>;
  readonly limited: Readonly<
    Record<Exclude<Facility, "granClassWithRefreshments">, number>
  >;
}

const points = (
  ordinary: number,
  green: number,
  granClassNoRefreshments: number,
  granClassWithRefreshments: number,
  limitedOrdinary: number,
  limitedGreen: number,
  limitedGranClass: number,
): PointValues => ({
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
  { maxKm: 50, value: points(2_000, 3_500, 6_500, 10_500, 1_300, 2_200, 4_200) },
  { maxKm: 100, value: points(3_000, 4_000, 7_000, 11_000, 1_900, 2_600, 4_500) },
  { maxKm: 150, value: points(4_500, 6_500, 9_500, 13_500, 2_900, 4_200, 6_100) },
  { maxKm: 200, value: points(5_500, 7_500, 10_500, 14_500, 3_500, 4_800, 6_700) },
  { maxKm: 250, value: points(7_000, 10_000, 13_000, 17_000, 4_500, 6_500, 8_400) },
  { maxKm: 300, value: points(8_000, 11_000, 14_000, 18_000, 5_000, 7_000, 9_000) },
  { maxKm: 400, value: points(9_500, 13_500, 16_500, 20_500, 6_000, 8_500, 10_500) },
  { maxKm: 500, value: points(11_000, 16_000, 19_000, 23_000, 7_000, 10_000, 12_000) },
  { maxKm: 600, value: points(12_500, 18_500, 21_500, 25_500, 8_000, 11_500, 13_500) },
  { maxKm: null, value: points(14_000, 21_000, 24_000, 28_000, 9_000, 13_000, 15_000) },
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
export const get2026ExpressFare = (
  tickets: readonly { readonly fare: number }[],
  usesSpecialVehicle: boolean,
) =>
  tickets.reduce((total, ticket) => total + ticket.fare, 0) -
  (usesSpecialVehicle ? 530 : 0);

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

/** 2026年3月14日改定後のJR東日本・幹線普通旅客運賃（磁気） */
const trunkFareBands2026: readonly FareBand[] = [
  fare(1, 3, 160), fare(4, 6, 200), fare(7, 10, 210), fare(11, 15, 260),
  fare(16, 20, 350), fare(21, 25, 440), fare(26, 30, 530), fare(31, 35, 620),
  fare(36, 40, 720), fare(41, 45, 810), fare(46, 50, 910), fare(51, 60, 1_040),
  fare(61, 70, 1_230), fare(71, 80, 1_410), fare(81, 90, 1_600), fare(91, 100, 1_790),
  fare(101, 120, 2_090), fare(121, 140, 2_420), fare(141, 160, 2_750), fare(161, 180, 3_190),
  fare(181, 200, 3_520), fare(201, 220, 3_850), fare(221, 240, 4_180), fare(241, 260, 4_620),
  fare(261, 280, 5_060), fare(281, 300, 5_390), fare(301, 320, 5_720), fare(321, 340, 5_940),
  fare(341, 360, 6_270), fare(361, 380, 6_600), fare(381, 400, 6_930), fare(401, 420, 7_260),
  fare(421, 440, 7_480), fare(441, 460, 7_810), fare(461, 480, 8_030), fare(481, 500, 8_360),
  fare(501, 520, 8_690), fare(521, 540, 9_020), fare(541, 560, 9_350), fare(561, 580, 9_570),
  fare(581, 600, 9_900), fare(601, 640, 10_230), fare(641, 680, 10_450), fare(681, 720, 10_780),
  fare(721, 760, 11_110), fare(761, 800, 11_440), fare(801, 840, 11_770), fare(841, 880, 11_990),
  fare(881, 920, 12_320), fare(921, 960, 12_650), fare(961, 1_000, 12_980),
];

/** 2026年3月14日改定後のJR東日本・地方交通線普通旅客運賃（磁気） */
const localFareBands2026: readonly FareBand[] = [
  fare(1, 3, 160), fare(4, 6, 200), fare(7, 10, 220), fare(11, 15, 260),
  fare(16, 20, 350), fare(21, 23, 440), fare(24, 28, 530), fare(29, 32, 620),
  fare(33, 37, 720), fare(38, 41, 810), fare(42, 46, 910), fare(47, 55, 1_040),
  fare(56, 64, 1_230), fare(65, 73, 1_410), fare(74, 82, 1_600), fare(83, 91, 1_790),
  fare(92, 100, 1_980), fare(101, 110, 2_090), fare(111, 128, 2_420), fare(129, 146, 2_750),
  fare(147, 164, 3_190), fare(165, 182, 3_520), fare(183, 200, 3_850), fare(201, 219, 4_180),
  fare(220, 237, 4_620), fare(238, 255, 5_060), fare(256, 273, 5_390), fare(274, 291, 5_720),
  fare(292, 310, 5_940), fare(311, 328, 6_270), fare(329, 346, 6_600), fare(347, 364, 6_930),
  fare(365, 382, 7_260), fare(383, 400, 7_480), fare(401, 419, 7_810), fare(420, 437, 8_030),
  fare(438, 455, 8_360), fare(456, 473, 8_690), fare(474, 491, 9_020), fare(492, 510, 9_350),
  fare(511, 528, 9_570), fare(529, 546, 9_900), fare(547, 582, 10_120), fare(583, 619, 10_450),
  fare(620, 655, 10_780), fare(656, 691, 11_110), fare(692, 728, 11_440), fare(729, 764, 11_660),
  fare(765, 800, 11_990),
];

const getFareFromBands = (distanceKm: number, bands: readonly FareBand[]) => {
  const roundedKm = Math.ceil(distanceKm);
  const band = bands.find(
    ({ minKm, maxKm }) => minKm <= roundedKm && roundedKm <= maxKm,
  );
  if (!band) {
    throw new RangeError(`${distanceKm}kmに対応する運賃がありません`);
  }
  return band.fare;
};

export const get2026TrunkBasicFare = (distanceKm: number) =>
  getFareFromBands(distanceKm, trunkFareBands2026);

export const get2026LocalBasicFare = (distanceKm: number) =>
  getFareFromBands(distanceKm, localFareBands2026);

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
