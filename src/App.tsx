import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { parse } from "csv-parse/browser/esm/sync";
import { ceil, round, sum } from "lodash";
import type * as React from "react";
import {
  Fragment,
  Reducer,
  useContext,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  Accordion,
  AccordionContext,
  Alert,
  Badge,
  Card,
  Col,
  Container,
  Dropdown,
  DropdownButton,
  Fade,
  FloatingLabel,
  Form,
  Nav,
  Navbar,
  OverlayTrigger,
  Popover,
  Row,
  Table,
  ToggleButton,
} from "react-bootstrap";
import { NavLink, Route, Routes } from "react-router-dom";
import "./App.css";

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

const StationDropdown: React.FC<{
  value?: Station;
  header: string;
  onChange: (value: Station) => void;
  items: readonly { station: Station; disabled: boolean; active: boolean }[];
}> = ({ value, header, onChange, items }) => {
  return (
    <DropdownButton
      title={value?.name ?? header}
      variant="secondary"
      className="d-grid"
    >
      <Dropdown.Header>{header}</Dropdown.Header>
      {items.map(({ station, disabled, active }) => (
        <Dropdown.Item
          onClick={() => onChange(station)}
          className="d-flex justify-content-between"
          key={station.name}
          disabled={disabled}
          active={active}
        >
          <span>{station.name}</span>
          <code className="ms-5">{station.distance.toFixed(1)}</code>
        </Dropdown.Item>
      ))}
    </DropdownButton>
  );
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
 * 新幹線以外の線区の指定席特急料金（A特急料金）を計算する
 * @param distance 営業キロ
 * @returns 指定席特急料金
 */
const getLimitedExpressFare0 = (distance: number) =>
  distance > 600
    ? 3830
    : distance > 400
    ? 3490
    : distance > 300
    ? 3170
    : distance > 200
    ? 2950
    : distance > 150
    ? 2730
    : distance > 100
    ? 2390
    : distance > 50
    ? 1730
    : 1290;

/**
 * 奥羽本線中福島・新庄間並びに田沢湖線及び奥羽本線中大曲・秋田間を、東北新幹線にまたがって利用する場合の指定席特急料金を計算する
 * @param distance 営業キロ
 * @returns 指定席特急料金
 */
const getLimitedExpressFare1 = (distance: number) =>
  distance > 100 ? 1680 : distance > 50 ? 1230 : 910;

/**
 * 上越線に運転する特別急行列車の越後湯沢・ガーラ湯沢相互間に発売する指定席特急券及び自由席特急券に対する特急料金
 */
const limitedExpressFares2 = {
  nonReservedOrStandingOnly: 100,
  reserved: 100,
};

/**
 * 新幹線以外の線区の特急料金（A特急料金）を計算する
 * @param distance 営業キロ
 * @returns 指定席特急料金、立席特急料金及び自由席特急料金
 */
const getLimitedExpressFares0 = (distance: number, season: Season) => {
  const reserved = getLimitedExpressFare0(distance);
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
const getLimitedExpressFares1 = (distance: number, season: Season) => {
  const reserved = getLimitedExpressFare1(distance);
  return {
    reserved:
      season === busiest
        ? reserved + 280
        : season === busy
        ? reserved + 140
        : season === off
        ? reserved - 140
        : reserved,
    nonReservedOrStandingOnly: reserved - 380,
  } as const;
};

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

  const reservedExpressTicket: ExpressTicket = {
    type: reserved,
    availableSeat: reserved,
    section,
    fare:
      season === busiest
        ? reservedExpressFare + 400
        : season === busy
        ? reservedExpressFare + 200
        : season === off
        ? reservedExpressFare - 200
        : reservedExpressFare,
  };

  const specificExpressFare =
    departure.name === "東京" && arrival.name === "大宮"
      ? 1090
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
      ? getDistance0(section) > 50
        ? 1000
        : 880
      : undefined;

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
          ...(specificExpressFare !== undefined
            ? { type: specific, fare: specificExpressFare }
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
            specificExpressFare !== undefined
              ? specificExpressFare
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
  const nonReservedAvailable = line === line2 || line === line4;

  /**
   * 立席が利用可能な区間であれば、 `true`
   */
  const standingOnlyAvailable = line === line1;

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

const ExpressFaresLabel: React.VFC<{
  tickets: readonly ExpressTicket[];
}> = ({ tickets }) => {
  const text = jpyNameFormatter.format(sum(tickets.map(({ fare }) => fare)));
  const badges = [
    ...new Set(
      tickets
        .filter(({ type, availableSeat }) => type !== availableSeat)
        .map(({ type }) => type)
    ),
  ].map((type) => <Badge key={type}>{type}</Badge>);

  return tickets.length > 1 ? (
    <>
      <OverlayTrigger
        overlay={
          <Popover>
            <Popover.Header>特急料金の内訳</Popover.Header>
            <Popover.Body>
              {tickets.map(({ section, fare, type, availableSeat }) => (
                <Row key={`${section.departure.name}-${section.arrival.name}`}>
                  <Col xs="auto">
                    {section.departure.name} <i className="bi bi-arrow-right" />{" "}
                    {section.arrival.name}{" "}
                    {type !== availableSeat ? <Badge>{type}</Badge> : undefined}
                  </Col>
                  <Col xs="auto" className="ms-auto">
                    {jpyNameFormatter.format(fare)}
                  </Col>
                </Row>
              ))}
            </Popover.Body>
          </Popover>
        }
      >
        <u style={{ textDecoration: "underline dotted var(--bs-info)" }}>
          {text}
        </u>
      </OverlayTrigger>{" "}
      {badges}
    </>
  ) : (
    <>
      {text} {badges}
    </>
  );
};

const SeatsLabel: React.VFC<{
  tickets: readonly ExpressTicket[];
}> = ({ tickets }) => {
  const seats = new Set(tickets.map(({ availableSeat }) => availableSeat));
  const text = [...seats].join("・");
  return seats.size > 1 ? (
    <OverlayTrigger
      overlay={
        <Popover>
          <Popover.Header>区間ごとの利用座席</Popover.Header>
          <Popover.Body>
            {tickets.map(({ section, availableSeat }) => (
              <Row key={`${section.departure.name}-${section.arrival.name}`}>
                <Col xs="auto">
                  {section.departure.name} <i className="bi bi-arrow-right" />{" "}
                  {section.arrival.name}
                </Col>
                <Col xs="auto" className="ms-auto">
                  {availableSeat}
                </Col>
              </Row>
            ))}
          </Popover.Body>
        </Popover>
      }
    >
      <u style={{ textDecoration: "underline dotted var(--bs-info)" }}>
        {text}
      </u>
    </OverlayTrigger>
  ) : (
    <>{text}</>
  );
};

/**
 * 指定した区間の運賃を計算する
 * @param line
 * @param section 運賃を計算する区間
 * @returns 運賃
 */
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
      return (
        !expressTickets.some(
          ({ availableSeat }) => availableSeat === reserved
        ) &&
        ((line !== line0 && line !== line1) ||
          expressTickets[0]!.section.departure.index >=
            line.findIndex(({ name }) => name === "盛岡") ||
          expressTickets.slice(-1)[0]!.section.arrival.index <=
            line.findIndex(({ name }) => name === "盛岡"))
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
              : (_, section, season) =>
                  getLimitedExpressFares1(getDistance0(section), season),
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

const kilometerFormatter = new Intl.NumberFormat(undefined, {
  style: "unit",
  unit: "kilometer",
  minimumFractionDigits: 1,
});

const jpyNameFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "JPY",
  currencyDisplay: "name",
});

const jpySymbolFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "JPY",
  currencyDisplay: "symbol",
});

