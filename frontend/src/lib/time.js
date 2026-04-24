const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

export function getCurrentIstDate() {
  return formatIstDateFromIso(new Date().toISOString());
}

export function formatIstDateFromIso(isoString) {
  const shifted = new Date(new Date(isoString).getTime() + IST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatIstDateTime(isoString) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(isoString));
}

export function isSameIstDay(dateString) {
  return dateString === getCurrentIstDate();
}
