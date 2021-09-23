import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";
import parse from "csv-parse/lib/sync";
import _ from "lodash";
import React, { useCallback, useState } from "react";
import {
  Badge,
  Card,
  Col,
  Container,
  Dropdown,
  DropdownButton,
  FloatingLabel,
  Form,
  Navbar,
  Row,
  Table,
} from "react-bootstrap";
import "./App.css";

interface Station {
  readonly name: string;
  readonly distance: number;
}

// (\d+(?:\.\d)?)\t(.+)
const line0: readonly Station[] = [
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
];

const line1: readonly Station[] = [
  ...line0.slice(
    line0.findIndex((station) => station.name === "東京"),
    line0.findIndex((station) => station.name === "大宮") + 1
  ),
  { name: "熊谷", distance: 64.7 },
  { name: "本庄早稲田", distance: 86 },
  { name: "高崎", distance: 105 },
  { name: "上毛高原", distance: 151.6 },
  { name: "越後湯沢", distance: 199.2 },
  { name: "浦佐", distance: 228.9 },
  { name: "長岡", distance: 270.6 },
  { name: "燕三条", distance: 293.8 },
  { name: "新潟", distance: 333.9 },
];

const line2: readonly Station[] = [
  ...line0.slice(
    line0.findIndex((station) => station.name === "東京"),
    line0.findIndex((station) => station.name === "大宮") + 1
  ),
  ...line1.slice(
    line1.findIndex((station) => station.name === "熊谷"),
    line1.findIndex((station) => station.name === "高崎") + 1
  ),
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
];

const lines: ReadonlyMap<string, readonly Station[]> = new Map([
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

// 幹線
// 1-3: 150, 4-6: 190, 7-10: 200
const getFare0 = (distance: number) => {
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

// 東京附近における電車特定区間
// 1-3: 140, 4-6: 160, 7-10: 170
const getFare1 = (distance: number) => {
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
  line: readonly Station[];
  departure: Station;
  arrival: Station;
}> = ({ line, departure, arrival }) => {
  const departureIndex = line.findIndex((station) => station === departure);
  const arrivalIndex = line.findIndex((station) => station === arrival);

  const [stationA, stationB, stationAIndex, stationBIndex] =
    departureIndex < arrivalIndex
      ? [departure, arrival, departureIndex, arrivalIndex]
      : [arrival, departure, arrivalIndex, departureIndex];

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
    line === line0 ? tables[0] : line === line1 ? tables[1] : tables[2]
  ).find((row: any) => row["駅名"] === stationB.name)[stationA.name];

  const nonReservedAvailable =
    line !== line0 ||
    stationBIndex <= line.findIndex((station) => station.name === "盛岡");

  const standingOnlyAvailable =
    line === line0 &&
    stationAIndex >= line.findIndex((station) => station.name === "盛岡");

  const lowExpressFare =
    stationA.name === "東京" && stationB.name === "大宮"
      ? 1090
      : stationBIndex - stationAIndex === 1 ||
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

  const ths = (
    <>
      {nonReservedAvailable ? <th scope="col">自由席</th> : <></>}
      {standingOnlyAvailable ? <th scope="col">立席</th> : <></>}
      <th scope="col">指定席</th>
    </>
  );

  const fare =
    stationBIndex <= line.findIndex((station) => station.name === "大宮")
      ? getFare1(distance)
      : getFare0(distance);

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
        <thead>
          <tr>
            <td></td>
            {ths}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">運賃</th>
            <td colSpan={nonReservedAvailable || standingOnlyAvailable ? 2 : 1}>
              {fare}円
            </td>
          </tr>
          <tr>
            <th scope="row">特急料金</th>
            {nonReservedAvailable || standingOnlyAvailable ? (
              <td>
                {nonReservedOrStandingOnlyFare}円{" "}
                {lowExpressFare !== undefined ? (
                  <Badge>特定</Badge>
                ) : standingOnlyAvailable ? (
                  <Badge bg="secondary">特定</Badge>
                ) : (
                  <></>
                )}
              </td>
            ) : (
              <></>
            )}
            <td>{reservedExpressFare}円</td>
          </tr>
          <tr>
            <th scope="row">割引</th>
            {nonReservedAvailable || standingOnlyAvailable ? <td>-</td> : <></>}
            <td>-200円</td>
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
          </tr>
        </tfoot>
      </Table>
      <h5>JRE POINTのレート</h5>
      <Table striped bordered>
        <thead>
          <tr>{ths}</tr>
        </thead>
        <tbody>
          <tr>
            {nonReservedAvailable || standingOnlyAvailable ? (
              <td>
                {((nonReservedOrStandingOnlyFare + fare) / points).toFixed(2)}
                円/ポイント
              </td>
            ) : (
              <></>
            )}
            <td>
              {((reservedExpressFare + fare - 200) / points).toFixed(2)}
              円/ポイント
            </td>
          </tr>
        </tbody>
      </Table>
    </>
  );
};

const App: React.VFC = () => {
  const [line, setLine] = useState<readonly Station[]>(line0);
  const [departure, setDeparture] = useState<Station>();
  const [arrival, setArrival] = useState<Station>();

  const handleLineChange = useCallback(
    (line: readonly Station[]) => {
      if (departure && !line.includes(departure)) {
        setDeparture(undefined);
      }
      if (arrival && !line.includes(arrival)) {
        setArrival(undefined);
      }
      setLine(line);
    },
    [departure, arrival]
  );

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
          <Container fluid>
            <Row>
              <Col>
                <FloatingLabel controlId="floatingSelect" label="路線">
                  <Form.Select
                    aria-label="Floating label select example"
                    onChange={(e) =>
                      handleLineChange(lines.get(e.currentTarget.value)!)
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
                  onChange={setDeparture}
                  header="出発駅"
                  items={line?.map((station) => ({
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
                  onChange={setArrival}
                  header="到着駅"
                  items={line.map((station) => ({
                    station,
                    disabled: station === departure,
                    active: station === arrival,
                  }))}
                />
              </Col>
            </Row>
          </Container>
        </Card>
        {departure && arrival && (
          <C2 line={line} departure={departure} arrival={arrival} />
        )}
      </Container>
    </>
  );
};

export default App;
