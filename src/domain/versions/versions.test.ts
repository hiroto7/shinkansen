import { describe, expect, it } from "vitest";
import { calculateBasicFare, calculateEastBasicFare } from "../basic-fares";
import { stationExpressFareRules2022_03_12 } from "../fare-calculation";
import { createQuote, supportedSeasonsForVersion } from "../quote";
import { routes, sectionDistance, type Line } from "../routes";
import { average } from "../seasons";
import { validateJourneySelection, type Facility } from "../types";
import { version2026 } from "./2026";

const section = (line: Line, departure: string, arrival: string) => ({
  departure: line.find(({ name }) => name === departure)!,
  arrival: line.find(({ name }) => name === arrival)!,
  sorted: true as const,
});

const quote2022 = (
  departure: string,
  arrival: string,
  campaign: "regular" | "shinkansenYear" = "regular",
) => {
  const line = routes.tohokuLine;
  return createQuote({
    version: "2022-03-12",
    campaign,
    line,
    section: section(line, departure, arrival),
    season: average,
  });
};

const currentPoints = (
  distanceKm: number,
  facility: Facility,
  campaign: "regular" | "limited35Percent" = "regular",
) =>
  version2026.getPoints({
    distanceKm,
    facility,
    campaign,
    departure: "東京",
    arrival: "上野",
  });

describe("共通の路線情報", () => {
  it("年版に依存しない駅と営業キロを提供する", () => {
    const line = routes.lineGroups.get("山形新幹線")!.lines[0]!;
    expect(sectionDistance(section(line, "東京", "新庄"))).toBe(421.4);
  });
});

describe("2022年版", () => {
  it("旧アプリの4距離帯と新幹線YEARを公開入口から維持する", () => {
    expect(quote2022("東京", "上野").points).toBe(2_160);
    expect(quote2022("東京", "宇都宮").points).toBe(4_620);
    expect(quote2022("東京", "仙台").points).toBe(7_940);
    expect(quote2022("東京", "新青森").points).toBe(12_110);
    expect(quote2022("東京", "仙台", "shinkansenYear").points).toBe(3_900);
  });

  it("東京―仙台の普通運賃と通常期指定席料金を維持する", () => {
    const result = quote2022("東京", "仙台");
    expect(result.basicFare).toBe(6_050);
    expect(result.expressFare).toBe(5_040);
    expect(result.paperFare).toBe(11_090);
  });

  it("新幹線eチケットには特定都区市内制度を適用しない", () => {
    const line = routes.hokurikuLine;
    const result = createQuote({
      version: "2022-03-12",
      campaign: "regular",
      line,
      section: section(line, "上野", "長野"),
      season: average,
    });

    expect(result.distanceKm).toBe(218.8);
    expect(result.basicFare).toBe(3_740);
  });

  it("3段階のシーズンだけを扱う", () => {
    expect(supportedSeasonsForVersion("2022-03-12")).toEqual([
      "閑散期",
      "通常期",
      "繁忙期",
    ]);
    const line = routes.tohokuLine;
    expect(() =>
      createQuote({
        version: "2022-03-12",
        campaign: "regular",
        line,
        section: section(line, "東京", "仙台"),
        season: "最繁忙期",
      }),
    ).toThrow("2022年3月12日時点では最繁忙期の設定がありません");
  });

  it("普通車以外を参考版の対象外にする", () => {
    const line = routes.tohokuLine;
    const trip = section(line, "東京", "仙台");
    const result = createQuote({
      version: "2022-03-12",
      campaign: "regular",
      line,
      section: trip,
      green: { start: trip.departure.index, end: trip.arrival.index },
      season: average,
    });
    expect(result.points).toBeUndefined();
    expect(result.exclusionReason).toBe("historicalFacility");
  });
});

describe("共通の新幹線指定席特急料金表", () => {
  const { standard, highSpeed } = stationExpressFareRules2022_03_12;

  it("Markdownの通常列車と、はやぶさ・こまちの表を参照する", () => {
    expect(standard.get(routes.tohokuLine)!(section(routes.tohokuLine, "東京", "仙台"))).toBe(5_040);
    expect(standard.get(routes.joetsuLine)!(section(routes.joetsuLine, "長岡", "新潟"))).toBe(2_400);
    expect(standard.get(routes.hokurikuLine)!(section(routes.hokurikuLine, "長野", "上越妙高"))).toBe(2_400);
    expect(highSpeed(section(routes.tohokuLine, "東京", "新青森"))).toBe(7_330);
  });
});

