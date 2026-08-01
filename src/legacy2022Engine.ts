import { parse } from "csv-parse/browser/esm/sync";
import { ceil, round, sum } from "lodash";

interface Section {
  departure: Station;
  arrival: Station;
}

interface SortedSection extends Section {
  sorted: true;
}

const average = "通常期";
const busy = "繁忙期";
const busiest = "最繁忙期";
const off = "閑散期";

const seasons = [off, average, busy, busiest] as const;

type Season = (typeof seasons)[number];

interface Station {
  readonly index: number;
  readonly name: string;
  /**
   * 起点からの営業キロ
   */
  readonly distance: number;
}

/**
 * 特定都区市内または東京山手線内
 */
interface Zone {
  readonly name: string;
  readonly central: Station;
  readonly stations: ReadonlySet<Station>;
}

type Line = readonly Station[];

interface LineGroup {
  readonly name: string;
  readonly lines: readonly Line[];
}

// (\d+(?:\.\d)?)\t(.+)
/** 東北新幹線 */
const line0: Line = [
  { name: "東京", distance: 0 },
  { name: "上野", distance: 3.6 },
  { name: "大宮", distance: 30.3 },
  { name: "小山", distance: 80.6 },
  { name: "宇都宮", distance: 109.5 },
  { name: "那須塩原", distance: 157.8 },
  { name: "新白河", distance: 185.4 },
  { name: "郡山", distance: 226.7 },
  { name: "福島", distance: 272.8 },
  { name: "白石蔵王", distance: 306.8 },
  { name: "仙台", distance: 351.8 },
  { name: "古川", distance: 395 },
  { name: "くりこま高原", distance: 416.2 },
  { name: "一ノ関", distance: 445.1 },
  { name: "水沢江刺", distance: 470.1 },
  { name: "北上", distance: 487.5 },
  { name: "新花巻", distance: 500 },
  { name: "盛岡", distance: 535.3 },
  { name: "いわて沼宮内", distance: 566.4 },
  { name: "二戸", distance: 601 },
  { name: "八戸", distance: 631.9 },
  { name: "七戸十和田", distance: 668 },
  { name: "新青森", distance: 713.7 },
].map((value, index) => ({ ...value, index }));

/** 秋田新幹線 */
const line1: Line = [
  ...line0.slice(
    line0.findIndex(({ name }) => name === "東京"),
    line0.findIndex(({ name }) => name === "盛岡") + 1
  ),
  ...[
    { name: "雫石", distance: 551.3 },
    { name: "田沢湖", distance: 575.4 },
    { name: "角館", distance: 594.1 },
    { name: "大曲", distance: 610.9 },
    { name: "秋田", distance: 662.6 },
  ].map((value, index) => ({
    ...value,
    index: index + line0.findIndex(({ name }) => name === "盛岡") + 1,
  })),
];

/** 山形新幹線 */
const line2: Line = [
  ...line0.slice(
    line0.findIndex(({ name }) => name === "東京"),
    line0.findIndex(({ name }) => name === "福島") + 1
  ),
  ...[
    { name: "米沢", distance: 312.9 },
    { name: "高畠", distance: 322.7 },
    { name: "赤湯", distance: 328.9 },
    { name: "かみのやま温泉", distance: 347.8 },
    { name: "山形", distance: 359.9 },
    { name: "天童", distance: 373.2 },
    { name: "さくらんぼ東根", distance: 380.9 },
    { name: "村山", distance: 386.3 },
    { name: "大石田", distance: 399.7 },
    { name: "新庄", distance: 421.4 },
  ].map((value, index) => ({
    ...value,
    index: index + line0.findIndex(({ name }) => name === "福島") + 1,
  })),
];

/** 上越新幹線（新潟方面） */
const line3: Line = [
  ...line0.slice(
    line0.findIndex(({ name }) => name === "東京"),
    line0.findIndex(({ name }) => name === "大宮") + 1
  ),
  ...[
    { name: "熊谷", distance: 64.7 },
    { name: "本庄早稲田", distance: 86 },
    { name: "高崎", distance: 105 },
    { name: "上毛高原", distance: 151.6 },
    { name: "越後湯沢", distance: 199.2 },
    { name: "浦佐", distance: 228.9 },
    { name: "長岡", distance: 270.6 },
    { name: "燕三条", distance: 293.8 },
    { name: "新潟", distance: 333.9 },
  ].map((value, index) => ({
    ...value,
    index: index + line0.findIndex(({ name }) => name === "大宮") + 1,
  })),
];

