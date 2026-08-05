import { ceil, round, sum } from "lodash";
import hokurikuFares from "./express-fares/hokuriku.md?raw";
import joetsuFares from "./express-fares/joetsu.md?raw";
import tohokuHighSpeedFares from "./express-fares/tohoku-hayabusa-komachi.md?raw";
import tohokuFares from "./express-fares/tohoku.md?raw";
import {
  akitaLine as line1,
  basicFareSection,
  galaYuzawaLine as line4,
  hokurikuLine as line5,
  isSameSection as isEquivalent,
  joetsuLine as line3,
  sectionDistance as getDistance0,
  tohokuLine as line0,
  yamagataLine as line2,
  type Line,
  type Section,
  type SortedSection,
  type Station,
} from "./routes";
import type { Season } from "./seasons";

export interface SeasonRules {
  readonly effectiveFrom: string;
  readonly sources: readonly string[];
  readonly supportedSeasons: readonly Season[];
  adjustment(season: Season): number;
}

/** 2022年3月12日時点。最繁忙期の設定前。 */
export const seasonRules2022_03_12: SeasonRules = {
  effectiveFrom: "2022-03-12",
  sources: [
    "https://www.jreast.co.jp/kippu/yakkan/pdf/history220210-1.pdf",
  ],
  supportedSeasons: ["閑散期", "通常期", "繁忙期"],
  adjustment: (season) => {
    if (season === "最繁忙期") {
      throw new RangeError("2022年3月12日時点では最繁忙期の設定がありません");
    }
    return season === "繁忙期" ? 200 : season === "閑散期" ? -200 : 0;
  },
};

/** 2022年4月1日以降のJR東日本新幹線のシーズン加減。 */
export const seasonRules2022_04_01: SeasonRules = {
  effectiveFrom: "2022-04-01",
  sources: [
    "https://www.jreast.co.jp/kippu/yakkan/pdf/history220210-1.pdf",
    "https://www.jreast.co.jp/ryokaku/02_hen/02_syo/07_setsu/05.html",
    "https://www.jreast.co.jp/ryokaku/02_hen/03_syo/07_setsu/",
  ],
  supportedSeasons: ["閑散期", "通常期", "繁忙期", "最繁忙期"],
  adjustment: (season) =>
    season === "最繁忙期"
      ? 400
      : season === "繁忙期"
        ? 200
        : season === "閑散期"
          ? -200
          : 0,
};

const applySeason = (fare: number, season: Season, rules: SeasonRules) =>
  fare + rules.adjustment(season);

const junctions: ReadonlyMap<Line, Station> = new Map(
  (
    [
      [line1, "盛岡"],
      [line2, "福島"],
      [line3, "大宮"],
      [line4, "越後湯沢"],
      [line5, "高崎"],
    ] as const
  ).map(([line, station]) => [line, line.find(({ name }) => name === station)!])
);

type FareTable = (section: SortedSection) => number;

const parseFareTable = (markdown: string): FareTable => {
  const [header = [], , ...rows] = markdown
    .trim()
    .split("\n")
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));

  return ({ departure, arrival }) =>
    Number(
      rows.find(([station]) => station === arrival.name)![
        header.indexOf(departure.name)
      ]!.replaceAll(",", ""),
    );
};

export interface StationExpressFareRules {
  readonly asOf: string;
  readonly unchangedThrough: string;
  readonly sources: readonly string[];
  readonly standard: ReadonlyMap<Line, FareTable>;
  readonly highSpeed: FareTable;
}

/**
 * 2022年版アプリが当時の旅客営業規則別表第2号から転記した表を、
 * 現行の別表第2号と運送約款改正履歴に照合した新幹線の通常期基準額。
 * 将来この表が改定された場合は、この値を上書きせず別の規則部品を追加する。
 */
export const stationExpressFareRules2022_03_12: StationExpressFareRules = {
  asOf: "2022-03-12",
  unchangedThrough: "2026-03-14",
  sources: [
    "https://www.jreast.co.jp/kippu/yakkan/history.html",
    "https://www.jreast.co.jp/ryokaku/beppyou/pdf/beppyou02.pdf",
  ],
  standard: new Map([
    [line0, parseFareTable(tohokuFares)],
    [line3, parseFareTable(joetsuFares)],
    [line5, parseFareTable(hokurikuFares)],
  ]),
  highSpeed: parseFareTable(tohokuHighSpeedFares),
};

