import { routes, type Line, type SortedSection, type Station } from "./domain/routes";
import type { Season } from "./domain/seasons";
import type { Facility, Interval } from "./domain/types";
import { createQuote, type Campaign } from "./domain/quote";

export type RankingBasis = "nonReserved" | "reserved" | "highSpeed";
export type DirectedInterval = readonly [number, number];

export const rate = (fare: number | undefined, points: number | undefined) =>
  fare !== undefined && points !== undefined ? fare / points : undefined;

export const intervalWithin = (
  interval: Interval,
  outerStart: number,
  outerEnd: number,
): Interval | undefined => {
  if (!(outerStart < outerEnd)) return undefined;
  const clampedStart = Math.max(
    outerStart,
    Math.min(interval.start, outerEnd - 1),
  );
  const clampedEnd = Math.min(
    outerEnd,
    Math.max(interval.end, outerStart + 1),
  );
  if (clampedStart < clampedEnd) {
    return { start: clampedStart, end: clampedEnd };
  }
  return { start: outerStart, end: outerEnd };
};

const highSpeedAvailableStations = (line: Line, section: SortedSection) => {
  const omiya = routes.tohokuLine.find(({ name }) => name === "大宮")!;
  const sendai = routes.tohokuLine.find(({ name }) => name === "仙台")!;
  return line
    .slice(section.departure.index, section.arrival.index + 1)
    .filter(
      (station) =>
        station.index <= omiya.index ||
        ((line === routes.tohokuLine || line === routes.akitaLine) &&
          station.index >= sendai.index),
    );
};

export const highSpeedStationsForSection = (
  line: Line,
  section: SortedSection,
): readonly Station[] => {
  if (line !== routes.tohokuLine && line !== routes.akitaLine) return [];
  const morioka = routes.tohokuLine.find(({ name }) => name === "盛岡")!;
  const sendai = routes.tohokuLine.find(({ name }) => name === "仙台")!;
  return highSpeedAvailableStations(line, section).filter(
    (station) =>
      station === section.departure ||
      station === section.arrival ||
      (sendai.index <= station.index && station.index < morioka.index),
  );
};

export const defaultHighSpeedSection = (
  line: Line,
  section: SortedSection,
): Interval | undefined => {
  if (line !== routes.tohokuLine && line !== routes.akitaLine) return undefined;
  const omiya = routes.tohokuLine.find(({ name }) => name === "大宮")!;
  const sendai = routes.tohokuLine.find(({ name }) => name === "仙台")!;
  const morioka = routes.tohokuLine.find(({ name }) => name === "盛岡")!;
  const available =
    (section.departure.index <= omiya.index &&
      section.arrival.index >= sendai.index) ||
    (section.departure.index < morioka.index &&
      section.arrival.index > sendai.index);
  if (!available) return undefined;

  const stations = highSpeedStationsForSection(line, section);
  const start = stations[0];
  const end = stations.at(-1);
  if (start && end && start.index < end.index) {
    return { start: start.index, end: end.index };
  }
  return undefined;
};

export const highSpeedIntervalWithin = (
  interval: Interval,
  line: Line,
  section: SortedSection,
): Interval | undefined => {
  const fallback = defaultHighSpeedSection(line, section);
  if (!fallback) return undefined;
  const stations = highSpeedStationsForSection(line, section);
  const start = stations.find(({ index }) => index >= interval.start);
  const end = stations.findLast(({ index }) => index <= interval.end);
  if (start && end && start.index < end.index) {
    return { start: start.index, end: end.index };
  }
  return fallback;
};

export const granClassLastIndex = (line: Line) => {
  if (line === routes.akitaLine) {
    return line.find(({ name }) => name === "盛岡")!.index;
  }
  if (line === routes.yamagataLine) {
    return line.find(({ name }) => name === "福島")!.index;
  }
  return line.length - 1;
};

