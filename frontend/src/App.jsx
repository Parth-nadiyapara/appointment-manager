import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarClock,
  ClipboardList,
  Clock3,
  Headset,
  LayoutDashboard,
  Loader2,
  Mail,
  MapPin,
  Menu,
  PhoneCall,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  UserRound,
  X
} from 'lucide-react';
import AuthPortal from './components/AuthPortal.jsx';
import BookingForm from './components/BookingForm.jsx';
import UserDashboard from './components/UserDashboard.jsx';
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
const editableStatusOptions = ['New', 'Contacted', 'Converted', 'Lost'];

function deriveDashboardKpis(dashboard) {
  return {
    totalLeads: dashboard.kpis.totalLeads || dashboard.leads.length,
    appointmentsToday: dashboard.kpis.appointmentsToday || 0,
    pendingFollowUps: dashboard.leads.filter((lead) => lead.status === 'New' || lead.status === 'Contacted').length
  };
}

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('user');
  const [authReady, setAuthReady] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(false);
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

    async function syncIdentity(nextSession) {
      setSession(nextSession);
      setAccessToken(nextSession?.access_token || null);

      if (!nextSession) {
        setProfile(null);
        setRole('user');
        setIdentityLoading(false);
        setAuthReady(true);
        return;
      }

      setIdentityLoading(true);
      try {
        const identity = await api.getMe();
        setProfile(identity.profile);
        setRole(identity.role || 'user');
      } catch (error) {
        setProfile(null);
        setRole('user');
        await supabase.auth.signOut();
      } finally {
        setIdentityLoading(false);
        setAuthReady(true);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      syncIdentity(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/auth') {
        navigate('/auth?mode=reset');
      }
      syncIdentity(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || identityLoading || !session || route !== '/auth') {
      return;
    }

    navigate(role === 'admin' ? '/admin' : '/dashboard');
  }, [authReady, identityLoading, role, route, session]);

  function navigate(path) {
    const targetUrl = new URL(path, window.location.origin);
    window.history.pushState({}, '', `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
    setRoute(targetUrl.pathname);
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

  function openPrimaryAction() {
    if (session) {
      scrollToSection('booking');
      return;
    }

    scrollToSection('access');
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
            <NavLink onClick={() => navigate('/')}>Home</NavLink>
            <NavLink onClick={() => scrollToSection('services')}>Services</NavLink>
            <NavLink onClick={() => scrollToSection('process')}>Process</NavLink>
            <NavLink onClick={() => scrollToSection('results')}>Results</NavLink>
            <NavLink onClick={() => scrollToSection('faq')}>FAQ</NavLink>
            {identityLoading ? <span className="text-sm font-semibold text-slate-400">Checking session...</span> : null}
            {!identityLoading && session ? (
              <>
                {role === 'admin' ? (
                  <button
                    onClick={() => navigate('/admin')}
                    className={`rounded-md px-3 py-2 text-sm font-bold ${
                      route === '/admin' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Admin
                  </button>
                ) : null}
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold ${
                    route === '/dashboard' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  My dashboard
                </button>
                <button
                  onClick={() => supabase?.auth.signOut()}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                >
                  Logout
                </button>
              </>
            ) : null}
            <button
              onClick={openPrimaryAction}
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
              <MobileLink onClick={() => navigate('/')}>Home</MobileLink>
              <MobileLink onClick={() => scrollToSection('services')}>Services</MobileLink>
              <MobileLink onClick={() => scrollToSection('process')}>Process</MobileLink>
              <MobileLink onClick={() => scrollToSection('results')}>Results</MobileLink>
              <MobileLink onClick={() => scrollToSection('faq')}>FAQ</MobileLink>
              {!identityLoading && session ? <MobileLink onClick={() => navigate('/dashboard')}>My dashboard</MobileLink> : null}
              {!identityLoading && role === 'admin' ? <MobileLink onClick={() => navigate('/admin')}>Admin</MobileLink> : null}
              <button
                onClick={openPrimaryAction}
                className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-teal-600 px-5 text-sm font-bold text-white"
              >
                Book now
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {route === '/auth' ? (
        <AuthPortal session={session} role={role} onNavigate={navigate} />
      ) : route === '/dashboard' ? (
        <UserDashboard session={session} profile={profile} role={role} authReady={authReady} onNavigate={navigate} />
      ) : route === '/admin' ? (
        <PrivateAdmin session={session} authReady={authReady} role={role} profile={profile} onNavigate={navigate} />
      ) : (
        <PublicBookingPage onNavigate={navigate} session={session} profile={profile} onPrimaryAction={openPrimaryAction} />
      )}
    </main>
  );
}