/**
 * 地方交通線の営業キロの区間
 * @param distance 10キロメートルを超え、1200キロメートルまでの営業キロ
 * @returns 中央の営業キロ
 */
const getDistance2 = (distance: number) =>
  distance <= 15
    ? 13
    : distance <= 20
    ? 18
    : distance <= 23
    ? 22
    : distance <= 28
    ? 26
    : distance <= 32
    ? 30
    : distance <= 37
    ? 35
    : distance <= 41
    ? 39
    : distance <= 46
    ? 44
    : distance <= 55
    ? 51
    : distance <= 64
    ? 60
    : distance <= 73
    ? 69
    : distance <= 82
    ? 78
    : distance <= 91
    ? 87
    : distance <= 100
    ? 96
    : distance <= 110
    ? 105
    : distance <= 128
    ? 119
    : distance <= 146
    ? 137
    : distance <= 164
    ? 155
    : distance <= 182
    ? 173
    : distance <= 200
    ? 191
    : distance <= 219
    ? 210
    : distance <= 237
    ? 228
    : distance <= 255
    ? 246
    : distance <= 273
    ? 264
    : distance <= 291
    ? 282
    : distance <= 310
    ? 301
    : distance <= 328
    ? 319
    : distance <= 346
    ? 337
    : distance <= 364
    ? 355
    : distance <= 382
    ? 373
    : distance <= 400
    ? 391
    : distance <= 419
    ? 410
    : distance <= 437
    ? 428
    : distance <= 455
    ? 446
    : distance <= 473
    ? 464
    : distance <= 491
    ? 482
    : distance <= 510
    ? 501
    : distance <= 528
    ? 519
    : distance <= 546
    ? 537
    : distance <= 582
    ? 564
    : distance <= 619
    ? 601
    : distance <= 655
    ? 637
    : distance <= 691
    ? 673
    : distance <= 728
    ? 710
    : distance <= 764
    ? 746
    : distance <= 800
    ? 782
    : distance <= 837
    ? 819
    : distance <= 873
    ? 855
    : distance <= 910
    ? 892
    : distance <= 946
    ? 928
    : distance <= 982
    ? 964
    : distance <= 1019
    ? 1001
    : distance <= 1055
    ? 1037
    : distance <= 1091
    ? 1073
    : distance <= 1128
    ? 1110
    : distance <= 1164
    ? 1146
    : 1182;

/**
 *
 * @param distance 10キロメートルを超える営業キロ
 * @returns
 */
const getDistance1 = (distance: number) =>
  distance > 600
    ? Math.ceil(distance / 40) * 40 - 20
    : distance > 100
    ? Math.ceil(distance / 20) * 20 - 10
    : distance > 50
    ? Math.ceil(distance / 10) * 10 - 5
    : Math.ceil(distance / 5) * 5 - 2;

/**
 * **幹線**内相互発着となる場合の大人片道普通旅客運賃を計算する
 * @param distance 営業キロ
 * @returns 運賃
 */
const getBasicFare0 = (distance: number) => {
  // 1-3: 150, 4-6: 190, 7-10: 200
  const distance1 = getDistance1(distance);
  const fare0 =
    16.2 * Math.min(distance1, 300) +
    12.85 * Math.max(Math.min(distance1 - 300, 300), 0) +
    7.05 * Math.max(distance1 - 600, 0);

  return distance > 10
    ? round((distance > 100 ? round(fare0, -2) : ceil(fare0, -1)) * 1.1, -1)
    : distance > 6
    ? 200
    : distance > 3
    ? 190
    : 150;
};

/**
 * **地方交通線**内相互発着となる場合の大人片道普通旅客運賃を計算する
 * @param distance 営業キロ
 * @returns 運賃
 */
