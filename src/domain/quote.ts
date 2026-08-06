import {
  getCurrentPoints,
  getSpecialVehicleFare,
  specialVehicleExpressReduction,
  type Campaign,
} from "./current-rules";
import { calculateFareOptions } from "./fare-calculation";
import { distanceBetween, type Line, type SortedSection } from "./routes";
import type { Season } from "./seasons";
import type { Facility, Interval, JourneySelection } from "./types";
import { highestFacility } from "./types";
export type { Campaign } from "./current-rules";

export type ExclusionReason =
  | "limitedFacility"
  | "shinshuPreDc"
  | "invalidJourney";

export interface FareBreakdown {
  readonly basicFare: number;
  readonly expressFare: number;
  readonly specialVehicleFare: number;
  readonly total: number;
}

interface QuoteInput {
  readonly campaign: Campaign;
  readonly line: Line;
  readonly section: SortedSection;
  readonly highSpeed?: SortedSection;
  readonly green?: Interval;
  readonly granClass?: Interval;
  readonly includesGranClassA?: boolean;
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
  journey.includesGranClassA
    ? "granClassWithRefreshments"
    : journey.granClass
      ? "granClassNoRefreshments"
      : journey.green
        ? "green"
        : "ordinary";

const ticketFare = (tickets: readonly { readonly fare: number }[]) =>
  tickets.reduce((total, ticket) => total + ticket.fare, 0);

export const createQuote = (input: QuoteInput): Quote => {
  const {
    line,
    section,
    highSpeed,
    green,
    granClass,
    includesGranClassA,
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
    ...(includesGranClassA ? { includesGranClassA: true } : {}),
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
  const points = getCurrentPoints({
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
      exclusionReason:
        input.campaign === "shinshuPreDc"
          ? "shinshuPreDc"
          : "limitedFacility",
    };
  }

  let fares: ReturnType<typeof calculateFareOptions>;
  try {
    fares = calculateFareOptions({
      line,
      section,
      highSpeed,
      season: input.season,
    });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return { distanceKm, facility, exclusionReason: "invalidJourney" };
  }
  const selected = highSpeed ? fares.reservedHighSpeed : fares.reserved;
  if (selected === undefined) {
    return { distanceKm, facility, exclusionReason: "invalidJourney" };
  }
  const expressFare =
    ticketFare(selected.expressTickets) -
    (facility !== "ordinary" ? specialVehicleExpressReduction : 0);

  const intervalDistance = (interval: Interval) => {
    const start = line[interval.start];
    const end = line[interval.end];
    if (!start || !end) return undefined;
    const km = distanceBetween(start, end);
    return km > 0 ? km : undefined;
  };
  const greenKm = green ? intervalDistance(green) : undefined;
  const granClassKm = granClass ? intervalDistance(granClass) : undefined;
  if (
    (green && greenKm === undefined) ||
    (granClass && granClassKm === undefined)
  ) {
    return { distanceKm, facility, exclusionReason: "invalidJourney" };
  }

  const specialVehicleFare = greenKm
    ? getSpecialVehicleFare({
        greenKm,
        ...(granClassKm !== undefined ? { granClassKm } : {}),
        ...(includesGranClassA ? { includesGranClassA: true } : {}),
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
