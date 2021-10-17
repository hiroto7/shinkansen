import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";
import parse from "csv-parse/lib/sync";
import { ceil, round, sum } from "lodash";
import type * as React from "react";
import { Reducer, useContext, useMemo, useReducer, useState } from "react";
import {
  Accordion,
  AccordionContext,
  Alert,
  Badge,
  Button,
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
  readonly zone?: Zone;
}

/**
 * 特定都区市内または東京山手線内
 */
interface Zone {
  readonly name: string;
  readonly central: Station;
  readonly stations: ReadonlySet<Station>;
}

interface Line {
  readonly name: string;
  readonly stations: readonly Station[];
}

// (\d+(?:\.\d)?)\t(.+)
const line0: Line = {
  name: "東北新幹線",
  stations: [
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
  ].map((value, index) => ({ ...value, index })),
};

const line1: Line = {
  name: "秋田新幹線",
  stations: [
    ...line0.stations.slice(
      line0.stations.findIndex((station) => station.name === "東京"),
      line0.stations.findIndex((station) => station.name === "盛岡") + 1
    ),
    ...[
      { name: "雫石", distance: 551.3 },
      { name: "田沢湖", distance: 575.4 },
      { name: "角館", distance: 594.1 },
      { name: "大曲", distance: 610.9 },
      { name: "秋田", distance: 662.6 },
    ].map((value, index) => ({
      ...value,
      index:
        index +
        line0.stations.findIndex((station) => station.name === "盛岡") +
        1,
    })),
  ],
};

const line2: Line = {
  name: "山形新幹線",
  stations: [
    ...line0.stations.slice(
      line0.stations.findIndex((station) => station.name === "東京"),
      line0.stations.findIndex((station) => station.name === "福島") + 1
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
      index:
        index +
        line0.stations.findIndex((station) => station.name === "福島") +
        1,
    })),
  ],
};

const line3: Line = {
  name: "上越新幹線",
  stations: [
    ...line0.stations.slice(
      line0.stations.findIndex((station) => station.name === "東京"),
      line0.stations.findIndex((station) => station.name === "大宮") + 1
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
      index:
        index +
        line0.stations.findIndex((station) => station.name === "大宮") +
        1,
    })),
  ],
};

const line4: Line = {
  name: "北陸新幹線",
  stations: [
    ...line0.stations.slice(
      line0.stations.findIndex((station) => station.name === "東京"),
      line0.stations.findIndex((station) => station.name === "大宮") + 1
    ),
    ...line3.stations.slice(
      line3.stations.findIndex((station) => station.name === "熊谷"),
      line3.stations.findIndex((station) => station.name === "高崎") + 1
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
      index:
        index +
        line3.stations.findIndex((station) => station.name === "高崎") +
        1,
    })),
  ],
};

const lines: ReadonlyMap<string, Line> = new Map([
  [line0.name, line0],
  [line1.name, line1],
  [line2.name, line2],
  [line3.name, line3],
  [line4.name, line4],
]);

const zone0: Zone = {
  name: "東京山手線内",
  central: line0.stations.find((station) => station.name === "東京")!,
  stations: new Set([
    line0.stations.find((station) => station.name === "東京")!,
    line0.stations.find((station) => station.name === "上野")!,
  ]),
};

const zone1: Zone = {
  name: "東京都区内",
  central: line0.stations.find((station) => station.name === "東京")!,
  stations: new Set([
    line0.stations.find((station) => station.name === "東京")!,
    line0.stations.find((station) => station.name === "上野")!,
  ]),
};

const zone2: Zone = {
  name: "仙台市内",
  central: line0.stations.find((station) => station.name === "仙台")!,
  stations: new Set([
    line0.stations.find((station) => station.name === "仙台")!,
  ]),
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
      [line4, "高崎"],
    ] as const
  ).map(([line, station]) => [
    line,
    line.stations.find(({ name }) => name === station)!,
  ])
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
    line4,
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
 * @param section 距離を求める区間。 `section[1]` は `section[0]` より終点に近い駅である必要がある。
 * @returns 距離
 */
const getDistance0 = (...section: Section) =>
  round(section[1].distance - section[0].distance, 1);

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

/**
 * 乗車券または特急券
 */
interface Ticket {
  /**
   * 区間
   */
  readonly section: Section | BasicFareTicketSection;
  /**
   * 運賃または特急料金
   */
  readonly fare: number;
}