const getBasicFare1 = (distance: number) => {
  // 1-3: 150, 4-6: 190, 7-10: 210
  const distance2 = getDistance2(distance);
  const fare0 =
    17.8 * Math.min(distance2, 273) +
    14.1 * Math.max(Math.min(distance2 - 273, 273), 0) +
    7.7 * Math.max(distance2 - 546, 0);

  return 10 < distance && distance <= 15
    ? 240
    : 15 < distance && distance <= 20
    ? 330
    : 20 < distance && distance <= 23
    ? 420
    : 23 < distance && distance <= 28
    ? 510
    : 32 < distance && distance <= 37
    ? 680
    : 41 < distance && distance <= 46
    ? 860
    : 46 < distance && distance <= 55
    ? 990
    : 55 < distance && distance <= 64
    ? 1170
    : 64 < distance && distance <= 73
    ? 1340
    : 73 < distance && distance <= 82
    ? 1520
    : 82 < distance && distance <= 91
    ? 1690
    : 100 < distance && distance <= 110
    ? 1980
    : 291 < distance && distance <= 310
    ? 5720
    : distance > 10
    ? round((distance > 100 ? round(fare0, -2) : ceil(fare0, -1)) * 1.1, -1)
    : distance > 6
    ? 210
    : distance > 3
    ? 190
    : 150;
};

/**
 * **東京附近における電車特定区間**内相互発着の場合の大人片道普通旅客運賃を計算する
 * @param distance 営業キロ
 * @returns 運賃
 */
const getBasicFare2 = (distance: number) => {
  // 1-3: 140, 4-6: 160, 7-10: 170
  const distance1 = getDistance1(distance);
  const fare0 =
    15.3 * Math.min(distance1, 300) +
    12.15 * Math.max(Math.min(distance1 - 300, 300), 0);

  return distance > 10
    ? ceil((distance > 100 ? round(fare0, -2) : ceil(fare0, -1)) * 1.1, -1)
    : distance > 6
    ? 170
    : distance > 3
    ? 160
    : 140;
};

const reserved = "指定席";
const nonReserved = "自由席";
const specific = "特定";
const standingOnly = "立席";

/**
 * 特急券
 */
interface ExpressTicket {
  /**
   * 全乗車区間
   */
  readonly section: Section;
  /**
   * 特急料金
   */
  readonly fare: number;
  /**
   * はやぶさ号やこまち号を利用する区間
   */
  readonly highSpeed?: Section | undefined;
  /**
   * 特急券の種類
   */
  readonly type: typeof reserved | typeof nonReserved | typeof specific;
  /**
   * 利用可能な座席の種類
   */
  readonly availableSeat:
    | typeof reserved
    | typeof nonReserved
    | typeof standingOnly;
}

/**
 * 奥羽本線中福島・新庄間並びに田沢湖線及び奥羽本線中大曲・秋田間を、東北新幹線にまたがって利用する場合の指定席特急料金を計算する
 * @param distance 営業キロ
 * @returns 指定席特急料金
 */
const getLimitedExpressFare1 = (distance: number) =>
  getLimitedExpressFare3(distance) - 530;

/**
 * 奥羽本線中福島・新庄間並びに田沢湖線及び奥羽本線中大曲・秋田間の指定席特急料金を計算する
 * @param distance 営業キロ
 * @returns 指定席特急料金
 */
const getLimitedExpressFare3 = (distance: number) =>
  distance > 100 ? 2110 : distance > 50 ? 1660 : 1290;

/**
 * 上越線に運転する特別急行列車の越後湯沢・ガーラ湯沢相互間に発売する指定席特急券及び自由席特急券に対する特急料金
 */
const limitedExpressFares2 = {
  nonReservedOrStandingOnly: 100,
  reserved: 100,
};

/**
 * 奥羽本線中福島・新庄間並びに田沢湖線及び奥羽本線中大曲・秋田間の特急料金を計算する
 * @param distance 営業キロ
 * @returns 指定席特急料金、立席特急料金及び自由席特急料金
 */
const getLimitedExpressFares0 = (
  distance: number,
  season: Season,
  seasonRules: SeasonRules,
) => {
  const reserved = getLimitedExpressFare3(distance);
  return {
    reserved: applySeason(reserved, season, seasonRules),
    nonReservedOrStandingOnly: reserved - 530,
  } as const;
};

/**
 * 奥羽本線中福島・新庄間並びに田沢湖線及び奥羽本線中大曲・秋田間を、東北新幹線にまたがって利用する場合の特急料金を計算する
 * @param distance 営業キロ
 * @returns 指定席特急料金・立席特急料金及び自由席特急料金
 */
