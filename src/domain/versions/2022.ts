import {
  calculateFareOptions,
  get2022BasicFare,
  seasonRules2022_03_12,
  stationExpressFareRules2022_03_12,
} from "../fare-calculation";
import type { DistanceBand } from "../types";
import { valueForDistance } from "../types";

export const metadata2022 = {
  id: "2022-03-12",
  label: "2022年3月12日時点",
  sources: {
    regular: "https://www.jreast.co.jp/press/2021/20210413_ho01.pdf",
    shinkansenYear:
      "https://www.jreast.co.jp/shinkansenyear2022/tokuten_ticket/",
    seasonRules:
      "https://www.jreast.co.jp/press/2021/20211005_ho04.pdf",
  },
  note: "旧アプリが対象としていた普通車指定席の交換ポイント",
} as const;

const regularPointBands2022: readonly DistanceBand<number>[] = [
  { maxKm: 100, value: 2_160 },
  { maxKm: 200, value: 4_620 },
  { maxKm: 400, value: 7_940 },
  { maxKm: null, value: 12_110 },
];

const shinkansenYearPointBands2022: readonly DistanceBand<number>[] = [
  { maxKm: 100, value: 1_000 },
  { maxKm: 200, value: 2_300 },
  { maxKm: 400, value: 3_900 },
  { maxKm: null, value: 6_000 },
];

export const get2022Points = (
  distanceKm: number,
  campaign: "regular" | "shinkansenYear" = "regular",
) =>
  valueForDistance(
    distanceKm,
    campaign === "regular"
      ? regularPointBands2022
      : shinkansenYearPointBands2022,
  );

export const calculator2022 = {
  metadata: metadata2022,
  supportedSeasons: seasonRules2022_03_12.supportedSeasons,
  expressFareRules: stationExpressFareRules2022_03_12,
  getPoints: get2022Points,
  getFares: (
    input: Omit<
      Parameters<typeof calculateFareOptions>[0],
      "seasonRules" | "stationExpressFareRules" | "getBasicFare"
    >,
  ) =>
    calculateFareOptions({
      ...input,
      seasonRules: seasonRules2022_03_12,
      stationExpressFareRules: stationExpressFareRules2022_03_12,
      getBasicFare: get2022BasicFare,
    }),
} as const;
