export type Facility =
  | "ordinary"
  | "green"
  | "granClassNoRefreshments"
  | "granClassWithRefreshments";

export interface DistanceBand<T> {
  readonly maxKm: number | null;
  readonly value: T;
}

export interface Interval {
  readonly start: number;
  readonly end: number;
}

export interface JourneySelection {
  readonly origin: number;
  readonly destination: number;
  /** はやぶさ・こまち等の加算対象となる、連続した1区間 */
  readonly highSpeed?: Interval;
  /** グリーン車以上を使用する、連続した1区間 */
  readonly green?: Interval;
  /** グリーン区間に内包される、連続したグランクラス区間 */
  readonly granClass?: Interval;
  /** グランクラス(A)を一部でも利用するか */
  readonly includesGranClassA?: boolean;
}

export const valueForDistance = <T>(
  distanceKm: number,
  bands: readonly DistanceBand<T>[],
): T => {
  if (!(distanceKm > 0)) {
    throw new RangeError("乗車距離は0kmより大きい必要があります");
  }

  const band = bands.find(
    ({ maxKm }) => maxKm === null || distanceKm <= maxKm,
  );
  if (!band) {
    throw new RangeError(`${distanceKm}kmに対応する距離帯がありません`);
  }
  return band.value;
};

const contains = (outer: Interval, inner: Interval) =>
  outer.start <= inner.start && inner.end <= outer.end;

const assertInterval = (name: string, interval: Interval, trip: Interval) => {
  if (!(interval.start < interval.end)) {
    throw new RangeError(`${name}は始点より終点が後である必要があります`);
  }
  if (!contains(trip, interval)) {
    throw new RangeError(`${name}は全乗車区間に含まれる必要があります`);
  }
};

/**
 * 入力欄を各1個に制限し、各設備の利用区間を1つの連続区間とする。
 * グランクラスは特別車両なので、必ずグリーン車以上の利用区間に内包する。
 */
export const validateJourneySelection = (journey: JourneySelection): void => {
  const trip = { start: journey.origin, end: journey.destination };
  if (!(trip.start < trip.end)) {
    throw new RangeError("乗車区間は始点より終点が後である必要があります");
  }

  if (journey.highSpeed) {
    assertInterval("はやぶさ・こまち利用区間", journey.highSpeed, trip);
  }
  if (journey.green) {
    assertInterval("グリーン車以上の利用区間", journey.green, trip);
  }
  if (journey.granClass) {
    assertInterval("グランクラス利用区間", journey.granClass, trip);
    if (!journey.green || !contains(journey.green, journey.granClass)) {
      throw new RangeError("グランクラス利用区間はグリーン車以上の利用区間に含まれる必要があります");
    }
  }
  if (journey.includesGranClassA && !journey.granClass) {
    throw new RangeError(
      "グランクラス(A)を利用する場合はグランクラス利用区間が必要です",
    );
  }
};

export const highestFacility = (journey: JourneySelection): Facility => {
  validateJourneySelection(journey);
  return journey.includesGranClassA
    ? "granClassWithRefreshments"
    : journey.granClass
      ? "granClassNoRefreshments"
      : journey.green
        ? "green"
        : "ordinary";
};
