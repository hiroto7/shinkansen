import { useMemo, useState } from "react";
import {
  legacy2022Engine,
  type ExpressTicket,
  type Line,
  type Season,
  type SortedSection,
  type Station,
  type TotalFare,
} from "../App";
import type {
  DataVersion,
  Facility,
  Interval,
  JourneySelection,
} from "../domain/types";
import { highestFacility } from "../domain/types";
import { get2022Points } from "../domain/versions/2022";
import {
  get2026JourneyPoints,
  get2026LocalBasicFare,
  get2026SpecialVehicleFare,
  get2026TrunkBasicFare,
} from "../domain/versions/2026";
import "./modern.css";

type Campaign = "regular" | "shinkansenYear" | "limited35Percent";
type Tab = "detail" | "ranking";
type RankingFacility =
  | "ordinary"
  | "green"
  | "granClassNoRefreshments"
  | "granClassWithRefreshments";
type RankingLimit = 50 | 100 | "all";

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

const campaigns = [
  {
    id: "limited35Percent",
    title: "JR東日本新幹線全線 35%特別レート",
    dates: "2026/6/22–7/6、9/25–10/9、2027/1/18–1/31",
    status: "2026年度・3回",
  },
  {
    id: "shinshu",
    title: "信州DC プレキャンペーン",
    dates: "2026/9/1–9/17",
    status: "対象列車・区間限定",
  },
] as const;

const distanceBetween = (a: Station, b: Station) =>
  Math.round(Math.abs(b.distance - a.distance) * 10) / 10;

const overlap = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

const seasonal = (base: number, season: Season) =>
  season === legacy2022Engine.busiest
    ? base + 400
    : season === legacy2022Engine.busy
      ? base + 200
      : season === legacy2022Engine.off
        ? base - 200
        : base;

const currentLimitedExpressFare = (distanceKm: number, season: Season) =>
  seasonal(distanceKm <= 50 ? 1_290 : distanceKm <= 100 ? 1_730 : 2_390, season);

const getCurrentBasicFare = (
  line: Line,
  section: SortedSection,
): number => {
  const distanceKm = distanceBetween(section.departure, section.arrival);
  if (line !== legacy2022Engine.line1) {
    return get2026TrunkBasicFare(distanceKm);
  }

  const morioka = line.find(({ name }) => name === "盛岡")!;
  const omagari = line.find(({ name }) => name === "大曲")!;
  if (
    morioka.index <= section.departure.index &&
    section.arrival.index <= omagari.index
  ) {
    return get2026LocalBasicFare(distanceKm);
  }

  const localStart =
    section.departure.index < morioka.index ? morioka : section.departure;
  const localEnd = section.arrival.index > omagari.index ? omagari : section.arrival;
  const localKm =
    localStart.index < localEnd.index ? distanceBetween(localStart, localEnd) : 0;
  const calculationKm =
    Math.round((distanceKm + localKm * (17.8 / 16.2 - 1)) * 10) / 10;
  return get2026TrunkBasicFare(calculationKm);
};

const fareTickets = (fare: TotalFare): readonly ExpressTicket[] =>
  fare.expressTickets;

const currentExpressFare = (
  line: Line,
  section: SortedSection,
  tickets: readonly ExpressTicket[],
  season: Season,
  green: Interval | undefined,
) => {
  const junction = legacy2022Engine.junctions.get(line);
  const throughMiniShinkansen =
    (line === legacy2022Engine.line1 || line === legacy2022Engine.line2) &&
    junction !== undefined &&
    section.departure.index < junction.index &&
    junction.index < section.arrival.index;

  return tickets.reduce((total, ticket) => {
    const ticketInterval = {
      start: ticket.section.departure.index,
      end: ticket.section.arrival.index,
    };
    const usesGreen = green !== undefined && overlap(green, ticketInterval);
    const isMiniSection =
      junction !== undefined && ticket.section.departure.index >= junction.index;

    if (isMiniSection) {
      if (throughMiniShinkansen) return total + (usesGreen ? 880 : seasonal(1_410, season));
      const base = currentLimitedExpressFare(
        distanceBetween(ticket.section.departure, ticket.section.arrival),
        season,
      );
      return total + (usesGreen ? base - 530 : base);
    }

    return total + (usesGreen ? ticket.fare - 530 : ticket.fare);
  }, 0);
};

