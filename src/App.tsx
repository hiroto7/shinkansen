import { useMemo, useState } from "react";
import {
  routes,
  type Line,
  type SortedSection,
  type Station,
} from "./domain/routes";
import { average, seasons, type Season } from "./domain/seasons";
import type { Facility, Interval } from "./domain/types";
import {
  createQuote,
  type Campaign,
  type ExclusionReason,
  type FareBreakdown,
} from "./domain/quote";
import "./App.css";

type Tab = "detail" | "ranking";
type RankingFacility = Facility;
type RankingLimit = 50 | 100 | "all";
type OrdinaryRankingBasis = "nonReserved" | "reserved";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat("ja-JP");

const facilityLabels: Readonly<Record<Facility, string>> = {
  ordinary: "普通車指定席",
  green: "グリーン車",
  granClassNoRefreshments: "グランクラス（飲料・軽食なし）",
  granClassWithRefreshments: "グランクラス（飲料・軽食ありを含む）",
};

const seasonLabels: Readonly<Record<Season, string>> = {
  閑散期: "閑散期",
  通常期: "通常期",
  繁忙期: "繁忙期",
  最繁忙期: "最繁忙期",
};

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
  return clampedStart < clampedEnd
    ? { start: clampedStart, end: clampedEnd }
    : { start: outerStart, end: outerEnd };
};

const highSpeedAvailableStations = (
  line: Line,
  section: SortedSection,
) => {
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
  return start && end && start.index < end.index
    ? { start: start.index, end: end.index }
    : undefined;
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
  return start && end && start.index < end.index
    ? { start: start.index, end: end.index }
    : fallback;
};

const granClassLastIndex = (line: Line) => {
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
  const granClass: Interval = {
    start: section.departure.index,
    end: granClassEnd,
  };
  return {
    green,
    granClass,
    ...(facility === "granClassWithRefreshments"
      ? { includesGranClassA: true }
      : {}),
  };
};

const rate = (fare: number | undefined, points: number | undefined) =>
  fare !== undefined && points !== undefined ? fare / points : undefined;

const RateCard = ({
  label,
  breakdown,
  points,
}: {
  label: string;
  breakdown?: FareBreakdown | undefined;
  points?: number | undefined;
}) => (
  <article className="rate-card">
    <span>{label}</span>
    <strong>{breakdown === undefined ? "—" : yen.format(breakdown.total)}</strong>
    <small>{rate(breakdown?.total, points)?.toFixed(2) ?? "—"} 円/pt</small>
    {breakdown && (
      <dl className="rate-breakdown">
        <div><dt>普通運賃</dt><dd>{yen.format(breakdown.basicFare)}</dd></div>
        <div><dt>特急料金</dt><dd>{yen.format(breakdown.expressFare)}</dd></div>
        {breakdown.specialVehicleFare > 0 && (
          <div><dt>特別車両料金</dt><dd>{yen.format(breakdown.specialVehicleFare)}</dd></div>
        )}
      </dl>
    )}
  </article>
);

export const rangeAfterStartChange = (
  stations: readonly Station[],
  end: number,
  start: number,
) => {
  const position = stations.findIndex((station) => station.index === start);
  const next = stations[position + 1];
  return { start, end: start >= end && next ? next.index : end };
};

export const rangeAfterEndChange = (
  stations: readonly Station[],
  start: number,
  end: number,
) => {
  const position = stations.findIndex((station) => station.index === end);
  const previous = stations[position - 1];
  return { start: end <= start && previous ? previous.index : start, end };
};

