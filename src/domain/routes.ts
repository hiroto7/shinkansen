export interface Section {
  readonly departure: Station;
  readonly arrival: Station;
}

export interface SortedSection extends Section {
  readonly sorted: true;
}

export interface Station {
  readonly index: number;
  readonly name: string;
  /** 起点からの営業キロ */
  readonly distance: number;
}

export type Line = readonly Station[];

export interface LineGroup {
  readonly name: string;
  readonly lines: readonly Line[];
}

/** 東北新幹線 */
export const tohokuLine: Line = [
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
export const akitaLine: Line = [
  ...tohokuLine.slice(0, tohokuLine.findIndex(({ name }) => name === "盛岡") + 1),
  ...[
    { name: "雫石", distance: 551.3 },
    { name: "田沢湖", distance: 575.4 },
    { name: "角館", distance: 594.1 },
    { name: "大曲", distance: 610.9 },
    { name: "秋田", distance: 662.6 },
  ].map((value, index) => ({
    ...value,
    index: index + tohokuLine.findIndex(({ name }) => name === "盛岡") + 1,
  })),
];

/** 山形新幹線 */
export const yamagataLine: Line = [
  ...tohokuLine.slice(0, tohokuLine.findIndex(({ name }) => name === "福島") + 1),
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
    index: index + tohokuLine.findIndex(({ name }) => name === "福島") + 1,
  })),
];

/** 上越新幹線（新潟方面） */
export const joetsuLine: Line = [
  ...tohokuLine.slice(0, tohokuLine.findIndex(({ name }) => name === "大宮") + 1),
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
    index: index + tohokuLine.findIndex(({ name }) => name === "大宮") + 1,
  })),
];

/** 上越新幹線（ガーラ湯沢方面） */
export const galaYuzawaLine: Line = [
  ...joetsuLine.slice(0, joetsuLine.findIndex(({ name }) => name === "越後湯沢") + 1),
  {
    name: "ガーラ湯沢",
    distance: 201,
    index: joetsuLine.findIndex(({ name }) => name === "越後湯沢") + 1,
  },
];

/** 北陸新幹線 */
export const hokurikuLine: Line = [
  ...tohokuLine.slice(0, tohokuLine.findIndex(({ name }) => name === "大宮") + 1),
  ...joetsuLine.slice(
    joetsuLine.findIndex(({ name }) => name === "熊谷"),
    joetsuLine.findIndex(({ name }) => name === "高崎") + 1,
  ),
  ...[
    { name: "安中榛名", distance: 123.5 },
    { name: "軽井沢", distance: 146.8 },
    { name: "佐久平", distance: 164.4 },
    { name: "上田", distance: 189.2 },
    { name: "長野", distance: 222.4 },
    { name: "飯山", distance: 252.3 },
    { name: "上越妙高", distance: 281.9 },
  ].map((value, index) => ({
    ...value,
    index: index + joetsuLine.findIndex(({ name }) => name === "高崎") + 1,
  })),
];

export const lineGroups: ReadonlyMap<string, LineGroup> = new Map(
  [
    { name: "東北新幹線", lines: [tohokuLine] },
    { name: "秋田新幹線", lines: [akitaLine] },
    { name: "山形新幹線", lines: [yamagataLine] },
    { name: "上越新幹線", lines: [joetsuLine, galaYuzawaLine] },
    { name: "北陸新幹線", lines: [hokurikuLine] },
  ].map((group) => [group.name, group]),
);

export const distanceBetween = (a: Station, b: Station) =>
  Math.round(Math.abs(b.distance - a.distance) * 10) / 10;

export const sectionDistance = (section: Section | SortedSection) =>
  distanceBetween(section.departure, section.arrival);

export const isSameSection = (a: Section, b: Section) =>
  a.departure === b.departure && a.arrival === b.arrival;

export const sortSection = (
  section: Section,
): Readonly<{ section: SortedSection; reversed: boolean }> =>
  section.departure.index < section.arrival.index
    ? { section: { ...section, sorted: true }, reversed: false }
    : {
        section: {
          departure: section.arrival,
          arrival: section.departure,
          sorted: true,
        },
        reversed: true,
      };

export const routes = {
  lineGroups,
  tohokuLine,
  akitaLine,
  yamagataLine,
  joetsuLine,
  galaYuzawaLine,
  hokurikuLine,
  sectionDistance,
  sortSection,
} as const;
