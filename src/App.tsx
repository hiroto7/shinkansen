import { useMemo, useState } from "react";
import { routes, type Station } from "./domain/routes";
import { average, seasons, type Season } from "./domain/seasons";
import type { Facility, Interval } from "./domain/types";
import {
  createQuote,
  type Campaign,
  type ExclusionReason,
  type FareBreakdown,
} from "./domain/quote";
import {
  buildRankingRows,
  defaultFacilitySections,
  defaultHighSpeedSection,
  granClassLastIndex,
  highSpeedIntervalWithin,
  highSpeedStationsForSection,
  intervalWithin,
  rankForRate,
  rankingBasisForHighSpeed,
  rate,
  sectionFrom,
  updateDirectedInterval,
  type DirectedInterval,
  type RankingBasis,
} from "./app-logic";
import "./App.css";

type Tab = "detail" | "ranking";

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

const RateCard = ({
  label,
  breakdown,
  points,
  rank,
}: {
  label: string;
  breakdown?: FareBreakdown | undefined;
  points?: number | undefined;
  rank?: number | undefined;
}) => (
  <article className="rate-card">
    <span>{label}</span>
    <strong>{breakdown === undefined ? "—" : yen.format(breakdown.total)}</strong>
    <small>
      {rate(breakdown?.total, points)?.toFixed(2) ?? "—"} 円/pt
      {rank === undefined ? "" : `・${rank}位`}
    </small>
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

const RangeSelect = ({
  label,
  stations,
  value,
  onChange,
}: {
  label: string;
  stations: readonly Station[];
  value: DirectedInterval;
  onChange: (value: Interval) => void;
}) => {
  const change = (edge: 0 | 1, index: number) => {
    const [from, to] = updateDirectedInterval(stations, value, edge, index);
    onChange({ start: Math.min(from, to), end: Math.max(from, to) });
  };
  const [from, to] = value;

  return (
    <div className="range-select">
      <span>{label}</span>
      <select
        aria-label={`${label} 始点`}
        value={from}
        onChange={(event) => change(0, Number(event.target.value))}
      >
        {stations.slice(0, -1).map((station) => (
          <option value={station.index} key={station.name}>{station.name}</option>
        ))}
      </select>
      <span className="range-arrow">→</span>
      <select
        aria-label={`${label} 終点`}
        value={to}
        onChange={(event) => change(1, Number(event.target.value))}
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
    useState<Facility>("ordinary");
  const [rankingBasis, setRankingBasis] =
    useState<RankingBasis>("nonReserved");

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

  const departure = line[departureIndex] ?? line[0]!;
  const arrival = line[arrivalIndex] ?? line.at(-1)!;
  const { section: sorted, reversed } = routes.sortSection({ departure, arrival });
  const tripStart = sorted.departure.index;
  const tripEnd = sorted.arrival.index;
  const inTravelDirection = <T,>(values: readonly T[]) => {
    if (reversed) return values.toReversed();
    return values;
  };
  const directed = ({ start, end }: Interval): DirectedInterval => {
    if (reversed) return [end, start];
    return [start, end];
  };
  const tripStations = inTravelDirection(line.slice(tripStart, tripEnd + 1));
  const defaultHighSpeed = defaultHighSpeedSection(line, sorted);
  const highSpeedStations = inTravelDirection(
    highSpeedStationsForSection(line, sorted),
  );
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
  const highSpeedSection = sectionFrom(line, selectedHighSpeed);

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

  let activeRankingBasis: RankingBasis = "reserved";
  if (rankingFacility === "ordinary") activeRankingBasis = rankingBasis;
  const rankingRows = useMemo(
    () => buildRankingRows(campaign, season, rankingFacility, activeRankingBasis),
    [activeRankingBasis, campaign, rankingFacility, season],
  );
  const selectedBasis = rankingBasisForHighSpeed(
    selectedHighSpeed,
    defaultHighSpeed,
  );
  const selectedRank = useMemo(
    () => {
      if (!selectedBasis) return undefined;
      return rankForRate(
        buildRankingRows(campaign, season, quote.facility, selectedBasis),
        rate(quote.paperFare, quote.points),
      );
    },
    [
      campaign,
      quote.facility,
      quote.paperFare,
      quote.points,
      season,
      selectedBasis,
    ],
  );
  const nonReservedRank = useMemo(
    () => rankForRate(
      buildRankingRows(campaign, season, "ordinary", "nonReserved"),
      rate(quote.nonReservedFare, quote.points),
    ),
    [campaign, quote.nonReservedFare, quote.points, season],
  );
  let selectedFareLabel = "同じ設備・行程";
  if (quote.facility === "ordinary") {
    selectedFareLabel = "普通車指定席";
    if (selectedHighSpeed) {
      selectedFareLabel = "はやぶさ・こまち指定席";
    }
  }
  let rankingFareLabel = "普通車指定席";
  if (rankingBasis === "highSpeed") {
    rankingFareLabel = "はやぶさ・こまち指定席";
  }

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
        <h1>JRE POINT特典チケットのレート計算</h1>
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
              {seasons.map((value) => <option key={value}>{value}</option>)}
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
                  <select value={departureIndex} onChange={(event) => setDepartureIndex(Number(event.target.value))}>
                    {line.map((station) => <option value={station.index} key={station.name} disabled={station.index === arrivalIndex}>{station.name}</option>)}
                  </select>
                </label>
                <span className="journey-arrow">→</span>
                <label>降車駅
                  <select value={arrivalIndex} onChange={(event) => setArrivalIndex(Number(event.target.value))}>
                    {line.map((station) => <option value={station.index} key={station.name} disabled={station.index === departureIndex}>{station.name}</option>)}
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
                        value={directed(selectedHighSpeed)}
                        onChange={setHighSpeed}
                      />
                    )}
                    {selectedGreen && (
                      <RangeSelect
                        label={selectedGranClass ? "グリーン車またはグランクラスを利用する区間" : "グリーン車を利用する区間"}
                        stations={tripStations}
                        value={directed(selectedGreen)}
                        onChange={setGreen}
                      />
                    )}
                    {selectedGranClass && (
                      <RangeSelect
                        label="そのうちグランクラスを利用する区間"
                        stations={inTravelDirection(granClassStations)}
                        value={directed(selectedGranClass)}
                        onChange={setGranClass}
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
                    <strong>{departure.name} → {arrival.name}</strong>
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
                          rank={nonReservedRank}
                        />
                      )}
                      <RateCard
                        label={selectedFareLabel}
                        breakdown={quote.selectedFareBreakdown}
                        points={quote.points}
                        rank={selectedRank}
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
                <select value={rankingFacility} onChange={(event) => setRankingFacility(event.target.value as Facility)}>
                  <option value="ordinary">普通車指定席</option>
                  {campaign !== "shinshuPreDc" && <>
                    <option value="green">グリーン車</option>
                    <option value="granClassNoRefreshments">グランクラス（飲料・軽食なし）</option>
                    <option value="granClassWithRefreshments">グランクラス（飲料・軽食ありを含む）</option>
                  </>}
                </select>
              </label>
              {rankingFacility === "ordinary" && (
                <label>比較対象
                  <select value={rankingBasis} onChange={(event) => setRankingBasis(event.target.value as RankingBasis)}>
                    <option value="nonReserved">自由席・立席との比較</option>
                    <option value="reserved">普通車指定席との比較</option>
                    <option value="highSpeed">はやぶさ・こまち指定席との比較</option>
                  </select>
                </label>
              )}
            </div>
            <p className="ranking-note">全{integer.format(rankingRows.length)}件</p>
            <div className="ranking-table-wrap">
              <table className={`ranking-table${rankingFacility === "ordinary" ? " ordinary" : ""}`}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>区間</th>
                    <th>距離</th>
                    <th>ポイント</th>
                    {rankingFacility === "ordinary" ? (
                      <>
                        <th>自由席・立席</th>
                        <th>円/pt</th>
                        <th>{rankingFareLabel}</th>
                        <th>円/pt</th>
                      </>
                    ) : (
                      <>
                        <th>所定額</th>
                        <th>円/pt</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rankingRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.rank}</td>
                      <td>
                        <small>{row.group}</small>
                        <strong>{row.departure} → {row.arrival}</strong>
                      </td>
                      <td>{row.distanceKm.toFixed(1)} km</td>
                      <td>
                        {row.points === undefined ? "—" : integer.format(row.points)}
                      </td>
                      {rankingFacility === "ordinary" ? (
                        <>
                          <td>
                            {row.nonReservedFare === undefined
                              ? "—"
                              : yen.format(row.nonReservedFare)}
                          </td>
                          <td>
                            {row.nonReservedFare === undefined ? "—" : (
                              <strong className={rankingBasis === "nonReserved" ? "selected-rate" : ""}>
                                {(rate(row.nonReservedFare, row.points) ?? 0).toFixed(2)}
                              </strong>
                            )}
                          </td>
                          <td>
                            {row.paperFare === undefined ? "—" : yen.format(row.paperFare)}
                          </td>
                          <td>
                            <strong className={rankingBasis !== "nonReserved" ? "selected-rate" : ""}>
                              {(rate(row.paperFare, row.points) ?? 0).toFixed(2)}
                            </strong>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            {row.paperFare === undefined ? "—" : yen.format(row.paperFare)}
                          </td>
                          <td><strong className="selected-rate">{row.value.toFixed(2)}</strong></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