describe("2026年版の交換ポイント", () => {
  it("距離帯と設備で通常ポイントを決める", () => {
    expect(currentPoints(477.2, "green")).toBe(16_000);
    expect(currentPoints(477.2, "granClassNoRefreshments")).toBe(19_000);
    expect(currentPoints(535.3, "granClassWithRefreshments")).toBe(25_500);
    expect(currentPoints(604.2, "granClassWithRefreshments")).toBe(28_000);
  });

  it("35%期間限定レートは飲料・軽食ありを対象外にする", () => {
    expect(currentPoints(351.8, "ordinary", "limited35Percent")).toBe(6_000);
    expect(currentPoints(351.8, "granClassWithRefreshments", "limited35Percent")).toBeUndefined();
  });
});

describe("入力可能な区間", () => {
  it("グリーン車以上の区間内でグランクラス(A)と(B)の混在を許可する", () => {
    expect(() => validateJourneySelection({
      origin: 0,
      destination: 5,
      highSpeed: { start: 1, end: 4 },
      green: { start: 0, end: 4 },
      granClass: { start: 1, end: 3 },
      granClassWithRefreshments: { start: 2, end: 3 },
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
});

describe("2026年版の規則由来料金", () => {
  const rules = version2026.basicFareRules;

  it("旅客営業規則の賃率・中央営業キロ・特定額から幹線運賃を求める", () => {
    const { trunk } = rules;
    expect(calculateBasicFare(trunk, 3.6)).toBe(200);
    expect(calculateBasicFare(trunk, 11)).toBe(260);
    expect(calculateBasicFare(trunk, 210)).toBe(3_850);
    expect(calculateBasicFare(trunk, 250)).toBe(4_620);
    expect(calculateBasicFare(trunk, 330)).toBe(5_940);
    expect(calculateBasicFare(trunk, 713.7)).toBe(10_780);
  });

  it("地方交通線と幹線・地方交通線の連続利用を求める", () => {
    const { local } = rules;
    expect(calculateBasicFare(local, 7)).toBe(220);
    expect(calculateBasicFare(local, 29)).toBe(620);
    expect(calculateBasicFare(local, 94.1)).toBe(1_980);
    expect(calculateBasicFare(local, 137)).toBe(2_750);
    expect(calculateBasicFare(local, 210)).toBe(4_180);
    expect(calculateEastBasicFare(rules, 75.6, 75.6)).toBe(1_600);
    expect(calculateEastBasicFare(rules, 192.5, 75.6)).toBe(3_850);
    expect(calculateEastBasicFare(rules, 7, 2)).toBe(220);
  });

  it("特別車両料金と指定席料金の530円低減を全体へ適用する", () => {
    const special = version2026.specialVehicle!;
    expect(special.getFare({ greenKm: 477.2, granClassKm: 11 })).toBe(8_550);
    expect(special.getFare({
      greenKm: 535.3,
      granClassKm: 535.3,
      granClassWithRefreshmentsKm: 351.8,
    })).toBe(12_400);
    expect(6_050 - special.expressReduction).toBe(5_520);
  });
});

describe("2026年信州プレDC", () => {
  const campaignPoints = (departure: string, arrival: string, facility: Facility) =>
    version2026.getPoints({
      distanceKm: 222.4,
      facility,
      campaign: "shinshuPreDc",
      departure,
      arrival,
    });

  const cases = [
    ["東京", "軽井沢", 3_000], ["東京", "佐久平", 4_000],
    ["東京", "上田", 4_000], ["東京", "長野", 4_500],
    ["東京", "飯山", 5_000], ["上野", "軽井沢", 3_000],
    ["上野", "佐久平", 4_000], ["上野", "上田", 4_000],
    ["上野", "長野", 4_500], ["上野", "飯山", 4_500],
    ["大宮", "軽井沢", 3_000], ["大宮", "佐久平", 3_000],
    ["大宮", "上田", 4_000], ["大宮", "長野", 4_000],
    ["大宮", "飯山", 4_500],
  ] as const;

  it.each(cases)("%s―%sを%sポイントにする", (departure, arrival, points) => {
    expect(campaignPoints(departure, arrival, "ordinary")).toBe(points);
  });

  it("逆方向を扱う", () => {
    expect(campaignPoints("長野", "東京", "ordinary")).toBe(4_500);
  });

  it("対象外区間と上位設備を拒否する", () => {
    expect(campaignPoints("東京", "上越妙高", "ordinary")).toBeUndefined();
    expect(campaignPoints("東京", "長野", "green")).toBeUndefined();
  });
});