function PublicBookingPage({ onNavigate, session, profile, onPrimaryAction }) {
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
              CareDesk helps clinics, therapists, and coaching centers accept organized bookings, block unavailable slots in IST, and prepare every day with cleaner appointment visibility.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onPrimaryAction}
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
              <HeroStat label="Daily flow" value="Booked to guided" />
            </div>
          </div>
        </div>
      </section>

      <section id={session ? 'booking' : 'access'} className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 rounded-[28px] border border-slate-200 bg-white/78 p-6 shadow-[0_30px_80px_-38px_rgba(15,23,42,0.28)] backdrop-blur-sm lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
        <div className="space-y-10">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Built for consultation businesses</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Book appointments with the calm feel of a real reception desk.
            </h2>
            <p className="mt-4 text-lg font-medium leading-8 text-slate-700">
              Patients, parents, and coaching learners choose a service, pick an IST time slot, and share the details your team needs before the visit starts.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <TrustPoint icon={PhoneCall} title="Quick patient intake" text="Collect name, contact details, and visit purpose in one guided step." />
            <TrustPoint icon={CalendarClock} title="Live schedule clarity" text="Booked or expired slots disappear so staff do not promise unavailable times." />
            <TrustPoint icon={TrendingUp} title="Prepared follow-up" text="Every booking lands with enough context for care guidance or counseling response." />
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
                Admin desk included
              </span>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-28">
          <div className="rounded-[24px] border border-slate-300 bg-white p-5 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.3)] sm:p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-950">
                {session ? 'Schedule a consultation' : 'Sign in or register first'}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-600">
                {session
                  ? 'Choose a slot and share your details. Same-day expired times are removed based on IST.'
                  : 'Booking opens only after authentication. Create your account or sign in to continue.'}
              </p>
            </div>
            {session ? (
              <BookingForm session={session} profile={profile} onNavigate={onNavigate} />
            ) : (
              <AuthPortal session={session} role="user" onNavigate={onNavigate} embedded />
            )}
          </div>
        </div>
        </div>
      </section>

      <section id="services" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Service fit</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
              Built for healthcare visits and coaching conversations that need trust.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <ServiceCard
              title="Small clinics"
              text="Handle consultations, diagnostics, follow-up reviews, and wellness sessions without forcing patients to call every time."
            />
            <ServiceCard
              title="Coaching centers"
              text="Use one booking flow for discovery calls, parent counseling, mentoring sessions, and course guidance meetings."
            />
            <ServiceCard
              title="Therapists and specialists"
              text="Offer a premium appointment journey that protects session timing, collects context, and keeps case notes organized."
            />
          </div>
        </div>
      </section>

      <section id="process" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Process</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Simple for patients and learners, structured for staff.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              The public side feels easy to trust, while the private side helps front-desk teams, coaches, and clinic staff prepare the next conversation clearly.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ProcessStep number="01" title="Choose the visit type" text="Patients and learners pick the consultation, counseling, or coaching session they need." />
            <ProcessStep
              number="02"
              title="View only active slots"
              text="Times stay in IST, lunch time remains blocked, and expired same-day options disappear automatically."
            />
            <ProcessStep
              number="03"
              title="Arrive prepared"
              text="Each successful booking gives your team the details needed for a smoother visit, follow-up, or parent conversation."
            />
          </div>
        </div>
      </section>

      <section id="results" className="border-y border-slate-200 bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 text-white sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Operational clarity</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Admins get a dashboard that keeps the next patient or learner visible.</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
              Today’s bookings, pending follow-ups, and upcoming consultations stay in one place so reception teams and coaching coordinators can respond faster.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ResultCard title="Patient pipeline" text="Review fresh inquiries, update contact stages, and keep every follow-up visible to staff." />
            <ResultCard title="Upcoming sessions" text="See the day’s clinic visits or coaching appointments in order before they begin." />
            <ResultCard title="Reminder visibility" text="One-hour reminders help users arrive prepared instead of missing important appointments." />
            <ResultCard title="Calm intake flow" text="A professional booking experience builds confidence before medical care or counseling even starts." />
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">FAQ</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Questions clinics and coaching centers usually ask first.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <FaqItem
            title="Can two people still book the same time slot?"
            text="No. CareDesk checks slot overlap again while booking, so already-reserved consultation times cannot be taken twice."
          />
          <FaqItem
            title="What timezone does the public page use?"
            text="The booking page now works in IST. Same-day expired slots are hidden and the backend rejects times that have already passed."
          />
          <FaqItem
            title="Can patients and learners see their own appointments later?"
            text="Yes. Signed-in users can open their dashboard to review upcoming bookings, completed visits, and reminder cards."
          />
          <FaqItem
            title="When does the reminder alert appear?"
            text="The dashboard reminder appears only during the final one hour before the appointment starts, so users are nudged at the right time."
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
                <p className="text-sm text-slate-500">Appointment booking for clinics and coaching centers</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              Built for healthcare and coaching teams that need cleaner appointment intake, calmer scheduling, and better daily preparation.
            </p>
          </div>

          <div className="border-l border-slate-200 pl-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick links</p>
            <div className="mt-6 flex flex-col items-start gap-4 text-sm font-bold text-slate-800">
              <button onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>Booking</button>
              <button onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>Services</button>
            </div>
          </div>

          <div className="border-l border-slate-200 pl-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Support format</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-teal-600" />
                Front-desk and counseling workflow
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-teal-600" />
                support@caredesk.health
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-600" />
                Built for modern clinics and coaching institutes
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function PrivateAdmin({ session, authReady, role, profile, onNavigate }) {
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
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking session...
        </p>
      </AdminShell>
    );
  }

  if (!session) {
    return <AuthPortal session={session} role={role} onNavigate={onNavigate} />;
  }

  if (role !== 'admin') {
    return (
      <AdminShell>
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-8 shadow-[0_28px_80px_-38px_rgba(180,83,9,0.22)]">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Restricted area</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Admin access is managed through Supabase roles.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Your current account is signed in, but it is not marked as `admin`. Update the user role in Supabase and try again.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700"
            >
              Open my dashboard
            </button>
            <button
              type="button"
              onClick={() => supabase?.auth.signOut()}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-white"
            >
              Logout
            </button>
          </div>
        </section>
      </AdminShell>
    );
  }

  return <AdminDashboard profile={profile} />;
}