const getLimitedExpressFares1 = (distance: number) =>
  ({
    reserved: getLimitedExpressFare1(distance),
    nonReservedOrStandingOnly: getLimitedExpressFare3(distance) - 530,
  } as const);

/**
 * 新幹線の指定した区間の特急料金を計算する
 * @param line 東北新幹線、上越新幹線、北陸新幹線のいずれか
 * @param section 特急料金を計算する区間。 `arrival` は `departure` より終点に近い駅である必要がある。
 * @param highSpeed はやぶさ号やこまち号を利用する区間
 * @param season シーズン
 * @returns 自由席特急料金、特定特急料金、指定席特急料金
 */
const getSuperExpressTickets = (
  line: Line,
  section: SortedSection,
  highSpeed: SortedSection | undefined,
  season: Season,
  seasonRules: SeasonRules,
  stationExpressFareRules: StationExpressFareRules,
): Readonly<{
  reserved: ExpressTicket;
  nonReserved: ExpressTicket | undefined;
  reservedHighSpeed: ExpressTicket | undefined;
  standingOnly: ExpressTicket | undefined;
}> => {
  const { departure, arrival } = section;

  const standardFare = stationExpressFareRules.standard.get(line)!;
  const reservedExpressFare = standardFare(section);

  const specificExpressFares =
    departure.name === "郡山" && arrival.name === "福島"
      ? {
          nonReservedOrStandingOnly: 880,
          reserved: applySeason(1_410, season, seasonRules),
        }
      : departure.name === "東京" && arrival.name === "大宮"
      ? { nonReservedOrStandingOnly: 1090 }
      : arrival.index - departure.index === 1 ||
        [
          ["古川", "一ノ関"],
          ["一ノ関", "北上"],
          ["北上", "盛岡"],
          ["熊谷", "高崎"],
        ].some(([a, b]) =>
          isEquivalent(section, {
            departure: line.find(({ name }) => a === name)!,
            arrival: line.find(({ name }) => b === name)!,
          })
        )
      ? { nonReservedOrStandingOnly: getDistance0(section) > 50 ? 1000 : 880 }
      : {};

  const reservedExpressTicket: ExpressTicket = {
    availableSeat: reserved,
    section,
    ...("reserved" in specificExpressFares
      ? {
          type: specific,
          fare: specificExpressFares.reserved,
        }
      : {
          type: reserved,
          fare: applySeason(reservedExpressFare, season, seasonRules),
        }),
  };

  /**
   * 自由席が利用可能な区間であれば、 `true`
   */
  const nonReservedAvailable =
    line !== line0 ||
    arrival.index <= line.findIndex(({ name }) => name === "盛岡");

  /**
   * 立席が利用可能な区間であれば、 `true`
   */
  const standingOnlyAvailable =
    line === line0 &&
    departure.index >= line.findIndex(({ name }) => name === "盛岡");

  const nonReservedExpressTicket: ExpressTicket | undefined =
    nonReservedAvailable
      ? {
          availableSeat: nonReserved,
          section,
          ...("nonReservedOrStandingOnly" in specificExpressFares
            ? {
                type: specific,
                fare: specificExpressFares.nonReservedOrStandingOnly,
              }
            : { type: nonReserved, fare: reservedExpressFare - 530 }),
        }
      : undefined;

  const standingOnlyExpressTicket: ExpressTicket | undefined =
    standingOnlyAvailable
      ? {
          type: specific,
          availableSeat: standingOnly,
          section,
          fare:
            "nonReservedOrStandingOnly" in specificExpressFares
              ? specificExpressFares.nonReservedOrStandingOnly
              : reservedExpressFare - 530,
        }
      : undefined;

  const reservedHighSpeedFare =
    highSpeed &&
    (highSpeed.departure === departure && highSpeed.arrival === arrival
      ? stationExpressFareRules.highSpeed(section)
      : reservedExpressFare +
        stationExpressFareRules.highSpeed(highSpeed) -
        standardFare(highSpeed));

  const reservedHighSpeedTicket: ExpressTicket | undefined =
    reservedHighSpeedFare !== undefined
      ? {
          type: reserved,
          availableSeat: reserved,
          section,
          highSpeed,
          fare: applySeason(reservedHighSpeedFare, season, seasonRules),
        }
      : undefined;

  return {
    reserved: reservedExpressTicket,
    nonReserved: nonReservedExpressTicket,
    standingOnly: standingOnlyExpressTicket,
    reservedHighSpeed: reservedHighSpeedTicket,
  };
};