export const defaultFacilitySections = (
  line: Line,
  section: SortedSection,
  facility: Facility,
): Readonly<{
  green?: Interval;
  granClass?: Interval;
  includesGranClassA?: true;
}> | undefined => {
  if (facility === "ordinary") return {};
  const green: Interval = {
    start: section.departure.index,
    end: section.arrival.index,
  };
  if (facility === "green") return { green };

  const granClassEnd = Math.min(section.arrival.index, granClassLastIndex(line));
  if (section.departure.index >= granClassEnd) return undefined;
  return {
    green,
    granClass: { start: section.departure.index, end: granClassEnd },
    ...(facility === "granClassWithRefreshments"
      ? { includesGranClassA: true }
      : {}),
  };
};

export const rankingBasisForHighSpeed = (
  selected: Interval | undefined,
  defaultValue: Interval | undefined,
): RankingBasis | undefined => {
  if (!selected) return "reserved";
  if (
    selected.start === defaultValue?.start &&
    selected.end === defaultValue.end
  ) return "highSpeed";
  return undefined;
};

export const sectionFrom = (line: Line, interval: Interval | undefined) => {
  if (!interval) return undefined;
  return {
    departure: line[interval.start]!,
    arrival: line[interval.end]!,
    sorted: true as const,
  };
};

const rankingSections = (() => {
  const sections = new Map<
    string,
    { readonly group: string; readonly line: Line; readonly section: SortedSection }
  >();
  for (const [group, { lines }] of routes.lineGroups) {
    for (const line of lines) {
      line.forEach((departure, index) => {
        line.slice(index + 1).forEach((arrival) => {
          const key = `${departure.name}|${arrival.name}`;
          if (!sections.has(key)) {
            sections.set(key, {
              group,
              line,
              section: { departure, arrival, sorted: true },
            });
          }
        });
      });
    }
  }
  return [...sections.values()];
})();

export const rankRows = <T extends { readonly value: number },>(rows: readonly T[]) =>
  [...rows]
    .sort((a, b) => b.value - a.value)
    .map((row, _index, sorted) => ({
      ...row,
      rank: sorted.findIndex(({ value }) => value === row.value) + 1,
    }));

export const buildRankingRows = (
  campaign: Campaign,
  season: Season,
  facility: Facility,
  basis: RankingBasis,
) => rankRows(rankingSections.flatMap(({ group, line, section }) => {
  const facilities = defaultFacilitySections(line, section, facility);
  if (!facilities) return [];
  let highSpeed;
  if (basis === "highSpeed") {
    highSpeed = sectionFrom(line, defaultHighSpeedSection(line, section));
  }
  const quote = createQuote({
    campaign,
    line,
    section,
    ...facilities,
    ...(highSpeed ? { highSpeed } : {}),
    season,
  });
  if (quote.points === undefined) return [];
  return [{
    key: `${section.departure.name}-${section.arrival.name}`,
    group,
    departure: section.departure.name,
    arrival: section.arrival.name,
    ...quote,
    value:
      facility === "ordinary" && basis === "nonReserved"
        ? rate(quote.nonReservedFare ?? quote.paperFare, quote.points) ?? 0
        : rate(quote.paperFare, quote.points) ?? 0,
  }];
}));

export const rankForRate = (
  rows: ReturnType<typeof buildRankingRows>,
  value: number | undefined,
) => {
  if (value === undefined) return undefined;
  return rows.find(({ value: ranked }) => ranked <= value)?.rank ?? rows.length + 1;
};

export const updateDirectedInterval = (
  stations: readonly Station[],
  [from, to]: DirectedInterval,
  edge: 0 | 1,
  value: number,
): DirectedInterval => {
  let changed: DirectedInterval = [from, value];
  if (edge === 0) changed = [value, to];
  const fromPosition = stations.findIndex(({ index }) => index === changed[0]);
  const toPosition = stations.findIndex(({ index }) => index === changed[1]);
  if (fromPosition < toPosition) return changed;
  if (edge === 0) {
    return [value, stations[fromPosition + 1]?.index ?? to];
  }
  return [stations[toPosition - 1]?.index ?? from, value];
};
