import { describe, expect, it } from "vitest";
import {
  calculateEastBasicFare,
  calculateLocalBasicFare,
  calculateTrunkBasicFare,
} from "./domain/basic-fares";
import {
  getCurrentPoints,
  getSpecialVehicleFare,
  specialVehicleExpressReduction,
} from "./domain/current-rules";
import {
  highSpeedExpressFareTable,
  standardExpressFareTables,
} from "./domain/fare-calculation";
import { createQuote } from "./domain/quote";
import {
  routes,
  sectionDistance,
  type Line,
  type SortedSection,
} from "./domain/routes";
import { average, busy } from "./domain/seasons";
import { validateJourneySelection, type Facility } from "./domain/types";

const section = (
  line: Line,
  departure: string,
  arrival: string,
): SortedSection => ({
  departure: line.find(({ name }) => name === departure)!,
  arrival: line.find(({ name }) => name === arrival)!,
  sorted: true,
});

const route = (group: string, index = 0) =>
  routes.lineGroups.get(group)!.lines[index]!;

const quote = (
  group: string,
  departure: string,
  arrival: string,
  options: Partial<Parameters<typeof createQuote>[0]> = {},
) => {
  const line = route(group);
  return createQuote({
    campaign: "regular",
    line,
    section: section(line, departure, arrival),
    season: average,
    ...options,
  });
};

const currentPoints = (
  distanceKm: number,
  facility: Facility,
  campaign: "regular" | "limited35Percent" = "regular",
) =>
  getCurrentPoints({
    distanceKm,
    facility,
    campaign,
    departure: "東京",
    arrival: "上野",
  });

