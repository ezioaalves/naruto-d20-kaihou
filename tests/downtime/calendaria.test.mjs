import { describe, it, expect } from "vitest";
import { readClock, sunTimesFor, DEFAULT_SUN_TIMES } from "../../scripts/downtime/calendaria.mjs";

describe("readClock", () => {
  it("returns null without a usable api", () => {
    expect(readClock(null)).toBeNull();
    expect(readClock({})).toBeNull();
  });
  it("maps Calendaria date/time", () => {
    const api = {
      getActiveCalendar: () => ({ id: "greg" }),
      getCurrentDateTime: () => ({ year: 1024, month: 3, day: 7, hour: 14, label: "Day 7" }),
    };
    expect(readClock(api)).toEqual({
      calendarId: "greg",
      date: { year: 1024, month: 3, day: 7, label: "Day 7" },
      hour: 14,
    });
  });
});

describe("sunTimesFor", () => {
  it("falls back to defaults", () => {
    expect(sunTimesFor({})).toEqual(DEFAULT_SUN_TIMES);
  });
  it("uses api sun times when present", () => {
    const api = { getSunTimes: () => ({ sunrise: 5, midday: 13, sunset: 19 }) };
    expect(sunTimesFor(api)).toEqual({ sunrise: 5, midday: 13, sunset: 19 });
  });
});
