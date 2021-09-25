import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";
import parse from "csv-parse/lib/sync";
import _ from "lodash";
import React, { Reducer, useContext, useReducer } from "react";
import {
  Accordion,
  AccordionContext,
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Container,
  Dropdown,
  DropdownButton,
  Fade,
  FloatingLabel,
  Form,
  Navbar,
  Row,
  Table,
} from "react-bootstrap";
import "./App.css";

interface Station {
  readonly index: number;
  readonly name: string;
  readonly distance: number;
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
      { name: "糸魚川", distance: 318.9 },
      { name: "黒部宇奈月温泉", distance: 358.1 },
      { name: "富山", distance: 391.9 },
      { name: "新高岡", distance: 410.8 },
      { name: "金沢", distance: 450.5 },
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
  [line2.name, line2],
  [line3.name, line3],
  [line4.name, line4],
]);

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

const getDistance = (distance: number) =>
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
  const distance1 = getDistance(distance);
  const fare0 =
    16.2 * Math.min(distance1, 300) +
    12.85 * Math.max(Math.min(distance1 - 300, 300), 0) +
    7.05 * Math.max(distance1 - 600, 0);

  return distance > 10
    ? _.round(
        (distance > 100 ? _.round(fare0, -2) : _.ceil(fare0, -1)) * 1.1,
        -1
      )
    : distance > 6
    ? 200
    : distance > 3
    ? 190
    : 150;
};

/**
 * **東京附近における電車特定区間**内相互発着の場合の大人片道普通旅客運賃を計算する
 * @param distance 営業キロ
 * @returns 運賃
 */
const getBasicFare1 = (distance: number) => {
  // 1-3: 140, 4-6: 160, 7-10: 170
  const distance1 = getDistance(distance);
  const fare0 =
    15.3 * Math.min(distance1, 300) +
    12.15 * Math.max(Math.min(distance1 - 300, 300), 0);

  return distance > 10
    ? _.ceil(
        (distance > 100 ? _.round(fare0, -2) : _.ceil(fare0, -1)) * 1.1,
        -1
      )
    : distance > 6
    ? 170
    : distance > 3
    ? 160
    : 140;
};

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
 * 新幹線の指定席特急料金を計算する
 * @param line 東北新幹線、上越新幹線、北陸新幹線のいずれか
 * @param section 区間。 `section[1]` は `section[0]` より終点に近い駅である必要がある。
 * @returns 指定席特急料金
 */
const getSuperExpressFare = (line: Line, section: Section) =>
  +tables.get(line)!.find((row) => row["駅名"] === section[1].name)![
    section[0].name
  ]!;

/**
 * 新幹線の特急料金を計算する
 * @param line 東北新幹線、上越新幹線、北陸新幹線のいずれか
 * @param section 区間。 `section[1]` は `section[0]` より終点に近い駅である必要がある。
 * @returns 自由席特急料金、特定特急料金、指定席特急料金
 */
const getSuperExpressFares = (
  line: Line,
  section: Section,
  highSpeed: Section | undefined
) => {
  const [stationA, stationB] = section;

  const reserved = getSuperExpressFare(line, section);

  const lowExpressFare =
    stationA.name === "東京" && stationB.name === "大宮"
      ? 1090
      : stationB.index - stationA.index === 1 ||
        [
          ["古川", "一ノ関"],
          ["一ノ関", "北上"],
          ["北上", "盛岡"],
          ["熊谷", "高崎"],
        ].some(([a, b]) => stationA.name === a && stationB.name === b)
      ? stationB.distance - stationA.distance > 50
        ? 1000
        : 880
      : undefined;

  const nonReservedOrStandingOnly = lowExpressFare ?? reserved - 530;
  const nonReservedAvailable =
    line !== line0 ||
    stationB.index <=
      line.stations.findIndex((station) => station.name === "盛岡");
  const standingOnlyAvailable =
    line === line0 &&
    stationA.index >=
      line.stations.findIndex((station) => station.name === "盛岡");

  const highSpeedReserved =
    highSpeed &&
    (highSpeed[0] === stationA && highSpeed[1] === stationB
      ? +table.find((row) => row["駅名"] === stationB.name)![stationA.name]!
      : reserved +
        +table.find((row) => row["駅名"] === highSpeed[1].name)![
          highSpeed[0].name
        ]! -
        getSuperExpressFare(line, highSpeed));

  return {
    reserved,
    highSpeedReserved,
    nonReserved: nonReservedAvailable ? nonReservedOrStandingOnly : undefined,
    standingOnly: standingOnlyAvailable ? nonReservedOrStandingOnly : undefined,
    nonReservedOrStandingOnly,
    nonReservedAvailable,
    standingOnlyAvailable,
  };
};