describe("公開入口の見積もり", () => {
  describe("現行版", () => {
    it("宇都宮―那須塩原のポイントと比較額を維持する", () => {
      const result = quote("東北新幹線", "宇都宮", "那須塩原");

      expect(result.points).toBe(2_000);
      expect(result.nonReservedFareBreakdown).toEqual({
        basicFare: 910,
        expressFare: 880,
        specialVehicleFare: 0,
        total: 1_790,
      });
      expect(result.selectedFareBreakdown).toEqual({
        basicFare: 910,
        expressFare: 2_400,
        specialVehicleFare: 0,
        total: 3_310,
      });
    });

    it.each([
      ["山形新幹線", "東京", "新庄", busy, { basicFare: 7_480, expressFare: 6_050, paperFare: 13_530 }],
      ["山形新幹線", "福島", "新庄", busy, { expressFare: 2_310 }],
      ["上越新幹線", "東京", "ガーラ湯沢", average, { expressFare: 3_480 }],
      ["秋田新幹線", "水沢江刺", "秋田", average, { basicFare: 3_850 }],
      ["北陸新幹線", "上野", "長野", average, { distanceKm: 218.8, basicFare: 3_850 }],
    ] as const)("%sの%s―%sを所定額で計算する", (group, departure, arrival, season, expected) => {
      const index = arrival === "ガーラ湯沢" ? 1 : 0;
      const line = route(group, index);
      const result = createQuote({
        campaign: "regular",
        line,
        section: section(line, departure, arrival),
        season,
      });
      expect(result).toMatchObject(expected);
    });

    it("東京―新庄の全区間グリーン車を席種別料金10,920円にする", () => {
      const line = route("山形新幹線");
      const trip = section(line, "東京", "新庄");
      const result = createQuote({
        campaign: "regular",
        line,
        section: trip,
        green: { start: trip.departure.index, end: trip.arrival.index },
        season: busy,
      });

      expect(result).toMatchObject({
        expressFare: 5_520,
        specialVehicleFare: 5_400,
        paperFare: 18_400,
      });
    });

    it("グランクラス(A)と(B)の混在行程を(A)の所定額で計算する", () => {
      const line = route("東北新幹線");
      const trip = section(line, "宇都宮", "新青森");
      const granClass = { start: trip.departure.index, end: trip.arrival.index };
      const result = createQuote({
        campaign: "regular",
        line,
        section: trip,
        green: granClass,
        granClass,
        includesGranClassA: true,
        season: average,
      });

      expect(result).toMatchObject({
        points: 28_000,
        facility: "granClassWithRefreshments",
        specialVehicleFare: 12_600,
      });
    });

    it("不正な設備区間を例外にせず対象外として返す", () => {
      const line = route("東北新幹線");
      const result = quote("東北新幹線", "東京", "仙台", {
        green: { start: 0, end: line.length },
      });

      expect(result.points).toBeUndefined();
      expect(result.exclusionReason).toBe("invalidJourney");
    });

    it("小山から仙台で乗り継いではやぶさを利用する", () => {
      const line = routes.tohokuLine;
      const result = quote("東北新幹線", "小山", "新青森", {
        highSpeed: section(line, "仙台", "新青森"),
      });

      expect(result).toMatchObject({
        points: 14_000,
        expressFare: 6_280,
        paperFare: 16_510,
      });
      expect(quote("東北新幹線", "小山", "新青森")).toMatchObject({
        expressFare: 6_070,
        paperFare: 16_300,
      });
    });

    it("はやぶさを全区間または途中まで利用する", () => {
      const line = routes.tohokuLine;

      expect(quote("東北新幹線", "東京", "新青森", {
        highSpeed: section(line, "東京", "新青森"),
      })).toMatchObject({ expressFare: 7_330, paperFare: 18_110 });
      expect(quote("東北新幹線", "東京", "新青森", {
        highSpeed: section(line, "東京", "仙台"),
      })).toMatchObject({ expressFare: 7_130, paperFare: 17_910 });
    });

    it("料金表にない駅をはやぶさ利用区間へ指定しても例外にしない", () => {
      const line = routes.tohokuLine;
      const result = quote("東北新幹線", "小山", "新青森", {
        highSpeed: section(line, "小山", "新青森"),
      });

      expect(result.points).toBeUndefined();
      expect(result.exclusionReason).toBe("invalidJourney");
    });

    it("秋田直通では盛岡までの新幹線料金と盛岡以北を合成する", () => {
      const line = routes.akitaLine;
      const result = quote("秋田新幹線", "東京", "秋田", {
        highSpeed: section(line, "仙台", "秋田"),
      });

      expect(result).toMatchObject({
        expressFare: 7_700,
        paperFare: 18_150,
      });
    });
  });

  it("信州プレDCは対象駅間の普通車指定席だけにポイントを返す", () => {
    const line = route("北陸新幹線");
    const green = {
      start: line.find(({ name }) => name === "東京")!.index,
      end: line.find(({ name }) => name === "長野")!.index,
    };
    const ordinary = quote("北陸新幹線", "東京", "長野", {
      campaign: "shinshuPreDc",
    });
    const result = quote("北陸新幹線", "東京", "長野", {
      campaign: "shinshuPreDc",
      green,
    });

    expect(ordinary.points).toBe(4_500);
    expect(result.points).toBeUndefined();
    expect(result.exclusionReason).toBe("shinshuPreDc");
  });
});

