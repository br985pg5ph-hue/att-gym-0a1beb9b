const AMMAN_TZ = "Asia/Amman";

const ammanFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: AMMAN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function parseParts(parts: Intl.DateTimeFormatPart[]) {
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** Current wall-clock time in Amman as a Date whose local getters reflect Amman time. */
export function ammanNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: AMMAN_TZ }));
}

/** Format a Date as `YYYY-MM-DDTHH:MM` in Amman wall-clock time. */
export function toAmmanDateInput(d: Date): string {
  const parts = ammanFormatter.formatToParts(d);
  const { year, month, day, hour, minute } = parseParts(parts);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Parse a `datetime-local` value as Amman wall-clock time and return the true UTC Date. */
export function fromAmmanDateInput(iso: string): Date {
  const [datePart, timePart = "00:00:00"] = iso.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour = 0, minute = 0] = timePart.split(":").map(Number);

  let candidate = Date.UTC(year, month - 1, day, hour, minute);

  // Converge to the UTC instant that maps to the requested Amman wall-clock time.
  for (let i = 0; i < 3; i++) {
    const parts = ammanFormatter.formatToParts(new Date(candidate));
    const current = parseParts(parts);
    if (
      current.year === year &&
      current.month === month &&
      current.day === day &&
      current.hour === hour &&
      current.minute === minute
    ) {
      return new Date(candidate);
    }
    const actualUtc = Date.UTC(
      current.year,
      current.month - 1,
      current.day,
      current.hour,
      current.minute,
    );
    candidate += Date.UTC(year, month - 1, day, hour, minute) - actualUtc;
  }

  return new Date(candidate);
}

/** Add days to a Date while preserving the same Amman wall-clock time. */
export function addAmmanDays(d: Date, n: number): Date {
  const iso = toAmmanDateInput(d);
  const [datePart, timePart] = iso.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const base = new Date(year, month - 1, day);
  base.setDate(base.getDate() + n);
  const nextIso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}T${timePart}`;
  return fromAmmanDateInput(nextIso);
}

/** Format an ISO timestamp for display in Amman time. */
export function formatAmmanDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-JO", {
    timeZone: AMMAN_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** Format an ISO timestamp as a short date key `YYYY-MM-DD` in Amman time. */
export function toAmmanDateKey(d: Date): string {
  return toAmmanDateInput(d).slice(0, 10);
}
