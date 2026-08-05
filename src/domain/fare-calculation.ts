import hokurikuFares from "./express-fares/hokuriku.md?raw";
import joetsuFares from "./express-fares/joetsu.md?raw";
import tohokuHighSpeedFares from "./express-fares/tohoku-hayabusa-komachi.md?raw";
import tohokuFares from "./express-fares/tohoku.md?raw";
import { getBasicFareForSection } from "./basic-fares";
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

/** 2022年4月1日施行で、2026年3月14日現在も有効なシーズン加減。 */
const seasonAdjustment = (season: Season) =>
  season === "最繁忙期"
    ? 400
    : season === "繁忙期"
      ? 200
      : season === "閑散期"
        ? -200
        : 0;

const applySeason = (fare: number, season: Season) =>
  fare + seasonAdjustment(season);

const junctions: ReadonlyMap<Line, Station> = new Map(
  (
    [
      [line1, "盛岡"],
      [line2, "福島"],
      [line3, "大宮"],
      [line4, "越後湯沢"],
      [line5, "高崎"],
    ] as const
  ).map(([line, station]) => [
    line,
    line.find(({ name }) => name === station)!,
  ]),
);

type FareTable = (section: SortedSection) => number | undefined;

const parseFareTable = (markdown: string): FareTable => {
  const [header = [], , ...rows] = markdown
    .trim()
    .split("\n")
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );

  return ({ departure, arrival }) => {
    const column = header.indexOf(departure.name);
    const cell = rows.find(([station]) => station === arrival.name)?.[column];
    if (!cell) return undefined;

    const fare = Number(cell.replaceAll(",", ""));
    return Number.isFinite(fare) ? fare : undefined;
  };
};

/**
 * 2026年3月14日時点の旅客営業規則別表第2号と
 * 運送約款改正履歴に照合した新幹線の通常期基準額。
 */
export const standardExpressFareTables: ReadonlyMap<Line, FareTable> = new Map([
  [line0, parseFareTable(tohokuFares)],
  [line3, parseFareTable(joetsuFares)],
  [line5, parseFareTable(hokurikuFares)],
]);
export const highSpeedExpressFareTable = parseFareTable(tohokuHighSpeedFares);

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
) => {
  const reserved = getLimitedExpressFare3(distance);
  return {
    reserved: applySeason(reserved, season),
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
  }) as const;

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
): Readonly<{
  reserved: ExpressTicket;
  nonReserved: ExpressTicket | undefined;
  reservedHighSpeed: ExpressTicket | undefined;
  standingOnly: ExpressTicket | undefined;
}> => {
  const { departure, arrival } = section;

  const standardFare = standardExpressFareTables.get(line)!;
  const reservedExpressFare = standardFare(section);
  if (reservedExpressFare === undefined) {
    throw new RangeError(
      `${departure.name}・${arrival.name}間の指定席特急料金がありません`,
    );
  }

  const specificExpressFares =
    departure.name === "郡山" && arrival.name === "福島"
      ? {
          nonReservedOrStandingOnly: 880,
          reserved: applySeason(1_410, season),
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
              }),
            )
          ? {
              nonReservedOrStandingOnly:
                getDistance0(section) > 50 ? 1000 : 880,
            }
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
          fare: applySeason(reservedExpressFare, season),
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

  const highSpeedFare = highSpeed
    ? highSpeedExpressFareTable(highSpeed)
    : undefined;
  const standardHighSpeedSectionFare = highSpeed
    ? standardFare(highSpeed)
    : undefined;
  const reservedHighSpeedFare =
    highSpeed && highSpeedFare !== undefined
      ? highSpeed.departure === departure && highSpeed.arrival === arrival
        ? highSpeedFare
        : standardHighSpeedSectionFare !== undefined
          ? reservedExpressFare + highSpeedFare - standardHighSpeedSectionFare
          : undefined
      : undefined;

  const reservedHighSpeedTicket: ExpressTicket | undefined =
    reservedHighSpeedFare !== undefined
      ? {
          type: reserved,
          availableSeat: reserved,
          section,
          highSpeed,
          fare: applySeason(reservedHighSpeedFare, season),
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
) =>
  line === line4
    ? limitedExpressFares2
    : getLimitedExpressFares0(getDistance0(section), season);

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
    season: Season,
  ) => {
    readonly reserved: number;
    readonly nonReservedOrStandingOnly: number;
  },
  season: Season,
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
          ({ availableSeat }) => availableSeat === reserved,
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
          ({ availableSeat }) => availableSeat === standingOnly,
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
  },
>(
  a: F,
  b: F,
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
  },
>(
  fares: F,
): F & { readonly total: number } => ({
  ...fares,
  total:
    fares.basicFare +
    fares.expressTickets.reduce((total, { fare }) => total + fare, 0) +
    (fares.discount ?? 0),
});

const getFareTotalWithSomeTicketType = (
  line: Line,
  basicFares: readonly [number, number],
  expressTickets: readonly ExpressTicket[],
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
              ({ availableSeat }) => availableSeat === reserved,
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
}: {
  line: Line;
  section: SortedSection;
  highSpeed: SortedSection | undefined;
  season: Season;
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
          )
        : undefined
      : getSuperExpressTickets(
          line,
          section,
          highSpeed,
          season,
        );

  const limitedExpressFares =
    (line === line1 || line === line2 || line === line4) &&
    junction &&
    arrival.index > junction.index
      ? departure.index >= junction.index
        ? getLimitedExpressTickets(
            line,
            section,
            getLimitedExpressFares2,
            season,
          )
        : getLimitedExpressTickets(
            line,
            { departure: junction, arrival, sorted: true },
            line === line4
              ? getLimitedExpressFares2
              : (_, section) => getLimitedExpressFares1(getDistance0(section)),
            season,
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

  const basicFare0 = getBasicFareForSection(line, section);
  const fareSection = basicFareSection(section);
  const basicFare1 =
    fareSection === section
      ? basicFare0
      : getBasicFareForSection(line, fareSection);

  const nonReservedOrStandingOnly: TotalFare | undefined =
    nonReservedOrStandingOnlyExpressTickets &&
    getFareTotalWithSomeTicketType(
      line,
      [basicFare0, basicFare1],
      nonReservedOrStandingOnlyExpressTickets,
    );
  const reserved: TotalFare = getFareTotalWithSomeTicketType(
    line,
    [basicFare0, basicFare1],
    reservedExpressTickets,
  );
  const reservedHighSpeed: TotalFare | undefined =
    reservedHighSpeedExpressTickets &&
    getFareTotalWithSomeTicketType(
      line,
      [basicFare0, basicFare1],
      reservedHighSpeedExpressTickets,
    );

  return {
    distance,
    nonReservedOrStandingOnly: nonReservedOrStandingOnly,
    reserved,
    reservedHighSpeed,
  } as const;
};

export type { ExpressTicket, TotalFare };
