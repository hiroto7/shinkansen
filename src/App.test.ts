import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, {
  defaultFacilitySections,
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
    expect(html).toContain("乗車駅");
    expect(html).toContain("降車駅");
    expect(html).not.toContain("はやぶさ・こまち利用区間 始点");
    expect(html).not.toContain("グリーン車を利用する区間 始点");
  });
});
