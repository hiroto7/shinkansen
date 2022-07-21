import { Table } from "react-bootstrap";

const kilometerFormatter = new Intl.NumberFormat(undefined, {
  style: "unit",
  unit: "kilometer",
});

const Others: React.FC = () => (
  <main>
    <h1>在来線特急</h1>
    <Table bordered>
      <thead>
        <tr>
          <th>営業キロ</th>
          <th>交換ポイント</th>
        </tr>
      </thead>
      <tbody>
        {(
          [
            [[0, 50], 460],
            [[51, 100], 720],
            [[101, 200], 1280],
            [[201, undefined], 1940],
          ] as const
        ).map(([[lower, upper], points]) => (
          <tr key={`${lower}-${upper}`}>
            <td>
              {kilometerFormatter.format(lower)} -{" "}
              {upper && kilometerFormatter.format(upper)}
            </td>
            <td>{points.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  </main>
);

export default Others;
