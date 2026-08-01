import type { DistanceBand } from "../types";
import { valueForDistance } from "../types";

export const legacy2022 = {
  id: "2022-03-12",
  label: "2022年3月12日時点",
  sources: {
    regular: "https://www.jreast.co.jp/press/2021/20210413_ho01.pdf",
    shinkansenYear:
      "https://www.jreast.co.jp/shinkansenyear2022/tokuten_ticket/",
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
