import { dateAndTimeToUtcIso, formatIstLabel } from './time.js';

const OPEN_HOUR = 9;
const CLOSE_HOUR = 18;
const SLOT_INTERVAL_MINUTES = 30;
const LUNCH_START_HOUR = 13;
const LUNCH_END_HOUR = 14;

export function buildDailySlots(date, durationMinutes, appointments = []) {
  const booked = new Set(appointments.map((appointment) => appointment.starts_at));
  const slots = [];
  const now = Date.now();
  const lunchStartsAt = new Date(dateAndTimeToUtcIso(date, LUNCH_START_HOUR, 0));
  const lunchEndsAt = new Date(dateAndTimeToUtcIso(date, LUNCH_END_HOUR, 0));

  for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
      const startsAt = dateAndTimeToUtcIso(date, hour, minute);
      const endsAt = new Date(new Date(startsAt).getTime() + durationMinutes * 60 * 1000);
      const closesAt = new Date(dateAndTimeToUtcIso(date, CLOSE_HOUR, 0));
      const inFuture = new Date(startsAt).getTime() > now;
      const overlapsLunch = new Date(startsAt) < lunchEndsAt && endsAt > lunchStartsAt;

      if (endsAt <= closesAt && !overlapsLunch) {
        slots.push({
          startsAt,
          label: formatIstLabel(startsAt),
          available: !booked.has(startsAt) && inFuture
        });
      }
    }
  }

  return slots;
}