const reserved = "指定席";
const nonReserved = "自由席";
const specific = "特定";
const standingOnly = "立席";

/**
 * 特急券
 */
interface ExpressTicket extends Ticket {
  /**
   * 全乗車区間
   */
  readonly section: Section;
  /**
   * はやぶさ号やこまち号を利用する区間
   */
  readonly highSpeed?: Section;
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
  distance > 100 ? 1680 : distance > 100 ? 1230 : 910;

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
 * @param section 区間。 `section[1]` は `section[0]` より終点に近い駅である必要がある
 * @returns 指定席特急料金
 */
const getSuperExpressFare = (table: FareTable, section: Section): number =>
  +table.find((row) => row["駅名"] === section[1].name)![section[0].name]!;

/**
 * 新幹線の指定した区間の特急料金を計算する
 * @param line 東北新幹線、上越新幹線、北陸新幹線のいずれか
 * @param section 特急料金を計算する区間。 `section[1]` は `section[0]` より終点に近い駅である必要がある。
 * @param highSpeed はやぶさ号やこまち号を利用する区間
 * @param season シーズン
 * @returns 自由席特急料金、特定特急料金、指定席特急料金
 */
const getSuperExpressFares = (
  line: Line,
  section: Section,
  highSpeed: Section | undefined,
  season: Season
): Readonly<{
  reserved: ExpressTicket;
  nonReserved: ExpressTicket | undefined;
  reservedHighSpeed: ExpressTicket | undefined;
  standingOnly: ExpressTicket | undefined;
}> => {
  const [stationA, stationB] = section;

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
    stationA.name === "東京" && stationB.name === "大宮"
      ? 1090
      : stationB.index - stationA.index === 1 ||
        [
          ["古川", "一ノ関"],
          ["一ノ関", "北上"],
          ["北上", "盛岡"],
          ["熊谷", "高崎"],
        ].some(([a, b]) => stationA.name === a && stationB.name === b)
      ? getDistance0(...section) > 50
        ? 1000
        : 880
      : undefined;

  /**
   * 自由席が利用可能な区間であれば、 `true`
   */
  const nonReservedAvailable =
    line !== line0 ||
    stationB.index <=
      line.stations.findIndex((station) => station.name === "盛岡");

  /**
   * 立席が利用可能な区間であれば、 `true`
   */
  const standingOnlyAvailable =
    line === line0 &&
    stationA.index >=
      line.stations.findIndex((station) => station.name === "盛岡");

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
    (highSpeed[0] === stationA && highSpeed[1] === stationB
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
 * @param line 秋田新幹線または山形新幹線
 * @param section 特急料金を計算する区間。 `section[1]` は `section[0]` より終点に近い駅である必要がある。
 * @param getLimitedExpressFares `getLimitedExpressFares0` または `getLimitedExpressFares1`
 */
const getLimitedExpressFares = (
  line: Line,
  section: Section,
  getLimitedExpressFares0: (
    distance: number,
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
  } = getLimitedExpressFares0(getDistance0(...section), season);

  const reservedExpressTicket: ExpressTicket = {
    type: reserved,
    section,
    fare: reservedExpressFare,
    availableSeat: reserved,
  };

  /**
   * 自由席が利用可能な区間であれば、 `true`
   */
  const nonReservedAvailable = line === line2;

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

const BasicFareLabel: React.VFC<{
  ticket: Ticket;
  section: Section;
}> = ({ ticket, section }) => {
  const text = jpyNameFormatter.format(ticket.fare);

  return !isEquivalent(ticket.section, section) ? (
    <>
      <OverlayTrigger
        overlay={
          <Popover>
            <Popover.Header>運賃計算区間</Popover.Header>
            <Popover.Body>
              {ticket.section[0].name} <i className="bi bi-arrow-right"></i>{" "}
              {ticket.section[1].name}
            </Popover.Body>
          </Popover>
        }
      >
        <u style={{ textDecoration: "underline dotted var(--bs-secondary)" }}>
          {text}
        </u>
      </OverlayTrigger>
    </>
  ) : (
    <>{text}</>
  );
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
  ].map((type) => <Badge>{type}</Badge>);

  return tickets.length > 1 ? (
    <>
      <OverlayTrigger
        overlay={
          <Popover>
            <Popover.Header>内訳</Popover.Header>
            <Popover.Body>
              {tickets.map(({ section, fare, type, availableSeat }) => (
                <Row
                  className="justify-content-between"
                  key={`${section[0].name}-${section[1].name}`}
                >
                  <Col xs="auto">
                    {section[0].name} <i className="bi bi-arrow-right"></i>{" "}
                    {section[1].name}{" "}
                    {type !== availableSeat ? <Badge>{type}</Badge> : undefined}
                  </Col>
                  <Col xs="auto">{jpyNameFormatter.format(fare)}</Col>
                </Row>
              ))}
            </Popover.Body>
          </Popover>
        }
      >
        <u style={{ textDecoration: "underline dotted var(--bs-secondary)" }}>
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

const f = (stationOrZone: Station | Zone): Station =>
  "central" in stationOrZone ? stationOrZone.central : stationOrZone;

const SeatsLabel: React.VFC<{
  tickets: readonly ExpressTicket[];
}> = ({ tickets }) => {
  const seats = new Set(tickets.map(({ availableSeat }) => availableSeat));
  const text = [...seats].join("・");
  return seats.size > 1 ? (
    <OverlayTrigger
      overlay={
        <Popover>
          <Popover.Header>座席</Popover.Header>
          <Popover.Body>
            {tickets.map(({ section, availableSeat }) => (
              <Row
                className="justify-content-between"
                key={`${section[0].name}-${section[1].name}`}
              >
                <Col xs="auto">
                  {section[0].name} <i className="bi bi-arrow-right"></i>{" "}
                  {section[1].name}
                </Col>
                <Col xs="auto">{availableSeat}</Col>
              </Row>
            ))}
          </Popover.Body>
        </Popover>
      }
    >
      <u style={{ textDecoration: "underline dotted var(--bs-secondary)" }}>
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
 * @param section 運賃を計算する区間。 `section[1]` は `section[0]` より終点に近い駅である必要がある。
 * @returns 運賃
 */
const getBasicFare = (line: Line, section: Section) => {
  const [stationA, stationB] = section;
  const distance = getDistance0(...section);

  return stationB.index <=
    line.stations.findIndex((station) => station.name === "大宮")
    ? getBasicFare2(distance)
    : line === line1 &&
      stationA.index >=
        line.stations.findIndex((station) => station.name === "盛岡") &&
      stationB.index <=
        line.stations.findIndex((station) => station.name === "大曲")
    ? getBasicFare1(distance)
    : getBasicFare0(
        line === line1 &&
          ["盛岡", "大曲"]
            .map((name) =>
              line.stations.findIndex((station) => station.name === name)
            )
            .some((i) => stationA.index < i && i < stationB.index)
          ? distance +
              round(
                getDistance0(
                  stationA.index <
                    line.stations.findIndex(
                      (station) => station.name === "盛岡"
                    )
                    ? line.stations.find((station) => station.name === "盛岡")!
                    : stationA,
                  line.stations.findIndex(
                    (station) => station.name === "大曲"
                  ) < stationB.index
                    ? line.stations.find((station) => station.name === "大曲")!
                    : stationB
                ) *
                  (17.8 / 16.2 - 1),
                1
              )
          : distance
      );
};

interface TotalFare {
  readonly basicFareTicket: Ticket;
  readonly expressTickets: readonly ExpressTicket[];
  readonly discount?: number;
  readonly total: number;
  readonly rate: number;
}

/**
 * 指定した区間の運賃・特急料金を計算する
 * @param line
 * @param section 運賃・特急料金を計算する区間。 `section[1]` は `section[0]` より終点に近い駅である必要がある。
 * @param highSpeed はやぶさ号やこまち号を利用する区間
 */
const getFares = (
  line: Line,
  section: Section,
  highSpeed: Section | undefined,
  season: Season
) => {
  const [stationA, stationB] = section;

  const distance = getDistance0(...section);
  const points =
    distance > 400
      ? 12110
      : distance > 200
      ? 7940
      : distance > 100
      ? 4620
      : 2160;

  const junction = junctions.get(line);

  const superExpressTickets =
    (line === line1 || line === line2) && junction
      ? stationA.index < junction.index
        ? getSuperExpressFares(
            line0,
            junction.index < stationB.index ? [stationA, junction] : section,
            highSpeed &&
              (junction.index < highSpeed[1].index
                ? [highSpeed[0], junction]
                : highSpeed),
            season
          )
        : undefined
      : getSuperExpressFares(line, section, highSpeed, season);

  const limitedExpressFares =
    (line === line1 || line === line2) &&
    junction &&
    stationB.index > junction.index
      ? stationA.index >= junction.index
        ? getLimitedExpressFares(line, section, getLimitedExpressFares0, season)
        : getLimitedExpressFares(
            line,
            [junction, stationB],
            getLimitedExpressFares1,
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

  const nonReservedOrStandingOnlyExpressFare: number | undefined =
    nonReservedOrStandingOnlyExpressTickets &&
    sum(nonReservedOrStandingOnlyExpressTickets.map(({ fare }) => fare));

  const reservedExpressFare: number = sum(
    reservedExpressTickets.map(({ fare }) => fare)
  );

  const reservedHighSpeedExpressFare: number | undefined =
    reservedHighSpeedExpressTickets &&
    sum(reservedHighSpeedExpressTickets.map(({ fare }) => fare));

  const ticketSection200: BasicFareTicketSection = [
    cityZones.find(({ stations }) => stations.has(section[0])) ?? section[0],
    cityZones.find(({ stations }) => stations.has(section[1])) ?? section[1],
  ];
  const fareSection200: Section = [
    f(ticketSection200[0]),
    f(ticketSection200[1]),
  ];

  const ticketSection100: BasicFareTicketSection = [
    zone0.stations.has(section[0]) ? zone0 : section[0],
    zone0.stations.has(section[1]) ? zone0 : section[1],
  ];
  const fareSection100: Section = [
    f(ticketSection100[0]),
    f(ticketSection100[1]),
  ];

  const basicFareTicket0: Ticket = {
    fare: getBasicFare(line, section),
    section,
  };

  const basicFareTicket1: Ticket =
    getDistance0(...fareSection200) > 200
      ? {
          fare: getBasicFare(line, fareSection200),
          section: ticketSection200,
        }
      : getDistance0(...fareSection100) > 100
      ? {
          fare: getBasicFare(line, fareSection100),
          section: ticketSection100,
        }
      : basicFareTicket0;

  const [nonReservedOrStandingOnly0, nonReservedOrStandingOnly1] =
    nonReservedOrStandingOnlyExpressFare !== undefined &&
    nonReservedOrStandingOnlyExpressTickets
      ? [
          {
            basicFareTicket: basicFareTicket0,
            expressTickets: nonReservedOrStandingOnlyExpressTickets,
            total: basicFareTicket0.fare + nonReservedOrStandingOnlyExpressFare,
          },
          {
            basicFareTicket: basicFareTicket1,
            expressTickets: nonReservedOrStandingOnlyExpressTickets,
            total: basicFareTicket1.fare + nonReservedOrStandingOnlyExpressFare,
          },
        ]
      : [];
  const [reserved0, reserved1] = [
    {
      basicFareTicket: basicFareTicket0,
      expressTickets: reservedExpressTickets,
      discount: -200,
      total: basicFareTicket0.fare + reservedExpressFare - 200,
    },
    {
      basicFareTicket: basicFareTicket1,
      expressTickets: reservedExpressTickets,
      total: basicFareTicket1.fare + reservedExpressFare,
    },
  ];
  const [reservedHighSpeed0, reservedHighSpeed1] =
    reservedHighSpeedExpressFare !== undefined &&
    reservedHighSpeedExpressTickets
      ? [
          {
            basicFareTicket: basicFareTicket0,
            expressTickets: reservedHighSpeedExpressTickets,
            discount: -200,
            total: basicFareTicket0.fare + reservedHighSpeedExpressFare - 200,
          },
          {
            basicFareTicket: basicFareTicket1,
            expressTickets: reservedHighSpeedExpressTickets,
            total: basicFareTicket1.fare + reservedHighSpeedExpressFare,
          },
        ]
      : [];

  const nonReservedOrStandingOnly2: Omit<TotalFare, "rate"> | undefined =
    nonReservedOrStandingOnly0 !== undefined &&
    nonReservedOrStandingOnly1 !== undefined
      ? nonReservedOrStandingOnly0.total < nonReservedOrStandingOnly1.total
        ? nonReservedOrStandingOnly0
        : nonReservedOrStandingOnly1
      : undefined;
  const reserved2: Omit<TotalFare, "rate"> =
    reserved0.total < reserved1.total ? reserved0 : reserved1;
  const reservedHighSpeed2: Omit<TotalFare, "rate"> | undefined =
    reservedHighSpeed0 !== undefined && reservedHighSpeed1 !== undefined
      ? reservedHighSpeed0.total < reservedHighSpeed1.total
        ? reservedHighSpeed0
        : reservedHighSpeed1
      : undefined;

  return {
    distance,
    nonReservedOrStandingOnly: nonReservedOrStandingOnly2 && {
      ...nonReservedOrStandingOnly2,
      rate: nonReservedOrStandingOnly2.total / points,
    },
    reserved: {
      ...reserved2,
      rate: reserved2.total / points,
    },
    reservedHighSpeed: reservedHighSpeed2 && {
      ...reservedHighSpeed2,
      rate: reservedHighSpeed2.total / points,
    },
    points,
  };
};

const isEquivalent = (
  a: Section | BasicFareTicketSection,
  b: Section | BasicFareTicketSection
) => a[0] === b[0] && a[1] === b[1];

const reverseTicket = <T extends Ticket>(ticket: T): T => ({
  ...ticket,
  section: [ticket.section[1], ticket.section[0]],
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

const Result: React.VFC<{
  line: Line;
  section: Section;
  highSpeed: Section | undefined;
  longestHighSpeedSection: Section | undefined;
  rankedFares: Readonly<{
    nonReservedOrStandingOnly: {
      section: Section;
      rank: number;
      fares: ReturnType<typeof getFares>;
    }[];
    reserved: {
      section: Section;
      rank: number;
      fares: ReturnType<typeof getFares>;
    }[];
    reservedHighSpeed: {
      section: Section;
      rank: number;
      fares: ReturnType<typeof getFares>;
    }[];
  }>;
  season: Season;
}> = ({
  line,
  section,
  highSpeed,
  longestHighSpeedSection,
  rankedFares,
  season,
}) => {
  const [departure, arrival] = section;

  const sortedSection: Section =
    departure.index < arrival.index ? section : [arrival, departure];

  const sortedHighSpeed: Section | undefined = highSpeed
    ? departure.index < arrival.index
      ? highSpeed
      : [highSpeed[1], highSpeed[0]]
    : undefined;

  const {
    distance,
    nonReservedOrStandingOnly,
    reserved,
    reservedHighSpeed,
    points,
  } = getFares(line, sortedSection, sortedHighSpeed, season);

  const totalFares: readonly TotalFare[] = [
    ...(nonReservedOrStandingOnly ? [nonReservedOrStandingOnly] : []),
    ...(reserved ? [reserved] : []),
    ...(reservedHighSpeed ? [reservedHighSpeed] : []),
  ];

  const [basicFareTickets, expressTicketLists] =
    departure.index < arrival.index
      ? [
          totalFares.map(({ basicFareTicket }) => basicFareTicket),
          totalFares.map(({ expressTickets }) => expressTickets),
        ]
      : [
          totalFares.map(({ basicFareTicket }) =>
            reverseTicket(basicFareTicket)
          ),
          totalFares.map(({ expressTickets }) =>
            reverseTickets(...expressTickets)
          ),
        ];

  const cells0 = expressTicketLists.map((expressTickets) => (
    <th scope="col">
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
      <h2 className="h5">営業キロ</h2>
      <p>{kilometerFormatter.format(distance)}</p>
      <h2 className="h5">所定の運賃・特急料金</h2>
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
            {basicFareTickets.map((basicFareTicket) => (
              <td>
                <BasicFareLabel ticket={basicFareTicket} section={section} />
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">特急料金</th>
            {expressTicketLists.map((expressTickets) => (
              <td>
                <ExpressFaresLabel tickets={expressTickets} />
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">割引</th>
            {totalFares.map(({ discount }) => (
              <td>
                {discount !== undefined
                  ? jpyNameFormatter.format(discount)
                  : undefined}
              </td>
            ))}
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">計</th>
            {totalFares.map(({ total }) => (
              <td>{jpyNameFormatter.format(total)}</td>
            ))}
          </tr>
        </tfoot>
      </Table>
      <h2 className="h5">JRE POINT 特典チケット</h2>
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
            {totalFares.map(({ rate }) => (
              <td>{rate.toFixed(2)}</td>
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
                    rankedFares.nonReservedOrStandingOnly.find(({ section }) =>
                      isEquivalent(section, sortedSection)
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
                ) : (
                  <></>
                )}
              </td>
            )}
          </tr>
        </tbody>
      </Table>
    </>
  );
};

const ContextAwareItem: React.VFC<{
  eventKey: string;
  line: Line;
  section: Section;
  highSpeed: Section;
  longestHighSpeedSection: Section;
  onChange: (highSpeed: Section) => void;
}> = ({
  eventKey,
  line,
  section,
  highSpeed,
  longestHighSpeedSection,
  onChange,
}) => {
  const { activeEventKey } = useContext(AccordionContext);

  const isCurrentEventKey = activeEventKey === eventKey;
  const stations1 = (
    section[0].index < section[1].index
      ? line.stations.slice(section[0].index, section[1].index + 1)
      : line.stations.slice(section[1].index, section[0].index + 1)
  ).filter((station) => isHighSpeedAvailableStation(line, station));
  const items = stations1.map((station) => ({
    station,
    disabled:
      station.index <=
        line0.stations.findIndex((station) => station.name === "大宮") ||
      station.index >=
        line0.stations.findIndex((station) => station.name === "盛岡"),
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
              <b>{highSpeed[0].name}</b> <i className="bi bi-arrow-right"></i>{" "}
              <b>{highSpeed[1].name}</b>
            </span>
          </Fade>
        </div>
      </Accordion.Header>
      <Accordion.Body as="fieldset">
        <Row className="gy-2 gx-3">
          <Col>
            <StationDropdown
              value={highSpeed[0]}
              onChange={(station) => onChange([station, highSpeed[1]])}
              header={`${train}号の乗車駅`}
              items={items.map(({ station, disabled }) => ({
                station,
                disabled:
                  station === longestHighSpeedSection[1] ||
                  (disabled && station !== section[0]),
                active: station === highSpeed[0],
              }))}
            />
          </Col>
          <Col xs="auto" className="align-self-center">
            <i className="bi bi-arrow-right"></i>
          </Col>
          <Col>
            <StationDropdown
              value={highSpeed[1]}
              onChange={(station) => onChange([highSpeed[0], station])}
              header={`${train}号の降車駅`}
              items={items.map(({ station, disabled }) => ({
                station,
                disabled:
                  station === longestHighSpeedSection[0] ||
                  (disabled && station !== section[1]),
                active: station === highSpeed[1],
              }))}
            />
          </Col>
        </Row>
        <div className="d-grid mt-3">
          <Button
            variant="outline-secondary"
            onClick={() => onChange(longestHighSpeedSection)}
            disabled={
              highSpeed[0] === longestHighSpeedSection?.[0] &&
              highSpeed[1] === longestHighSpeedSection?.[1]
            }
          >
            デフォルトに戻す
          </Button>
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
  station.index <=
    line0.stations.findIndex((station) => station.name === "大宮") ||
  ((line === line0 || line === line1) &&
    station.index >=
      line0.stations.findIndex((station) => station.name === "仙台"));

/**
 * 全乗車区間のうち、はやぶさ号やこまち号が利用可能な最長区間を求める。
 * @param line
 * @param section 全乗車区間。 `section[1]` は `section[0]` より終点に近い駅である必要がある。
 * @returns はやぶさ号やこまち号が利用可能な最長区間。 `undefined` の場合は利用可能な区間がない。
 */
const getLongestHighSpeedSection0 = (
  line: Line,
  section: Section
): Section | undefined => {
  const [a, b] = section;
  const highSpeedAvailableStations = line.stations
    .slice(a.index, b.index + 1)
    .filter((station) => isHighSpeedAvailableStation(line, station));

  const [highSpeedDeparture, highSpeedArrival] = [
    highSpeedAvailableStations.find(({ index }) => index >= a.index),
    highSpeedAvailableStations
      .filter(({ index }) => index <= b.index)
      .slice(-1)[0],
  ];

  return highSpeedDeparture &&
    highSpeedArrival &&
    highSpeedDeparture !== highSpeedArrival
    ? [highSpeedDeparture, highSpeedArrival]
    : undefined;
};

/**
 * 全乗車区間のうち、はやぶさ号やこまち号が利用可能な最長区間を求める。
 * @param line
 * @param section 全乗車区間。 `section[0]` と `section[1]` の順序は不問。
 * @returns はやぶさ号やこまち号が利用可能な最長区間。 `undefined` の場合は利用可能な区間がない。
 */
const getLongestHighSpeedSection = (
  line: Line,
  section: Section
): Section | undefined => {
  const [departure, arrival] = section;
  if (departure.index < arrival.index) {
    return getLongestHighSpeedSection0(line, section);
  } else {
    const longestHighSpeedSection = getLongestHighSpeedSection0(line, [
      arrival,
      departure,
    ]);
    return longestHighSpeedSection
      ? [longestHighSpeedSection[1], longestHighSpeedSection[0]]
      : undefined;
  }
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
const isHighSpeedAvailableSection = (line: Line, section: Section) => {
  const [departure, arrival] = section;
  const [stationA, stationB] =
    departure.index < arrival.index
      ? [departure, arrival]
      : [arrival, departure];

  return (
    (line === line0 || line === line1) &&
    ((stationA.index <=
      line0.stations.findIndex((station) => station.name === "大宮") &&
      stationB.index >=
        line0.stations.findIndex((station) => station.name === "仙台")) ||
      (stationA.index <
        line0.stations.findIndex((station) => station.name === "盛岡") &&
        stationB.index >
          line0.stations.findIndex((station) => station.name === "仙台")))
  );
};

interface State {
  readonly line: Line;
  readonly section: Section;
  readonly longestHighSpeedSection: Section | undefined;
  readonly highSpeed: Section | undefined;
}

type Action = Readonly<
  | {
      type: "setLine";
      payload: Line;
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
      type: "setHighSpeed";
      payload: Section | undefined;
    }
>;

type Section = readonly [a: Station, b: Station];
type BasicFareTicketSection = readonly [a: Station | Zone, b: Station | Zone];

const reducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case "setLine": {
      const line = action.payload;
      const [departure, arrival] = state.section;
      const firstOfLine = line.stations[0]!;
      const lastOfLine = line.stations.slice(-1)[0]!;

      const section: Section = line.stations.includes(departure)
        ? line.stations.includes(arrival)
          ? [departure, arrival]
          : [departure, lastOfLine === departure ? firstOfLine : lastOfLine]
        : line.stations.includes(arrival)
        ? [firstOfLine === arrival ? lastOfLine : firstOfLine, arrival]
        : [firstOfLine, lastOfLine];

      const longestHighSpeedSection = getLongestHighSpeedSection(line, section);

      return {
        ...state,
        line,
        section,
        longestHighSpeedSection,
        highSpeed: longestHighSpeedSection,
      };
    }

    case "setDeparture": {
      const section = [action.payload, state.section[1]] as const;
      const longestHighSpeedSection = getLongestHighSpeedSection(
        state.line,
        section
      );

      return {
        ...state,
        section,
        longestHighSpeedSection,
        highSpeed: longestHighSpeedSection,
      };
    }

    case "setArrival": {
      const section = [state.section[0], action.payload] as const;
      const longestHighSpeedSection = getLongestHighSpeedSection(
        state.line,
        section
      );

      return {
        ...state,
        section,
        longestHighSpeedSection,
        highSpeed: longestHighSpeedSection,
      };
    }

    case "setHighSpeed":
      return {
        ...state,
        highSpeed: action.payload,
      };
  }
};

const init = (): State => {
  const line = line0;
  const section: Section = [line.stations[0]!, line.stations.slice(-1)[0]!];
  const longestHighSpeedSection = getLongestHighSpeedSection(line, section);
  return {
    line,
    section,
    longestHighSpeedSection,
    highSpeed: longestHighSpeedSection,
  };
};

const App1: React.VFC<{
  season: Season;
  rankedFares: Readonly<{
    nonReservedOrStandingOnly: {
      section: Section;
      rank: number;
      fares: ReturnType<typeof getFares>;
    }[];
    reserved: {
      section: Section;
      rank: number;
      fares: ReturnType<typeof getFares>;
    }[];
    reservedHighSpeed: {
      section: Section;
      rank: number;
      fares: ReturnType<typeof getFares>;
    }[];
  }>;
}> = ({ season, rankedFares }) => {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  const { line, section, highSpeed, longestHighSpeedSection } = state;
  const [departure, arrival] = section;

  const highSpeedAvailable = useMemo(
    () => isHighSpeedAvailableSection(line, section),
    [line, section]
  );

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
                type: "setLine",
                payload: lines.get(e.currentTarget.value)!,
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
              header="出発駅"
              items={line.stations.map((station) => ({
                station,
                disabled: station === arrival,
                active: station === departure,
              }))}
            />
          </Col>
          <Col xs="auto" className="align-self-center">
            <i className="bi bi-arrow-right"></i>
          </Col>
          <Col>
            <StationDropdown
              value={arrival}
              onChange={(station) =>
                dispatch({ type: "setArrival", payload: station })
              }
              header="到着駅"
              items={line.stations.map((station) => ({
                station,
                disabled: station === departure,
                active: station === arrival,
              }))}
            />
          </Col>
        </Row>
      </Card>
      {highSpeedAvailable && highSpeed && longestHighSpeedSection ? (
        <Accordion className="mb-3">
          <ContextAwareItem
            eventKey="0"
            line={line}
            section={section}
            highSpeed={highSpeed}
            longestHighSpeedSection={longestHighSpeedSection}
            onChange={(highSpeed) =>
              dispatch({ type: "setHighSpeed", payload: highSpeed })
            }
          />
        </Accordion>
      ) : (
        <></>
      )}
      <Result
        line={line}
        section={section}
        highSpeed={highSpeedAvailable ? highSpeed : undefined}
        longestHighSpeedSection={longestHighSpeedSection}
        rankedFares={rankedFares}
        season={season}
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
  rankedFares: Readonly<{
    nonReservedOrStandingOnly: {
      section: Section;
      rank: number;
      fares: ReturnType<typeof getFares>;
    }[];
    reserved: {
      section: Section;
      rank: number;
      fares: ReturnType<typeof getFares>;
    }[];
    reservedHighSpeed: {
      section: Section;
      rank: number;
      fares: ReturnType<typeof getFares>;
    }[];
  }>;
}> = ({ rankedFares }) => {
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
      <FloatingLabel
        label="次の所定額に対するレートで並び替える"
        className="mb-3"
      >
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
          <option value="reservedHighSpeed">はやぶさ・こまち号 指定席</option>
        </Form.Select>
      </FloatingLabel>
      <Table
        striped
        bordered
        responsive
        size={small ? "sm" : undefined}
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
            <th scope="col">所定</th>
            <th scope="col">レート</th>
            <th scope="col">所定</th>
            <th scope="col">レート</th>
            <th scope="col">所定</th>
            <th scope="col">レート</th>
          </tr>
        </thead>
        <tbody>
          {rankedFares[seat].map(({ rank, section, fares }) => {
            const {
              distance,
              points,
              nonReservedOrStandingOnly,
              reserved,
              reservedHighSpeed,
            } = fares;
            return (
              <tr key={`${section[0].name}-${section[1].name}`}>
                <th scope="row">{rank + 1}</th>
                <th scope="row">{section[0].name}</th>
                <th scope="row">{section[1].name}</th>
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
                  {nonReservedOrStandingOnly?.rate !== undefined ? (
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
                  {reservedHighSpeed?.rate !== undefined ? (
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
            );
          })}
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

const App: React.VFC = () => {
  const [season, setSeason] = useState<Season>(average);

  const faresForEachSection = useMemo(
    () =>
      [...lines.values()].flatMap((line) => {
        const junction = junctions.get(line);
        return line.stations.flatMap((stationA, index, stations) =>
          stations
            .slice(Math.max(index, junction?.index ?? 0) + 1)
            .map((stationB) => {
              const section: Section = [stationA, stationB];
              const highSpeed = getLongestHighSpeedSection0(line, section);
              return {
                section,
                fares: getFares(line, section, highSpeed, season),
              };
            })
        );
      }),
    [season]
  );

  const rankedFares = useMemo(
    () => ({
      nonReservedOrStandingOnly: rank(
        faresForEachSection,
        ({ fares }) =>
          fares.nonReservedOrStandingOnly?.rate ?? fares.reserved.rate
      ).map(({ value, rank }) => ({ ...value, rank })),
      reserved: rank(
        faresForEachSection,
        ({ fares }) => fares.reserved.rate
      ).map(({ value, rank }) => ({ ...value, rank })),
      reservedHighSpeed: rank(
        faresForEachSection,
        ({ fares }) => fares.reservedHighSpeed?.rate ?? fares.reserved.rate
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
            <FloatingLabel label="シーズン">
              <Form.Select
                value={season}
                onChange={(e) => setSeason(e.currentTarget.value as Season)}
              >
                {seasons.map((season) => (
                  <option key={season}>{season}</option>
                ))}
              </Form.Select>
            </FloatingLabel>
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
              <b>最繁忙期</b>
              の特急料金のうち、秋田新幹線や山形新幹線のものは予想です。
            </li>
          </ul>
        </Alert>
        <Routes>
          <Route
            path="ranking"
            element={<Ranking rankedFares={rankedFares} />}
          />
          <Route
            path="/"
            element={<App1 season={season} rankedFares={rankedFares} />}
          />
        </Routes>
      </Container>
    </>
  );
};

export default App;
