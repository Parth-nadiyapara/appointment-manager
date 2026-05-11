import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2, LogIn, MailCheck, ShieldCheck, UserPlus2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function getInitialMode() {
  if (typeof window === 'undefined') {
    return 'signin';
  }

  const params = new URLSearchParams(window.location.search);
  if (window.location.hash.includes('type=recovery') || params.get('mode') === 'reset') {
    return 'reset';
  }

  return params.get('mode') || 'signin';
}

export default function AuthPortal({ session, role, onNavigate }) {
  const [mode, setMode] = useState(getInitialMode);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ fullName: '', phone: '', email: '', password: '' });
  const [verifyForm, setVerifyForm] = useState({ email: '', token: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setMode('reset');
    }
  }, []);

  const authTabs = useMemo(
    () => [
      { id: 'signin', label: 'Sign in', icon: LogIn },
      { id: 'signup', label: 'Register', icon: UserPlus2 },
      { id: 'verify', label: 'Verify email', icon: MailCheck },
      { id: 'forgot', label: 'Forgot password', icon: KeyRound }
    ],
    []
  );

  async function handleSignIn(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword(signInForm);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Signed in successfully. Redirecting to your CareDesk portal...' });
    }

    setSubmitting(false);
  }

  async function handleSignUp(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email: signUpForm.email,
      password: signUpForm.password,
      options: {
        data: {
          full_name: signUpForm.fullName,
          phone: signUpForm.phone
        },
        emailRedirectTo: `${window.location.origin}/auth`
      }
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({
        type: 'success',
        text: 'Check your email for the verification link or OTP, then come back here to verify and continue.'
      });
      setVerifyForm((current) => ({ ...current, email: signUpForm.email }));
      setMode('verify');
    }

    setSubmitting(false);
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.verifyOtp({
      email: verifyForm.email,
      token: verifyForm.token,
      type: 'signup'
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Email verified. You can sign in now.' });
      setMode('signin');
      setSignInForm((current) => ({ ...current, email: verifyForm.email }));
    }

    setSubmitting(false);
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth?mode=reset`
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password reset email sent. Open it and set a new password.' });
    }

    setSubmitting(false);
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password: resetPassword });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password updated. You can continue with your refreshed session.' });
      window.history.replaceState({}, '', '/auth');
    }

    setSubmitting(false);
  }

  if (!supabase) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-8 text-amber-900 shadow-[0_24px_70px_-38px_rgba(180,83,9,0.34)]">
          Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable sign in, registration, and session management.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <article className="rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_rgba(255,255,255,0.92)_55%)] p-8 shadow-[0_28px_90px_-38px_rgba(15,23,42,0.24)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-teal-700">
            <ShieldCheck className="h-4 w-4" />
            CareDesk Access
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Secure sign in for appointment tracking, reminders, and CareDesk sessions.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
            Patients can register, verify their email, stay signed in across refreshes, and review appointments from a clean healthcare dashboard.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Feature title="Supabase Auth" text="Session persistence, secure sign in, password reset, and email verification." />
            <Feature title="Booking dashboard" text="Track upcoming visits, completed consultations, and reminder alerts in one place." />
            <Feature title="Role protection" text="Admin tools stay restricted to users marked as admin in Supabase." />
            <Feature title="Calm medical UI" text="Soft shadows, premium cards, and responsive layouts that match CareDesk." />
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </button>
        </article>

        <article className="rounded-[30px] border border-slate-200 bg-white/88 p-6 shadow-[0_28px_90px_-38px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:p-8">
          {session && mode !== 'reset' ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Session active</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">You are already signed in.</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Continue to {role === 'admin' ? 'the admin control center' : 'your booking dashboard'}.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onNavigate(role === 'admin' ? '/admin' : '/dashboard')}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700"
                >
                  Open {role === 'admin' ? 'Admin' : 'My'} Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Stay on homepage
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {authTabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                      mode === id ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {mode === 'signin' ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <Heading title="Sign in to CareDesk" text="Manage sessions securely and open your healthcare dashboard." />
                    <Input
                      label="Email"
                      type="email"
                      value={signInForm.email}
                      onChange={(event) => setSignInForm((current) => ({ ...current, email: event.target.value }))}
                    />
                    <Input
                      label="Password"
                      type="password"
                      value={signInForm.password}
                      onChange={(event) => setSignInForm((current) => ({ ...current, password: event.target.value }))}
                    />
                    <SubmitButton submitting={submitting} label="Sign in" />
                  </form>
                ) : null}

                {mode === 'signup' ? (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <Heading title="Create your account" text="Register once and keep future appointments in your personal portal." />
                    <Input
                      label="Full name"
                      value={signUpForm.fullName}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, fullName: event.target.value }))}
                    />
                    <Input
                      label="Phone"
                      value={signUpForm.phone}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={signUpForm.email}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, email: event.target.value }))}
                    />
                    <Input
                      label="Password"
                      type="password"
                      value={signUpForm.password}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, password: event.target.value }))}
                    />
                    <SubmitButton submitting={submitting} label="Register" />
                  </form>
                ) : null}

                {mode === 'verify' ? (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <Heading title="Verify email OTP" text="Paste the OTP from your email to complete account verification." />
                    <Input
                      label="Email"
                      type="email"
                      value={verifyForm.email}
                      onChange={(event) => setVerifyForm((current) => ({ ...current, email: event.target.value }))}
                    />
                    <Input
                      label="OTP code"
                      value={verifyForm.token}
                      onChange={(event) => setVerifyForm((current) => ({ ...current, token: event.target.value }))}
                    />
                    <SubmitButton submitting={submitting} label="Verify email" />
                  </form>
                ) : null}

                {mode === 'forgot' ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <Heading title="Reset your password" text="We’ll send a secure recovery link to your email address." />
                    <Input
                      label="Email"
                      type="email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                    />
                    <SubmitButton submitting={submitting} label="Send reset email" />
                  </form>
                ) : null}

                {mode === 'reset' ? (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <Heading title="Choose a new password" text="Set a fresh password to finish the recovery flow." />
                    <Input
                      label="New password"
                      type="password"
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                    />
                    <SubmitButton submitting={submitting} label="Update password" />
                  </form>
                ) : null}
              </div>

              {message ? (
                <div
                  className={`mt-6 rounded-2xl px-4 py-3 text-sm font-medium ${
                    message.type === 'success' ? 'bg-teal-50 text-teal-900' : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  {message.text}
                </div>
              ) : null}
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function Feature({ title, text }) {
  return (
    <article className="rounded-2xl border border-white/70 bg-white/78 p-4 shadow-[0_22px_58px_-38px_rgba(15,23,42,0.24)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_68px_-34px_rgba(15,23,42,0.26)]">
      <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-teal-700">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function Heading({ title, text }) {
  return (
    <div>
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        {...props}
        required
        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-950 shadow-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
    </label>
  );
}

function SubmitButton({ submitting, label }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:bg-slate-300"
    >
      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  );
}
