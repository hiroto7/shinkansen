import { getBasicFareForSection, type BasicFareRules } from "./basic-fares";
import {
  calculateFareOptions,
  type SeasonRules,
  type StationExpressFareRules,
} from "./fare-calculation";
import { distanceBetween, type Line, type SortedSection } from "./routes";
import type { Season } from "./seasons";
import type {
  DataVersion,
  Facility,
  Interval,
  JourneySelection,
} from "./types";
import { highestFacility } from "./types";
import { version2022 } from "./versions/2022";
import { version2026 } from "./versions/2026";

export type Campaign =
  | "regular"
  | "shinkansenYear"
  | "limited35Percent"
  | "shinshuPreDc";

export type ExclusionReason =
  | "historicalFacility"
  | "limitedFacility"
  | "shinshuPreDc"
  | "invalidJourney";

export interface FareBreakdown {
  readonly basicFare: number;
  readonly expressFare: number;
  readonly specialVehicleFare: number;
  readonly total: number;
}

export interface FacilityDistances {
  /** 最初にグリーン車以上へ乗ってから最後に降りるまで */
  readonly greenKm: number;
  /** greenKmに内包されるグランクラス区間 */
  readonly granClassKm?: number;
  /** 指定時はグランクラス(A)。A/B混在時も第130条第2項によりAとして計算 */
  readonly granClassWithRefreshmentsKm?: number;
}

interface PointInput {
  readonly distanceKm: number;
  readonly facility: Facility;
  readonly campaign: Campaign;
  readonly departure: string;
  readonly arrival: string;
}

export interface VersionDefinition {
  readonly metadata: {
    readonly id: DataVersion;
    readonly label: string;
    readonly sources: Readonly<Record<string, string>>;
    readonly note?: string;
  };
  readonly seasonRules: SeasonRules;
  readonly expressFareRules: StationExpressFareRules;
  readonly basicFareRules: BasicFareRules;
  readonly supportsFacility: (facility: Facility) => boolean;
  readonly getPoints: (input: PointInput) => number | undefined;
  readonly pointExclusionReason: (campaign: Campaign) => ExclusionReason;
  readonly specialVehicle?: {
    readonly expressReduction: number;
    readonly getFare: (distances: FacilityDistances) => number;
  };
}

interface QuoteInput {
  readonly version: DataVersion;
  readonly campaign: Campaign;
  readonly line: Line;
  readonly section: SortedSection;
  readonly highSpeed?: SortedSection;
  readonly green?: Interval;
  readonly granClass?: Interval;
  readonly granClassWithRefreshments?: Interval;
  readonly season: Season;
}

interface Quote {
  readonly distanceKm: number;
  readonly points?: number;
  readonly paperFare?: number;
  readonly nonReservedFare?: number;
  readonly basicFare?: number;
  readonly expressFare?: number;
  readonly specialVehicleFare?: number;
  readonly selectedFareBreakdown?: FareBreakdown;
  readonly nonReservedFareBreakdown?: FareBreakdown;
  readonly facility: Facility;
  readonly exclusionReason?: ExclusionReason;
}

const versions: Readonly<Record<DataVersion, VersionDefinition>> = {
  "2022-03-12": version2022,
  "2026-03-14": version2026,
};

export const supportedSeasonsForVersion = (version: DataVersion) =>
  versions[version].seasonRules.supportedSeasons;

const fareBreakdown = (
  basicFare: number,
  expressFare: number,
  specialVehicleFare = 0,
): FareBreakdown => ({
  basicFare,
  expressFare,
  specialVehicleFare,
  total: basicFare + expressFare + specialVehicleFare,
});

const requestedFacility = (journey: JourneySelection): Facility =>
  journey.granClassWithRefreshments
    ? "granClassWithRefreshments"
    : journey.granClass
      ? "granClassNoRefreshments"
      : journey.green
        ? "green"
        : "ordinary";

const ticketFare = (tickets: readonly { readonly fare: number }[]) =>
  tickets.reduce((total, ticket) => total + ticket.fare, 0);