function AdminShell({ children }) {
  return <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</section>;
}

function AdminDashboard({ profile }) {
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
        const nextDashboard = await api.getDashboard();
        setDashboard({
          ...nextDashboard,
          kpis: deriveDashboardKpis(nextDashboard)
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();

    const refreshTimer = window.setInterval(() => {
      loadDashboard();
    }, 30000);

    return () => window.clearInterval(refreshTimer);
  }, []);

  async function changeStatus(leadId, status) {
    const previous = dashboard;
    setDashboard((current) => {
      const leads = current.leads.map((lead) => (lead.id === leadId ? { ...lead, status } : lead));
      return {
        ...current,
        leads,
        kpis: {
          ...current.kpis,
          pendingFollowUps: leads.filter((lead) => lead.status === 'New' || lead.status === 'Contacted').length
        }
      };
    });

    try {
      const result = await api.updateLeadStatus(leadId, status);
      setDashboard((current) => {
        const leads = current.leads.map((lead) => (lead.id === leadId ? { ...lead, ...result.lead } : lead));
        return {
          ...current,
          leads,
          kpis: {
            ...current.kpis,
            pendingFollowUps: leads.filter((lead) => lead.status === 'New' || lead.status === 'Contacted').length
          }
        };
      });
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
            Signed in as {profile?.owner_name || profile?.business_name || 'CareDesk admin'}. Manage clinic visits, counseling inquiries, learner calls, and follow-ups from one protected workspace.
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

      <div className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.26)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_34px_90px_-38px_rgba(15,23,42,0.28)]">
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard icon={UsersRound} label="Total Leads" value={dashboard.kpis.totalLeads} />
          <KpiCard icon={CalendarClock} label="Appointments Today" value={dashboard.kpis.appointmentsToday} />
          <KpiCard icon={ClipboardList} label="Pending Follow-ups" value={dashboard.kpis.pendingFollowUps} />
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.26)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_34px_90px_-38px_rgba(15,23,42,0.28)]">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-[0_28px_56px_-24px_rgba(15,23,42,0.22)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-950">Inquiry pipeline</h2>
            {loading ? <span className="text-sm text-slate-500">Loading...</span> : null}
          </div>
          <div className="space-y-3">
            {dashboard.leads.map((lead) => (
              <article key={lead.id} className="rounded-xl border border-slate-300 bg-white p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_24px_46px_-24px_rgba(15,23,42,0.2)]">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="font-bold text-slate-950">{lead.name}</h3>
                    <p className="text-sm text-slate-500">{lead.email} / {lead.phone}</p>
                    <p className="mt-2 text-sm text-slate-600">{lead.inquiry || 'No medical or coaching note provided yet.'}</p>
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

        <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-[0_28px_56px_-24px_rgba(15,23,42,0.22)]">
          <h2 className="mb-4 text-xl font-bold text-slate-950">Upcoming appointments</h2>
          <div className="space-y-3">
            {dashboard.appointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-medium text-slate-500">
                No clinic or coaching appointments are queued right now.
              </div>
            ) : (
              dashboard.appointments.map((appointment) => (
                  <article key={appointment.id} className="rounded-xl border border-slate-300 bg-white p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_24px_46px_-24px_rgba(15,23,42,0.2)]">
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
    <div className="rounded-md border border-white/15 bg-white/10 p-4 backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:border-white/25 hover:bg-white/14 hover:shadow-[0_22px_48px_-26px_rgba(15,23,42,0.6)]">
      <p className="text-sm font-semibold text-slate-200">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function TrustPoint({ icon: Icon, title, text }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.24)] transition duration-300 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-[0_28px_54px_-24px_rgba(15,23,42,0.24)]">
      <Icon className="mb-3 h-5 w-5 text-teal-600" />
      <h3 className="font-extrabold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function ServiceCard({ title, text }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-6 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-[0_28px_58px_-24px_rgba(15,23,42,0.22)]">
      <h3 className="text-xl font-extrabold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function ProcessStep({ number, title, text }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-6 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-[0_28px_58px_-24px_rgba(15,23,42,0.22)]">
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{number}</p>
      <h3 className="mt-3 text-xl font-extrabold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function ResultCard({ title, text }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:bg-white/8 hover:shadow-[0_28px_56px_-24px_rgba(2,6,23,0.45)]">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
    </article>
  );
}

function FaqItem({ title, text }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-6 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-[0_28px_58px_-24px_rgba(15,23,42,0.22)]">
      <h3 className="text-lg font-extrabold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function KpiCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-[0_28px_52px_-24px_rgba(15,23,42,0.22)]">
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