/** 上越新幹線（ガーラ湯沢方面） */
const line4: Line = [
  ...line3.slice(
    line3.findIndex(({ name }) => name === "東京"),
    line3.findIndex(({ name }) => name === "越後湯沢") + 1
  ),
  {
    name: "ガーラ湯沢",
    distance: 201.0,
    index: line3.findIndex(({ name }) => name === "越後湯沢") + 1,
  },
];

/** 北陸新幹線 */
const line5 = [
  ...line0.slice(
    line0.findIndex(({ name }) => name === "東京"),
    line0.findIndex(({ name }) => name === "大宮") + 1
  ),
  ...line3.slice(
    line3.findIndex(({ name }) => name === "熊谷"),
    line3.findIndex(({ name }) => name === "高崎") + 1
  ),
  ...[
    { name: "安中榛名", distance: 123.5 },
    { name: "軽井沢", distance: 146.8 },
    { name: "佐久平", distance: 164.4 },
    { name: "上田", distance: 189.2 },
    { name: "長野", distance: 222.4 },
    { name: "飯山", distance: 252.3 },
    { name: "上越妙高", distance: 281.9 },
    // { name: "糸魚川", distance: 318.9 },
    // { name: "黒部宇奈月温泉", distance: 358.1 },
    // { name: "富山", distance: 391.9 },
    // { name: "新高岡", distance: 410.8 },
    // { name: "金沢", distance: 450.5 },
  ].map((value, index) => ({
    ...value,
    index: index + line3.findIndex(({ name }) => name === "高崎") + 1,
  })),
];

const lineGroups: ReadonlyMap<string, LineGroup> = new Map(
  [
    { name: "東北新幹線", lines: [line0] },
    { name: "秋田新幹線", lines: [line1] },
    { name: "山形新幹線", lines: [line2] },
    { name: "上越新幹線", lines: [line3, line4] },
    { name: "北陸新幹線", lines: [line5] },
  ].map((group) => [group.name, group])
);

const zone0: Zone = {
  name: "東京山手線内",
  central: line0.find(({ name }) => name === "東京")!,
  stations: new Set([
    line0.find(({ name }) => name === "東京")!,
    line0.find(({ name }) => name === "上野")!,
  ]),
};

const zone1: Zone = {
  name: "東京都区内",
  central: line0.find(({ name }) => name === "東京")!,
  stations: new Set([
    line0.find(({ name }) => name === "東京")!,
    line0.find(({ name }) => name === "上野")!,
  ]),
};

const zone2: Zone = {
  name: "仙台市内",
  central: line0.find(({ name }) => name === "仙台")!,
  stations: new Set([line0.find(({ name }) => name === "仙台")!]),
};

const cityZones: readonly Zone[] = [zone1, zone2];

const highSpeedTrains: ReadonlyMap<Line, string> = new Map([
  [line0, "はやぶさ"],
  [line1, "こまち"],
]);

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

type FareTable = readonly { readonly [column: string]: string }[];

