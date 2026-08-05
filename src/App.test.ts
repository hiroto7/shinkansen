import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, {
  defaultHighSpeedSection,
  defaultFacilitySections,
  highSpeedIntervalWithin,
  highSpeedStationsForSection,
  intervalWithin,
  rangeAfterEndChange,
  rangeAfterStartChange,
} from "./App";
import { routes, type Line, type SortedSection } from "./domain/routes";

const section = (
  line: Line,
  departure: string,
  arrival: string,
): SortedSection => ({
  departure: line.find(({ name }) => name === departure)!,
  arrival: line.find(({ name }) => name === arrival)!,
  sorted: true,
});

describe("入力区間補正", () => {
  const line = routes.tohokuLine;

  it("始点が終点以降になった場合は終点を次の駅へ送る", () => {
    expect(rangeAfterStartChange(line, 4, 4)).toEqual({ start: 4, end: 5 });
  });

  it("終点が始点以前になった場合は始点を前の駅へ戻す", () => {
    expect(rangeAfterEndChange(line, 4, 4)).toEqual({ start: 3, end: 4 });
  });

  it("既存の設備区間が乗車区間外になっても設備選択を維持する", () => {
    expect(intervalWithin({ start: 10, end: 12 }, 2, 4)).toEqual({
      start: 3,
      end: 4,
    });
  });

  it("小山発では仙台から先をはやぶさ・こまち利用区間にする", () => {
    const trip = section(line, "小山", "新青森");

    expect(defaultHighSpeedSection(line, trip)).toEqual({
      start: line.find(({ name }) => name === "仙台")!.index,
      end: trip.arrival.index,
    });
    expect(
      highSpeedStationsForSection(line, trip).map(({ name }) => name),
    ).not.toContain("小山");
    expect(
      highSpeedStationsForSection(line, trip).map(({ name }) => name),
    ).toContain("仙台");
  });

  it("乗車区間変更後も利用可能なはやぶさ・こまち区間へ補正する", () => {
    const trip = section(line, "小山", "新青森");

    expect(highSpeedIntervalWithin({ start: 0, end: 22 }, line, trip)).toEqual({
      start: line.find(({ name }) => name === "仙台")!.index,
      end: trip.arrival.index,
    });
  });

  it("料金差を適用できる区間がなければ選択肢を出さない", () => {
    expect(
      defaultHighSpeedSection(line, section(line, "小山", "仙台")),
    ).toBeUndefined();
  });

  it("秋田直通ではこまち利用区間を秋田まで保持する", () => {
    const akita = routes.akitaLine;
    const trip = section(akita, "東京", "秋田");

    expect(defaultHighSpeedSection(akita, trip)).toEqual({
      start: trip.departure.index,
      end: trip.arrival.index,
    });
  });

  it("設備選択時は設定可能な全区間を既定にする", () => {
    const akita = routes.akitaLine;
    const trip = section(akita, "東京", "秋田");

    expect(defaultFacilitySections(akita, trip, "green")).toEqual({
      green: { start: trip.departure.index, end: trip.arrival.index },
    });
    expect(
      defaultFacilitySections(akita, trip, "granClassWithRefreshments"),
    ).toEqual({
      green: { start: trip.departure.index, end: trip.arrival.index },
      granClass: {
        start: trip.departure.index,
        end: akita.find(({ name }) => name === "盛岡")!.index,
      },
      includesGranClassA: true,
    });
  });
});

describe("区間入力画面", () => {
  it("通常表示では乗車駅と降車駅だけを表示する", () => {
    const html = renderToStaticMarkup(createElement(App));

    expect(html).toContain('class="journey-fields"');
    expect(html).not.toContain("データ年版");
    expect(html).not.toContain("新幹線YEARスペシャル");
    expect(html).toContain("全線35%特別レート");
    expect(html).toContain("最繁忙期");
    expect(html).toContain("乗車駅");
    expect(html).toContain("降車駅");
    expect(html).not.toContain("はやぶさ・こまち利用区間 始点");
    expect(html).not.toContain("グリーン車を利用する区間 始点");
    expect(html).toContain(
      'href="https://shinkansen-2022.vercel.app/">2022年版（更新終了・参考）',
    );
    expect(html).toContain("現行の運賃・制度とは異なります");
  });
});
