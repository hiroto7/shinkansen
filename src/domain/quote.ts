import {
  distanceBetween,
  routes,
  type Line,
  type SortedSection,
} from "./routes";
import type { Season } from "./seasons";
import { calculator2022 } from "./versions/2022";
import type { DataVersion, Facility, Interval, JourneySelection } from "./types";
import { highestFacility } from "./types";
import { calculator2026 } from "./versions/2026";

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

const getCurrentBasicFare = (
  line: Line,
  section: SortedSection,
): number => {
  const distanceKm = distanceBetween(section.departure, section.arrival);
  if (line !== routes.akitaLine) {
    return calculator2026.getBasicFare(distanceKm);
  }

  const morioka = line.find(({ name }) => name === "盛岡")!;
  const omagari = line.find(({ name }) => name === "大曲")!;
  if (
    morioka.index <= section.departure.index &&
    section.arrival.index <= omagari.index
  ) {
    return calculator2026.getBasicFare(distanceKm, distanceKm);
  }

  const localStart =
    section.departure.index < morioka.index ? morioka : section.departure;
  const localEnd = section.arrival.index > omagari.index ? omagari : section.arrival;
  const localKm =
    localStart.index < localEnd.index ? distanceBetween(localStart, localEnd) : 0;
  return calculator2026.getBasicFare(distanceKm, localKm);
};
const fareTickets = (fare: {
  readonly expressTickets: readonly { readonly fare: number }[];
}) =>
  fare.expressTickets;

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
  readonly points?: number | undefined;
  readonly paperFare?: number | undefined;
  readonly nonReservedFare?: number | undefined;
  readonly basicFare?: number | undefined;
  readonly expressFare?: number | undefined;
  readonly specialVehicleFare?: number | undefined;
  readonly facility: Facility;
  readonly exclusionReason?: ExclusionReason | undefined;
}

const requestedFacility = (journey: JourneySelection): Facility =>
  journey.granClassWithRefreshments
    ? "granClassWithRefreshments"
    : journey.granClass
      ? "granClassNoRefreshments"
      : journey.green
        ? "green"
        : "ordinary";

export const createQuote = ({
  version,
  campaign,
  line,
  section,
  highSpeed,
  green,
  granClass,
  granClassWithRefreshments,
  season,
}: QuoteInput): Quote => {
  const distanceKm = distanceBetween(section.departure, section.arrival);
  const journey: JourneySelection = {
    origin: section.departure.index,
    destination: section.arrival.index,
    ...(highSpeed
      ? { highSpeed: { start: highSpeed.departure.index, end: highSpeed.arrival.index } }
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

  const fareData = calculator2022.getFares({
    line,
    section,
    highSpeed,
    season,
    getPoints: (distance) => calculator2022.getPoints(distance),
  });
  const selectedFare = highSpeed
    ? (fareData.reservedHighSpeed ?? fareData.reserved)
    : fareData.reserved;

  if (version === "2022-03-12") {
    if (facility !== "ordinary") {
      return {
        distanceKm,
        facility,
        exclusionReason: "historicalFacility",
      };
    }
    const points = calculator2022.getPoints(
      distanceKm,
      campaign === "shinkansenYear" ? "shinkansenYear" : "regular",
    );
    const cheapestFare = selectedFare.total;
    const paperFare = cheapestFare - (selectedFare.discount ?? 0);
    const nonReservedFare = fareData.nonReservedOrStandingOnly
      ? fareData.nonReservedOrStandingOnly.total -
        (fareData.nonReservedOrStandingOnly.discount ?? 0)
      : undefined;
    return {
      distanceKm,
      facility,
      points,
      paperFare,
      ...(nonReservedFare !== undefined ? { nonReservedFare } : {}),
      basicFare: selectedFare.basicFare,
      expressFare: fareTickets(selectedFare).reduce(
        (total, ticket) => total + ticket.fare,
        0,
      ),
      specialVehicleFare: 0,
    };
  }

  const points =
    campaign === "shinshuPreDc"
      ? calculator2026.getShinshuPreDcPoints(
          section.departure.name,
          section.arrival.name,
          facility,
        )
      : calculator2026.getJourneyPoints(
          distanceKm,
          journey,
          campaign === "limited35Percent" ? "limited35Percent" : "regular",
        );
  if (points === undefined) {
    return {
      distanceKm,
      facility,
      exclusionReason:
        campaign === "shinshuPreDc"
          ? "shinshuPreDc"
          : "limitedFacility",
    };
  }
  const basicFare = getCurrentBasicFare(line, section);
  const expressFare = calculator2026.getExpressFare(
    fareTickets(selectedFare),
    green !== undefined,
  );
  const intervalDistance = (interval: Interval) => {
    const start = line[interval.start];
    const end = line[interval.end];
    if (!start || !end) return undefined;
    const distanceKm = distanceBetween(start, end);
    return distanceKm > 0 ? distanceKm : undefined;
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
  const specialVehicleFare = greenKm
    ? calculator2026.getSpecialVehicleFare({
        greenKm,
        ...(granClassKm !== undefined ? { granClassKm } : {}),
        ...(granClassWithRefreshmentsKm !== undefined
          ? { granClassWithRefreshmentsKm }
          : {}),
      })
    : 0;
  const paperFare = basicFare + expressFare + specialVehicleFare;
  const nonReservedFare =
    facility === "ordinary" && fareData.nonReservedOrStandingOnly
      ? basicFare +
        calculator2026.getExpressFare(
          fareTickets(fareData.nonReservedOrStandingOnly),
          false,
        )
      : undefined;

  return {
    distanceKm,
    facility,
    points,
    paperFare,
    ...(nonReservedFare !== undefined ? { nonReservedFare } : {}),
    basicFare,
    expressFare,
    specialVehicleFare,
  };
};