const csvs: readonly (readonly [Line, string])[] = [
  [
    line0,
    `
駅名,東京,上野,大宮,小山,宇都宮,那須塩原,新白河,郡山,福島,白石蔵王,仙台,古川,くりこま高原,一ノ関,水沢江刺,北上,新花巻,盛岡,いわて沼宮内,二戸,八戸,七戸十和田
上野,2400,,,,,,,,,,,,,,,,,,,,,
大宮,2610,2400,,,,,,,,,,,,,,,,,,,,
小山,2610,2400,2400,,,,,,,,,,,,,,,,,,,
宇都宮,3040,2830,2400,2400,,,,,,,,,,,,,,,,,,
那須塩原,3380,3170,3170,2400,2400,,,,,,,,,,,,,,,,,
新白河,3380,3170,3170,3170,2400,2400,,,,,,,,,,,,,,,,
郡山,4270,4060,3170,3170,3170,2400,2400,,,,,,,,,,,,,,,
福島,4270,4060,4060,3170,3170,3170,2400,2400,,,,,,,,,,,,,,
白石蔵王,5040,4830,4060,4060,3170,3170,3170,2400,2400,,,,,,,,,,,,,
仙台,5040,4830,4830,4060,4060,3170,3170,3170,2400,2400,,,,,,,,,,,,
古川,5040,4830,4830,4830,4060,4060,4060,3170,3170,2400,2400,,,,,,,,,,,
くりこま高原,5580,5370,4830,4830,4830,4060,4060,3170,3170,3170,2400,2400,,,,,,,,,,
一ノ関,5580,5370,5370,4830,4830,4060,4060,4060,3170,3170,2400,2400,2400,,,,,,,,,
水沢江刺,5580,5370,5370,4830,4830,4830,4060,4060,3170,3170,3170,2400,2400,2400,,,,,,,,
北上,5580,5370,5370,5370,4830,4830,4830,4060,4060,3170,3170,2400,2400,2400,2400,,,,,,,
新花巻,5580,5370,5370,5370,4830,4830,4830,4060,4060,3170,3170,3170,2400,2400,2400,2400,,,,,,
盛岡,5910,5700,5370,5370,5370,4830,4830,4830,4060,4060,3170,3170,3170,2400,2400,2400,2400,,,,,
いわて沼宮内,5910,5700,5700,5370,5370,5370,4830,4830,4060,4060,4060,3170,3170,3170,2400,2400,2400,2400,,,,
二戸,5910,5700,5700,5700,5370,5370,5370,4830,4830,4060,4060,4060,3170,3170,3170,3170,3170,2400,2400,,,
八戸,6280,6070,6070,5700,5700,5370,5370,5370,4830,4830,4060,4060,4060,3170,3170,3170,3170,2400,2400,2400,,
七戸十和田,6280,6070,6070,5700,5700,5700,5370,5370,4830,4830,4830,4060,4060,4060,3170,3170,3170,3170,3170,2400,2400,
新青森,6810,6600,6070,6070,6070,5700,5700,5370,5370,5370,4830,4830,4060,4060,4060,4060,4060,3170,3170,3170,2400,2400
`,
  ],
  [
    line3,
    `
駅名,東京,上野,大宮,熊谷,本庄早稲田,高崎,上毛高原,越後湯沢,浦佐,長岡,燕三条
上野,2400,,,,,,,,,,
大宮,2610,2400,,,,,,,,,
熊谷,2610,2400,2400,,,,,,,,
本庄早稲田,2610,2400,2400,2400,,,,,,,
高崎,3040,2830,2400,2400,2400,,,,,,
上毛高原,3380,3170,3170,2400,2400,2400,,,,,
越後湯沢,3380,3170,3170,3170,3170,2400,2400,,,,
浦佐,4270,4060,3170,3170,3170,3170,2400,2400,,,
長岡,4270,4060,4060,4060,3170,3170,3170,2400,2400,,
燕三条,4270,4060,4060,4060,4060,3170,3170,2400,2400,2400,
新潟,5040,4830,4830,4060,4060,4060,3170,3170,3170,2400,2400
`,
  ],
  [
    line5,
    `
駅名,東京,上野,大宮,熊谷,本庄早稲田,高崎,安中榛名,軽井沢,佐久平,上田,長野,飯山,上越妙高,糸魚川,黒部宇奈月温泉,富山,新高岡
上野,2400,,,,,,,,,,,,,,,,
大宮,2610,2400,,,,,,,,,,,,,,,
熊谷,2610,2400,2400,,,,,,,,,,,,,,
本庄早稲田,2610,2400,2400,2400,,,,,,,,,,,,,
高崎,3040,2830,2400,2400,2400,,,,,,,,,,,,
安中榛名,3040,2830,2400,2400,2400,2400,,,,,,,,,,,
軽井沢,3380,3170,3170,2400,2400,2400,2400,,,,,,,,,,
佐久平,3380,3170,3170,2400,2400,2400,2400,2400,,,,,,,,,
上田,3380,3170,3170,3170,3170,2400,2400,2400,2400,,,,,,,,
長野,4270,4060,3170,3170,3170,3170,2400,2400,2400,2400,,,,,,,
飯山,4270,4060,4060,3170,3170,3170,3170,3170,2400,2400,2400,,,,,,
上越妙高,4270,4060,4060,4060,3170,3170,3170,3170,3170,2400,2400,2400,,,,,
糸魚川,5700,5490,4730,4730,4730,4730,3830,3830,3830,3830,3070,3070,2400,,,,
黒部宇奈月温泉,6030,5820,5820,5050,5050,5050,5050,5050,4160,4160,4160,3830,2400,2400,,,
富山,6360,6150,6150,6150,6150,5390,5390,5390,5390,5390,4160,3830,3170,2400,2400,,
新高岡,6900,6690,6150,6150,6150,6150,5390,5390,5390,5390,4160,3830,3170,2400,2400,2400,
金沢,6900,6690,6690,6150,6150,6150,6150,6150,5390,5390,5050,3830,3170,3170,2400,2400,2400
`,
  ],
];

