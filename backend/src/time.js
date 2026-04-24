const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;
const IST_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

export function getIstToday() {
  return partsToDateString(IST_FORMATTER.formatToParts(new Date()));
}

export function dateAndTimeToUtcIso(dateString, hour, minute) {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS;

  return new Date(utcTimestamp).toISOString();
}

export function startOfIstDayUtc(dateString) {
  return dateAndTimeToUtcIso(dateString, 0, 0);
}

export function endOfIstDayUtc(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcTimestamp = Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS;

  return new Date(utcTimestamp).toISOString();
}

export function formatIstLabel(isoString) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(isoString));
}

export function isoToIstDate(isoString) {
  return partsToDateString(IST_FORMATTER.formatToParts(new Date(isoString)));
}

function partsToDateString(parts) {
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
