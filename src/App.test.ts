import { describe, expect, it } from "vitest";
import type { Line, SortedSection } from "./domain/routes";
import { routes } from "./domain/routes";
import { average, busy } from "./domain/seasons";
import {
  intervalWithin,
  rangeAfterEndChange,
  rangeAfterStartChange,
} from "./App";
import { createQuote } from "./domain/quote";

const section = (line: Line, departure: string, arrival: string): SortedSection => ({
  departure: line.find((station) => station.name === departure)!,
  arrival: line.find((station) => station.name === arrival)!,
  sorted: true,
});

const route = (group: string, index = 0) =>
  routes.lineGroups.get(group)!.lines[index]!;

describe("2026年版の通し特急料金", () => {
  it("宇都宮―那須塩原のポイントと比較額を維持する", () => {
    const line = route("東北新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "宇都宮", "那須塩原"),
      season: average,
    });

    expect(quote.points).toBe(2_000);
    expect(quote.nonReservedFare).toBe(1_790);
    expect(quote.paperFare).toBe(3_310);
    expect(quote.nonReservedFareBreakdown).toEqual({
      basicFare: 910,
      expressFare: 880,
      specialVehicleFare: 0,
      total: 1_790,
    });
    expect(quote.selectedFareBreakdown).toEqual({
      basicFare: 910,
      expressFare: 2_400,
      specialVehicleFare: 0,
      total: 3_310,
    });
  });

  it("東京―新庄の繁忙期普通車指定席を6,050円にする", () => {
    const line = route("山形新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "東京", "新庄"),
      season: busy,
    });

    expect(quote.basicFare).toBe(7_480);
    expect(quote.expressFare).toBe(6_050);
    expect(quote.paperFare).toBe(13_530);
  });

  it("東京―新庄の全区間グリーン車を席種別料金10,920円にする", () => {
    const line = route("山形新幹線");
    const trip = section(line, "東京", "新庄");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: trip,
      green: { start: trip.departure.index, end: trip.arrival.index },
      season: busy,
    });

    expect(quote.expressFare).toBe(5_520);
    expect(quote.specialVehicleFare).toBe(5_400);
    expect(quote.paperFare).toBe(18_400);
  });

  it("グランクラス(A)と(B)の混在行程を(A)の所定額で計算する", () => {
    const line = route("東北新幹線");
    const trip = section(line, "宇都宮", "新青森");
    const granClass = {
      start: trip.departure.index,
      end: trip.arrival.index,
    };
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: trip,
      green: granClass,
      granClass,
      granClassWithRefreshments: {
        start: line.find(({ name }) => name === "仙台")!.index,
        end: trip.arrival.index,
      },
      season: average,
    });

    expect(quote.points).toBe(28_000);
    expect(quote.facility).toBe("granClassWithRefreshments");
    expect(quote.specialVehicleFare).toBe(12_600);
  });

  it("福島―新庄だけの利用には距離帯料金とシーズン加算を適用する", () => {
    const line = route("山形新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "福島", "新庄"),
      season: busy,
    });

    expect(quote.expressFare).toBe(2_310);
  });

  it("ガーラ湯沢区間の100円を在来線特急料金で上書きしない", () => {
    const line = route("上越新幹線", 1);
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "東京", "ガーラ湯沢"),
      season: average,
    });

    expect(quote.expressFare).toBe(3_480);
  });

  it("田沢湖線をまたぐ普通運賃を現行の賃率換算キロで計算する", () => {
    const line = route("秋田新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "水沢江刺", "秋田"),
      season: average,
    });

    expect(quote.basicFare).toBe(3_850);
  });

  it("新幹線eチケットには特定都区市内制度を適用しない", () => {
    const line = route("北陸新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "上野", "長野"),
      season: average,
    });

    expect(quote.distanceKm).toBe(218.8);
    expect(quote.basicFare).toBe(3_850);
  });

  it("不正な設備区間を例外にせず対象外として返す", () => {
    const line = route("東北新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "東京", "仙台"),
      green: { start: 0, end: line.length },
      season: average,
    });

    expect(quote.points).toBeUndefined();
    expect(quote.exclusionReason).toBe("invalidJourney");
  });
});

describe("設備区間の入力", () => {
  const line = route("東北新幹線");

  it("始点が終点以降になった場合は終点を次の駅へ送る", () => {
    expect(rangeAfterStartChange(line, 4, 4)).toEqual({ start: 4, end: 5 });
  });

  it("終点が始点以前になった場合は始点を前の駅へ戻す", () => {
    expect(rangeAfterEndChange(line, 4, 4)).toEqual({ start: 3, end: 4 });
  });

  it("既存の設備区間が乗車区間外になっても設備選択を維持する", () => {
    expect(intervalWithin(true, 10, 12, 2, 4)).toEqual({ start: 3, end: 4 });
  });
});

describe("信州プレDCの画面用計算", () => {
  it("対象駅間の普通車指定席だけにポイントを返す", () => {
    const line = route("北陸新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "shinshuPreDc",
      line,
      section: section(line, "東京", "長野"),
      season: average,
    });
    const greenQuote = createQuote({
      version: "2026-03-14",
      campaign: "shinshuPreDc",
      line,
      section: section(line, "東京", "長野"),
      green: {
        start: line.find((station) => station.name === "東京")!.index,
        end: line.find((station) => station.name === "長野")!.index,
      },
      season: average,
    });

    expect(quote.points).toBe(4_500);
    expect(greenQuote.points).toBeUndefined();
    expect(greenQuote.exclusionReason).toBe("shinshuPreDc");
  });
});