const tables: ReadonlyMap<Line, FareTable> = new Map(
  csvs.map(
    ([line, raw]) => [line, parse(raw.trim(), { columns: true })] as const
  )
);

const table: FareTable = parse(
  `
駅名,東京,上野,大宮,仙台,古川,くりこま高原,一ノ関,水沢江刺,北上,新花巻,盛岡,いわて沼宮内,二戸,八戸,七戸十和田
上野,2400,,,,,,,,,,,,,,
大宮,2610,2400,,,,,,,,,,,,,
仙台,5360,5150,5150,,,,,,,,,,,,
古川,5360,5150,5150,2500,,,,,,,,,,,
くりこま高原,6000,5790,5250,2500,2500,,,,,,,,,,
一ノ関,6000,5790,5790,2500,2500,2500,,,,,,,,,
水沢江刺,6000,5790,5790,3380,2500,2500,2500,,,,,,,,
北上,6000,5790,5790,3380,2500,2500,2500,2500,,,,,,,
新花巻,6000,5790,5790,3380,3380,2500,2500,2500,2500,,,,,,
盛岡,6430,6220,5890,3380,3380,3380,2500,2500,2500,2500,,,,,
いわて沼宮内,6430,6220,6220,4270,3380,3380,3270,2500,2500,2500,2400,,,,
二戸,6430,6220,6220,4270,4270,3380,3270,3270,3270,3270,2400,2400,,,
八戸,6800,6590,6590,4270,4270,4270,3270,3270,3270,3270,2400,2400,2400,,
七戸十和田,6800,6590,6590,5040,4270,4270,4160,3270,3270,3270,3170,3170,2400,2400,
新青森,7330,7120,6590,5040,5040,4270,4160,4160,4160,4160,3170,3170,3170,2400,2400
`.trim(),
  { columns: true }
);

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
 * 指定した区間の距離を返す。丸め誤差は取り除く。
 * @param section 距離を求める区間
 * @returns 距離
 */