interface QuoteInput {
  readonly version: DataVersion;
  readonly campaign: Campaign;
  readonly line: Line;
  readonly section: SortedSection;
  readonly highSpeed?: SortedSection;
  readonly green?: Interval;
  readonly granClass?: Interval;
  readonly granClassWithRefreshments?: Interval;
  readonly season: Season;
}

interface Quote {
  readonly distanceKm: number;
  readonly points?: number | undefined;
  readonly paperFare?: number | undefined;
  readonly cheapestFare?: number | undefined;
  readonly basicFare?: number | undefined;
  readonly expressFare?: number | undefined;
  readonly specialVehicleFare?: number | undefined;
  readonly facility: Facility;
}

const createQuote = ({
  version,
  campaign,
  line,
  section,
  highSpeed,
  green,
  granClass,
  granClassWithRefreshments,
  season,
}: QuoteInput): Quote => {
  const distanceKm = distanceBetween(section.departure, section.arrival);
  const journey: JourneySelection = {
    origin: section.departure.index,
    destination: section.arrival.index,
    ...(highSpeed
      ? { highSpeed: { start: highSpeed.departure.index, end: highSpeed.arrival.index } }
      : {}),
    ...(green ? { green } : {}),
    ...(granClass ? { granClass } : {}),
    ...(granClassWithRefreshments ? { granClassWithRefreshments } : {}),
  };
  const facility = highestFacility(journey);

  const legacy = legacy2022Engine.getFares({
    line,
    section,
    highSpeed,
    season,
    getPoints: (distance) => get2022Points(distance),
  });
  const selectedLegacyFare = highSpeed
    ? (legacy.reservedHighSpeed ?? legacy.reserved)
    : legacy.reserved;

  if (version === "2022-03-12") {
    if (facility !== "ordinary") {
      return { distanceKm, facility };
    }
    const points = get2022Points(
      distanceKm,
      campaign === "shinkansenYear" ? "shinkansenYear" : "regular",
    );
    const cheapestFare = selectedLegacyFare.total;
    const paperFare = cheapestFare - (selectedLegacyFare.discount ?? 0);
    return {
      distanceKm,
      facility,
      points,
      cheapestFare,
      paperFare,
      basicFare: selectedLegacyFare.basicFare,
      expressFare: fareTickets(selectedLegacyFare).reduce(
        (total, ticket) => total + ticket.fare,
        0,
      ),
      specialVehicleFare: 0,
    };
  }

  const points = get2026JourneyPoints(
    distanceKm,
    journey,
    campaign === "limited35Percent" ? "limited35Percent" : "regular",
  );
  const basicFare = getCurrentBasicFare(line, section);
  const expressFare = currentExpressFare(
    line,
    section,
    fareTickets(selectedLegacyFare),
    season,
    green,
  );
  const specialVehicleFare = green
    ? get2026SpecialVehicleFare({
        greenKm: distanceBetween(line[green.start]!, line[green.end]!),
        ...(granClass
          ? { granClassKm: distanceBetween(line[granClass.start]!, line[granClass.end]!) }
          : {}),
        ...(granClassWithRefreshments
          ? {
              granClassWithRefreshmentsKm: distanceBetween(
                line[granClassWithRefreshments.start]!,
                line[granClassWithRefreshments.end]!,
              ),
            }
          : {}),
      })
    : 0;
  const paperFare = basicFare + expressFare + specialVehicleFare;

  return {
    distanceKm,
    facility,
    points,
    paperFare,
    cheapestFare: paperFare - 200,
    basicFare,
    expressFare,
    specialVehicleFare,
  };
};

const intervalFromIndexes = (
  enabled: boolean,
  start: number,
  end: number,
): Interval | undefined => (enabled && start < end ? { start, end } : undefined);

