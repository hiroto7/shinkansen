import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

jest.mock(
  "csv-parse/browser/esm/sync",
  () =>
    jest.requireActual("../node_modules/csv-parse/dist/cjs/sync.cjs"),
  { virtual: true }
);

test.each(["/", "/ranking"])(
  "%s で更新終了の注意事項と公式情報へのリンクを表示する",
  (initialEntry) => {
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    );

    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "このサイトは更新を終了しています",
      })
    ).toBeInTheDocument();
    expect(alert).toHaveTextContent("2022年3月12日改正時点");
    expect(alert).toHaveTextContent("現行の運賃・制度とは異なります");
    expect(
      within(alert).getByRole("link", { name: "JRE POINT特典" })
    ).toHaveAttribute(
      "href",
      "https://www.jreast.co.jp/tokuten_ticket/"
    );
    expect(
      within(alert).getByRole("link", { name: "旅客営業規則" })
    ).toHaveAttribute("href", "https://www.jreast.co.jp/ryokaku/");
  }
);
