import { useMemo, useState } from "react";
import {
  calculator2022,
  type Line,
  type Season,
  type SortedSection,
  type Station,
} from "./domain/versions/2022";
import type { DataVersion, Facility, Interval } from "./domain/types";
import { createQuote, type Campaign, type ExclusionReason } from "./domain/quote";
import "./App.css";

type Tab = "detail" | "ranking";
type RankingFacility =
  | "ordinary"
  | "green"
  | "granClassNoRefreshments"
  | "granClassWithRefreshments";
type RankingLimit = 50 | 100 | "all";
type OrdinaryRankingBasis = "nonReserved" | "reserved";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat("ja-JP");

const versionOptions: readonly { value: DataVersion; label: string }[] = [
  { value: "2026-03-14", label: "2026年3月14日以降" },
  { value: "2022-03-12", label: "2022年3月12日時点" },
];

const facilityLabels: Readonly<Record<Facility, string>> = {
  ordinary: "普通車指定席",
  green: "グリーン車",
  granClassNoRefreshments: "グランクラス（飲料・軽食なし）",
  granClassWithRefreshments: "グランクラス（飲料・軽食あり）",
};

const seasonLabels: Readonly<Record<Season, string>> = {
  閑散期: "閑散期",
  通常期: "通常期",
  繁忙期: "繁忙期",
  最繁忙期: "最繁忙期",
};

export const intervalWithin = (
  enabled: boolean,
  start: number,
  end: number,
  outerStart: number,
  outerEnd: number,
): Interval | undefined => {
  if (!enabled || !(outerStart < outerEnd)) return undefined;
  const clampedStart = Math.max(outerStart, Math.min(start, outerEnd - 1));
  const clampedEnd = Math.min(outerEnd, Math.max(end, outerStart + 1));
  return clampedStart < clampedEnd
    ? { start: clampedStart, end: clampedEnd }
    : { start: outerStart, end: outerEnd };
};

const granClassLastIndex = (line: Line) => {
  if (line === calculator2022.line1) {
    return line.find(({ name }) => name === "盛岡")!.index;
  }
  if (line === calculator2022.line2) {
    return line.find(({ name }) => name === "福島")!.index;
  }
  return line.length - 1;
};

const canonicalFacilitySections = (
  line: Line,
  section: SortedSection,
  facility: RankingFacility,
) => {
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
      ? { granClassWithRefreshments: granClass }
      : {}),
  };
};

const rate = (fare: number | undefined, points: number | undefined) =>
  fare !== undefined && points !== undefined ? fare / points : undefined;