describe("現行の料金規則", () => {
  it("駅と営業キロを提供する", () => {
    expect(sectionDistance(section(routes.yamagataLine, "東京", "新庄"))).toBe(421.4);
  });

  it.each([
    [routes.tohokuLine, "東京", "仙台", 5_040],
    [routes.joetsuLine, "長岡", "新潟", 2_400],
    [routes.hokurikuLine, "長野", "上越妙高", 2_400],
  ] as const)("通常列車の指定席特急料金表を参照する", (line, departure, arrival, fare) => {
    const standard = standardExpressFareTables.get(line)!;
    expect(standard(section(line, departure, arrival))).toBe(fare);
  });

  it("はやぶさ・こまちの指定席特急料金表を参照する", () => {
    expect(highSpeedExpressFareTable(
      section(routes.tohokuLine, "東京", "新青森"),
    )).toBe(7_330);
  });

  it.each([
    [477.2, "green", 16_000],
    [477.2, "granClassNoRefreshments", 19_000],
    [535.3, "granClassWithRefreshments", 25_500],
    [604.2, "granClassWithRefreshments", 28_000],
  ] as const)("%skm・%sの通常交換ポイントを%sにする", (distance, facility, points) => {
    expect(currentPoints(distance, facility)).toBe(points);
  });

  it("35%期間限定レートは飲料・軽食ありを対象外にする", () => {
    expect(currentPoints(351.8, "ordinary", "limited35Percent")).toBe(6_000);
    expect(currentPoints(351.8, "granClassWithRefreshments", "limited35Percent")).toBeUndefined();
  });

  it("グリーン車以上の区間内でグランクラス(A)と(B)の混在を許可する", () => {
    expect(() => validateJourneySelection({
      origin: 0,
      destination: 5,
      highSpeed: { start: 1, end: 4 },
      green: { start: 0, end: 4 },
      granClass: { start: 1, end: 3 },
      includesGranClassA: true,
    })).not.toThrow();
  });

  it("グリーン車以上の区間外にあるグランクラスを拒否する", () => {
    expect(() => validateJourneySelection({
      origin: 0,
      destination: 5,
      green: { start: 0, end: 2 },
      granClass: { start: 3, end: 4 },
    })).toThrow("グランクラス利用区間はグリーン車以上の利用区間に含まれる必要があります");
  });

  it("グランクラス区間なしで(A)だけを指定できない", () => {
    expect(() => validateJourneySelection({
      origin: 0,
      destination: 5,
      includesGranClassA: true,
    })).toThrow("グランクラス(A)を利用する場合はグランクラス利用区間が必要です");
  });

  it.each([
    [3.6, 200], [11, 260], [210, 3_850], [250, 4_620],
    [330, 5_940], [713.7, 10_780],
  ])("幹線%skmの普通運賃を%s円にする", (distance, fare) => {
    expect(calculateTrunkBasicFare(distance)).toBe(fare);
  });

  it.each([
    [7, 220], [29, 620], [94.1, 1_980], [137, 2_750], [210, 4_180],
  ])("地方交通線%skmの普通運賃を%s円にする", (distance, fare) => {
    expect(calculateLocalBasicFare(distance)).toBe(fare);
  });

  it.each([
    [75.6, 75.6, 1_600], [192.5, 75.6, 3_850], [7, 2, 220],
  ])("幹線%skm・地方交通線%skmの普通運賃を%s円にする", (distance, local, fare) => {
    expect(calculateEastBasicFare(distance, local)).toBe(fare);
  });

  it("特別車両料金と指定席料金の530円低減を全体へ適用する", () => {
    expect(getSpecialVehicleFare({ greenKm: 477.2, granClassKm: 11 })).toBe(8_550);
    expect(getSpecialVehicleFare({
      greenKm: 535.3,
      granClassKm: 535.3,
      includesGranClassA: true,
    })).toBe(12_400);
    expect(6_050 - specialVehicleExpressReduction).toBe(5_520);
  });

  const shinshuCases = [
    ["東京", "軽井沢", 3_000], ["東京", "佐久平", 4_000],
    ["東京", "上田", 4_000], ["東京", "長野", 4_500],
    ["東京", "飯山", 5_000], ["上野", "軽井沢", 3_000],
    ["上野", "佐久平", 4_000], ["上野", "上田", 4_000],
    ["上野", "長野", 4_500], ["上野", "飯山", 4_500],
    ["大宮", "軽井沢", 3_000], ["大宮", "佐久平", 3_000],
    ["大宮", "上田", 4_000], ["大宮", "長野", 4_000],
    ["大宮", "飯山", 4_500],
  ] as const;

  const shinshuPoints = (departure: string, arrival: string, facility: Facility) =>
    getCurrentPoints({
      distanceKm: 222.4,
      facility,
      campaign: "shinshuPreDc",
      departure,
      arrival,
    });

  it.each(shinshuCases)("信州プレDCの%s―%sを%sポイントにする", (departure, arrival, points) => {
    expect(shinshuPoints(departure, arrival, "ordinary")).toBe(points);
  });

  it("信州プレDCの逆方向を扱う", () => {
    expect(shinshuPoints("長野", "東京", "ordinary")).toBe(4_500);
  });

  it("信州プレDCの対象外区間と上位設備を拒否する", () => {
    expect(shinshuPoints("東京", "上越妙高", "ordinary")).toBeUndefined();
    expect(shinshuPoints("東京", "長野", "green")).toBeUndefined();
  });
});
