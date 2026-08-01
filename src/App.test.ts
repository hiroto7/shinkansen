import { describe, expect, it } from "vitest";
import {
  calculator2022,
  type Line,
  type SortedSection,
} from "./domain/versions/2022";
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
  calculator2022.lineGroups.get(group)!.lines[index]!;

describe("2026年版の通し特急料金", () => {
  it("宇都宮―那須塩原のポイントと比較額を維持する", () => {
    const line = route("東北新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "宇都宮", "那須塩原"),
      season: calculator2022.average,
    });

    expect(quote.points).toBe(2_000);
    expect(quote.nonReservedFare).toBe(1_790);
    expect(quote.paperFare).toBe(3_310);
  });

  it("東京―新庄の繁忙期普通車指定席を6,050円にする", () => {
    const line = route("山形新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "東京", "新庄"),
      season: calculator2022.busy,
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
      season: calculator2022.busy,
    });

    expect(quote.expressFare).toBe(5_520);
    expect(quote.specialVehicleFare).toBe(5_400);
    expect(quote.paperFare).toBe(18_400);
  });

  it("福島―新庄だけの利用には距離帯料金とシーズン加算を適用する", () => {
    const line = route("山形新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "福島", "新庄"),
      season: calculator2022.busy,
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
      season: calculator2022.average,
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
      season: calculator2022.average,
    });

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
      season: calculator2022.average,
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
      season: calculator2022.average,
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
      season: calculator2022.average,
    });

    expect(quote.points).toBe(4_500);
    expect(greenQuote.points).toBeUndefined();
    expect(greenQuote.exclusionReason).toBe("shinshuPreDc");
  });
});