const RateCard = ({
  label,
  fare,
  points,
}: {
  label: string;
  fare?: number | undefined;
  points?: number | undefined;
}) => (
  <article className="rate-card">
    <span>{label}</span>
    <strong>{fare === undefined ? "—" : yen.format(fare)}</strong>
    <small>{rate(fare, points)?.toFixed(2) ?? "—"} 円/pt</small>
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
  historicalFacility: {
    title: "2022年版の対象外です",
    detail: "2022年版は普通車指定席のみ参照できます。",
  },
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
  const [version, setVersion] = useState<DataVersion>("2026-03-14");
  const [campaign, setCampaign] = useState<Campaign>("regular");
  const [groupName, setGroupName] = useState("東北新幹線");
  const group = calculator2022.lineGroups.get(groupName)!;
  const [routeIndex, setRouteIndex] = useState(0);
  const line = group.lines[Math.min(routeIndex, group.lines.length - 1)]!;
  const [departureIndex, setDepartureIndex] = useState(0);
  const [arrivalIndex, setArrivalIndex] = useState(line.length - 1);
  const [season, setSeason] = useState<Season>(calculator2022.average);
  const [highSpeedEnabled, setHighSpeedEnabled] = useState(false);
  const [highSpeedStart, setHighSpeedStart] = useState(0);
  const [highSpeedEnd, setHighSpeedEnd] = useState(line.length - 1);
  const [greenEnabled, setGreenEnabled] = useState(false);
  const [greenStart, setGreenStart] = useState(0);
  const [greenEnd, setGreenEnd] = useState(line.length - 1);
  const [granClassEnabled, setGranClassEnabled] = useState(false);
  const [granClassStart, setGranClassStart] = useState(0);
  const [granClassEnd, setGranClassEnd] = useState(line.length - 1);
  const [refreshments, setRefreshments] = useState(false);
  const [rankingFacility, setRankingFacility] =
    useState<RankingFacility>("ordinary");
  const [rankingLimit, setRankingLimit] = useState<RankingLimit>(50);
  const [ordinaryRankingBasis, setOrdinaryRankingBasis] =
    useState<OrdinaryRankingBasis>("nonReserved");

  const resetRoute = (nextGroupName: string, nextRouteIndex = 0) => {
    const nextLine = calculator2022.lineGroups.get(nextGroupName)!.lines[nextRouteIndex]!;
    setGroupName(nextGroupName);
    setRouteIndex(nextRouteIndex);
    setDepartureIndex(0);
    setArrivalIndex(nextLine.length - 1);
    setHighSpeedStart(0);
    setHighSpeedEnd(nextLine.length - 1);
    setGreenStart(0);
    setGreenEnd(nextLine.length - 1);
    setGranClassStart(0);
    setGranClassEnd(nextLine.length - 1);
  };

  const sorted = calculator2022.sortSection({
    departure: line[Math.min(departureIndex, line.length - 2)]!,
    arrival: line[Math.max(1, Math.min(arrivalIndex, line.length - 1))]!,
  }).section;
  const tripStart = sorted.departure.index;
  const tripEnd = sorted.arrival.index;
  const tripStations = line.slice(tripStart, tripEnd + 1);
  const granClassLimit = granClassLastIndex(line);
  const granClassAvailable = tripStart < Math.min(tripEnd, granClassLimit);
  const highSpeed = intervalWithin(
    highSpeedEnabled,
    highSpeedStart,
    highSpeedEnd,
    tripStart,
    tripEnd,
  );
  const green = intervalWithin(
    greenEnabled,
    greenStart,
    greenEnd,
    tripStart,
    tripEnd,
  );
  const granClassOuterStart = green?.start ?? tripStart;
  const granClassOuterEnd = Math.min(green?.end ?? tripEnd, granClassLimit);
  const granClassStations = line.slice(
    granClassOuterStart,
    granClassOuterEnd + 1,
  );
  const granClass = intervalWithin(
    green !== undefined && granClassEnabled && granClassAvailable,
    granClassStart,
    granClassEnd,
    granClassOuterStart,
    granClassOuterEnd,
  );
  const refreshmentSection = refreshments && granClass ? granClass : undefined;
  const selectedFacility: Facility = refreshments && granClass
    ? "granClassWithRefreshments"
    : granClass
      ? "granClassNoRefreshments"
      : green
        ? "green"
        : "ordinary";
  const highSpeedSection = highSpeed
    ? { departure: line[highSpeed.start]!, arrival: line[highSpeed.end]!, sorted: true as const }
    : undefined;

  const quote = createQuote({
    version,
    campaign,
    line,
    section: sorted,
    ...(highSpeedSection ? { highSpeed: highSpeedSection } : {}),
    ...(green ? { green } : {}),
    ...(granClass ? { granClass } : {}),
    ...(refreshmentSection
      ? { granClassWithRefreshments: refreshmentSection }
      : {}),
    season,
  });

  const rankingRows = useMemo(() => {
    if (tab !== "ranking") return [];
    const rows = [...calculator2022.lineGroups.entries()].flatMap(
      ([rankingGroupName, rankingGroup]) =>
        rankingGroup.lines.flatMap((rankingLine) =>
          rankingLine.flatMap((departure, departureOffset) =>
            rankingLine.slice(departureOffset + 1).flatMap((arrival) => {
              const rankingSection: SortedSection = { departure, arrival, sorted: true };
              const facilities = canonicalFacilitySections(
                rankingLine,
                rankingSection,
                rankingFacility,
              );
              if (facilities === undefined) return [];
              const rankingQuote = createQuote({
                version,
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
  }, [campaign, ordinaryRankingBasis, rankingFacility, season, tab, version]);
  const ranking =
    rankingLimit === "all"
      ? rankingRows
      : rankingRows.slice(0, rankingLimit);

  const onVersionChange = (next: DataVersion) => {
    setVersion(next);
    setCampaign("regular");
    if (next === "2022-03-12") {
      setRankingFacility("ordinary");
      setGreenEnabled(false);
      setGranClassEnabled(false);
      setRefreshments(false);
    }
  };

  const onCampaignChange = (next: Campaign) => {
    setCampaign(next);
    if (next === "shinshuPreDc") {
      setRankingFacility("ordinary");
      setGreenEnabled(false);
      setGranClassEnabled(false);
      setRefreshments(false);
    }
  };

  const onFacilityChange = (next: Facility) => {
    const usesGreen = next !== "ordinary";
    const usesGranClass =
      next === "granClassNoRefreshments" ||
      next === "granClassWithRefreshments";
    setGreenEnabled(usesGreen);
    setGranClassEnabled(usesGranClass);
    setRefreshments(next === "granClassWithRefreshments");
    if (usesGreen) {
      setGreenStart(tripStart);
      setGreenEnd(tripEnd);
    }
    if (usesGranClass) {
      setGranClassStart(tripStart);
      setGranClassEnd(Math.min(tripEnd, granClassLimit));
    }
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
          <label>データ年版
            <select value={version} onChange={(event) => onVersionChange(event.target.value as DataVersion)}>
              {versionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>交換レート
            <select value={campaign} onChange={(event) => onCampaignChange(event.target.value as Campaign)}>
              <option value="regular">通常</option>
              {version === "2022-03-12" ? (
                <option value="shinkansenYear">新幹線YEARスペシャル</option>
              ) : (
                <>
                  <option value="limited35Percent">全線35%特別レート</option>
                  <option value="shinshuPreDc">信州プレDC（対象区間のみ）</option>
                </>
              )}
            </select>
          </label>
          <label>シーズン
            <select value={season} onChange={(event) => setSeason(event.target.value as Season)}>
              {calculator2022.seasons.map((value) => <option key={value} value={value}>{seasonLabels[value]}</option>)}
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
              <div className="field-grid">
                <label>路線
                  <select value={groupName} onChange={(event) => resetRoute(event.target.value)}>
                    {[...calculator2022.lineGroups.keys()].map((name) => <option key={name}>{name}</option>)}
                  </select>
                </label>
                {group.lines.length > 1 && (
                  <label>方面
                    <select value={routeIndex} onChange={(event) => resetRoute(groupName, Number(event.target.value))}>
                      {group.lines.map((route, index) => <option key={route.at(-1)!.name} value={index}>{route.at(-1)!.name}方面</option>)}
                    </select>
                  </label>
                )}
              </div>
              <RangeSelect label="全乗車区間" stations={line} start={departureIndex} end={arrivalIndex} onStart={setDepartureIndex} onEnd={setArrivalIndex} />

              {(line === calculator2022.line0 || line === calculator2022.line1) && (
                <div className="segment-control">
                  <label className="switch"><input type="checkbox" checked={highSpeedEnabled} onChange={(event) => { setHighSpeedEnabled(event.target.checked); if (event.target.checked) { setHighSpeedStart(tripStart); setHighSpeedEnd(tripEnd); } }} /><span>「はやぶさ」「こまち」を利用する</span></label>
                  {highSpeedEnabled && highSpeed && <RangeSelect label="はやぶさ・こまち利用区間" stations={tripStations} start={highSpeed.start} end={highSpeed.end} onStart={setHighSpeedStart} onEnd={setHighSpeedEnd} />}
                </div>
              )}

              {version === "2026-03-14" && (
                <div className="facility-stack">
                  <fieldset className="facility-picker">
                    <legend>利用する最上位の座席設備</legend>
                    {([
                      ["ordinary", "普通車指定席", "全区間で普通車指定席を利用"],
                      ["green", "グリーン車", "一部または全部で利用"],
                      ["granClassNoRefreshments", "グランクラス", "飲料・軽食なし"],
                      ["granClassWithRefreshments", "グランクラス", "飲料・軽食あり"],
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
                  {greenEnabled && (
                    <div className="segment-control">
                      <RangeSelect
                        label={granClassEnabled ? "グリーン車・グランクラス利用区間" : "グリーン車利用区間"}
                        stations={tripStations}
                        start={green?.start ?? tripStart}
                        end={green?.end ?? tripEnd}
                        onStart={setGreenStart}
                        onEnd={setGreenEnd}
                      />
                      {granClassEnabled && granClassAvailable && (
                        <RangeSelect
                          label="グランクラス利用区間"
                          stations={granClassStations}
                          start={granClass?.start ?? granClassOuterStart}
                          end={granClass?.end ?? granClassOuterEnd}
                          onStart={setGranClassStart}
                          onEnd={setGranClassEnd}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="constraint-note">設備ごとの利用区間は、それぞれ1つの連続区間として指定してください。</p>
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
                        <RateCard label="自由席・立席" fare={quote.nonReservedFare} points={quote.points} />
                      )}
                      <RateCard
                        label={quote.facility === "ordinary" ? "普通車指定席" : "同じ設備・行程"}
                        fare={quote.paperFare}
                        points={quote.points}
                      />
                    </div>
                  </section>
                  <section className="result-section" aria-labelledby="breakdown-heading">
                    <h4 id="breakdown-heading">{facilityLabels[quote.facility]}の所定額内訳</h4>
                    <dl className="breakdown">
                      <div><dt>普通運賃</dt><dd>{quote.basicFare === undefined ? "—" : yen.format(quote.basicFare)}</dd></div>
                      <div><dt>特急料金</dt><dd>{quote.expressFare === undefined ? "—" : yen.format(quote.expressFare)}</dd></div>
                      {(quote.specialVehicleFare ?? 0) > 0 && (
                        <div><dt>特別車両料金</dt><dd>{yen.format(quote.specialVehicleFare!)}</dd></div>
                      )}
                      <div className="total"><dt>合計</dt><dd>{quote.paperFare === undefined ? "—" : yen.format(quote.paperFare)}</dd></div>
                    </dl>
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
                  {version === "2026-03-14" && campaign !== "shinshuPreDc" && <>
                    <option value="green">グリーン車</option>
                    <option value="granClassNoRefreshments">グランクラス（飲料・軽食なし）</option>
                    <option value="granClassWithRefreshments">グランクラス（飲料・軽食あり）</option>
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
            <p className="ranking-note">全{integer.format(rankingRows.length)}件中、{integer.format(ranking.length)}件を表示。{rankingFacility === "ordinary" ? `自由席・立席と普通車指定席の所定額を比較できます。${ordinaryRankingBasis === "nonReserved" ? "自由席・立席を設定しない区間は、指定席レートで並べます。" : ""}` : "指定した設備と同じ行程の所定額との比較です。"}</p>
            <div className="ranking-table-wrap"><table className={`ranking-table${rankingFacility === "ordinary" ? " ordinary" : ""}`}><thead><tr><th>#</th><th>区間</th><th>距離</th><th>ポイント</th>{rankingFacility === "ordinary" ? <><th>自由席・立席</th><th>円/pt</th><th>普通車指定席</th><th>円/pt</th></> : <><th>所定額</th><th>円/pt</th></>}</tr></thead><tbody>
              {ranking.map((row, index) => <tr key={row.key}><td>{index + 1}</td><td><small>{row.group}</small><strong>{row.departure} → {row.arrival}</strong></td><td>{row.distanceKm.toFixed(1)} km</td><td>{row.points === undefined ? "—" : integer.format(row.points)}</td>{rankingFacility === "ordinary" ? <><td>{row.nonReservedFare === undefined ? "—" : yen.format(row.nonReservedFare)}</td><td>{row.nonReservedFare === undefined ? "—" : <strong className={ordinaryRankingBasis === "nonReserved" ? "selected-rate" : ""}>{(rate(row.nonReservedFare, row.points) ?? 0).toFixed(2)}</strong>}</td><td>{row.paperFare === undefined ? "—" : yen.format(row.paperFare)}</td><td><strong className={ordinaryRankingBasis === "reserved" ? "selected-rate" : ""}>{(rate(row.paperFare, row.points) ?? 0).toFixed(2)}</strong></td></> : <><td>{row.paperFare === undefined ? "—" : yen.format(row.paperFare)}</td><td><strong className="selected-rate">{row.value.toFixed(2)}</strong></td></>}</tr>)}
            </tbody></table></div>
          </section>
        )}

        <aside className="notice">
          <strong>計算の前提</strong>
          <p>運賃・料金はJRの規則と公式表、交換ポイントはえきねっとの公式表から計算します。時刻表・列車編成・残席・実際の発売可否は判定しません。表示額は購入を保証するものではありません。最新情報はご自身でお調べください。</p>
        </aside>
      </main>
    </div>
  );
};

export default App;