const RangeSelect = ({
  label,
  stations,
  start,
  end,
  onStart,
  onEnd,
}: {
  label: string;
  stations: readonly Station[];
  start: number;
  end: number;
  onStart: (value: number) => void;
  onEnd: (value: number) => void;
}) => {
  const selectStart = (value: number) => {
    const range = rangeAfterStartChange(stations, end, value);
    if (range.end !== end) onEnd(range.end);
    onStart(range.start);
  };
  const selectEnd = (value: number) => {
    const range = rangeAfterEndChange(stations, start, value);
    if (range.start !== start) onStart(range.start);
    onEnd(range.end);
  };

  return (
    <div className="range-select">
      <span>{label}</span>
      <select
        aria-label={`${label} 始点`}
        value={start}
        onChange={(event) => selectStart(Number(event.target.value))}
      >
        {stations.slice(0, -1).map((station) => (
          <option value={station.index} key={station.name}>{station.name}</option>
        ))}
      </select>
      <span className="range-arrow">→</span>
      <select
        aria-label={`${label} 終点`}
        value={end}
        onChange={(event) => selectEnd(Number(event.target.value))}
      >
        {stations.slice(1).map((station) => (
          <option value={station.index} key={station.name}>{station.name}</option>
        ))}
      </select>
    </div>
  );
};

const exclusionMessages: Readonly<
  Record<ExclusionReason, { readonly title: string; readonly detail: string }>
> = {
  limitedFacility: {
    title: "全線35%特別レートの対象外です",
    detail: "飲料・軽食ありのグランクラスは対象外です。",
  },
  shinshuPreDc: {
    title: "信州プレDCの対象外です",
    detail:
      "公式表に掲載された北陸新幹線の対象駅間・普通車指定席のみ計算できます。",
  },
  invalidJourney: {
    title: "利用区間を計算できません",
    detail: "各設備の始点と終点、および区間の包含関係を確認してください。",
  },
};

