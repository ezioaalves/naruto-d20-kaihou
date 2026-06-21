export const BLOCKS = Object.freeze(["sunrise", "midday", "sunset"]);

export function makeBlockId(calendarId, date, block) {
  return `${calendarId}:${date.year}-${date.month}-${date.day}:${block}`;
}

/** Suggest the current action block from the hour and Calendaria sun times. */
export function suggestBlock(hour, sunTimes) {
  const { midday, sunset } = sunTimes;
  if (hour < midday) return "sunrise";
  if (hour < sunset) return "midday";
  return "sunset";
}