const sortSection = (
  section: Section
): Readonly<{ section: SortedSection; reversed: boolean }> =>
  section.departure.index < section.arrival.index
    ? { section: { ...section, sorted: true }, reversed: false }
    : { section: { ...reverseSection(section), sorted: true }, reversed: true };

const Result: React.VFC<{
  line: Line;
  section: Section;
  highSpeed: Section | undefined;
  longestHighSpeedSection: Section | undefined;
  rankedFares: Record<
    "nonReservedOrStandingOnly" | "reserved" | "reservedHighSpeed",
    readonly {
      readonly section: Section;
      readonly rank: number;
    }[]
  >;
  season: Season;
  getPoints(distance: number): number;
}> = ({
  line,
  section,
  highSpeed,
  longestHighSpeedSection,
  rankedFares,
  season,
  getPoints,
}) => {
  const { section: sortedSection, reversed } = sortSection(section);
  const sortedHighSpeed = highSpeed && sortSection(highSpeed).section;

  const { distance, points, ...others } = getFares({
    line,
    section: sortedSection,
    highSpeed: sortedHighSpeed,
    season,
    getPoints,
  });

  const { nonReservedOrStandingOnly, reservedHighSpeed } = others;

  const totalFares = (
    ["nonReservedOrStandingOnly", "reserved", "reservedHighSpeed"] as const
  ).flatMap((key: keyof typeof others) => {
    const totalFare: TotalFare | undefined = others[key];
    return totalFare
      ? [
          {
            ...totalFare,
            key,
            ...(reversed
              ? { expressTickets: reverseTickets(...totalFare.expressTickets) }
              : {}),
          },
        ]
      : [];
  });

  const cells0 = totalFares.map(({ expressTickets, key }) => (
    <th scope="col" key={key}>
      {expressTickets.some(({ highSpeed }) => highSpeed) && (
        <>
          {highSpeedTrains.get(line)!}号<br />
        </>
      )}
      <SeatsLabel tickets={expressTickets} />
    </th>
  ));

  return (
    <>
      <h2 className="h4 mt-4">営業キロ</h2>
      <p>{kilometerFormatter.format(distance)}</p>
      <h2 className="h4 mt-4">所定の運賃・特急料金</h2>
      <Table bordered>
        <thead>
          <tr>
            <td></td>
            {cells0}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">運賃</th>
            {totalFares.map(({ basicFare, key }) => (
              <td key={key}>{jpyNameFormatter.format(basicFare)}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">特急料金</th>
            {totalFares.map(({ expressTickets, key }) => (
              <td key={key}>
                <ExpressFaresLabel tickets={expressTickets} />
              </td>
            ))}
          </tr>
          {totalFares.some(({ discount }) => discount !== undefined) ? (
            <tr>
              <th scope="row">割引</th>
              {totalFares.map(({ discount, key }) => (
                <td key={key}>
                  {discount !== undefined
                    ? jpyNameFormatter.format(discount)
                    : undefined}
                </td>
              ))}
            </tr>
          ) : undefined}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">計</th>
            {totalFares.map(({ total, key }) => (
              <td key={key}>{jpyNameFormatter.format(total)}</td>
            ))}
          </tr>
        </tfoot>
      </Table>
      <details className="mb-3">
        <summary className="h6">きっぷの種類</summary>
        <p>
          利用可能な種類のきっぷのうち、最も低廉なものの運賃・特急料金を表示しています。
        </p>
        <dl>
          {totalFares.map(({ expressTickets, types, key }) => (
            <Row key={key}>
              <Col as="dt" xs="auto">
                {expressTickets.some(({ highSpeed }) => highSpeed) && (
                  <>{highSpeedTrains.get(line)!}号 </>
                )}
                <SeatsLabel tickets={expressTickets} />
              </Col>
              <Col as="dd" xs>
                {types.map(({ name, url }, index) => (
                  <Fragment key={name}>
                    {url !== undefined ? (
                      <a href={url.href} target="_blank" rel="noreferrer">
                        {name}
                      </a>
                    ) : (
                      name
                    )}
                    {types.length - 1 !== index ? "・" : ""}
                  </Fragment>
                ))}
                {types.length > 1 ? "のいずれか" : ""}
              </Col>
            </Row>
          ))}
        </dl>
      </details>
      <h2 className="h4 mt-4">JRE POINT特典チケット</h2>
      {points !== undefined ? (
        <>
          <h3 className="h6">交換ポイント</h3>
          <p>{points.toLocaleString()}ポイント</p>
          <h3 className="h6">レート</h3>
          <p>
            所定額（運賃・特急料金・割引の合計）のそれぞれを交換ポイントで割った値です。
          </p>
          <Table bordered>
            <thead>
              <tr>
                <td></td>
                {cells0}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">レート</th>
                {totalFares.map(({ total, key }) => (
                  <td key={key}>{(total / points).toFixed(2)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">順位</th>
                {nonReservedOrStandingOnly && (
                  <td>
                    {rankedFares.nonReservedOrStandingOnly.find(({ section }) =>
                      isEquivalent(section, sortedSection)
                    )!.rank + 1}
                    位
                  </td>
                )}
                <td>
                  {nonReservedOrStandingOnly === undefined
                    ? `${
                        rankedFares.nonReservedOrStandingOnly.find(
                          ({ section }) => isEquivalent(section, sortedSection)
                        )!.rank + 1
                      }位または`
                    : undefined}
                  {rankedFares.reserved.find(({ section }) =>
                    isEquivalent(section, sortedSection)
                  )!.rank + 1}
                  位
                  {reservedHighSpeed === undefined
                    ? `または${
                        rankedFares.reservedHighSpeed.find(({ section }) =>
                          isEquivalent(section, sortedSection)
                        )!.rank + 1
                      }位`
                    : undefined}
                </td>
                {reservedHighSpeed && (
                  <td>
                    {highSpeed &&
                    longestHighSpeedSection &&
                    isEquivalent(highSpeed, longestHighSpeedSection) ? (
                      <>
                        {rankedFares.reservedHighSpeed.find(({ section }) =>
                          isEquivalent(section, sortedSection)
                        )!.rank + 1}
                        位
                      </>
                    ) : undefined}
                  </td>
                )}
              </tr>
            </tbody>
          </Table>
        </>
      ) : (
        <Alert variant="warning">指定した区間では利用できません。</Alert>
      )}
    </>
  );
};

const ContextAwareItem: React.VFC<{
  eventKey: string;
  line: Line;
  section: Section;
  highSpeed: Section;
  longestHighSpeedSection: Section;
  onDepartureChange: (station: Station) => void;
  onArrivalChange: (station: Station) => void;
  onReset: () => void;
}> = ({
  eventKey,
  line,
  section,
  highSpeed,
  longestHighSpeedSection,
  onDepartureChange,
  onArrivalChange,
  onReset,
}) => {
  const { activeEventKey } = useContext(AccordionContext);

  const isCurrentEventKey = activeEventKey === eventKey;
  const stations1 = (
    section.departure.index < section.arrival.index
      ? line.slice(section.departure.index, section.arrival.index + 1)
      : line.slice(section.arrival.index, section.departure.index + 1)
  ).filter((station) => isHighSpeedAvailableStation(line, station));
  const items = stations1.map((station) => ({
    station,
    disabled:
      station.index <= line0.findIndex((station) => station.name === "大宮") ||
      station.index >= line0.findIndex((station) => station.name === "盛岡"),
  }));

  const train = highSpeedTrains.get(line)!;

  return (
    <Accordion.Item eventKey={eventKey}>
      <Accordion.Header>
        <div className="d-flex justify-content-between flex-grow-1 overflow-hidden me-1">
          <span className="flex-shrink-0">{train}号の利用区間</span>
          <Fade in={!isCurrentEventKey}>
            <span
              className="ms-4 overflow-hidden text-nowrap"
              style={{ textOverflow: "ellipsis" }}
            >
              <b>{highSpeed.departure.name}</b>{" "}
              <i className="bi bi-arrow-right" />{" "}
              <b>{highSpeed.arrival.name}</b>
            </span>
          </Fade>
        </div>
      </Accordion.Header>
      <Accordion.Body as="fieldset">
        <Row className="gy-2 gx-3">
          <Col>
            <StationDropdown
              value={highSpeed.departure}
              onChange={onDepartureChange}
              header={`${train}号の乗車駅`}
              items={items.map(({ station, disabled }) => ({
                station,
                disabled:
                  station === longestHighSpeedSection.arrival ||
                  (disabled && station !== section.departure),
                active: station === highSpeed.departure,
              }))}
            />
          </Col>
          <Col xs="auto" className="align-self-center">
            <i className="bi bi-arrow-right" />
          </Col>
          <Col>
            <StationDropdown
              value={highSpeed.arrival}
              onChange={onArrivalChange}
              header={`${train}号の降車駅`}
              items={items.map(({ station, disabled }) => ({
                station,
                disabled:
                  station === longestHighSpeedSection.departure ||
                  (disabled && station !== section.arrival),
                active: station === highSpeed.arrival,
              }))}
            />
          </Col>
        </Row>
        <div className="d-grid mt-3">
          <ToggleButton
            variant="outline-secondary"
            onChange={onReset}
            type="checkbox"
            id="toggle-check"
            value="1"
            disabled={
              highSpeed.departure === longestHighSpeedSection?.departure &&
              highSpeed.arrival === longestHighSpeedSection?.arrival
            }
            checked={
              highSpeed.departure === longestHighSpeedSection?.departure &&
              highSpeed.arrival === longestHighSpeedSection?.arrival
            }
          >
            デフォルト
          </ToggleButton>
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
};

/**
 * はやぶさ号やこまち号が利用可能な駅かどうか調べる
 * @param line
 * @param station
 * @returns はやぶさ号やこまち号が利用可能な駅ならtrue
 */
const isHighSpeedAvailableStation = (line: Line, station: Station) =>
  station.index <= line.findIndex((station) => station.name === "大宮") ||
  ((line === line0 || line === line1) &&
    station.index >= line0.findIndex((station) => station.name === "仙台"));

/**
 * 全乗車区間のうち、はやぶさ号やこまち号が利用可能な最長区間を求める。
 * @param line
 * @param section 全乗車区間
 * @returns はやぶさ号やこまち号が利用可能な最長区間。 `undefined` の場合は利用可能な区間がない。
 */
const getLongestHighSpeedSection = (
  line: Line,
  section: SortedSection
): SortedSection | undefined => {
  const { departure, arrival } = section;
  const highSpeedAvailableStations = line
    .slice(departure.index, arrival.index + 1)
    .filter((station) => isHighSpeedAvailableStation(line, station));

  const highSpeedDeparture = highSpeedAvailableStations.find(
    ({ index }) => index >= departure.index
  );
  const highSpeedArrival = highSpeedAvailableStations
    .filter(({ index }) => index <= arrival.index)
    .slice(-1)[0];

  return highSpeedDeparture &&
    highSpeedArrival &&
    highSpeedDeparture !== highSpeedArrival
    ? { departure: highSpeedDeparture, arrival: highSpeedArrival, sorted: true }
    : undefined;
};

/*
AB -O-- --S- -M- -A

T  xxxx xxoo ooo oo 
|   xxx xxoo ooo oo
O    xx xxoo ooo oo
|     x xxxo ooo oo
|       xxxo ooo oo

|        xxo ooo oo
|         xo ooo oo
S          o ooo oo
|            ooo oo

|             oo oo
M              x xx
|                xx

|                 x
*/
/**
 * はやぶさ号やこまち号が利用可能な区間かどうか調べる。
 * @param line
 * @param section
 * @returns はやぶさ号やこまち号が利用可能な区間ならtrue
 */
const isHighSpeedAvailableSection = (line: Line, section: SortedSection) =>
  (line === line0 || line === line1) &&
  ((section.departure.index <=
    line0.findIndex((station) => station.name === "大宮") &&
    section.arrival.index >=
      line0.findIndex((station) => station.name === "仙台")) ||
    (section.departure.index <
      line0.findIndex((station) => station.name === "盛岡") &&
      section.arrival.index >
        line0.findIndex((station) => station.name === "仙台")));

interface State {
  readonly group: LineGroup;
  readonly line: Line;
  readonly section: Section;
  readonly highSpeed:
    | {
        readonly departure: Station | undefined;
        readonly arrival: Station | undefined;
      }
    | undefined;
}

type Action = Readonly<
  | {
      type: "setGroup";
      payload: LineGroup;
    }
  | {
      type: "setDeparture";
      payload: Station;
    }
  | {
      type: "setArrival";
      payload: Station;
    }
  | {
      type: "setHighSpeedDeparture";
      payload: Station;
    }
  | {
      type: "setHighSpeedArrival";
      payload: Station;
    }
  | {
      type: "resetHighSpeed";
      payload?: undefined;
    }
>;

interface Section {
  departure: Station;
  arrival: Station;
}

/**
 * `arrival` が `departure` よりも終点に近いことが保証された `Section`
 */
interface SortedSection extends Section {
  sorted: true;
}

const reducer: Reducer<State, Action> = (state, { type, payload }): State => {
  switch (type) {
    case "setGroup": {
      const { departure, arrival } = state.section;
      const line = payload.lines[0]!;
      const firstOfLine = line[0]!;
      const lastOfLine = line.slice(-1)[0]!;

      const section: Section = line.includes(departure)
        ? line.includes(arrival)
          ? state.section
          : {
              departure,
              arrival: lastOfLine === departure ? firstOfLine : lastOfLine,
            }
        : line.includes(arrival)
        ? {
            departure: firstOfLine === arrival ? lastOfLine : firstOfLine,
            arrival,
          }
        : { departure: firstOfLine, arrival: lastOfLine };

      return {
        ...state,
        group: payload,
        line,
        section,
        highSpeed: undefined,
      };
    }

    case "setDeparture": {
      const arrival = state.section.arrival;
      const line = state.line.includes(payload)
        ? state.line
        : state.group.lines.find((line) => line.includes(payload))!;
      const firstOfLine = line[0]!;
      const lastOfLine = line.slice(-1)[0]!;

      const section = {
        departure: payload,
        arrival: line.includes(arrival)
          ? arrival
          : lastOfLine === payload
          ? firstOfLine
          : lastOfLine,
      };

      return {
        ...state,
        line,
        section,
        highSpeed: undefined,
      };
    }

    case "setArrival": {
      const departure = state.section.departure;
      const line = state.line.includes(payload)
        ? state.line
        : state.group.lines.find((line) => line.includes(payload))!;
      const firstOfLine = line[0]!;
      const lastOfLine = line.slice(-1)[0]!;

      const section = {
        departure: line.includes(departure)
          ? departure
          : firstOfLine === payload
          ? lastOfLine
          : firstOfLine,
        arrival: payload,
      };

      return {
        ...state,
        line,
        section,
        highSpeed: undefined,
      };
    }

    case "setHighSpeedDeparture":
      return {
        ...state,
        highSpeed: {
          departure: payload,
          arrival:
            state.highSpeed &&
            state.highSpeed.arrival &&
            payload.index < state.highSpeed.arrival.index
              ? state.highSpeed.arrival
              : undefined,
        },
      };

    case "setHighSpeedArrival":
      return {
        ...state,
        highSpeed: {
          departure:
            state.highSpeed &&
            state.highSpeed.departure &&
            state.highSpeed.departure.index < payload.index
              ? state.highSpeed.departure
              : undefined,
          arrival: payload,
        },
      };

    case "resetHighSpeed":
      return {
        ...state,
        highSpeed: undefined,
      };
  }
};

const init = (): State => {
  const group = lineGroups.get("東北新幹線")!;
  const line = group.lines[0]!;
  const section: Section = {
    departure: line[0]!,
    arrival: line.slice(-1)[0]!,
  };
  return {
    group,
    line,
    section,
    highSpeed: undefined,
  };
};

const Home: React.VFC<{
  season: Season;
  onSeasonChange: (season: Season) => void;
  pointTicketType: PointTicketType;
  onPointTicketTypeChange: (type: PointTicketType) => void;
  rankedFares: Record<
    "nonReservedOrStandingOnly" | "reserved" | "reservedHighSpeed",
    readonly {
      readonly section: Section;
      readonly rank: number;
    }[]
  >;
}> = ({
  season,
  pointTicketType,
  onSeasonChange,
  onPointTicketTypeChange,
  rankedFares,
}) => {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  const { group, line, section } = state;

  const { section: sortedSection, reversed } = useMemo(
    () => sortSection(section),
    [section]
  );

  const longestHighSpeedSection = useMemo(() => {
    const longestHighSpeedSection = getLongestHighSpeedSection(
      line,
      sortedSection
    );
    return reversed
      ? longestHighSpeedSection && reverseSection(longestHighSpeedSection)
      : longestHighSpeedSection;
  }, [line, reversed, sortedSection]);

  const highSpeedAvailable = useMemo(
    () => isHighSpeedAvailableSection(line, sortedSection),
    [line, sortedSection]
  );

  const highSpeed: Section | undefined =
    longestHighSpeedSection && highSpeedAvailable
      ? {
          departure:
            state.highSpeed?.departure ?? longestHighSpeedSection.departure,
          arrival: state.highSpeed?.arrival ?? longestHighSpeedSection.arrival,
        }
      : undefined;

  const { departure, arrival } = section;

  return (
    <main>
      <h1>区間を指定して調べる</h1>
      <p>
        <a
          href="https://www.eki-net.com/top/point/guide/tokuten_section.html#headerM2_01"
          target="_blank"
          rel="noreferrer"
        >
          えきねっとでJRE POINTと交換できる特典チケット
        </a>
        が、割引なしのきっぷと比べてどのくらい割がいいのか（レート）を計算します。
      </p>
      <Card body className="my-3" as="fieldset">
        <FloatingLabel controlId="floatingSelect" label="路線" className="mb-3">
          <Form.Select
            aria-label="Floating label select example"
            onChange={(e) =>
              dispatch({
                type: "setGroup",
                payload: lineGroups.get(e.currentTarget.value)!,
              })
            }
          >
            <option>東北新幹線</option>
            <option>秋田新幹線</option>
            <option>山形新幹線</option>
            <option>上越新幹線</option>
            <option>北陸新幹線</option>
          </Form.Select>
        </FloatingLabel>
        <Row className="gy-2 gx-3">
          <Col>
            <StationDropdown
              value={departure}
              onChange={(station) =>
                dispatch({ type: "setDeparture", payload: station })
              }
              header="発駅"
              items={[...new Set(group.lines.flat())]
                .sort((a, b) => a.distance - b.distance)
                .map((station) => ({
                  station,
                  disabled: station === arrival,
                  active: station === departure,
                }))}
            />
          </Col>
          <Col xs="auto" className="align-self-center">
            <i className="bi bi-arrow-right" />
          </Col>
          <Col>
            <StationDropdown
              value={arrival}
              onChange={(station) =>
                dispatch({ type: "setArrival", payload: station })
              }
              header="着駅"
              items={[...new Set(group.lines.flat())]
                .sort((a, b) => a.distance - b.distance)
                .map((station) => ({
                  station,
                  disabled: station === departure,
                  active: station === arrival,
                }))}
            />
          </Col>
        </Row>
      </Card>
      {highSpeed && longestHighSpeedSection ? (
        <Accordion className="mb-3">
          <ContextAwareItem
            eventKey="0"
            line={line}
            section={section}
            highSpeed={highSpeed}
            longestHighSpeedSection={longestHighSpeedSection}
            onDepartureChange={(station: Station) =>
              dispatch({ type: "setHighSpeedDeparture", payload: station })
            }
            onArrivalChange={(station: Station) =>
              dispatch({ type: "setHighSpeedArrival", payload: station })
            }
            onReset={() => dispatch({ type: "resetHighSpeed" })}
          />
        </Accordion>
      ) : undefined}
      <Row className="gy-2 mb-3">
        <Col md>
          <SeasonSelect
            season={season}
            onChange={(season) => onSeasonChange(season)}
          />
        </Col>
        <Col md>
          <PointTicketTypeSelect
            type={pointTicketType}
            onChange={(type) => onPointTicketTypeChange(type)}
          />
        </Col>
      </Row>
      <Result
        line={line}
        section={section}
        highSpeed={highSpeed}
        longestHighSpeedSection={longestHighSpeedSection}
        rankedFares={rankedFares}
        season={season}
        getPoints={pointTicketType.getPoints}
      />
    </main>
  );
};

type Ranked<T> = { value: T; rank: number };
const rank = <T,>(
  array: readonly T[],
  callbackfn: (t: T) => number
): readonly Ranked<T>[] =>
  [...array]
    .sort((a, b) => callbackfn(b) - callbackfn(a))
    .reduce<{
      readonly last?: Ranked<T>;
      readonly array: readonly Ranked<T>[];
    }>(
      (previous, current, index) => {
        const last = {
          value: current,
          rank:
            previous.last === undefined ||
            callbackfn(previous.last.value) !== callbackfn(current)
              ? index
              : previous.last.rank,
        };
        return { last, array: [...previous.array, last] };
      },
      { array: [] }
    ).array;

const Ranking: React.VFC<{
  rankedFares: Record<
    "nonReservedOrStandingOnly" | "reserved" | "reservedHighSpeed",
    readonly {
      readonly section: Section;
      readonly rank: number;
      readonly points: number;
      readonly distance: number;
      readonly nonReservedOrStandingOnly:
        | (TotalFare & { readonly rate: number })
        | undefined;
      readonly reserved: TotalFare & { readonly rate: number };
      readonly reservedHighSpeed:
        | (TotalFare & { readonly rate: number })
        | undefined;
    }[]
  >;
  season: Season;
  onSeasonChange: (season: Season) => void;
  pointTicketType: PointTicketType;
  onPointTicketTypeChange: (type: PointTicketType) => void;
}> = ({
  rankedFares,
  season,
  onSeasonChange,
  pointTicketType,
  onPointTicketTypeChange,
}) => {
  const [seat, setSeat] = useState<
    "nonReservedOrStandingOnly" | "reserved" | "reservedHighSpeed"
  >("nonReservedOrStandingOnly");
  const [small, setSmall] = useState(false);

  return (
    <main>
      <h1>ランキング</h1>
      <p>
        <a
          href="https://www.eki-net.com/top/point/guide/tokuten_section.html#headerM2_01"
          target="_blank"
          rel="noreferrer"
        >
          JRE POINT特典チケット
        </a>
        を交換するのに割がいい（レートが高い）区間を調べます。
      </p>
      <Form.Group className="mb-3" controlId="SmallTableCheckbox">
        <Form.Check
          type="checkbox"
          label="小さく表示する"
          checked={small}
          onChange={(e) => setSmall(e.currentTarget.checked)}
        />
      </Form.Group>
      <Row className="gy-2 mb-3">
        <Col xl>
          <FloatingLabel label="次の所定額に対するレートで並び替える">
            <Form.Select
              value={seat}
              onChange={(e) =>
                setSeat(
                  e.currentTarget.value as
                    | "nonReservedOrStandingOnly"
                    | "reserved"
                    | "reservedHighSpeed"
                )
              }
            >
              <option value="nonReservedOrStandingOnly">自由席・立席</option>
              <option value="reserved">指定席</option>
              <option value="reservedHighSpeed">
                はやぶさ号・こまち号 指定席
              </option>
            </Form.Select>
          </FloatingLabel>
        </Col>
        <Col xl>
          <SeasonSelect
            season={season}
            onChange={(season) => onSeasonChange(season)}
          />
        </Col>
        <Col xl>
          <PointTicketTypeSelect
            type={pointTicketType}
            onChange={(type) => onPointTicketTypeChange(type)}
          />
        </Col>
      </Row>
      <Table
        striped
        bordered
        responsive
        {...(small ? { size: "sm" } : {})}
        className="text-nowrap"
      >
        <thead>
          <tr>
            <th scope="col" rowSpan={2}>
              #
            </th>
            <th scope="col" colSpan={2} rowSpan={2}>
              区間
            </th>
            <th scope="col" rowSpan={2}>
              営業キロ
            </th>
            <th scope="col" rowSpan={2}>
              交換ポイント
            </th>
            <th scope="col" colSpan={2}>
              自由席・立席
            </th>
            <th scope="col" colSpan={2}>
              指定席
            </th>
            <th scope="col" colSpan={2}>
              はやぶさ号・こまち号
              <br />
              指定席
            </th>
          </tr>
          <tr>
            <th scope="col">所定額</th>
            <th scope="col">レート</th>
            <th scope="col">所定額</th>
            <th scope="col">レート</th>
            <th scope="col">所定額</th>
            <th scope="col">レート</th>
          </tr>
        </thead>
        <tbody>
          {rankedFares[seat].map(
            ({
              rank,
              section,
              distance,
              points,
              nonReservedOrStandingOnly,
              reserved,
              reservedHighSpeed,
            }) => (
              <tr key={`${section.departure.name}-${section.arrival.name}`}>
                <th scope="row">{rank + 1}</th>
                <th scope="row">{section.departure.name}</th>
                <th scope="row">{section.arrival.name}</th>
                <td className="text-end">
                  {kilometerFormatter.format(distance)}
                </td>
                <td className="text-end">{points.toLocaleString()}</td>
                <td className="text-end">
                  {nonReservedOrStandingOnly
                    ? jpySymbolFormatter.format(nonReservedOrStandingOnly.total)
                    : undefined}
                </td>
                <td className="text-end">
                  {nonReservedOrStandingOnly ? (
                    <strong
                      className={
                        seat === "nonReservedOrStandingOnly"
                          ? "text-primary"
                          : undefined
                      }
                    >
                      {nonReservedOrStandingOnly.rate.toFixed(2)}
                    </strong>
                  ) : (
                    <i className="text-muted">{reserved.rate.toFixed(2)}</i>
                  )}
                </td>
                <td className="text-end">
                  {jpySymbolFormatter.format(reserved.total)}
                </td>
                <td className="text-end">
                  <strong
                    className={seat === "reserved" ? "text-primary" : undefined}
                  >
                    {reserved.rate.toFixed(2)}
                  </strong>
                </td>
                <td className="text-end">
                  {reservedHighSpeed
                    ? jpySymbolFormatter.format(reservedHighSpeed.total)
                    : undefined}
                </td>
                <td className="text-end">
                  {reservedHighSpeed ? (
                    <strong
                      className={
                        seat === "reservedHighSpeed"
                          ? "text-primary"
                          : undefined
                      }
                    >
                      {reservedHighSpeed.rate.toFixed(2)}
                    </strong>
                  ) : (
                    <i className="text-muted">{reserved.rate.toFixed(2)}</i>
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </Table>
    </main>
  );
};

const average = "通常期";
const busy = "繁忙期";
const busiest = "最繁忙期";
const off = "閑散期";

const seasons = [off, average, busy, busiest] as const;

type Season = typeof seasons[number];

const SeasonSelect: React.VFC<{
  season: Season;
  onChange: (season: Season) => void;
}> = ({ season, onChange }) => (
  <FloatingLabel label="シーズン">
    <Form.Select
      value={season}
      onChange={(e) => onChange(e.currentTarget.value as Season)}
    >
      {seasons.map((season) => (
        <option key={season}>{season}</option>
      ))}
    </Form.Select>
  </FloatingLabel>
);

const PointTicketTypeSelect: React.VFC<{
  type: PointTicketType;
  onChange: (type: PointTicketType) => void;
}> = ({ type, onChange }) => (
  <FloatingLabel label="JRE POINT特典チケット 交換ポイント">
    <Form.Select
      value={type.name}
      onChange={(e) =>
        onChange(
          pointTicketTypes.find(({ name }) => name === e.currentTarget.value)!
        )
      }
    >
      {pointTicketTypes.map((nextPointTicketType) => (
        <option key={nextPointTicketType.name}>
          {nextPointTicketType.name}
        </option>
      ))}
    </Form.Select>
    {type.url && (
      <Form.Text>
        <a href={type.url.href} target="_blank" rel="noreferrer">
          詳細
        </a>
      </Form.Text>
    )}
  </FloatingLabel>
);

const App: React.VFC = () => {
  const [season, setSeason] = useState<Season>(average);
  const [pointTicketType, setPointTicketType] = useState(pointTicketTypes[0]!);

  const faresForEachSection = useMemo(
    () =>
      [...lineGroups.values()]
        .flatMap(({ lines }) => lines)
        .flatMap((line) => {
          const junction = junctions.get(line);
          return line.flatMap((departure, index, stations) =>
            stations
              .slice(Math.max(index, junction?.index ?? 0) + 1)
              .flatMap((arrival) => {
                const section: SortedSection = {
                  departure,
                  arrival,
                  sorted: true,
                };
                const highSpeed = getLongestHighSpeedSection(line, section);
                const {
                  points,
                  distance,
                  nonReservedOrStandingOnly,
                  reserved,
                  reservedHighSpeed,
                } = getFares({
                  line,
                  section,
                  highSpeed,
                  season,
                  getPoints: pointTicketType.getPoints,
                });

                return points !== undefined
                  ? [
                      {
                        section,
                        points,
                        distance,
                        nonReservedOrStandingOnly:
                          nonReservedOrStandingOnly && {
                            ...nonReservedOrStandingOnly,
                            rate: nonReservedOrStandingOnly.total / points,
                          },
                        reserved: {
                          ...reserved,
                          rate: reserved.total / points,
                        },
                        reservedHighSpeed: reservedHighSpeed && {
                          ...reservedHighSpeed,
                          rate: reservedHighSpeed.total / points,
                        },
                      },
                    ]
                  : [];
              })
          );
        }),
    [pointTicketType.getPoints, season]
  );

  const rankedFares = useMemo(
    () => ({
      nonReservedOrStandingOnly: rank(
        faresForEachSection,
        ({ reserved, nonReservedOrStandingOnly }) =>
          nonReservedOrStandingOnly?.rate ?? reserved.rate
      ).map(({ value, rank }) => ({ ...value, rank })),
      reserved: rank(faresForEachSection, ({ reserved }) => reserved.rate).map(
        ({ value, rank }) => ({ ...value, rank })
      ),
      reservedHighSpeed: rank(
        faresForEachSection,
        ({ reserved, reservedHighSpeed }) =>
          reservedHighSpeed?.rate ?? reserved.rate
      ).map(({ value, rank }) => ({ ...value, rank })),
    }),
    [faresForEachSection]
  );

  return (
    <>
      <Navbar variant="dark" bg="dark" expand="lg">
        <Container>
          <Navbar.Brand>JRE POINT特典チケットのレート計算</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={NavLink} end to="/">
                区間を指定して調べる
              </Nav.Link>
              <Nav.Link as={NavLink} end to="/ranking">
                ランキング
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container>
        <Alert variant="warning" className="mt-3">
          <ul className="mb-0">
            <li>
              このページに表示される運賃・特急料金およびその他の内容について、正確性を保証しません。
            </li>
            <li>
              <Alert.Link href="https://www.jreast.co.jp/press/2021/sendai/20211116_s01.pdf">
                2022年春に改定が予定されている、秋田新幹線や山形新幹線の新しい特急料金体系
              </Alert.Link>
              には対応していません。
            </li>
          </ul>
        </Alert>
        <div className="mt-4">
          <Routes>
            <Route
              path="ranking"
              element={
                <Ranking
                  rankedFares={rankedFares}
                  season={season}
                  pointTicketType={pointTicketType}
                  onSeasonChange={setSeason}
                  onPointTicketTypeChange={setPointTicketType}
                />
              }
            />
            <Route
              path="/"
              element={
                <Home
                  season={season}
                  pointTicketType={pointTicketType}
                  onSeasonChange={setSeason}
                  onPointTicketTypeChange={setPointTicketType}
                  rankedFares={rankedFares}
                />
              }
            />
          </Routes>
        </div>
      </Container>
    </>
  );
};

export default App;