/**
 * 新幹線以外の線区の指定した区間の特急料金を計算する
 * @param line 秋田新幹線、山形新幹線、上越新幹線（ガーラ湯沢方面）のいずれか
 * @param section 特急料金を計算する区間。 `arrival` は `departure` より終点に近い駅である必要がある。
 */
const getLimitedExpressFares2 = (
  line: Line,
  section: SortedSection,
  season: Season,
  seasonRules: SeasonRules,
) =>
  line === line4
    ? limitedExpressFares2
    : getLimitedExpressFares0(getDistance0(section), season, seasonRules);

/**
 * 新幹線以外の線区の指定した区間の特急料金を計算する
 * @param line 秋田新幹線、山形新幹線、上越新幹線（ガーラ湯沢方面）のいずれか
 * @param section 特急料金を計算する区間。 `arrival` は `departure` より終点に近い駅である必要がある。
 */
const getLimitedExpressTickets = (
  line: Line,
  section: SortedSection,
  getLimitedExpressFares: (
    line: Line,
    section: SortedSection,
    season: Season
  ) => {
    readonly reserved: number;
    readonly nonReservedOrStandingOnly: number;
  },
  season: Season
): Readonly<{
  reserved: ExpressTicket;
  nonReserved: ExpressTicket | undefined;
  standingOnly: ExpressTicket | undefined;
}> => {
  const {
    reserved: reservedExpressFare,
    nonReservedOrStandingOnly: nonReservedOrStandingOnlyExpressFare,
  } = getLimitedExpressFares(line, section, season);

  const reservedExpressTicket: ExpressTicket = {
    type: reserved,
    section,
    fare: reservedExpressFare,
    availableSeat: reserved,
  };

  /**
   * 自由席が利用可能な区間であれば、 `true`
   */
  const nonReservedAvailable = line === line4;

  /**
   * 立席が利用可能な区間であれば、 `true`
   */
  const standingOnlyAvailable = line === line1 || line === line2;

  const nonReservedExpressTicket: ExpressTicket | undefined =
    nonReservedAvailable
      ? {
          availableSeat: nonReserved,
          type: nonReserved,
          section,
          fare: nonReservedOrStandingOnlyExpressFare,
        }
      : undefined;

  const standingOnlyExpressTicket: ExpressTicket | undefined =
    standingOnlyAvailable
      ? {
          type: specific,
          availableSeat: standingOnly,
          section,
          fare: nonReservedOrStandingOnlyExpressFare,
        }
      : undefined;

  return {
    reserved: reservedExpressTicket,
    nonReserved: nonReservedExpressTicket,
    standingOnly: standingOnlyExpressTicket,
  };
};

export const get2022BasicFare = (line: Line, section: SortedSection) => {
  const { departure, arrival } = section;
  const distance = getDistance0(section);

  return arrival.index <= line.findIndex(({ name }) => name === "大宮")
    ? getBasicFare2(distance)
    : line === line1 &&
      departure.index >= line.findIndex(({ name }) => name === "盛岡") &&
      arrival.index <= line.findIndex(({ name }) => name === "大曲")
    ? getBasicFare1(distance)
    : getBasicFare0(
        line === line1 &&
          ["盛岡", "大曲"]
            .map((name) => line.findIndex((station) => station.name === name))
            .some((i) => departure.index < i && i < arrival.index)
          ? distance +
              round(
                getDistance0({
                  sorted: true,
                  departure:
                    departure.index <
                    line.findIndex(({ name }) => name === "盛岡")
                      ? line.find(({ name }) => name === "盛岡")!
                      : departure,
                  arrival:
                    line.findIndex(({ name }) => name === "大曲") <
                    arrival.index
                      ? line.find(({ name }) => name === "大曲")!
                      : arrival,
                }) *
                  (17.8 / 16.2 - 1),
                1
              )
          : distance
      );
};

interface TicketType {
  readonly name: string;
  readonly url?: URL;
  isAvailable(line: Line, expressTickets: readonly ExpressTicket[]): boolean;
}