const granClassLastIndex = (line: Line) => {
  if (line === legacy2022Engine.line1) {
    return line.find(({ name }) => name === "盛岡")!.index;
  }
  if (line === legacy2022Engine.line2) {
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

const RateCard = ({ label, value }: { label: string; value?: number | undefined }) => (
  <article className="rate-card">
    <span>{label}</span>
    <strong>{value === undefined ? "—" : `${value.toFixed(2)} 円/pt`}</strong>
  </article>
);

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
}) => (
  <div className="range-select">
    <span>{label}</span>
    <select aria-label={`${label} 始点`} value={start} onChange={(event) => onStart(Number(event.target.value))}>
      {stations.slice(0, -1).map((station) => (
        <option value={station.index} key={station.name}>{station.name}</option>
      ))}
    </select>
    <span className="range-arrow">→</span>
    <select aria-label={`${label} 終点`} value={end} onChange={(event) => onEnd(Number(event.target.value))}>
      {stations.slice(1).map((station) => (
        <option value={station.index} key={station.name}>{station.name}</option>
      ))}
    </select>
  </div>
);

const App = () => {
  const [tab, setTab] = useState<Tab>("detail");
  const [version, setVersion] = useState<DataVersion>("2026-03-14");
  const [campaign, setCampaign] = useState<Campaign>("regular");
  const [groupName, setGroupName] = useState("東北新幹線");
  const group = legacy2022Engine.lineGroups.get(groupName)!;
  const [routeIndex, setRouteIndex] = useState(0);
  const line = group.lines[Math.min(routeIndex, group.lines.length - 1)]!;
  const [departureIndex, setDepartureIndex] = useState(0);
  const [arrivalIndex, setArrivalIndex] = useState(line.length - 1);
  const [season, setSeason] = useState<Season>(legacy2022Engine.average);
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

  const resetRoute = (nextGroupName: string, nextRouteIndex = 0) => {
    const nextLine = legacy2022Engine.lineGroups.get(nextGroupName)!.lines[nextRouteIndex]!;
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

  const sorted = legacy2022Engine.sortSection({
    departure: line[Math.min(departureIndex, line.length - 2)]!,
    arrival: line[Math.max(1, Math.min(arrivalIndex, line.length - 1))]!,
  }).section;
  const tripStart = sorted.departure.index;
  const tripEnd = sorted.arrival.index;
  const granClassLimit = granClassLastIndex(line);
  const granClassAvailable = tripStart < Math.min(tripEnd, granClassLimit);
  const granClassStations = line.slice(0, granClassLimit + 1);
  const highSpeed = intervalFromIndexes(
    highSpeedEnabled,
    Math.max(tripStart, highSpeedStart),
    Math.min(tripEnd, highSpeedEnd),
  );
  const green = intervalFromIndexes(
    greenEnabled,
    Math.max(tripStart, greenStart),
    Math.min(tripEnd, greenEnd),
  );
  const granClass = intervalFromIndexes(
    green !== undefined && granClassEnabled && granClassAvailable,
    Math.max(green?.start ?? tripStart, granClassStart),
    Math.min(green?.end ?? tripEnd, granClassEnd, granClassLimit),
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
    const rows = [...legacy2022Engine.lineGroups.entries()].flatMap(
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
                value: rate(rankingQuote.paperFare, rankingQuote.points) ?? 0,
              }];
            }),
          ),
        ),
    );
    return rows.sort((a, b) => b.value - a.value);
  }, [campaign, rankingFacility, season, tab, version]);
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
        <div>
          <p className="eyebrow">JRE POINT / SHINKANSEN</p>
          <h1>新幹線特典レート</h1>
        </div>
        <a href="https://github.com/hiroto7/shinkansen">GitHub ↗</a>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">POINT VALUE EXPLORER</p>
            <h2>どこで使うと、<br />何円分になるか。</h2>
            <p>運賃・料金はJRの規則と公式表、交換ポイントはえきねっとの公式表から計算します。</p>
          </div>
        </section>

        <nav className="tabs" aria-label="表示切替">
          <button className={tab === "detail" ? "active" : ""} onClick={() => setTab("detail")}>区間を調べる</button>
          <button className={tab === "ranking" ? "active" : ""} onClick={() => setTab("ranking")}>ランキング</button>
        </nav>

        <section className="control-bar">
          <label>データ年版
            <select value={version} onChange={(event) => onVersionChange(event.target.value as DataVersion)}>
              {versionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>交換レート
            <select value={campaign} onChange={(event) => setCampaign(event.target.value as Campaign)}>
              <option value="regular">通常</option>
              {version === "2022-03-12" ? (
                <option value="shinkansenYear">新幹線YEARスペシャル</option>
              ) : (
                <option value="limited35Percent">全線35%特別レート</option>
              )}
            </select>
          </label>
          <label>シーズン
            <select value={season} onChange={(event) => setSeason(event.target.value as Season)}>
              {legacy2022Engine.seasons.map((value) => <option key={value} value={value}>{seasonLabels[value]}</option>)}
            </select>
          </label>
        </section>

        {tab === "detail" ? (
          <div className="dashboard-grid">
            <section className="panel journey-panel">
              <div className="panel-heading"><span>01</span><div><p>JOURNEY</p><h3>乗車区間</h3></div></div>
              <div className="field-grid">
                <label>路線
                  <select value={groupName} onChange={(event) => resetRoute(event.target.value)}>
                    {[...legacy2022Engine.lineGroups.keys()].map((name) => <option key={name}>{name}</option>)}
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

              {(line === legacy2022Engine.line0 || line === legacy2022Engine.line1) && (
                <div className="segment-control">
                  <label className="switch"><input type="checkbox" checked={highSpeedEnabled} onChange={(event) => { setHighSpeedEnabled(event.target.checked); if (event.target.checked) { setHighSpeedStart(tripStart); setHighSpeedEnd(tripEnd); } }} /><span>「はやぶさ」「こまち」を利用する</span></label>
                  {highSpeedEnabled && <RangeSelect label="はやぶさ・こまち利用区間" stations={line} start={highSpeedStart} end={highSpeedEnd} onStart={setHighSpeedStart} onEnd={setHighSpeedEnd} />}
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
                      return (
                        <label className="facility-option" key={value}>
                          <input
                            type="radio"
                            name="facility"
                            value={value}
                            checked={selectedFacility === value}
                            disabled={isGranClass && !granClassAvailable}
                            onChange={() => onFacilityChange(value)}
                          />
                          <strong>{title}</strong>
                          <span>{isGranClass && !granClassAvailable ? "この区間では選択不可" : description}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                  {greenEnabled && (
                    <div className="segment-control">
                      <RangeSelect
                        label={granClassEnabled ? "グリーン車・グランクラス利用区間" : "グリーン車利用区間"}
                        stations={line}
                        start={greenStart}
                        end={greenEnd}
                        onStart={setGreenStart}
                        onEnd={setGreenEnd}
                      />
                      {granClassEnabled && granClassAvailable && (
                        <RangeSelect
                          label="グランクラス利用区間"
                          stations={granClassStations}
                          start={Math.min(granClassStart, granClassLimit - 1)}
                          end={Math.min(granClassEnd, granClassLimit)}
                          onStart={setGranClassStart}
                          onEnd={setGranClassEnd}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="constraint-note">各利用区間は、途中で分断しない1つの連続区間として指定します。グランクラスを選んだ場合は、グリーン車・グランクラスを利用する全体区間と、そのうちグランクラスに乗る区間を指定します。</p>
            </section>

            <section className="panel result-panel">
              <div className="panel-heading"><span>02</span><div><p>RESULT</p><h3>計算結果</h3></div></div>
              {quote.points === undefined ? (
                <div className="unavailable"><strong>この組み合わせは年版の対象外です</strong><p>2022年版は旧アプリが扱っていた普通車指定席のみ参照できます。35%特別レートは飲料・軽食ありのグランクラスを対象外としています。</p></div>
              ) : (
                <>
                  <div className="result-route">
                    <strong>{sorted.departure.name} → {sorted.arrival.name}</strong>
                    <span>{quote.distanceKm.toFixed(1)} km</span>
                  </div>
                  <div className="points-total"><span>{facilityLabels[quote.facility]}</span><strong>{integer.format(quote.points)}<small> pt</small></strong></div>
                  <div className="rate-grid">
                    <RateCard label="同じ行程の所定額" value={rate(quote.paperFare, quote.points)} />
                    <RateCard label="新幹線eチケット相当" value={rate(quote.cheapestFare, quote.points)} />
                  </div>
                  <dl className="breakdown">
                    <div><dt>普通運賃</dt><dd>{quote.basicFare === undefined ? "—" : yen.format(quote.basicFare)}</dd></div>
                    <div><dt>特急料金</dt><dd>{quote.expressFare === undefined ? "—" : yen.format(quote.expressFare)}</dd></div>
                    <div><dt>特別車両料金</dt><dd>{quote.specialVehicleFare === undefined ? "—" : yen.format(quote.specialVehicleFare)}</dd></div>
                    <div className="total"><dt>所定額 合計</dt><dd>{quote.paperFare === undefined ? "—" : yen.format(quote.paperFare)}</dd></div>
                  </dl>
                </>
              )}
            </section>
          </div>
        ) : (
          <section className="panel ranking-panel">
            <div className="panel-heading"><span>R</span><div><p>{rankingLimit === "all" ? "ALL" : `TOP ${rankingLimit}`}</p><h3>{facilityLabels[rankingFacility]}レート</h3></div></div>
            <div className="ranking-tools">
              <label>設備
                <select value={rankingFacility} onChange={(event) => setRankingFacility(event.target.value as RankingFacility)}>
                  <option value="ordinary">普通車指定席</option>
                  {version === "2026-03-14" && <>
                    <option value="green">グリーン車</option>
                    <option value="granClassNoRefreshments">グランクラス（飲料・軽食なし）</option>
                    <option value="granClassWithRefreshments">グランクラス（飲料・軽食あり）</option>
                  </>}
                </select>
              </label>
              <label>表示件数
                <select value={rankingLimit} onChange={(event) => setRankingLimit(event.target.value === "all" ? "all" : Number(event.target.value) as 50 | 100)}>
                  <option value={50}>50件</option>
                  <option value={100}>100件</option>
                  <option value="all">全件</option>
                </select>
              </label>
            </div>
            <p className="ranking-note">全{integer.format(rankingRows.length)}件中、{integer.format(ranking.length)}件を表示しています。ランキングは設備ごとの標準行程で比較します。グリーン車は全区間、グランクラスは設定可能な範囲を連続して利用する条件です。一部区間の組み合わせは区間詳細で確認できます。</p>
            <div className="ranking-table-wrap"><table className="ranking-table"><thead><tr><th>#</th><th>区間</th><th>距離</th><th>ポイント</th><th>所定額</th><th>円/pt</th></tr></thead><tbody>
              {ranking.map((row, index) => <tr key={row.key}><td>{index + 1}</td><td><small>{row.group}</small><strong>{row.departure} → {row.arrival}</strong></td><td>{row.distanceKm.toFixed(1)} km</td><td>{row.points === undefined ? "—" : integer.format(row.points)}</td><td>{row.paperFare === undefined ? "—" : yen.format(row.paperFare)}</td><td><strong>{row.value.toFixed(2)}</strong></td></tr>)}
            </tbody></table></div>
          </section>
        )}

        <section className="campaign-section">
          <div className="section-title"><p>MANUAL ARCHIVE</p><h3>キャンペーン</h3></div>
          <div className="campaign-grid">{campaigns.map((item) => <article key={item.id}><span>{item.status}</span><h4>{item.title}</h4><p>{item.dates}</p></article>)}</div>
        </section>

        <aside className="notice">
          <strong>計算の前提</strong>
          <p>時刻表・列車編成・残席・実際の発売可否は判定しません。表示額は購入を保証するものではありません。最新情報はご自身でお調べください。</p>
        </aside>
      </main>
      <footer><span>DATA: 2022 / 2026</span><span>RULE-BASED, NOT ROUTE-PLANNER DATA</span></footer>
    </div>
  );
};

export default App;
