import { describe, expect, it } from "vitest";
import {
  buildRankingRows,
  defaultFacilitySections,
  defaultHighSpeedSection,
  highSpeedIntervalWithin,
  highSpeedStationsForSection,
  intervalWithin,
  rankRows,
  rankingBasisForHighSpeed,
  updateDirectedInterval,
} from "./app-logic";
import { routes, type Line, type SortedSection } from "./domain/routes";
import { average } from "./domain/seasons";

const section = (
  line: Line,
  departure: string,
  arrival: string,
): SortedSection => ({
  departure: line.find(({ name }) => name === departure)!,
  arrival: line.find(({ name }) => name === arrival)!,
  sorted: true,
});

describe("区間入力", () => {
  const line = routes.tohokuLine;

  it("乗車側が降車側以降になった場合は降車側を次の駅へ送る", () => {
    expect(updateDirectedInterval(line, [3, 4], 0, 4)).toEqual([4, 5]);
  });

  it("降車側が乗車側以前になった場合は乗車側を前の駅へ戻す", () => {
    expect(updateDirectedInterval(line, [3, 4], 1, 3)).toEqual([2, 3]);
  });

  it("逆方向も画面上の駅順で区間を補正する", () => {
    const reversed = line.toReversed();
    expect(updateDirectedInterval(reversed, [22, 0], 0, 10)).toEqual([10, 0]);
    expect(updateDirectedInterval(reversed, [10, 0], 1, 10)).toEqual([11, 10]);
  });

  it("既存の設備区間が乗車区間外になっても設備選択を維持する", () => {
    expect(intervalWithin({ start: 10, end: 12 }, 2, 4)).toEqual({ start: 3, end: 4 });
  });

  it("小山発では仙台から先をはやぶさ・こまち利用区間にする", () => {
    const trip = section(line, "小山", "新青森");
    expect(defaultHighSpeedSection(line, trip)).toEqual({
      start: line.find(({ name }) => name === "仙台")!.index,
      end: trip.arrival.index,
    });
    const stations = highSpeedStationsForSection(line, trip).map(({ name }) => name);
    expect(stations).not.toContain("小山");
    expect(stations).toContain("仙台");
  });

  it("乗車区間変更後も利用可能なはやぶさ・こまち区間へ補正する", () => {
    const trip = section(line, "小山", "新青森");
    expect(highSpeedIntervalWithin({ start: 0, end: 22 }, line, trip)).toEqual({
      start: line.find(({ name }) => name === "仙台")!.index,
      end: trip.arrival.index,
    });
  });

  it("料金差を適用できる区間がなければ選択肢を出さない", () => {
    expect(defaultHighSpeedSection(line, section(line, "小山", "仙台"))).toBeUndefined();
  });

  it("秋田直通ではこまち利用区間を秋田まで保持する", () => {
    const line = routes.akitaLine;
    const trip = section(line, "東京", "秋田");
    expect(defaultHighSpeedSection(line, trip)).toEqual({
      start: trip.departure.index,
      end: trip.arrival.index,
    });
  });

  it("設備選択時は設定可能な全区間を既定にする", () => {
    const line = routes.akitaLine;
    const trip = section(line, "東京", "秋田");
    expect(defaultFacilitySections(line, trip, "green")).toEqual({
      green: { start: trip.departure.index, end: trip.arrival.index },
    });
    expect(defaultFacilitySections(line, trip, "granClassWithRefreshments")).toEqual({
      green: { start: trip.departure.index, end: trip.arrival.index },
      granClass: {
        start: trip.departure.index,
        end: line.find(({ name }) => name === "盛岡")!.index,
      },
      includesGranClassA: true,
    });
  });
});

describe("ランキング", () => {
  it("共有区間を重複させない", () => {
    const rows = buildRankingRows("regular", average, "ordinary", "nonReserved");
    expect(new Set(rows.map(({ key }) => key)).size).toBe(rows.length);
    const tokyoSendai = rows.filter(
      ({ departure, arrival }) => departure === "東京" && arrival === "仙台",
    );
    expect(tokyoSendai).toHaveLength(1);
  });

  it("同じレートを同順位にする", () => {
    const rows = rankRows([
      { value: 3 },
      { value: 2 },
      { value: 2 },
      { value: 1 },
    ]);
    expect(rows.map(({ rank }) => rank)).toEqual([1, 2, 2, 4]);
  });

  it("はやぶさ・こまち料金を適用し、対象外区間は指定席へ戻す", () => {
    const reserved = buildRankingRows("regular", average, "ordinary", "reserved");
    const highSpeed = buildRankingRows("regular", average, "ordinary", "highSpeed");
    const fare = (rows: typeof reserved, departure: string, arrival: string) =>
      rows.find((row) => row.departure === departure && row.arrival === arrival)?.paperFare;
    expect(highSpeed).toHaveLength(reserved.length);
    expect(fare(highSpeed, "東京", "新青森")).toBe(18_110);
    expect(fare(highSpeed, "東京", "宇都宮")).toBe(fare(reserved, "東京", "宇都宮"));
  });

  it("既定からずらしたはやぶさ・こまち区間には順位を付けない", () => {
    const defaultValue = { start: 0, end: 22 };
    expect(rankingBasisForHighSpeed(undefined, defaultValue)).toBe("reserved");
    expect(rankingBasisForHighSpeed(defaultValue, defaultValue)).toBe("highSpeed");
    expect(rankingBasisForHighSpeed({ start: 10, end: 22 }, defaultValue)).toBeUndefined();
  });
});