const ticketTypes: readonly [TicketType, TicketType, TicketType] = [
  {
    name: "紙のきっぷ",
    isAvailable() {
      return true;
    },
  },
  {
    name: "タッチでGo!新幹線",
    url: new URL("https://www.jreast.co.jp/touchdego/"),
    isAvailable(line: Line, expressTickets: readonly ExpressTicket[]) {
      return !(
        expressTickets.some(
          ({ availableSeat }) => availableSeat === reserved
        ) ||
        ((line === line0 || line === line1) &&
          expressTickets[0]!.section.departure.index <
            line.findIndex(({ name }) => name === "盛岡") &&
          expressTickets.slice(-1)[0]!.section.arrival.index >
            line.findIndex(({ name }) => name === "盛岡")) ||
        (line === line2 &&
          expressTickets[0]!.section.departure.index <
            line.findIndex(({ name }) => name === "福島") &&
          expressTickets.slice(-1)[0]!.section.arrival.index >
            line.findIndex(({ name }) => name === "福島"))
      );
    },
  },
  {
    name: "新幹線eチケット",
    url: new URL("https://www.eki-net.com/top/e-ticket/"),
    isAvailable(line: Line, expressTickets: readonly ExpressTicket[]) {
      return (
        !expressTickets.some(
          ({ availableSeat }) => availableSeat === standingOnly
        ) &&
        (expressTickets[0]!.section.departure !==
          line.find(({ name }) => name === "東京") ||
          expressTickets.slice(-1)[0]!.section.arrival !==
            line.find(({ name }) => name === "上野")) &&
        (expressTickets[0]!.section.departure !==
          line.find(({ name }) => name === "越後湯沢") ||
          expressTickets.slice(-1)[0]!.section.arrival !==
            line.find(({ name }) => name === "ガーラ湯沢"))
      );
    },
  },
];

interface TotalFare {
  /**
   * 運賃
   */
  readonly basicFare: number;
  /**
   * 特急券
   */
  readonly expressTickets: readonly ExpressTicket[];
  /**
   * 割引
   */
  readonly discount?: number;
  /**
   * 運賃・特急料金・割引の合計
   */
  readonly total: number;
  readonly types: readonly TicketType[];
}

const chooseOneOrBothTicketType = <
  F extends {
    readonly total: number;
    readonly basicFare: number;
    readonly types: readonly TicketType[];
  }
>(
  a: F,
  b: F
): F =>
  a.total < b.total
    ? a
    : a.total > b.total
    ? b
    : {
        ...a,
        types: [...a.types, ...b.types],
      };

const totalFares = <
  F extends {
    readonly basicFare: number;
    readonly expressTickets: readonly ExpressTicket[];
    readonly discount?: number;
  }
>(
  fares: F
): F & { readonly total: number } => ({
  ...fares,
  total:
    fares.basicFare +
    sum(fares.expressTickets.map(({ fare }) => fare)) +
    (fares.discount ?? 0),
});

const getFareTotalWithSomeTicketType = (
  line: Line,
  basicFares: readonly [number, number],
  expressTickets: readonly ExpressTicket[]
) =>
  [
    {
      basicFare: basicFares[1],
      expressTickets,
      types: [ticketTypes[0]],
    },
    ...(ticketTypes[1].isAvailable(line, expressTickets)
      ? [
          {
            basicFare: basicFares[1],
            expressTickets,
            types: [ticketTypes[1]],
          },
        ]
      : []),
    ...(ticketTypes[2].isAvailable(line, expressTickets)
      ? [
          {
            basicFare: basicFares[0],
            expressTickets,
            types: [ticketTypes[2]],
            ...(expressTickets.some(
              ({ availableSeat }) => availableSeat === reserved
            )
              ? { discount: -200 }
              : {}),
          },
        ]
      : []),
  ]
    .map(totalFares)
    .reduce(chooseOneOrBothTicketType);

/**
 * 指定した区間の運賃・特急料金を計算する
 * @param line
 * @param section 運賃・特急料金を計算する区間
 * @param highSpeed はやぶさ号やこまち号を利用する区間
 */
