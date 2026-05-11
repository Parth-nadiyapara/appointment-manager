import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  LogOut,
  ShieldAlert,
  Stethoscope,
  UserRound
} from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

function formatDateTime(isoString) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(isoString));
}

export default function UserDashboard({ session, profile, role, authReady, onNavigate }) {
  const [dashboard, setDashboard] = useState({
    kpis: { totalBookings: 0, upcomingCount: 0, completedCount: 0, unreadAlerts: 0 },
    appointments: [],
    alerts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    let ignore = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        const nextDashboard = await api.getUserDashboard();
        if (!ignore) {
          setDashboard(nextDashboard);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    const pollTimer = window.setInterval(loadDashboard, 30000);
    let channel = null;

    if (supabase) {
      channel = supabase
        .channel(`user-dashboard-${session.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, loadDashboard)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_alerts' }, loadDashboard)
        .subscribe();
    }

    return () => {
      ignore = true;
      window.clearInterval(pollTimer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [session]);

  const upcomingAppointments = useMemo(
    () => dashboard.appointments.filter((appointment) => appointment.timeline_status === 'upcoming' || appointment.timeline_status === 'in_progress'),
    [dashboard.appointments]
  );
  const completedAppointments = useMemo(
    () => dashboard.appointments.filter((appointment) => appointment.timeline_status === 'completed'),
    [dashboard.appointments]
  );

  async function markAlertRead(alertId) {
    setDashboard((current) => ({
      ...current,
      alerts: current.alerts.map((alert) => (alert.id === alertId ? { ...alert, status: 'read' } : alert)),
      kpis: {
        ...current.kpis,
        unreadAlerts: Math.max(0, current.kpis.unreadAlerts - 1)
      }
    }));

    try {
      await api.markAlertRead(alertId);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!authReady) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white/88 p-8 text-slate-600 shadow-[0_28px_90px_-38px_rgba(15,23,42,0.2)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white/88 p-8 shadow-[0_28px_90px_-38px_rgba(15,23,42,0.2)]">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Patient portal</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Sign in to see your bookings and reminders.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Your CareDesk dashboard keeps upcoming visits, completed appointments, and alerts in one secure place.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/auth')}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Back to homepage
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="grid gap-6 rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.13),_rgba(255,255,255,0.94)_62%)] p-6 shadow-[0_30px_100px_-40px_rgba(15,23,42,0.24)] lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Patient dashboard</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Welcome back, {profile?.owner_name || session.user.email?.split('@')[0] || 'CareDesk user'}.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600">
            Review upcoming visits, completed consultations, and care reminders from one calm medical workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {role === 'admin' ? (
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-700 transition hover:bg-teal-100"
              >
                Open admin controls
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => supabase?.auth.signOut()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard icon={ClipboardList} label="Total bookings" value={dashboard.kpis.totalBookings} />
          <MetricCard icon={CalendarClock} label="Upcoming" value={dashboard.kpis.upcomingCount} />
          <MetricCard icon={CheckCircle2} label="Completed" value={dashboard.kpis.completedCount} />
          <MetricCard icon={Bell} label="Unread alerts" value={dashboard.kpis.unreadAlerts} />
        </div>
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <section className="space-y-6">
          <DashboardPanel title="Upcoming appointments" icon={Stethoscope} loading={loading}>
            {upcomingAppointments.length === 0 ? (
              <EmptyState text="No upcoming appointments yet. Once you book, your next visit will appear here." />
            ) : (
              <div className="grid gap-4">
                {upcomingAppointments.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title="Completed visits" icon={CheckCircle2}>
            {completedAppointments.length === 0 ? (
              <EmptyState text="Completed consultations will show up here after your appointments finish." />
            ) : (
              <div className="grid gap-4">
                {completedAppointments.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} subdued />
                ))}
              </div>
            )}
          </DashboardPanel>
        </section>

        <section className="space-y-6">
          <DashboardPanel title="Care alerts" icon={Bell}>
            {dashboard.alerts.length === 0 ? (
              <EmptyState text="No reminders right now. CareDesk will surface new alerts here." />
            ) : (
              <div className="space-y-3">
                {dashboard.alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onMarkRead={markAlertRead} />
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title="Session & access" icon={UserRound}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Signed in email" value={session.user.email || 'Unavailable'} />
              <InfoTile label="Role" value={role} />
              <InfoTile label="Session state" value="Persisted via Supabase" />
              <InfoTile label="Access protection" value="Authenticated route" />
            </div>
          </DashboardPanel>
        </section>
      </div>
    </section>
  );
}

function DashboardPanel({ title, icon: Icon, children, loading = false }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white/88 p-6 shadow-[0_28px_90px_-38px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_34px_100px_-38px_rgba(15,23,42,0.22)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Icon className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
        </div>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
      </div>
      {children}
    </article>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-2xl border border-white/75 bg-white/88 p-5 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.24)] transition duration-300 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-[0_30px_80px_-34px_rgba(15,23,42,0.26)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function AppointmentCard({ appointment, subdued = false }) {
  const toneClass =
    appointment.timeline_status === 'completed' || subdued
      ? 'bg-slate-50 text-slate-600'
      : appointment.timeline_status === 'in_progress'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-teal-50 text-teal-700';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_62px_-38px_rgba(15,23,42,0.22)] transition duration-300 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-[0_30px_72px_-34px_rgba(15,23,42,0.24)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Consultation</p>
          <h3 className="mt-2 text-xl font-black text-slate-950">{appointment.service_name}</h3>
          <p className="mt-2 text-sm text-slate-500">{formatDateTime(appointment.starts_at)}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${toneClass}`}>
          {appointment.timeline_status.replace('_', ' ')}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <InfoTile label="Appointment type" value={appointment.service_name} compact />
        <InfoTile label="Meeting status" value={appointment.status} compact />
      </div>
    </article>
  );
}

function AlertCard({ alert, onMarkRead }) {
  const toneClass =
    alert.level === 'success'
      ? 'border-emerald-200 bg-emerald-50'
      : alert.level === 'warning'
        ? 'border-amber-200 bg-amber-50'
        : 'border-slate-200 bg-slate-50';

  return (
    <article className={`rounded-2xl border p-4 shadow-[0_22px_58px_-38px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-34px_rgba(15,23,42,0.22)] ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">{alert.title}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{alert.message}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            {formatDateTime(alert.remind_at)}
          </p>
        </div>
        {alert.status !== 'read' ? (
          <button
            type="button"
            onClick={() => onMarkRead(alert.id)}
            className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white"
          >
            Mark read
          </button>
        ) : (
          <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-500">Read</span>
        )}
      </div>
    </article>
  );
}

function InfoTile({ label, value, compact = false }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/72 p-4 ${compact ? '' : 'shadow-[0_20px_56px_-38px_rgba(15,23,42,0.18)]'}`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">{text}</div>;
}