const App = () => {
  const [tab, setTab] = useState<Tab>("detail");
  const [campaign, setCampaign] = useState<Campaign>("regular");
  const [groupName, setGroupName] = useState("東北新幹線");
  const group = routes.lineGroups.get(groupName)!;
  const [routeIndex, setRouteIndex] = useState(0);
  const line = group.lines[Math.min(routeIndex, group.lines.length - 1)]!;
  const [departureIndex, setDepartureIndex] = useState(0);
  const [arrivalIndex, setArrivalIndex] = useState(line.length - 1);
  const [season, setSeason] = useState<Season>(average);
  const [highSpeed, setHighSpeed] = useState<Interval>();
  const [facility, setFacility] = useState<Facility>("ordinary");
  const [green, setGreen] = useState<Interval>();
  const [granClass, setGranClass] = useState<Interval>();
  const [rankingFacility, setRankingFacility] =
    useState<RankingFacility>("ordinary");
  const [rankingLimit, setRankingLimit] = useState<RankingLimit>(50);
  const [ordinaryRankingBasis, setOrdinaryRankingBasis] =
    useState<OrdinaryRankingBasis>("nonReserved");

  const resetRoute = (nextGroupName: string, nextRouteIndex = 0) => {
    const nextLine = routes.lineGroups.get(nextGroupName)!.lines[nextRouteIndex]!;
    setGroupName(nextGroupName);
    setRouteIndex(nextRouteIndex);
    setDepartureIndex(0);
    setArrivalIndex(nextLine.length - 1);
    setHighSpeed(undefined);
    setFacility("ordinary");
    setGreen(undefined);
    setGranClass(undefined);
  };

  const sorted = routes.sortSection({
    departure: line[Math.min(departureIndex, line.length - 2)]!,
    arrival: line[Math.max(1, Math.min(arrivalIndex, line.length - 1))]!,
  }).section;
  const tripStart = sorted.departure.index;
  const tripEnd = sorted.arrival.index;
  const tripStations = line.slice(tripStart, tripEnd + 1);
  const defaultHighSpeed = defaultHighSpeedSection(line, sorted);
  const highSpeedStations = highSpeedStationsForSection(line, sorted);
  const granClassLimit = granClassLastIndex(line);
  const granClassAvailable = tripStart < Math.min(tripEnd, granClassLimit);
  const selectedHighSpeed = highSpeed
    ? highSpeedIntervalWithin(highSpeed, line, sorted)
    : undefined;
  const selectedGreen = green
    ? intervalWithin(green, tripStart, tripEnd)
    : undefined;
  const granClassOuterStart = selectedGreen?.start ?? tripStart;
  const granClassOuterEnd = Math.min(
    selectedGreen?.end ?? tripEnd,
    granClassLimit,
  );
  const granClassStations = line.slice(
    granClassOuterStart,
    granClassOuterEnd + 1,
  );
  const selectedGranClass = granClass
    ? intervalWithin(granClass, granClassOuterStart, granClassOuterEnd)
    : undefined;
  const selectedFacility: Facility = selectedGranClass
    ? facility
    : selectedGreen
      ? "green"
      : "ordinary";
  const highSpeedSection = selectedHighSpeed
    ? { departure: line[selectedHighSpeed.start]!, arrival: line[selectedHighSpeed.end]!, sorted: true as const }
    : undefined;

  const quote = createQuote({
    campaign,
    line,
    section: sorted,
    ...(highSpeedSection ? { highSpeed: highSpeedSection } : {}),
    ...(selectedGreen ? { green: selectedGreen } : {}),
    ...(selectedGranClass ? { granClass: selectedGranClass } : {}),
    ...(facility === "granClassWithRefreshments" && selectedGranClass
      ? { includesGranClassA: true }
      : {}),
    season,
  });

  const rankingRows = useMemo(() => {
    if (tab !== "ranking") return [];
    const rows = [...routes.lineGroups.entries()].flatMap(
      ([rankingGroupName, rankingGroup]) =>
        rankingGroup.lines.flatMap((rankingLine) =>
          rankingLine.flatMap((departure, departureOffset) =>
            rankingLine.slice(departureOffset + 1).flatMap((arrival) => {
              const rankingSection: SortedSection = { departure, arrival, sorted: true };
              const facilities = defaultFacilitySections(
                rankingLine,
                rankingSection,
                rankingFacility,
              );
              if (facilities === undefined) return [];
              const rankingQuote = createQuote({
                campaign,
                line: rankingLine,
                section: rankingSection,
                ...facilities,
                season,
              });
              if (rankingQuote.points === undefined) return [];
              return [{
                key: `${rankingGroupName}-${rankingLine.at(-1)!.name}-${departure.name}-${arrival.name}`,
                group: rankingGroupName,
                departure: departure.name,
                arrival: arrival.name,
                ...rankingQuote,
                value:
                  rankingFacility === "ordinary" &&
                  ordinaryRankingBasis === "nonReserved"
                    ? rate(
                        rankingQuote.nonReservedFare ?? rankingQuote.paperFare,
                        rankingQuote.points,
                      ) ?? 0
                    : rate(rankingQuote.paperFare, rankingQuote.points) ?? 0,
              }];
            }),
          ),
        ),
    );
    return rows.sort((a, b) => b.value - a.value);
  }, [campaign, ordinaryRankingBasis, rankingFacility, season, tab]);
  const ranking =
    rankingLimit === "all"
      ? rankingRows
      : rankingRows.slice(0, rankingLimit);

  const onCampaignChange = (next: Campaign) => {
    setCampaign(next);
    if (next === "shinshuPreDc") {
      setRankingFacility("ordinary");
      setFacility("ordinary");
      setGreen(undefined);
      setGranClass(undefined);
    }
  };

  const onFacilityChange = (next: Facility) => {
    const defaults = defaultFacilitySections(line, sorted, next);
    if (!defaults) return;
    setFacility(next);
    setGreen(defaults.green);
    setGranClass(defaults.granClass);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <h1>新幹線特典レート</h1>
        <a href="https://github.com/hiroto7/shinkansen">GitHub</a>
      </header>

      <main>
        <nav className="tabs" aria-label="表示切替" role="tablist">
          <button
            type="button"
            role="tab"
            id="detail-tab"
            aria-controls="detail-panel"
            aria-selected={tab === "detail"}
            className={tab === "detail" ? "active" : ""}
            onClick={() => setTab("detail")}
          >
            区間を調べる
          </button>
          <button
            type="button"
            role="tab"
            id="ranking-tab"
            aria-controls="ranking-panel"
            aria-selected={tab === "ranking"}
            className={tab === "ranking" ? "active" : ""}
            onClick={() => setTab("ranking")}
          >
            ランキング
          </button>
        </nav>

        <section className="control-bar">
          <label>交換レート
            <select value={campaign} onChange={(event) => onCampaignChange(event.target.value as Campaign)}>
              <option value="regular">通常</option>
              <option value="limited35Percent">全線35%特別レート</option>
              <option value="shinshuPreDc">信州プレDC（対象区間のみ）</option>
            </select>
          </label>
          <label>シーズン
            <select value={season} onChange={(event) => setSeason(event.target.value as Season)}>
              {seasons.map((value) => <option key={value} value={value}>{seasonLabels[value]}</option>)}
            </select>
          </label>
        </section>

        {tab === "detail" ? (
          <div
            className="dashboard-grid"
            role="tabpanel"
            id="detail-panel"
            aria-labelledby="detail-tab"
          >
            <section className="panel journey-panel">
              <div className="panel-heading"><h3>乗車区間</h3></div>
              <div className={`journey-fields${group.lines.length > 1 ? " has-direction" : ""}`}>
                <label>路線
                  <select value={groupName} onChange={(event) => resetRoute(event.target.value)}>
                    {[...routes.lineGroups.keys()].map((name) => <option key={name}>{name}</option>)}
                  </select>
                </label>
                {group.lines.length > 1 && (
                  <label>方面
                    <select value={routeIndex} onChange={(event) => resetRoute(groupName, Number(event.target.value))}>
                      {group.lines.map((route, index) => <option key={route.at(-1)!.name} value={index}>{route.at(-1)!.name}方面</option>)}
                    </select>
                  </label>
                )}
                <label>乗車駅
                  <select value={departureIndex} onChange={(event) => {
                    const next = rangeAfterStartChange(line, arrivalIndex, Number(event.target.value));
                    setDepartureIndex(next.start);
                    setArrivalIndex(next.end);
                  }}>
                    {line.slice(0, -1).map((station) => <option value={station.index} key={station.name}>{station.name}</option>)}
                  </select>
                </label>
                <span className="journey-arrow">→</span>
                <label>降車駅
                  <select value={arrivalIndex} onChange={(event) => {
                    const next = rangeAfterEndChange(line, departureIndex, Number(event.target.value));
                    setDepartureIndex(next.start);
                    setArrivalIndex(next.end);
                  }}>
                    {line.slice(1).map((station) => <option value={station.index} key={station.name}>{station.name}</option>)}
                  </select>
                </label>
              </div>

              {defaultHighSpeed && (
                <div className="train-picker">
                  <label className="switch"><input type="checkbox" checked={selectedHighSpeed !== undefined} onChange={(event) => setHighSpeed(event.target.checked ? defaultHighSpeed : undefined)} /><span>「はやぶさ」「こまち」を利用する</span></label>
                </div>
              )}

              <div className="facility-stack">
                  <fieldset className="facility-picker">
                    <legend>利用する最上位の座席設備</legend>
                    {([
                      ["ordinary", "普通車指定席", "全区間で普通車指定席を利用"],
                      ["green", "グリーン車", "設定可能な全区間で利用"],
                      ["granClassNoRefreshments", "グランクラス", "飲料・軽食なしのみ"],
                      ["granClassWithRefreshments", "グランクラス", "飲料・軽食ありを含む"],
                    ] as const).map(([value, title, description]) => {
                      const isGranClass = value.startsWith("granClass");
                      const campaignUnavailable =
                        campaign === "shinshuPreDc" && value !== "ordinary";
                      return (
                        <label className="facility-option" key={value}>
                          <input
                            type="radio"
                            name="facility"
                            value={value}
                            checked={selectedFacility === value}
                            disabled={campaignUnavailable || (isGranClass && !granClassAvailable)}
                            onChange={() => onFacilityChange(value)}
                          />
                          <strong>{title}</strong>
                          <span>
                            {campaignUnavailable
                              ? "信州プレDC対象外"
                              : isGranClass && !granClassAvailable
                                ? "この区間では選択不可"
                                : description}
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
              </div>

              {(selectedHighSpeed || selectedGreen) && (
                <details className="section-details">
                  <summary>一部区間を指定</summary>
                  <div className="segment-control">
                    {selectedHighSpeed && (
                      <RangeSelect
                        label="はやぶさ・こまち利用区間"
                        stations={highSpeedStations}
                        start={selectedHighSpeed.start}
                        end={selectedHighSpeed.end}
                        onStart={(start) => setHighSpeed(rangeAfterStartChange(highSpeedStations, selectedHighSpeed.end, start))}
                        onEnd={(end) => setHighSpeed(rangeAfterEndChange(highSpeedStations, selectedHighSpeed.start, end))}
                      />
                    )}
                    {selectedGreen && (
                      <RangeSelect
                        label={selectedGranClass ? "グリーン車またはグランクラスを利用する区間" : "グリーン車を利用する区間"}
                        stations={tripStations}
                        start={selectedGreen.start}
                        end={selectedGreen.end}
                        onStart={(start) => setGreen(rangeAfterStartChange(tripStations, selectedGreen.end, start))}
                        onEnd={(end) => setGreen(rangeAfterEndChange(tripStations, selectedGreen.start, end))}
                      />
                    )}
                    {selectedGranClass && (
                      <RangeSelect
                        label="そのうちグランクラスを利用する区間"
                        stations={granClassStations}
                        start={selectedGranClass.start}
                        end={selectedGranClass.end}
                        onStart={(start) => setGranClass(rangeAfterStartChange(granClassStations, selectedGranClass.end, start))}
                        onEnd={(end) => setGranClass(rangeAfterEndChange(granClassStations, selectedGranClass.start, end))}
                      />
                    )}
                  </div>
                  <p className="constraint-note">途中で分かれない1つの区間を指定してください。</p>
                </details>
              )}
            </section>

            <section className="panel result-panel">
              <div className="panel-heading"><h3>計算結果</h3></div>
              {quote.points === undefined ? (
                <div className="unavailable">
                  <strong>
                    {exclusionMessages[quote.exclusionReason ?? "invalidJourney"].title}
                  </strong>
                  <p>{exclusionMessages[quote.exclusionReason ?? "invalidJourney"].detail}</p>
                </div>
              ) : (
                <>
                  <div className="result-route">
                    <strong>{sorted.departure.name} → {sorted.arrival.name}</strong>
                    <span>{quote.distanceKm.toFixed(1)} km</span>
                  </div>
                  <section className="result-section" aria-labelledby="points-heading">
                    <h4 id="points-heading">必要ポイント</h4>
                    <div className="points-total"><span>{facilityLabels[quote.facility]}</span><strong>{integer.format(quote.points)}<small> pt</small></strong></div>
                  </section>
                  <section className="result-section" aria-labelledby="comparison-heading">
                    <h4 id="comparison-heading">所定額との比較</h4>
                    <div className={`rate-grid${quote.facility === "ordinary" && quote.nonReservedFare !== undefined ? "" : " single"}`}>
                      {quote.facility === "ordinary" && quote.nonReservedFare !== undefined && (
                        <RateCard
                          label="自由席・立席"
                          breakdown={quote.nonReservedFareBreakdown}
                          points={quote.points}
                        />
                      )}
                      <RateCard
                        label={quote.facility === "ordinary" ? "普通車指定席" : "同じ設備・行程"}
                        breakdown={quote.selectedFareBreakdown}
                        points={quote.points}
                      />
                    </div>
                  </section>
                </>
              )}
            </section>
          </div>
        ) : (
          <section
            className="panel ranking-panel"
            role="tabpanel"
            id="ranking-panel"
            aria-labelledby="ranking-tab"
          >
            <div className="panel-heading"><h3>{facilityLabels[rankingFacility]}レート</h3></div>
            <div className="ranking-tools">
              <label>設備
                <select value={rankingFacility} onChange={(event) => setRankingFacility(event.target.value as RankingFacility)}>
                  <option value="ordinary">普通車指定席</option>
                  {campaign !== "shinshuPreDc" && <>
                    <option value="green">グリーン車</option>
                    <option value="granClassNoRefreshments">グランクラス（飲料・軽食なし）</option>
                    <option value="granClassWithRefreshments">グランクラス（飲料・軽食ありを含む）</option>
                  </>}
                </select>
              </label>
              {rankingFacility === "ordinary" && (
                <label>並び順
                  <select value={ordinaryRankingBasis} onChange={(event) => setOrdinaryRankingBasis(event.target.value as OrdinaryRankingBasis)}>
                    <option value="nonReserved">自由席・立席との比較</option>
                    <option value="reserved">普通車指定席との比較</option>
                  </select>
                </label>
              )}
              <label>表示件数
                <select value={rankingLimit} onChange={(event) => setRankingLimit(event.target.value === "all" ? "all" : Number(event.target.value) as 50 | 100)}>
                  <option value={50}>50件</option>
                  <option value={100}>100件</option>
                  <option value="all">全件</option>
                </select>
              </label>
            </div>
            <p className="ranking-note">全{integer.format(rankingRows.length)}件中、{integer.format(ranking.length)}件を表示</p>
            <div className="ranking-table-wrap"><table className={`ranking-table${rankingFacility === "ordinary" ? " ordinary" : ""}`}><thead><tr><th>#</th><th>区間</th><th>距離</th><th>ポイント</th>{rankingFacility === "ordinary" ? <><th>自由席・立席</th><th>円/pt</th><th>普通車指定席</th><th>円/pt</th></> : <><th>所定額</th><th>円/pt</th></>}</tr></thead><tbody>
              {ranking.map((row, index) => <tr key={row.key}><td>{index + 1}</td><td><small>{row.group}</small><strong>{row.departure} → {row.arrival}</strong></td><td>{row.distanceKm.toFixed(1)} km</td><td>{row.points === undefined ? "—" : integer.format(row.points)}</td>{rankingFacility === "ordinary" ? <><td>{row.nonReservedFare === undefined ? "—" : yen.format(row.nonReservedFare)}</td><td>{row.nonReservedFare === undefined ? "—" : <strong className={ordinaryRankingBasis === "nonReserved" ? "selected-rate" : ""}>{(rate(row.nonReservedFare, row.points) ?? 0).toFixed(2)}</strong>}</td><td>{row.paperFare === undefined ? "—" : yen.format(row.paperFare)}</td><td><strong className={ordinaryRankingBasis === "reserved" ? "selected-rate" : ""}>{(rate(row.paperFare, row.points) ?? 0).toFixed(2)}</strong></td></> : <><td>{row.paperFare === undefined ? "—" : yen.format(row.paperFare)}</td><td><strong className="selected-rate">{row.value.toFixed(2)}</strong></td></>}</tr>)}
            </tbody></table></div>
          </section>
        )}

        <aside className="notice">
          <p>時刻表・列車編成・残席・発売可否は判定しません。最新情報はご自身でお調べください。</p>
        </aside>
      </main>
    </div>
  );
};

export default App;