export const calculateFareOptions = ({
  line,
  section,
  highSpeed,
  season,
  seasonRules,
  stationExpressFareRules,
  getBasicFare,
}: {
  line: Line;
  section: SortedSection;
  highSpeed: SortedSection | undefined;
  season: Season;
  seasonRules: SeasonRules;
  stationExpressFareRules: StationExpressFareRules;
  getBasicFare: (line: Line, section: SortedSection) => number;
}) => {
  const { departure, arrival } = section;

  const distance = getDistance0(section);
  const junction = junctions.get(line);

  const superExpressTickets =
    (line === line1 || line === line2 || line === line4) && junction
      ? departure.index < junction.index
        ? getSuperExpressTickets(
            line === line4 ? line3 : line0,
            junction.index < arrival.index
              ? { sorted: true, departure, arrival: junction }
              : section,
            highSpeed &&
              (junction.index < highSpeed.arrival.index
                ? {
                    sorted: true,
                    departure: highSpeed.departure,
                    arrival: junction,
                  }
                : highSpeed),
            season,
            seasonRules,
            stationExpressFareRules,
          )
        : undefined
      : getSuperExpressTickets(
          line,
          section,
          highSpeed,
          season,
          seasonRules,
          stationExpressFareRules,
        );

  const limitedExpressFares =
    (line === line1 || line === line2 || line === line4) &&
    junction &&
    arrival.index > junction.index
      ? departure.index >= junction.index
        ? getLimitedExpressTickets(
            line,
            section,
            (fareLine, fareSection, fareSeason) =>
              getLimitedExpressFares2(
                fareLine,
                fareSection,
                fareSeason,
                seasonRules,
              ),
            season,
          )
        : getLimitedExpressTickets(
            line,
            { departure: junction, arrival, sorted: true },
            line === line4
              ? (fareLine, fareSection, fareSeason) =>
                  getLimitedExpressFares2(
                    fareLine,
                    fareSection,
                    fareSeason,
                    seasonRules,
                  )
              : (_, section) => getLimitedExpressFares1(getDistance0(section)),
            season
          )
      : undefined;

  const nonReservedOrStandingOnlySuperExpressTicket =
    superExpressTickets?.nonReserved ?? superExpressTickets?.standingOnly;
  const nonReservedOrStandingOnlyLimitedExpressTicket =
    limitedExpressFares?.nonReserved ?? limitedExpressFares?.standingOnly;

  const nonReservedOrStandingOnlyAvailable: boolean =
    (!superExpressTickets || !!nonReservedOrStandingOnlySuperExpressTicket) &&
    (!limitedExpressFares || !!nonReservedOrStandingOnlyLimitedExpressTicket);

  const nonReservedOrStandingOnlyExpressTickets =
    nonReservedOrStandingOnlyAvailable
      ? [
          nonReservedOrStandingOnlySuperExpressTicket,
          nonReservedOrStandingOnlyLimitedExpressTicket,
        ].filter((ticket): ticket is ExpressTicket => ticket !== undefined)
      : undefined;

  const reservedExpressTickets = [
    superExpressTickets?.reserved,
    limitedExpressFares?.reserved,
  ].filter((ticket): ticket is ExpressTicket => ticket !== undefined);

  const reservedHighSpeedExpressTickets =
    superExpressTickets?.reservedHighSpeed &&
    [
      superExpressTickets?.reservedHighSpeed,
      limitedExpressFares?.reserved,
    ].filter((ticket): ticket is ExpressTicket => ticket !== undefined);

  const basicFare0 = getBasicFare(line, section);
  const fareSection = basicFareSection(section);
  const basicFare1 =
    fareSection === section ? basicFare0 : getBasicFare(line, fareSection);

  const nonReservedOrStandingOnly: TotalFare | undefined =
    nonReservedOrStandingOnlyExpressTickets &&
    getFareTotalWithSomeTicketType(
      line,
      [basicFare0, basicFare1],
      nonReservedOrStandingOnlyExpressTickets
    );
  const reserved: TotalFare = getFareTotalWithSomeTicketType(
    line,
    [basicFare0, basicFare1],
    reservedExpressTickets
  );
  const reservedHighSpeed: TotalFare | undefined =
    reservedHighSpeedExpressTickets &&
    getFareTotalWithSomeTicketType(
      line,
      [basicFare0, basicFare1],
      reservedHighSpeedExpressTickets
    );

  return {
    distance,
    nonReservedOrStandingOnly: nonReservedOrStandingOnly,
    reserved,
    reservedHighSpeed,
  } as const;
};

export type {
  ExpressTicket,
  TotalFare,
};
