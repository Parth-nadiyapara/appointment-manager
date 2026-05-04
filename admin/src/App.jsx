import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  UsersRound
} from 'lucide-react';
import { api, setAccessToken } from './lib/api';
import { supabase } from './lib/supabaseClient';

const statusStyles = {
  New: 'bg-sky-50 text-sky-700 border-sky-200',
  Contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  Converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Lost: 'bg-slate-100 text-slate-600 border-slate-200'
};

const editableStatusOptions = ['New', 'Contacted', 'Lost'];

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    document.title = 'CareDesk Admin | Lead and Appointment Dashboard';

    if (!supabase) {
      setAuthReady(true);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAccessToken(data.session?.access_token || null);
      setAuthReady(true);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAccessToken(nextSession?.access_token || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!supabase) {
    return (
      <AdminShell>
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable the admin login.
        </p>
      </AdminShell>
    );
  }

  if (!authReady) {
    return (
      <AdminShell>
        <p className="text-sm font-semibold text-slate-500">Checking session...</p>
      </AdminShell>
    );
  }

  return session ? <AdminDashboard /> : <AdminLogin />;
}

function AdminLogin() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: authError } = await supabase.auth.signInWithPassword(credentials);

    if (authError) {
      setError(authError.message);
    }

    setSubmitting(false);
  }

  return (
    <AdminShell>
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase text-teal-700">Owner sign in</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Access the admin dashboard</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              type="email"
              value={credentials.email}
              onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
              className="h-12 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              className="h-12 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              required
            />
          </label>
          {error ? <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-md bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700 disabled:bg-slate-300"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}

function AdminShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-teal-600 text-white shadow-sm">
              <CalendarClock className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-xl font-extrabold tracking-tight text-slate-950">CareDesk</span>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Private admin portal
              </span>
            </span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            Protected access
          </span>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</section>
    </main>
  );
}

function AdminDashboard() {
  const [dashboard, setDashboard] = useState({
    kpis: { totalLeads: 0, appointmentsToday: 0, pendingFollowUps: 0 },
    leads: [],
    appointments: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setDashboard(await api.getDashboard());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function changeStatus(leadId, status) {
    const previous = dashboard;
    setDashboard((current) => ({
      ...current,
      leads: current.leads.map((lead) => (lead.id === leadId ? { ...lead, status } : lead))
    }));

    try {
      await api.updateLeadStatus(leadId, status);
    } catch (err) {
      setDashboard(previous);
      setError(err.message);
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-700">Private dashboard</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Lead and appointment command center</h1>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Follow-up stages stay editable until a non-cancelled appointment exists. After that, the lead is fixed to Converted.
          </p>
        </div>
        <button
          onClick={() => supabase?.auth.signOut()}
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <LayoutDashboard className="h-4 w-4 text-teal-600" />
          Sign out
        </button>
      </div>

      {error ? <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      <div className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.26)] backdrop-blur-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard icon={UsersRound} label="Total Leads" value={dashboard.kpis.totalLeads} />
          <KpiCard icon={CalendarClock} label="Appointments Today" value={dashboard.kpis.appointmentsToday} />
          <KpiCard icon={ClipboardList} label="Pending Follow-ups" value={dashboard.kpis.pendingFollowUps} />
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.26)] backdrop-blur-sm">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.2)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-950">Lead pipeline</h2>
              {loading ? <span className="text-sm text-slate-500">Loading...</span> : null}
            </div>
            <div className="space-y-3">
              {dashboard.leads.map((lead) => (
                <article key={lead.id} className="rounded-xl border border-slate-300 bg-white p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.2)]">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="font-bold text-slate-950">{lead.name}</h3>
                      <p className="text-sm text-slate-500">{lead.email} / {lead.phone}</p>
                      <p className="mt-2 text-sm text-slate-600">{lead.inquiry || 'No inquiry provided.'}</p>
                    </div>
                    {lead.status_locked ? (
                      <span
                        className={`inline-flex h-10 items-center rounded-lg border px-3 text-sm font-bold ${statusStyles[lead.status]}`}
                      >
                        {lead.status}
                      </span>
                    ) : (
                      <select
                        value={lead.status}
                        onChange={(event) => changeStatus(lead.id, event.target.value)}
                        className={`h-10 rounded-lg border px-3 text-sm font-bold outline-none ${statusStyles[lead.status]}`}
                      >
                        {editableStatusOptions.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.2)]">
            <h2 className="mb-4 text-xl font-bold text-slate-950">Upcoming appointments</h2>
            <div className="space-y-3">
              {dashboard.appointments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-medium text-slate-500">
                  No upcoming appointments are queued right now.
                </div>
              ) : (
                dashboard.appointments.map((appointment) => (
                  <article key={appointment.id} className="rounded-xl border border-slate-300 bg-white p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.2)]">
                    <p className="font-bold text-slate-950">{appointment.service_name}</p>
                    <p className="mt-1 text-sm text-slate-600">{appointment.customer_name}</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-teal-700">
                      <CalendarClock className="h-4 w-4" />
                      {new Date(appointment.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function KpiCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.2)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}
