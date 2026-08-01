import { describe, expect, it } from "vitest";
import { legacy2022Engine, type Line, type SortedSection } from "../App";
import { createQuote } from "./App";

const section = (line: Line, departure: string, arrival: string): SortedSection => ({
  departure: line.find((station) => station.name === departure)!,
  arrival: line.find((station) => station.name === arrival)!,
  sorted: true,
});

const route = (group: string, index = 0) =>
  legacy2022Engine.lineGroups.get(group)!.lines[index]!;

describe("2026年版の通し特急料金", () => {
  it("東京―新庄の繁忙期普通車指定席を6,050円にする", () => {
    const line = route("山形新幹線");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line,
      section: section(line, "東京", "新庄"),
      season: legacy2022Engine.busy,
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
      season: legacy2022Engine.busy,
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
      season: legacy2022Engine.busy,
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
      season: legacy2022Engine.average,
    });

    expect(quote.expressFare).toBe(3_480);
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
      season: legacy2022Engine.average,
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
      season: legacy2022Engine.average,
    });

    expect(quote.points).toBe(4_500);
    expect(greenQuote.points).toBeUndefined();
  });
});
