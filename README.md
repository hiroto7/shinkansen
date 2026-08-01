# JRE POINT特典チケットのレート計算

JRE POINT特典チケットの交換ポイントを、JR東日本の新幹線の所定額と比較するWebアプリです。

> [!WARNING]
> 現在公開している計算データは2022年時点のものです。現行の運賃・制度とは異なります。

## 開発

Node.js 24以降を使用します。

```sh
npm install
npm run dev
```

## 検証

```sh
npm run typecheck
npm test
npm run build
```

## 計算データの方針

- 運賃・料金は旅客営業規則とJR東日本の公式運賃表だけから実装します。
- 乗換案内サイトなどが表示する金額を、計算ロジックやデータとして取り込みません。
- `2022-03-12` と `2026-03-14` を別の年版として保持します。
- HS・G・GCの利用区間はそれぞれ連続した1区間だけを扱います。
- GCは特別車両（G）の一種として、G区間の内側だけで指定できます。

2026年版の一次資料は、[JR東日本の運賃改定案内](https://www.jreast.co.jp/2026unchin-kaitei/)、[旅客営業規則](https://www.jreast.co.jp/ryokaku/)、[えきねっとの商品ページ](https://www.eki-net.com/top/product/shinkansen/e-tokuten.html)です。
