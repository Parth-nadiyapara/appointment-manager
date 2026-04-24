import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Loader2, Mail, Phone, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { trackBookingCompleted } from '../lib/analytics';
import { formatIstDateTime, getCurrentIstDate, isSameIstDay } from '../lib/time';

const today = getCurrentIstDate();

const initialForm = {
  name: '',
  email: '',
  phone: '',
  inquiry: ''
};

export default function BookingForm() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [form, setForm] = useState(initialForm);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services]
  );

  useEffect(() => {
    let ignore = false;

    async function loadServices() {
      try {
        setLoadingServices(true);
        const data = await api.getServices();

        if (!ignore) {
          setServices(data.services);
          setServiceId(data.services[0]?.id || '');
        }
      } catch (error) {
        if (!ignore) {
          setMessage({ type: 'error', text: error.message });
        }
      } finally {
        if (!ignore) {
          setLoadingServices(false);
        }
      }
    }

    loadServices();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!serviceId || !date) {
      return;
    }

    let ignore = false;

    async function loadSlots() {
      try {
        setLoadingSlots(true);
        setSelectedSlot('');
        const data = await api.getAvailableSlots({ serviceId, date });

        if (!ignore) {
          setSlots(data.slots);
        }
      } catch (error) {
        if (!ignore) {
          setSlots([]);
          setMessage({ type: 'error', text: error.message });
        }
      } finally {
        if (!ignore) {
          setLoadingSlots(false);
        }
      }
    }

    loadSlots();

    return () => {
      ignore = true;
    };
  }, [date, serviceId]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);

    if (!serviceId || !date || !selectedSlot) {
      setMessage({ type: 'error', text: 'Choose a service, date, and available time.' });
      return;
    }

    try {
      setSubmitting(true);

      const result = await api.createBooking({
        serviceId,
        date,
        startsAt: selectedSlot,
        lead: form
      });

      setForm(initialForm);
      setSelectedSlot('');
      setMessage({
        type: 'success',
        text: `Booked for ${formatIstDateTime(result.appointment.starts_at)} IST. We also saved this lead as Converted.`
      });
      trackBookingCompleted(selectedService?.name || 'Appointment');

      const updated = await api.getAvailableSlots({ serviceId, date });
      setSlots(updated.slots);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <p className="font-semibold">Appointments are shown in Indian Standard Time.</p>
        <p className="mt-1 font-medium text-teal-900">
          {isSameIstDay(date)
            ? 'Past slots are automatically removed for today.'
            : 'Select a future date to see the next available consultation slots.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Service</span>
          <select
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            disabled={loadingServices}
            className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none transition focus:border-primary-600 focus:ring-4 focus:ring-primary-100"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {service.duration_minutes} min
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Date</span>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              type="date"
              min={today}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-slate-950 shadow-sm outline-none transition focus:border-primary-600 focus:ring-4 focus:ring-primary-100"
            />
          </div>
        </label>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Available times</h2>
            <p className="text-sm text-slate-500">
              {selectedService ? `${selectedService.name} appointments are held in IST.` : 'Select a service.'}
            </p>
          </div>
          {loadingSlots ? <Loader2 className="h-5 w-5 animate-spin text-primary-600" /> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((slot) => (
            <button
              type="button"
              key={slot.startsAt}
              disabled={!slot.available}
              onClick={() => setSelectedSlot(slot.startsAt)}
              className={`flex h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                selectedSlot === slot.startsAt
                  ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                  : 'border-slate-300 bg-white text-slate-800 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.9)] hover:border-primary-500 hover:text-primary-700'
              } disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none`}
            >
              <Clock className="h-4 w-4" />
              {slot.label}
            </button>
          ))}
        </div>

        {!loadingSlots && slots.length === 0 ? (
          <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No available slots remain for this date in IST. Please choose another day.
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Field icon={UserRound} label="Name" name="name" value={form.name} onChange={updateField} required />
        <Field icon={Mail} label="Email" name="email" type="email" value={form.email} onChange={updateField} required />
        <Field icon={Phone} label="Phone" name="phone" type="tel" value={form.phone} onChange={updateField} required />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Inquiry</span>
          <textarea
            name="inquiry"
            value={form.inquiry}
            onChange={updateField}
            rows="4"
            placeholder="Tell us what you need help with."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-100"
          />
        </label>
      </div>

      {message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-primary-50 text-primary-900' : 'bg-rose-50 text-rose-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white shadow-[0_20px_36px_-26px_rgba(5,150,105,0.85)] transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
        Confirm appointment
      </button>
    </form>
  );
}

function Field({ icon: Icon, label, ...props }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
        <input
          {...props}
          placeholder={label}
          className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-100"
        />
      </div>
    </label>
  );
}
