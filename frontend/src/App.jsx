import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Clock3,
  Headset,
  LayoutDashboard,
  Mail,
  MapPin,
  Menu,
  PhoneCall,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  X
} from 'lucide-react';
import BookingForm from './components/BookingForm.jsx';
import { api, setAccessToken } from './lib/api';
import { initAnalytics, trackPageView } from './lib/analytics';
import { applyRouteMetadata } from './lib/seo';
import { supabase } from './lib/supabaseClient';

const statusStyles = {
  New: 'bg-sky-50 text-sky-700 border-sky-200',
  Contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  Converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Lost: 'bg-slate-100 text-slate-600 border-slate-200'
};

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    function syncRoute() {
      setRoute(window.location.pathname);
    }

    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    applyRouteMetadata(route);
    trackPageView(route, document.title);
  }, [route]);

  useEffect(() => {
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

  function navigate(path) {
    window.history.pushState({}, '', path);
    setRoute(path);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollToSection(id) {
    if (route !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return;
    }

    setMobileNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-teal-600 text-white shadow-sm">
              <CalendarClock className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-xl font-extrabold tracking-tight text-slate-950">CareDesk</span>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Consultation scheduling suite
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-6 lg:flex">
            <NavLink onClick={() => scrollToSection('services')}>Services</NavLink>
            <NavLink onClick={() => scrollToSection('process')}>Process</NavLink>
            <NavLink onClick={() => scrollToSection('results')}>Results</NavLink>
            <NavLink onClick={() => scrollToSection('faq')}>FAQ</NavLink>
            <button
              onClick={() => navigate('/admin')}
              className={`rounded-md px-3 py-2 text-sm font-bold ${
                route === '/admin' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => scrollToSection('booking')}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-teal-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
            >
              Book now
              <ArrowRight className="h-4 w-4" />
            </button>
          </nav>

          <button
            type="button"
            onClick={() => setMobileNavOpen((current) => !current)}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 lg:hidden"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen ? (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              <MobileLink onClick={() => scrollToSection('services')}>Services</MobileLink>
              <MobileLink onClick={() => scrollToSection('process')}>Process</MobileLink>
              <MobileLink onClick={() => scrollToSection('results')}>Results</MobileLink>
              <MobileLink onClick={() => scrollToSection('faq')}>FAQ</MobileLink>
              <MobileLink onClick={() => navigate('/admin')}>Admin</MobileLink>
              <button
                onClick={() => scrollToSection('booking')}
                className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-teal-600 px-5 text-sm font-bold text-white"
              >
                Book now
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {route === '/admin' ? (
        <PrivateAdmin session={session} authReady={authReady} />
      ) : (
        <PublicBookingPage onNavigate={navigate} />
      )}
    </main>
  );
}

function PublicBookingPage({ onNavigate }) {
  return (
    <>
      <section
        className="relative overflow-hidden border-b border-slate-200"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.66) 42%, rgba(15,23,42,0.35) 100%), url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80')",
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      >
        <div className="mx-auto grid min-h-[72vh] max-w-7xl items-end gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="max-w-2xl pb-4 text-white">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold backdrop-blur">
              <BadgeCheck className="h-4 w-4" />
              Trusted scheduling for clinics, therapists, tutors, and coaching studios
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Consultation booking that feels calm, credible, and easy to trust.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
              CareDesk turns appointment requests into organized leads, removes already-passed slots in IST, and gives owners a focused dashboard for follow-up.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-teal-500 px-5 text-sm font-bold text-white transition hover:bg-teal-400"
              >
                Start booking
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/25 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                See how it works
              </button>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <HeroStat label="Avg intake" value="< 60 sec" />
              <HeroStat label="Timezone" value="IST aware" />
              <HeroStat label="Follow-up flow" value="Lead to booked" />
            </div>
          </div>
        </div>
      </section>

      <section id="booking" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 rounded-[28px] border border-slate-200 bg-white/78 p-6 shadow-[0_30px_80px_-38px_rgba(15,23,42,0.28)] backdrop-blur-sm lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
        <div className="space-y-10">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Built for consultation businesses</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Book appointments without losing promising leads.
            </h2>
            <p className="mt-4 text-lg font-medium leading-8 text-slate-700">
              Visitors choose a service, pick an IST time slot, and leave enough context for your team to respond with confidence. The result feels more like a real front desk than a generic form.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <TrustPoint icon={PhoneCall} title="Fast intake" text="Capture contact details and inquiry context in one step." />
            <TrustPoint icon={CalendarClock} title="Clean calendar" text="Booked or expired slots stop showing immediately." />
            <TrustPoint icon={TrendingUp} title="Lead ready" text="Appointments move straight into a workable follow-up pipeline." />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.18)]">
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                Double-booking protection
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2">
                <Clock3 className="h-4 w-4 text-teal-600" />
                Same-day IST slot control
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2">
                <Headset className="h-4 w-4 text-teal-600" />
                Lead dashboard included
              </span>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-28">
          <div className="rounded-[24px] border border-slate-300 bg-white p-5 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.3)] sm:p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-950">Schedule a consultation</h2>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Choose a slot and share your details. Same-day expired times are removed based on IST.
              </p>
            </div>
            <BookingForm />
          </div>
        </div>
        </div>
      </section>

      <section id="services" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Service fit</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
              A polished front door for high-trust appointments.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <ServiceCard
              title="Small clinics"
              text="Handle consultations, therapy sessions, diagnostics, and care follow-ups without making patients call for every booking."
            />
            <ServiceCard
              title="Coaching centers"
              text="Use one place for discovery calls, counselling sessions, parent meetings, and enrollment-focused lead capture."
            />
            <ServiceCard
              title="Private consultants"
              text="Create a booking flow that feels premium, filters outdated slots, and keeps every inquiry tied to a lead record."
            />
          </div>
        </div>
      </section>

      <section id="process" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Process</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Simple for visitors, structured for owners.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              The public site makes scheduling feel immediate. The private dashboard keeps the business side organized without making the workflow heavy.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ProcessStep number="01" title="Select a service" text="Visitors choose the consultation type and a valid date." />
            <ProcessStep
              number="02"
              title="See only real slots"
              text="Times are shown in IST and expired same-day slots disappear automatically."
            />
            <ProcessStep
              number="03"
              title="Capture and convert"
              text="Each successful booking updates the lead pipeline so follow-up starts with context."
            />
          </div>
        </div>
      </section>

      <section id="results" className="border-y border-slate-200 bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 text-white sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Operational clarity</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Owners get a dashboard that keeps the next action obvious.</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
              Total leads, appointments due today, and pending follow-ups stay visible. New inquiries can move from New to Contacted to Converted without leaving the system.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ResultCard title="Lead pipeline" text="See the latest inquiries, update status quickly, and keep the team aligned on next contact." />
            <ResultCard title="Upcoming calendar" text="Review appointments in time order so owners can prep their day without switching tools." />
            <ResultCard title="Trust-focused intake" text="A calmer public booking flow improves completion rates for services that need confidence." />
            <ResultCard title="Deployment-ready base" text="Frontend and backend are separated for GitHub and Vercel workflows." />
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">FAQ</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Questions business owners usually ask first.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <FaqItem
            title="Can visitors still double-book the same time?"
            text="No. The API checks availability again before insert, and Supabase also enforces a unique active slot at the database level."
          />
          <FaqItem
            title="What timezone does the public page use?"
            text="The booking page now works in IST. Same-day expired slots are hidden and the backend rejects times that have already passed."
          />
          <FaqItem
            title="Will leads update after booking?"
            text="Yes. Successful bookings automatically upsert the lead and move the status to Converted."
          />
          <FaqItem
            title="Can this be deployed to Vercel and GitHub?"
            text="Yes. The project is now organized into separate frontend and backend workspaces so deployment is straightforward."
          />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-600 text-white">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-black text-slate-950">CareDesk</p>
                <p className="text-sm text-slate-500">Appointment booking and lead management</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              Built for consultation-led businesses that need a booking website, clear appointment operations, and a more professional digital first impression.
            </p>
          </div>

          <div className="border-l border-slate-200 pl-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick links</p>
            <div className="mt-6 flex flex-col items-start gap-4 text-sm font-bold text-slate-800">
              <button onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>Booking</button>
              <button onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>Services</button>
              <button onClick={() => onNavigate('/admin')}>Admin</button>
            </div>
          </div>

          <div className="border-l border-slate-200 pl-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contact style</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-teal-600" />
                +91 front desk workflow
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-teal-600" />
                hello@caredesk.app
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-600" />
                Built for modern consultation teams
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function PrivateAdmin({ session, authReady }) {
  if (!supabase) {
    return (
      <AdminShell>
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable the private admin route.
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
  return <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</section>;
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
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-700">Private dashboard</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Lead and appointment command center</h1>
          <p className="mt-3 text-sm font-medium text-slate-600">
            New and Contacted are editable follow-up stages. Once a lead has an active appointment, it is fixed to Converted.
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
                      {Object.keys(statusStyles).map((status) => (
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

function NavLink({ children, onClick }) {
  return (
    <button onClick={onClick} className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">
      {children}
    </button>
  );
}

function MobileLink({ children, onClick }) {
  return (
    <button onClick={onClick} className="rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100">
      {children}
    </button>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-md border border-white/15 bg-white/10 p-4 backdrop-blur">
      <p className="text-sm font-semibold text-slate-200">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function TrustPoint({ icon: Icon, title, text }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-24px_rgba(15,23,42,0.28)]">
      <Icon className="mb-3 h-5 w-5 text-teal-600" />
      <h3 className="font-extrabold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function ServiceCard({ title, text }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-6 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.2)]">
      <h3 className="text-xl font-extrabold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function ProcessStep({ number, title, text }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-6 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.2)]">
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{number}</p>
      <h3 className="mt-3 text-xl font-extrabold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function ResultCard({ title, text }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
    </article>
  );
}

function FaqItem({ title, text }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-6 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.2)]">
      <h3 className="text-lg font-extrabold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{text}</p>
    </article>
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
