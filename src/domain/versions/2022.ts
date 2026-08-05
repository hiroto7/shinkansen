import {
  centralLocalKm,
  centralTrunkKm,
  fare,
  oldFinalize,
  roundTo,
  type BasicFareRules,
} from "../basic-fares";
import {
  seasonRules2022_03_12,
  stationExpressFareRules2022_03_12,
} from "../fare-calculation";
import type { VersionDefinition } from "../quote";
import type { DistanceBand } from "../types";
import { valueForDistance } from "../types";

const metadata = {
  id: "2022-03-12",
  label: "2022年3月12日時点",
  sources: {
    regular: "https://www.jreast.co.jp/press/2021/20210413_ho01.pdf",
    shinkansenYear:
      "https://www.jreast.co.jp/shinkansenyear2022/tokuten_ticket/",
    seasonRules: "https://www.jreast.co.jp/press/2021/20211005_ho04.pdf",
  },
  note: "旧アプリが対象としていた普通車指定席の交換ポイント",
} as const;

const points: Readonly<
  Record<"regular" | "shinkansenYear", readonly DistanceBand<number>[]>
> = {
  regular: [
    { maxKm: 100, value: 2_160 },
    { maxKm: 200, value: 4_620 },
    { maxKm: 400, value: 7_940 },
    { maxKm: null, value: 12_110 },
  ],
  shinkansenYear: [
    { maxKm: 100, value: 1_000 },
    { maxKm: 200, value: 2_300 },
    { maxKm: 400, value: 3_900 },
    { maxKm: null, value: 6_000 },
  ],
};

/** 2022年3月12日時点の普通旅客運賃。 */
const basicFareRules: BasicFareRules = {
  trunk: {
    shortFares: [fare(1, 3, 150), fare(4, 6, 190), fare(7, 10, 200)],
    specificFares: [],
    rates: [
      { maxKm: 300, rate: 16.2 },
      { maxKm: 600, rate: 12.85 },
      { maxKm: null, rate: 7.05 },
    ],
    centralKm: centralTrunkKm,
    finalize: oldFinalize(),
  },
  local: {
    shortFares: [fare(1, 3, 150), fare(4, 6, 190), fare(7, 10, 210)],
    specificFares: [
      fare(11, 15, 240),
      fare(16, 20, 330),
      fare(21, 23, 420),
      fare(24, 28, 510),
      fare(33, 37, 680),
      fare(42, 46, 860),
      fare(47, 55, 990),
      fare(56, 64, 1_170),
      fare(65, 73, 1_340),
      fare(74, 82, 1_520),
      fare(83, 91, 1_690),
      fare(101, 110, 1_980),
      fare(292, 310, 5_720),
    ],
    rates: [
      { maxKm: 273, rate: 17.8 },
      { maxKm: 546, rate: 14.1 },
      { maxKm: null, rate: 7.7 },
    ],
    centralKm: centralLocalKm,
    finalize: oldFinalize(),
  },
  electric: {
    shortFares: [fare(1, 3, 140), fare(4, 6, 160), fare(7, 10, 170)],
    specificFares: [],
    rates: [
      { maxKm: 300, rate: 15.3 },
      { maxKm: 600, rate: 12.15 },
    ],
    centralKm: centralTrunkKm,
    finalize: oldFinalize("ceil"),
  },
  alwaysApplyCityZone: false,
  mixedCalculationKm: (operatingKm, localKm) =>
    operatingKm + roundTo(localKm * (17.8 / 16.2 - 1), 0.1),
};

export const version2022: VersionDefinition = {
  metadata,
  seasonRules: seasonRules2022_03_12,
  expressFareRules: stationExpressFareRules2022_03_12,
  basicFareRules,
  supportsFacility: (facility) => facility === "ordinary",
  getPoints: ({ distanceKm, campaign }) =>
    valueForDistance(
      distanceKm,
      points[campaign === "shinkansenYear" ? "shinkansenYear" : "regular"],
    ),
  pointExclusionReason: () => "historicalFacility",
};
