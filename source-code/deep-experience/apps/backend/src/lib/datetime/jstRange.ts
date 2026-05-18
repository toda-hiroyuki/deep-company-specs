// JST date range parsing for admin filter queries.
// `from` and `to` accept "YYYY-MM-DD" and are interpreted as the full JST day
// (both ends inclusive). Either side may be omitted for an open range.
//
// Examples:
//   from="2026-04-19" -> UTC 2026-04-18T15:00:00.000Z
//   to  ="2026-04-19" -> UTC 2026-04-19T14:59:59.999Z

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class JstDateRangeError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
    this.name = "JstDateRangeError";
  }
}

function parseJstStartOfDay(dateKey: string, field: string): Date {
  if (!ISO_DATE_RE.test(dateKey)) {
    throw new JstDateRangeError(field, "must be YYYY-MM-DD");
  }
  const t = Date.parse(`${dateKey}T00:00:00+09:00`);
  if (Number.isNaN(t)) {
    throw new JstDateRangeError(field, "invalid calendar date");
  }
  return new Date(t);
}

export interface JstDateRange {
  fromUtc?: Date;
  toUtc?: Date;
}

export function parseJstDateRange(from?: string, to?: string): JstDateRange {
  const fromUtc = from ? parseJstStartOfDay(from, "from") : undefined;
  // `to` is inclusive: take the start of the next JST day and subtract 1ms.
  const toUtc = to
    ? new Date(parseJstStartOfDay(to, "to").getTime() + ONE_DAY_MS - 1)
    : undefined;

  if (fromUtc && toUtc && fromUtc.getTime() > toUtc.getTime()) {
    throw new JstDateRangeError("from", "from must be <= to");
  }

  return { fromUtc, toUtc };
}
