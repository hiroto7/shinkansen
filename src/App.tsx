import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";
import parse from "csv-parse/lib/sync";
import _ from "lodash";
import React, { Reducer, useContext, useReducer } from "react";
import {
  Accordion,
  AccordionContext,
  Badge,
  Card,
  Col,
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

type Line = readonly Station[];

const joinIndex = <T,>(array: readonly T[]) =>
  array.map((value, index) => ({ ...value, index }));

// (\d+(?:\.\d)?)\t(.+)
const line0: Line = joinIndex([
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
]);

const line1: Line = [
  ...line0.slice(
    line0.findIndex((station) => station.name === "東京"),
    line0.findIndex((station) => station.name === "大宮") + 1
  ),
  ...joinIndex([
    { name: "熊谷", distance: 64.7 },
    { name: "本庄早稲田", distance: 86 },
    { name: "高崎", distance: 105 },
    { name: "上毛高原", distance: 151.6 },
    { name: "越後湯沢", distance: 199.2 },
    { name: "浦佐", distance: 228.9 },
    { name: "長岡", distance: 270.6 },
    { name: "燕三条", distance: 293.8 },
    { name: "新潟", distance: 333.9 },
  ]),
];

const line2: Line = [
  ...line0.slice(
    line0.findIndex((station) => station.name === "東京"),
    line0.findIndex((station) => station.name === "大宮") + 1
  ),
  ...line1.slice(
    line1.findIndex((station) => station.name === "熊谷"),
    line1.findIndex((station) => station.name === "高崎") + 1
  ),
  ...joinIndex([
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
  ]),
];

const lines: ReadonlyMap<string, Line> = new Map([
  ["東北新幹線", line0],
  ["上越新幹線", line1],
  ["北陸新幹線", line2],
]);

const tables = [
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
`,
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
].map((raw) => parse(raw.trim(), { columns: true }));

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
const getFare0 = (distance: number) => {
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
const getFare1 = (distance: number) => {
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

console.log(getFare0);
console.log(getFare1);

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
    : [undefined, undefined];

  const distance = stationB.distance - stationA.distance;
  const points =
    distance > 400
      ? 12110
      : distance > 200
      ? 7940
      : distance > 100
      ? 4620
      : 2160;

  const reservedExpressFare = +(
    line === line0 ? tables[0] : line === line1 ? tables[2] : tables[3]
  ).find((row: any) => row["駅名"] === stationB.name)[stationA.name];

  const highSpeedExpressFare =
    highSpeedStationA === departure && highSpeedStationB === arrival
      ? +tables[1].find((row: any) => row["駅名"] === stationB.name)[
          stationA.name
        ]
      : highSpeedStationA && highSpeedStationB
      ? reservedExpressFare +
        (tables[1].find((row: any) => row["駅名"] === highSpeedStationB.name)[
          highSpeedStationA.name
        ] -
          tables[0].find((row: any) => row["駅名"] === highSpeedStationB.name)[
            highSpeedStationA.name
          ])
      : undefined;

  const nonReservedAvailable =
    line !== line0 ||
    stationB.index <= line.findIndex((station) => station.name === "盛岡");

  const standingOnlyAvailable =
    line === line0 &&
    stationA.index >= line.findIndex((station) => station.name === "盛岡");

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

  const nonReservedOrStandingOnlyFare =
    lowExpressFare ?? reservedExpressFare - 530;

  const fare =
    stationB.index <= line.findIndex((station) => station.name === "大宮")
      ? getFare1(distance)
      : getFare0(distance);

  const thead = (
    <thead>
      {highSpeedExpressFare !== undefined ? (
        <tr>
          <th scope="row">はやぶさ号</th>
          {nonReservedAvailable || standingOnlyAvailable ? (
            <th scope="row">利用しない</th>
          ) : (
            <></>
          )}
          <th scope="row">利用しない</th>
          <th scope="row">利用する</th>
        </tr>
      ) : (
        <></>
      )}
      <tr>
        <th scope="row">座席</th>
        {nonReservedAvailable ? <th scope="col">自由席</th> : <></>}
        {standingOnlyAvailable ? <th scope="col">立席</th> : <></>}
        <th scope="col">指定席</th>
        {highSpeedExpressFare !== undefined ? (
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
      <Table striped bordered>
        {thead}
        <tbody>
          <tr>
            <th scope="row">運賃</th>
            <td
              colSpan={
                +(highSpeedExpressFare !== undefined) +
                +(nonReservedAvailable || standingOnlyAvailable) +
                1
              }
            >
              {fare}円
            </td>
          </tr>
          <tr>
            <th scope="row">特急料金</th>
            {nonReservedAvailable || standingOnlyAvailable ? (
              <td>
                {nonReservedOrStandingOnlyFare}円{" "}
                {lowExpressFare !== undefined || standingOnlyAvailable ? (
                  <Badge bg="secondary">特定</Badge>
                ) : (
                  <></>
                )}
              </td>
            ) : (
              <></>
            )}
            <td>{reservedExpressFare}円</td>
            {highSpeedExpressFare !== undefined ? (
              <td>{highSpeedExpressFare}円</td>
            ) : (
              <></>
            )}
          </tr>
          <tr>
            <th scope="row">割引</th>
            {nonReservedAvailable || standingOnlyAvailable ? <td>-</td> : <></>}
            <td>-200円</td>
            {highSpeedExpressFare !== undefined ? <td>-200円</td> : <></>}
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">計</th>
            {nonReservedAvailable || standingOnlyAvailable ? (
              <td>{nonReservedOrStandingOnlyFare + fare}円</td>
            ) : (
              <></>
            )}
            <td>{reservedExpressFare + fare - 200}円</td>
            {highSpeedExpressFare !== undefined ? (
              <td>{highSpeedExpressFare + fare - 200}円</td>
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
      <Table striped bordered>
        {thead}
        <tbody>
          <tr>
            <th scope="row">レート</th>
            {nonReservedAvailable || standingOnlyAvailable ? (
              <td>
                {((nonReservedOrStandingOnlyFare + fare) / points).toFixed(2)}
              </td>
            ) : (
              <></>
            )}
            <td>{((reservedExpressFare + fare - 200) / points).toFixed(2)}</td>
            {highSpeedExpressFare !== undefined ? (
              <td>
                {((highSpeedExpressFare + fare - 200) / points).toFixed(2)}
              </td>
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
  departure: Station;
  arrival: Station;
  highSpeedDeparture: Station;
  highSpeedArrival: Station;
  onDepartureChange: (departure: Station) => void;
  onArrivalChange: (arrival: Station) => void;
}> = ({
  eventKey,
  line,
  train,
  departure,
  arrival,
  highSpeedDeparture,
  highSpeedArrival,
  onDepartureChange: setDeparture,
  onArrivalChange: setArrival,
}) => {
  const { activeEventKey } = useContext(AccordionContext);

  const isCurrentEventKey = activeEventKey === eventKey;
  const stations1 = (
    departure.index < arrival.index
      ? line.slice(departure.index, arrival.index + 1)
      : line.slice(arrival.index, departure.index + 1)
  ).filter(isHighSpeedAvailableStation);
  const [departure1, arrival1] =
    departure.index < arrival.index
      ? [stations1[0], stations1[stations1.length - 1]]
      : [stations1[stations1.length - 1], stations1[0]];
  const items = stations1.map((station) => ({
    station,
    disabled:
      station.index <= line0.findIndex((station) => station.name === "大宮") ||
      station.index >= line0.findIndex((station) => station.name === "盛岡"),
  }));

  return (
    <Accordion.Item eventKey={eventKey}>
      <Accordion.Header>
        <div className="d-flex justify-content-between flex-grow-1">
          <span className="flex-shrink-0">{train}号 利用区間</span>
          <Fade in={!isCurrentEventKey}>
            <span
              className="ms-2 me-2 overflow-hidden text-nowrap"
              style={{ textOverflow: "ellipsis" }}
            >
              <b>{highSpeedDeparture.name}</b>{" "}
              <i className="bi bi-arrow-right"></i>{" "}
              <b>{highSpeedArrival.name}</b>
            </span>
          </Fade>
        </div>
      </Accordion.Header>
      <Accordion.Body>
        <Row>
          <Col>
            <StationDropdown
              value={highSpeedDeparture}
              onChange={setDeparture}
              header="乗車駅"
              items={items.map(({ station, disabled }) => ({
                station,
                disabled:
                  station === arrival || (disabled && station !== departure),
                active: station === highSpeedDeparture,
              }))}
            />
          </Col>
          <Col xs="auto" className="align-self-center">
            <i className="bi bi-arrow-right"></i>
          </Col>
          <Col>
            <StationDropdown
              value={highSpeedArrival}
              onChange={setArrival}
              header="降車駅"
              items={items.map(({ station, disabled }) => ({
                station,
                disabled:
                  station === departure || (disabled && station !== arrival),
                active: station === highSpeedArrival,
              }))}
            />
          </Col>
        </Row>
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
  station.index <= line0.findIndex((station) => station.name === "大宮") ||
  station.index >= line0.findIndex((station) => station.name === "仙台");

const getLongestHighSpeedSection = (
  line: Line,
  [departure, arrival]: Section
): readonly [departure: Station, arrival: Station] | undefined => {
  const highSpeedAvailableStations = (
    departure.index < arrival.index
      ? line.slice(departure.index, arrival.index + 1)
      : line.slice(arrival.index, departure.index + 1)
  ).filter(isHighSpeedAvailableStation);

  const [highSpeedDeparture, highSpeedArrival] =
    departure.index < arrival.index
      ? [
          highSpeedAvailableStations.find(
            ({ index }) => index >= departure.index
          ),
          highSpeedAvailableStations
            .filter(({ index }) => index <= arrival.index)
            .slice(-1)[0],
        ]
      : [
          highSpeedAvailableStations
            .filter(({ index }) => index <= departure.index)
            .slice(-1)[0],
          highSpeedAvailableStations.find(
            ({ index }) => index >= arrival.index
          ),
        ];

  return highSpeedDeparture && highSpeedArrival
    ? [highSpeedDeparture, highSpeedArrival]
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
 * `stationB`は`stationA`より終点に近い駅である必要がある
 * @param line
 * @param stationA 起点方の駅
 * @param stationB 終点方の駅
 * @returns はやぶさ号やこまち号が利用可能な区間ならtrue
 */
const isHighSpeedAvailableSection = (
  line: Line,
  stationA: Station,
  stationB: Station
) =>
  (stationA.index <= line0.findIndex((station) => station.name === "大宮") &&
    stationB.index >= line0.findIndex((station) => station.name === "仙台")) ||
  (stationA.index < line0.findIndex((station) => station.name === "盛岡") &&
    stationB.index > line0.findIndex((station) => station.name === "仙台"));

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
      type: "setHighSpeed";
      payload: Section | undefined;
    }
>;

type Section = readonly [departure: Station, arrival: Station];

const reducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case "setLine": {
      const line = action.payload;
      const [departure, arrival] = state.section;
      const firstOfLine = line[0]!;
      const lastOfLine = line[line.length - 1]!;

      const section: Section = line.includes(departure)
        ? line.includes(arrival)
          ? [departure, arrival]
          : [departure, lastOfLine === departure ? firstOfLine : lastOfLine]
        : line.includes(arrival)
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

    case "setHighSpeed":
      return {
        ...state,
        highSpeedSection: action.payload,
      };
  }
};

const init = (): State => {
  const line = line0;
  const section = [line[0]!, line.slice(-1)[0]!] as const;
  const highSpeedSection = getLongestHighSpeedSection(line, section);
  return { line, section, highSpeedSection };
};

const App: React.VFC = () => {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  const { line, section, highSpeedSection } = state;
  const [departure, arrival] = section;

  const highSpeedAvailable =
    departure.index < arrival.index
      ? isHighSpeedAvailableSection(line, departure, arrival)
      : isHighSpeedAvailableSection(line, arrival, departure);

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
                  <option disabled>山形新幹線</option>
                  <option>上越新幹線</option>
                  <option>北陸新幹線</option>
                </Form.Select>
              </FloatingLabel>
            </Col>
          </Row>
          <Row className="mt-3">
            <Col>
              <StationDropdown
                value={departure}
                onChange={(station) =>
                  dispatch({ type: "setDeparture", payload: station })
                }
                header="出発駅"
                items={line.map((station) => ({
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
                items={line.map((station) => ({
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
              departure={departure}
              arrival={arrival}
              train="はやぶさ"
              highSpeedDeparture={highSpeedSection[0]}
              highSpeedArrival={highSpeedSection[1]}
              onDepartureChange={(station) =>
                dispatch({
                  type: "setHighSpeed",
                  payload: [station, highSpeedSection[1]],
                })
              }
              onArrivalChange={(station) =>
                dispatch({
                  type: "setHighSpeed",
                  payload: [highSpeedSection[0], station],
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