const C2: React.VFC<{
  line: Line;
  section: Section;
  highSpeedSection?: Section;
}> = ({ line, section, highSpeedSection }) => {
  const [departure, arrival] = section;
  const [stationA, stationB] =
    departure.index < arrival.index
      ? [departure, arrival]
      : [arrival, departure];
  const [highSpeedStationA, highSpeedStationB] = highSpeedSection
    ? departure.index < arrival.index
      ? highSpeedSection
      : [highSpeedSection[1], highSpeedSection[0]]
    : [];

  const distance = stationB.distance - stationA.distance;
  const points =
    distance > 400
      ? 12110
      : distance > 200
      ? 7940
      : distance > 100
      ? 4620
      : 2160;

  const superExpressFares =
    line === line2
      ? stationA.index < line2.stations.findIndex(({ name }) => name === "福島")
        ? getSuperExpressFares(
            line0,
            [stationA, line0.stations.find(({ name }) => name === "福島")!],
            highSpeedStationA &&
              highSpeedStationB && [highSpeedStationA, highSpeedStationB]
          )
        : undefined
      : getSuperExpressFares(
          line,
          [stationA, stationB],
          highSpeedStationA &&
            highSpeedStationB && [highSpeedStationA, highSpeedStationB]
        );

  const [limitedExpressFare, nonReservedOrStandingOnlyLimitedExpressFare] =
    line === line2 &&
    stationB.index > line2.stations.findIndex(({ name }) => name === "福島")
      ? stationA.index >=
        line2.stations.findIndex(({ name }) => name === "福島")
        ? [
            getLimitedExpressFare0(distance),
            getLimitedExpressFare0(distance) - 530,
          ]
        : [
            getLimitedExpressFare1(distance),
            getLimitedExpressFare1(distance) - 380,
          ]
      : [undefined, undefined];

  const nonReservedAvailable =
    stationA.index >= line2.stations.findIndex(({ name }) => name === "福島") ||
    undefined;

  const basicFare =
    stationB.index <=
    line.stations.findIndex((station) => station.name === "大宮")
      ? getBasicFare1(distance)
      : getBasicFare0(distance);

  const nonReservedOrStandingOnlyExpressFare =
    (superExpressFares?.nonReservedOrStandingOnly ?? 0) +
    (nonReservedOrStandingOnlyLimitedExpressFare ?? 0);

  const nonReservedOrStandingOnlyAvailable =
    !superExpressFares ||
    superExpressFares.nonReservedAvailable ||
    superExpressFares.standingOnlyAvailable;

  const reservedExpressFare =
    (superExpressFares?.reserved ?? 0) + (limitedExpressFare ?? 0);

  const nonReservedOrStandingOnlyTotal =
    basicFare + nonReservedOrStandingOnlyExpressFare;
  const reservedTotal = basicFare + reservedExpressFare - 200;
  const highSpeedReservedTotal =
    superExpressFares?.highSpeedReserved !== undefined
      ? basicFare + superExpressFares?.highSpeedReserved - 200
      : undefined;

  const thead = (
    <thead>
      {superExpressFares?.highSpeedReserved && (
        <tr>
          <th scope="row">はやぶさ号</th>
          {nonReservedOrStandingOnlyAvailable ? (
            <th scope="row">利用しない</th>
          ) : (
            <></>
          )}
          <th scope="row">利用しない</th>
          <th scope="row">利用する</th>
        </tr>
      )}
      <tr>
        <th scope="row">座席</th>
        {limitedExpressFare !== undefined ? (
          <th scope="col">
            {true ? "自由席" : superExpressFares ? "自由席・立席" : "立席"}
          </th>
        ) : superExpressFares!.nonReservedAvailable ? (
          <th scope="col">自由席</th>
        ) : superExpressFares!.standingOnlyAvailable ? (
          <th scope="col">立席</th>
        ) : (
          <></>
        )}
        <th scope="col">指定席</th>
        {superExpressFares?.highSpeedReserved !== undefined ? (
          <th scope="col">指定席</th>
        ) : (
          <></>
        )}
      </tr>
    </thead>
  );

  return (
    <>
      <dl>
        <dt>営業キロ</dt>
        <dd>{distance.toFixed(1)} km</dd>
        <dt>JRE POINT特典チケット 交換ポイント</dt>
        <dd>{points}ポイント</dd>
      </dl>
      <h5>所定の運賃・特急料金</h5>
      <Table bordered>
        {thead}
        <tbody>
          <tr>
            <th scope="row">運賃</th>
            <td
              colSpan={
                +(superExpressFares?.highSpeedReserved !== undefined) +
                +nonReservedOrStandingOnlyAvailable +
                1
              }
            >
              {basicFare}円
            </td>
          </tr>
          <tr>
            <th scope="row">特急料金</th>
            {nonReservedOrStandingOnlyAvailable ? (
              <td>{nonReservedOrStandingOnlyExpressFare}円</td>
            ) : (
              <></>
            )}
            <td>{reservedExpressFare}円</td>
            {superExpressFares?.highSpeedReserved !== undefined ? (
              <td>{superExpressFares?.highSpeedReserved}円</td>
            ) : (
              <></>
            )}
          </tr>
          <tr>
            <th scope="row">割引</th>
            {nonReservedOrStandingOnlyAvailable ? <td>-</td> : <></>}
            <td>-200円</td>
            {superExpressFares?.highSpeedReserved !== undefined ? (
              <td>-200円</td>
            ) : (
              <></>
            )}
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">計</th>
            {nonReservedOrStandingOnlyAvailable ? (
              <td>{nonReservedOrStandingOnlyTotal}円</td>
            ) : (
              <></>
            )}
            <td>{reservedTotal}円</td>
            {highSpeedReservedTotal !== undefined ? (
              <td>{highSpeedReservedTotal}円</td>
            ) : (
              <></>
            )}
          </tr>
        </tfoot>
      </Table>
      <h5>JRE POINTのレート</h5>
      <p>
        所定の運賃・特急料金を交換ポイントで割った値です。指定列車に乗り遅れた場合を除き、
        JRE POINT特典チケットで自由席・立席は利用できません。
      </p>
      <Table bordered>
        {thead}
        <tbody>
          <tr>
            <th scope="row">レート</th>
            {nonReservedOrStandingOnlyAvailable ? (
              <td>{(nonReservedOrStandingOnlyTotal / points).toFixed(2)}</td>
            ) : (
              <></>
            )}
            <td>{(reservedTotal / points).toFixed(2)}</td>
            {highSpeedReservedTotal !== undefined ? (
              <td>{(highSpeedReservedTotal / points).toFixed(2)}</td>
            ) : (
              <></>
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
  train: string;
  section: Section;
  highSpeedSection: Section;
  onChange: (highSpeedSection: Section) => void;
}> = ({ eventKey, line, train, section, highSpeedSection, onChange }) => {
  const { activeEventKey } = useContext(AccordionContext);

  const isCurrentEventKey = activeEventKey === eventKey;
  const stations1 = (
    section[0].index < section[1].index
      ? line.stations.slice(section[0].index, section[1].index + 1)
      : line.stations.slice(section[1].index, section[0].index + 1)
  ).filter(isHighSpeedAvailableStation);
  const items = stations1.map((station) => ({
    station,
    disabled:
      station.index <=
        line0.stations.findIndex((station) => station.name === "大宮") ||
      station.index >=
        line0.stations.findIndex((station) => station.name === "盛岡"),
  }));

  const longestHighSpeedSection = getLongestHighSpeedSection(line, section)!;

  return (
    <Accordion.Item eventKey={eventKey}>
      <Accordion.Header>
        <div className="d-flex justify-content-between flex-grow-1 overflow-hidden">
          <span className="flex-shrink-0">{train}号 利用区間</span>
          <Fade in={!isCurrentEventKey}>
            <span
              className="ms-4 me-2 overflow-hidden text-nowrap"
              style={{ textOverflow: "ellipsis" }}
            >
              <b>{highSpeedSection[0].name}</b>{" "}
              <i className="bi bi-arrow-right"></i>{" "}
              <b>{highSpeedSection[1].name}</b>
            </span>
          </Fade>
        </div>
      </Accordion.Header>
      <Accordion.Body>
        <Row className="gy-2 gx-3">
          <Col>
            <StationDropdown
              value={highSpeedSection[0]}
              onChange={(station) => onChange([station, highSpeedSection[1]])}
              header="乗車駅"
              items={items.map(({ station, disabled }) => ({
                station,
                disabled:
                  station === longestHighSpeedSection[1] ||
                  (disabled && station !== section[0]),
                active: station === highSpeedSection[0],
              }))}
            />
          </Col>
          <Col xs="auto" className="align-self-center">
            <i className="bi bi-arrow-right"></i>
          </Col>
          <Col>
            <StationDropdown
              value={highSpeedSection[1]}
              onChange={(station) => onChange([highSpeedSection[0], station])}
              header="降車駅"
              items={items.map(({ station, disabled }) => ({
                station,
                disabled:
                  station === longestHighSpeedSection[0] ||
                  (disabled && station !== section[1]),
                active: station === highSpeedSection[1],
              }))}
            />
          </Col>
        </Row>
        <Collapse
          in={
            highSpeedSection[0] !== longestHighSpeedSection?.[0] ||
            highSpeedSection[1] !== longestHighSpeedSection?.[1]
          }
        >
          <div>
            <div className="d-grid mt-3">
              <Button
                variant="outline-secondary"
                onClick={() => onChange(longestHighSpeedSection)}
              >
                デフォルトに戻す
              </Button>
            </div>
          </div>
        </Collapse>
      </Accordion.Body>
    </Accordion.Item>
  );
};

/**
 * はやぶさ号やこまち号が利用可能な駅かどうか調べる
 * @param station
 * @returns はやぶさ号やこまち号が利用可能な駅ならtrue
 */
const isHighSpeedAvailableStation = (station: Station) =>
  station.index <=
    line0.stations.findIndex((station) => station.name === "大宮") ||
  station.index >=
    line0.stations.findIndex((station) => station.name === "仙台");

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
  const highSpeedAvailableStations = line0.stations
    .slice(a.index, b.index + 1)
    .filter(isHighSpeedAvailableStation);

  const [highSpeedDeparture, highSpeedArrival] = [
    highSpeedAvailableStations.find(({ index }) => index >= a.index),
    highSpeedAvailableStations
      .filter(({ index }) => index <= b.index)
      .slice(-1)[0],
  ];

  return highSpeedDeparture && highSpeedArrival
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
    line === line0 &&
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
  readonly highSpeedSection: Section | undefined;
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
      type: "setHighSpeedSection";
      payload: Section | undefined;
    }
>;

type Section = readonly [Station, Station];

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

      return {
        ...state,
        line,
        section,
        highSpeedSection: getLongestHighSpeedSection(line, section),
      };
    }

    case "setDeparture": {
      const section = [action.payload, state.section[1]] as const;
      return {
        ...state,
        section,
        highSpeedSection: getLongestHighSpeedSection(state.line, section),
      };
    }

    case "setArrival": {
      const section = [state.section[0], action.payload] as const;
      return {
        ...state,
        section,
        highSpeedSection: getLongestHighSpeedSection(state.line, section),
      };
    }

    case "setHighSpeedSection":
      return {
        ...state,
        highSpeedSection: action.payload,
      };
  }
};

