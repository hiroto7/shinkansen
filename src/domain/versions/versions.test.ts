import { describe, expect, it } from "vitest";
import { validateJourneySelection } from "../types";
import { get2022Points } from "./2022";
import {
  get2026JourneyPoints,
  get2026LocalBasicFare,
  get2026Points,
  get2026SpecialVehicleFare,
  get2026TrunkBasicFare,
} from "./2026";

describe("2022年版", () => {
  it("旧アプリの4距離帯を境界で維持する", () => {
    expect(get2022Points(100)).toBe(2_160);
    expect(get2022Points(100.1)).toBe(4_620);
    expect(get2022Points(400)).toBe(7_940);
    expect(get2022Points(400.1)).toBe(12_110);
  });
});

describe("2026年版の交換ポイント", () => {
  it("ケース1: 401〜500kmで一部Gなら16,000ポイント", () => {
    expect(
      get2026JourneyPoints(477.2, {
        origin: 0,
        destination: 3,
        green: { start: 1, end: 3 },
      }),
    ).toBe(16_000);
  });

  it("ケース2: 401〜500kmで一部GCならGC区間長によらず19,000ポイント", () => {
    const shortGc = get2026JourneyPoints(477.2, {
      origin: 0,
      destination: 3,
      green: { start: 0, end: 3 },
      granClass: { start: 0, end: 1 },
    });
    const longGc = get2026JourneyPoints(477.2, {
      origin: 0,
      destination: 3,
      green: { start: 0, end: 3 },
      granClass: { start: 0, end: 2 },
    });
    expect(shortGc).toBe(19_000);
    expect(longGc).toBe(19_000);
  });

  it("ケース3: 501〜600kmで飲料・軽食ありGCなら25,500ポイント", () => {
    expect(
      get2026JourneyPoints(535.3, {
        origin: 0,
        destination: 3,
        green: { start: 0, end: 3 },
        granClass: { start: 2, end: 3 },
        granClassWithRefreshments: { start: 2, end: 3 },
      }),
    ).toBe(25_500);
  });

  it("35%期間限定レートは飲料・軽食ありGCを対象外にする", () => {
    expect(get2026Points(351.8, "ordinary", "limited35Percent")).toBe(6_000);
    expect(
      get2026Points(351.8, "granClassWithRefreshments", "limited35Percent"),
    ).toBeUndefined();
  });
});

describe("入力可能な区間", () => {
  it("Gの中にGC、その中に飲料・軽食ありGCを許可する", () => {
    expect(() =>
      validateJourneySelection({
        origin: 0,
        destination: 5,
        highSpeed: { start: 1, end: 4 },
        green: { start: 0, end: 4 },
        granClass: { start: 1, end: 3 },
        granClassWithRefreshments: { start: 2, end: 3 },
      }),
    ).not.toThrow();
  });

  it("G外のGCを拒否する", () => {
    expect(() =>
      validateJourneySelection({
        origin: 0,
        destination: 5,
        green: { start: 0, end: 2 },
        granClass: { start: 3, end: 4 },
      }),
    ).toThrow("GC区間はG区間に含まれる必要があります");
  });
});

describe("2026年版の規則由来料金", () => {
  it("改定後の幹線・地方交通線運賃表を参照する", () => {
    expect(get2026TrunkBasicFare(3.6)).toBe(200);
    expect(get2026TrunkBasicFare(713.7)).toBe(10_780);
    expect(get2026LocalBasicFare(94.1)).toBe(1_980);
  });

  it("一部GCをG全区間とGC差額で計算する", () => {
    expect(
      get2026SpecialVehicleFare({ greenKm: 477.2, granClassKm: 11 }),
    ).toBe(8_550);
    expect(
      get2026SpecialVehicleFare({
        greenKm: 535.3,
        granClassKm: 351.8,
        granClassWithRefreshmentsKm: 351.8,
      }),
    ).toBe(12_400);
  });
});
