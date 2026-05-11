import { dateAndTimeToUtcIso, formatIstLabel } from './time.js';

const OPEN_HOUR = 9;
const CLOSE_HOUR = 18;
const SLOT_INTERVAL_MINUTES = 30;
const LUNCH_START_HOUR = 13;
const LUNCH_END_HOUR = 14;

export function buildDailySlots(date, durationMinutes, appointments = []) {
  const bookedRanges = appointments.map((appointment) => ({
    startsAtMs: new Date(appointment.starts_at).getTime(),
    endsAtMs: new Date(appointment.ends_at).getTime()
  }));
  const slots = [];
  const now = Date.now();

  for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
      const startsAt = dateAndTimeToUtcIso(date, hour, minute);
      const endsAt = new Date(new Date(startsAt).getTime() + durationMinutes * 60 * 1000);
      const closesAt = new Date(dateAndTimeToUtcIso(date, CLOSE_HOUR, 0));
      const inFuture = new Date(startsAt).getTime() > now;
      const startsDuringLunch = hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR;
      const overlapsBookedSlot = bookedRanges.some(
        (appointment) => new Date(startsAt).getTime() < appointment.endsAtMs && endsAt.getTime() > appointment.startsAtMs
      );

      if (endsAt <= closesAt && !startsDuringLunch) {
        slots.push({
          startsAt,
          label: formatIstLabel(startsAt),
          available: !overlapsBookedSlot && inFuture
        });
      }
    }
  }

  return slots;
}