const init = (): State => {
  const line = line0;
  const section: Section = [line.stations[0]!, line.stations.slice(-1)[0]!];
  const highSpeedSection = getLongestHighSpeedSection(line, section);
  return { line, section, highSpeedSection };
};

const App: React.VFC = () => {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  const { line, section, highSpeedSection } = state;
  const [departure, arrival] = section;

  const highSpeedAvailable = isHighSpeedAvailableSection(line, section);

  return (
    <>
      <Navbar variant="dark" bg="dark">
        <Container>
          <Navbar.Brand>JRE POINT特典チケットのレート計算</Navbar.Brand>
        </Container>
      </Navbar>
      <Container>
        <p className="my-3">
          <a
            href="https://www.eki-net.com/top/point/guide/tokuten_section.html#headerM2_01"
            target="_blank"
            rel="noreferrer"
          >
            えきねっとでJRE POINTと交換できる特典チケット
          </a>
          が、割引なしのきっぷと比べてどのくらい割がいいのか計算します。
        </p>
        <Card body className="my-3">
          <Row>
            <Col>
              <FloatingLabel controlId="floatingSelect" label="路線">
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
                  <option disabled>秋田新幹線</option>
                  <option>山形新幹線</option>
                  <option>上越新幹線</option>
                  <option>北陸新幹線</option>
                </Form.Select>
              </FloatingLabel>
            </Col>
          </Row>
          <Row className="mt-2 gy-2 gx-3">
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
        {highSpeedAvailable && highSpeedSection ? (
          <Accordion className="mb-3">
            <ContextAwareItem
              eventKey="0"
              line={line}
              section={section}
              train="はやぶさ"
              highSpeedSection={highSpeedSection}
              onChange={(highSpeedSection) =>
                dispatch({
                  type: "setHighSpeedSection",
                  payload: highSpeedSection,
                })
              }
            />
          </Accordion>
        ) : (
          <></>
        )}
        <C2
          line={line}
          section={section}
          highSpeedSection={highSpeedAvailable ? highSpeedSection : undefined}
        />
      </Container>
    </>
  );
};

export default App;
