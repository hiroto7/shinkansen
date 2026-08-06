export const average = "通常期";
export const busy = "繁忙期";
export const busiest = "最繁忙期";
export const off = "閑散期";

export const seasons = [off, average, busy, busiest] as const;

export type Season = (typeof seasons)[number];
