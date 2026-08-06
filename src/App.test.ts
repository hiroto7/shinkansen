import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("区間入力画面", () => {
  it("通常表示では乗車駅と降車駅だけを表示する", () => {
    const html = renderToStaticMarkup(createElement(App));

    expect(html).toContain('class="journey-fields"');
    expect(html).not.toContain("データ年版");
    expect(html).not.toContain("新幹線YEARスペシャル");
    expect(html).toContain("全線35%特別レート");
    expect(html).toContain("最繁忙期");
    expect(html).toContain("乗車駅");
    expect(html).toContain("降車駅");
    expect(html).toContain("JRE POINT特典チケットのレート計算");
    expect(html).not.toContain("表示件数");
    expect(html).toContain("位");
    expect(html).not.toContain("はやぶさ・こまち利用区間 始点");
    expect(html).not.toContain("グリーン車を利用する区間 始点");
  });
});
