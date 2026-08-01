import { describe, expect, it } from "vitest";
import { legacy2022Engine, type SortedSection } from "../App";
import { createQuote } from "./App";

const section = (departureName: string, arrivalName: string): SortedSection => ({
  departure: legacy2022Engine.line0.find(({ name }) => name === departureName)!,
  arrival: legacy2022Engine.line0.find(({ name }) => name === arrivalName)!,
  sorted: true,
});

describe("ordinary-seat comparisons", () => {
  it("keeps the non-reserved benchmark for an adjacent-station trip", () => {
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line: legacy2022Engine.line0,
      section: section("宇都宮", "那須塩原"),
      season: legacy2022Engine.average,
    });

    expect(quote.points).toBe(2_000);
    expect(quote.nonReservedFare).toBe(1_790);
    expect(quote.paperFare).toBe(3_310);
  });

  it("does not add an ordinary non-reserved benchmark to a Green-car product", () => {
    const trip = section("宇都宮", "那須塩原");
    const quote = createQuote({
      version: "2026-03-14",
      campaign: "regular",
      line: legacy2022Engine.line0,
      section: trip,
      green: { start: trip.departure.index, end: trip.arrival.index },
      season: legacy2022Engine.average,
    });

    expect(quote.facility).toBe("green");
    expect(quote.nonReservedFare).toBeUndefined();
  });
});
