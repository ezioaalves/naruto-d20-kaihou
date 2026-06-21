export const DEFAULT_SUN_TIMES = Object.freeze({ sunrise: 6, midday: 12, sunset: 18 });

export function readClock(api) {
  if (!api || typeof api.getCurrentDateTime !== "function") return null;
  const dt = api.getCurrentDateTime();
  const calendarId = api.getActiveCalendar?.()?.id ?? "calendaria";
  return {
    calendarId,
    date: { year: dt.year, month: dt.month, day: dt.day, label: dt.label ?? "" },
    hour: dt.hour,
  };
}

export function sunTimesFor(api) {
  const t = api?.getSunTimes?.();
  if (!t) return { ...DEFAULT_SUN_TIMES };
  return { sunrise: t.sunrise, midday: t.midday, sunset: t.sunset };
}