export const createQuote = ({ version: id, ...input }: QuoteInput): Quote => {
  const version = versions[id];
  const {
    line,
    section,
    highSpeed,
    green,
    granClass,
    granClassWithRefreshments,
  } = input;
  const distanceKm = distanceBetween(section.departure, section.arrival);
  const journey: JourneySelection = {
    origin: section.departure.index,
    destination: section.arrival.index,
    ...(highSpeed
      ? {
          highSpeed: {
            start: highSpeed.departure.index,
            end: highSpeed.arrival.index,
          },
        }
      : {}),
    ...(green ? { green } : {}),
    ...(granClass ? { granClass } : {}),
    ...(granClassWithRefreshments ? { granClassWithRefreshments } : {}),
  };

  let facility: Facility;
  try {
    facility = highestFacility(journey);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return {
      distanceKm,
      facility: requestedFacility(journey),
      exclusionReason: "invalidJourney",
    };
  }
  if (!version.supportsFacility(facility)) {
    return { distanceKm, facility, exclusionReason: "historicalFacility" };
  }

  const points = version.getPoints({
    distanceKm,
    facility,
    campaign: input.campaign,
    departure: section.departure.name,
    arrival: section.arrival.name,
  });
  if (points === undefined) {
    return {
      distanceKm,
      facility,
      exclusionReason: version.pointExclusionReason(input.campaign),
    };
  }

  const fares = calculateFareOptions({
    line,
    section,
    highSpeed,
    season: input.season,
    seasonRules: version.seasonRules,
    stationExpressFareRules: version.expressFareRules,
    getBasicFare: (fareLine, fareSection) =>
      getBasicFareForSection(version.basicFareRules, fareLine, fareSection),
  });
  const selected = highSpeed
    ? (fares.reservedHighSpeed ?? fares.reserved)
    : fares.reserved;
  const expressFare =
    ticketFare(selected.expressTickets) -
    (facility !== "ordinary"
      ? (version.specialVehicle?.expressReduction ?? 0)
      : 0);

  const intervalDistance = (interval: Interval) => {
    const start = line[interval.start];
    const end = line[interval.end];
    if (!start || !end) return undefined;
    const km = distanceBetween(start, end);
    return km > 0 ? km : undefined;
  };
  const greenKm = green ? intervalDistance(green) : undefined;
  const granClassKm = granClass ? intervalDistance(granClass) : undefined;
  const granClassWithRefreshmentsKm = granClassWithRefreshments
    ? intervalDistance(granClassWithRefreshments)
    : undefined;
  if (
    (green && greenKm === undefined) ||
    (granClass && granClassKm === undefined) ||
    (granClassWithRefreshments && granClassWithRefreshmentsKm === undefined)
  ) {
    return { distanceKm, facility, exclusionReason: "invalidJourney" };
  }

  const specialVehicleFare =
    greenKm && version.specialVehicle
      ? version.specialVehicle.getFare({
          greenKm,
          ...(granClassKm !== undefined ? { granClassKm } : {}),
          ...(granClassWithRefreshmentsKm !== undefined
            ? { granClassWithRefreshmentsKm }
            : {}),
        })
      : 0;
  const selectedFareBreakdown = fareBreakdown(
    selected.basicFare,
    expressFare,
    specialVehicleFare,
  );
  const nonReserved =
    facility === "ordinary" ? fares.nonReservedOrStandingOnly : undefined;
  const nonReservedFareBreakdown = nonReserved
    ? fareBreakdown(
        nonReserved.basicFare,
        ticketFare(nonReserved.expressTickets),
      )
    : undefined;

  return {
    distanceKm,
    facility,
    points,
    paperFare: selectedFareBreakdown.total,
    ...(nonReservedFareBreakdown
      ? { nonReservedFare: nonReservedFareBreakdown.total }
      : {}),
    basicFare: selected.basicFare,
    expressFare,
    specialVehicleFare,
    selectedFareBreakdown,
    ...(nonReservedFareBreakdown ? { nonReservedFareBreakdown } : {}),
  };
};