const getDistance0 = (section: SortedSection) =>
  round(section.arrival.distance - section.departure.distance, 1);

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
const getLimitedExpressFares0 = (distance: number, season: Season) => {
  const reserved = getLimitedExpressFare3(distance);
  return {
    reserved:
      season === busiest
        ? reserved + 400
        : season === busy
        ? reserved + 200
        : season === off
        ? reserved - 200
        : reserved,
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
 * 新幹線の指定席特急料金を計算する
 * @param table 指定席特急料金の表
 * @param section 区間。 `arrival` は `departure` より終点に近い駅である必要がある
 * @returns 指定席特急料金
 */
const getSuperExpressFare = (
  table: FareTable,
  section: SortedSection
): number =>
  +table.find((row) => row["駅名"] === section.arrival.name)![
    section.departure.name
  ]!;

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
  season: Season
): Readonly<{
  reserved: ExpressTicket;
  nonReserved: ExpressTicket | undefined;
  reservedHighSpeed: ExpressTicket | undefined;
  standingOnly: ExpressTicket | undefined;
}> => {
  const { departure, arrival } = section;

  const reservedExpressFare = getSuperExpressFare(tables.get(line)!, section);

  const specificExpressFares =
    departure.name === "郡山" && arrival.name === "福島"
      ? {
          nonReservedOrStandingOnly: 880,
          reserved:
            season === busiest
              ? 1810
              : season === busy
              ? 1610
              : season === off
              ? 1210
              : 1410,
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
          fare:
            season === busiest
              ? reservedExpressFare + 400
              : season === busy
              ? reservedExpressFare + 200
              : season === off
              ? reservedExpressFare - 200
              : reservedExpressFare,
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
      ? getSuperExpressFare(table, section)
      : reservedExpressFare +
        getSuperExpressFare(table, highSpeed) -
        getSuperExpressFare(tables.get(line)!, highSpeed));

  const reservedHighSpeedTicket: ExpressTicket | undefined =
    reservedHighSpeedFare !== undefined
      ? {
          type: reserved,
          availableSeat: reserved,
          section,
          highSpeed,
          fare:
            season === busiest
              ? reservedHighSpeedFare + 400
              : season === busy
              ? reservedHighSpeedFare + 200
              : season === off
              ? reservedHighSpeedFare - 200
              : reservedHighSpeedFare,
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
  season: Season
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

const getBasicFare = (line: Line, section: SortedSection) => {
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

const isPointAvailable = (line: Line, section: SortedSection) =>
  !isEquivalent(section, {
    departure: line.find(({ name }) => name === "東京")!,
    arrival: line.find(({ name }) => name === "上野")!,
  }) &&
  !isEquivalent(section, {
    departure: line.find(({ name }) => name === "越後湯沢")!,
    arrival: line.find(({ name }) => name === "ガーラ湯沢")!,
  }) &&
  (line !== line5 ||
    section.arrival.index <= line.findIndex(({ name }) => name === "上越妙高"));

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

interface PointTicketType {
  readonly name: string;
  readonly url?: URL;
  getPoints(distance: number): number;
}

const pointTicketTypes: readonly [PointTicketType, PointTicketType] = [
  {
    name: "通常",
    getPoints(distance: number) {
      return distance > 400
        ? 12110
        : distance > 200
        ? 7940
        : distance > 100
        ? 4620
        : 2160;
    },
  },
  {
    name: "新幹線YEARスペシャル",
    url: new URL("https://www.jreast.co.jp/shinkansenyear2022/tokuten_ticket/"),
    getPoints(distance: number) {
      return distance > 400
        ? 6000
        : distance > 200
        ? 3900
        : distance > 100
        ? 2300
        : 1000;
    },
  },
];

/**
 * 指定した区間の運賃・特急料金を計算する
 * @param line
 * @param section 運賃・特急料金を計算する区間
 * @param highSpeed はやぶさ号やこまち号を利用する区間
 */
const getFares = ({
  line,
  section,
  highSpeed,
  season,
  getPoints,
}: {
  line: Line;
  section: SortedSection;
  highSpeed: SortedSection | undefined;
  season: Season;
  getPoints: (distance: number) => number;
}) => {
  const { departure, arrival } = section;

  const distance = getDistance0(section);
  const points = isPointAvailable(line, section)
    ? getPoints(distance)
    : undefined;

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
            season
          )
        : undefined
      : getSuperExpressTickets(line, section, highSpeed, season);

  const limitedExpressFares =
    (line === line1 || line === line2 || line === line4) &&
    junction &&
    arrival.index > junction.index
      ? departure.index >= junction.index
        ? getLimitedExpressTickets(
            line,
            section,
            getLimitedExpressFares2,
            season
          )
        : getLimitedExpressTickets(
            line,
            { departure: junction, arrival, sorted: true },
            line === line4
              ? getLimitedExpressFares2
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

  const section200: SortedSection = {
    sorted: true,
    departure:
      cityZones.find(({ stations }) => stations.has(section.departure))
        ?.central ?? section.departure,
    arrival:
      cityZones.find(({ stations }) => stations.has(section.arrival))
        ?.central ?? section.arrival,
  };
  const section100: SortedSection = {
    sorted: true,
    departure: zone0.stations.has(section.departure)
      ? zone0.central
      : section.departure,
    arrival: zone0.stations.has(section.arrival)
      ? zone0.central
      : section.arrival,
  };

  const basicFare0 = getBasicFare(line, section);

  const basicFare1 =
    getDistance0(section200) > 200
      ? getBasicFare(line, section200)
      : getDistance0(section100) > 100
      ? getBasicFare(line, section100)
      : basicFare0;

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
    points,
  } as const;
};

const isEquivalent = (a: Section, b: Section) =>
  a.departure === b.departure && a.arrival === b.arrival;

const reverseSection = (section: Section): Section => ({
  departure: section.arrival,
  arrival: section.departure,
});
const reverseTicket = (ticket: ExpressTicket): ExpressTicket => ({
  ...ticket,
  section: reverseSection(ticket.section),
});
const reverseTickets = (
  ...tickets: readonly ExpressTicket[]
): readonly ExpressTicket[] => tickets.map(reverseTicket).reverse();

const sortSection = (
  section: Section
): Readonly<{ section: SortedSection; reversed: boolean }> =>
  section.departure.index < section.arrival.index
    ? { section: { ...section, sorted: true }, reversed: false }
    : { section: { ...reverseSection(section), sorted: true }, reversed: true };

export type {
  ExpressTicket,
  Line,
  Season,
  SortedSection,
  Station,
  TotalFare,
};

export const legacy2022Engine = {
  lineGroups,
  line0,
  line1,
  line2,
  average,
  busy,
  seasons,
  getFares,
  sortSection,
} as const;
