import React, { useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2, LogIn, ShieldCheck, UserPlus2 } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

const fullNamePattern = /^[A-Za-z][A-Za-z\s]{1,59}$/;
const phonePattern = /^[6-9]\d{9}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,32}$/;

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AuthPortal({ session, role, onNavigate, embedded = false }) {
  const [mode, setMode] = useState('signin');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ fullName: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [forgotForm, setForgotForm] = useState({ fullName: '', phone: '', email: '', newPassword: '', confirmPassword: '' });

  const authTabs = useMemo(
    () => [
      { id: 'signin', label: 'Sign in', icon: LogIn },
      { id: 'signup', label: 'Register', icon: UserPlus2 },
      { id: 'forgot', label: 'Forgot password', icon: KeyRound }
    ],
    []
  );

  function validateRegistration(form) {
    if (!fullNamePattern.test(form.fullName.trim())) {
      return 'Enter a valid full name using letters and spaces only.';
    }
    if (!phonePattern.test(form.phone.trim())) {
      return 'Enter a valid 10-digit mobile number.';
    }
    if (!validateEmail(form.email.trim())) {
      return 'Enter a valid email address.';
    }
    if (!passwordPattern.test(form.password)) {
      return 'Password must be 8-32 characters with uppercase, lowercase, number, and special character.';
    }
    if (form.password !== form.confirmPassword) {
      return 'Password and confirm password must match.';
    }
    return null;
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    if (!validateEmail(signInForm.email.trim())) {
      setMessage({ type: 'error', text: 'Enter a valid email address.' });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: signInForm.email.trim(),
      password: signInForm.password
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Signed in successfully. Opening your CareDesk dashboard...' });
    }

    setSubmitting(false);
  }

  async function handleSignUp(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const validationError = validateRegistration(signUpForm);
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      setSubmitting(false);
      return;
    }

    try {
      await api.register({
        fullName: signUpForm.fullName.trim(),
        phone: signUpForm.phone.trim(),
        email: signUpForm.email.trim(),
        password: signUpForm.password
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: signUpForm.email.trim(),
        password: signUpForm.password
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Registration complete. Your CareDesk account is ready.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }

    setSubmitting(false);
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const validationError = validateRegistration({
      ...forgotForm,
      password: forgotForm.newPassword,
      confirmPassword: forgotForm.confirmPassword
    });
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      setSubmitting(false);
      return;
    }

    try {
      await api.recoverPassword({
        fullName: forgotForm.fullName.trim(),
        phone: forgotForm.phone.trim(),
        email: forgotForm.email.trim(),
        newPassword: forgotForm.newPassword
      });
      setMessage({ type: 'success', text: 'Password updated. You can sign in with your new password now.' });
      setMode('signin');
      setSignInForm((current) => ({ ...current, email: forgotForm.email.trim() }));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }

    setSubmitting(false);
  }

  const content = (
    <article className={`rounded-[30px] border border-slate-200 bg-white/92 p-6 shadow-[0_28px_90px_-38px_rgba(15,23,42,0.22)] backdrop-blur-sm ${embedded ? '' : 'sm:p-8'}`}>
      {session ? (
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
            {!embedded ? (
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Stay on homepage
              </button>
            ) : null}
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
                <Heading title="Sign in to CareDesk" text="Login first, then book and manage appointments from your personal dashboard." />
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
                <Heading title="Create your account" text="Register with valid details before booking any appointment." />
                <Input
                  label="Full name"
                  value={signUpForm.fullName}
                  onChange={(event) => setSignUpForm((current) => ({ ...current, fullName: event.target.value }))}
                  pattern="[A-Za-z][A-Za-z\\s]{1,59}"
                />
                <Input
                  label="Phone"
                  value={signUpForm.phone}
                  onChange={(event) => setSignUpForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
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
                  minLength={8}
                />
                <Input
                  label="Confirm password"
                  type="password"
                  value={signUpForm.confirmPassword}
                  onChange={(event) => setSignUpForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  minLength={8}
                />
                <PasswordHint />
                <SubmitButton submitting={submitting} label="Register" />
              </form>
            ) : null}

            {mode === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Heading title="Change your password" text="Enter your name, email, and mobile number exactly as saved in CareDesk." />
                <Input
                  label="Full name"
                  value={forgotForm.fullName}
                  onChange={(event) => setForgotForm((current) => ({ ...current, fullName: event.target.value }))}
                  pattern="[A-Za-z][A-Za-z\\s]{1,59}"
                />
                <Input
                  label="Phone"
                  value={forgotForm.phone}
                  onChange={(event) => setForgotForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                />
                <Input
                  label="Email"
                  type="email"
                  value={forgotForm.email}
                  onChange={(event) => setForgotForm((current) => ({ ...current, email: event.target.value }))}
                />
                <Input
                  label="New password"
                  type="password"
                  value={forgotForm.newPassword}
                  onChange={(event) => setForgotForm((current) => ({ ...current, newPassword: event.target.value }))}
                  minLength={8}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  value={forgotForm.confirmPassword}
                  onChange={(event) => setForgotForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  minLength={8}
                />
                <PasswordHint />
                <SubmitButton submitting={submitting} label="Change password" />
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
  );

  if (embedded) {
    return content;
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
            Secure sign in and registration for bookings, dashboards, and appointment tracking.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
            Register once, stay signed in across refreshes, and manage all future consultations from your patient dashboard.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Feature title="Required login" text="Booking is available only after a valid CareDesk sign in or registration." />
            <Feature title="Session persistence" text="Supabase keeps authenticated users signed in across refreshes and route changes." />
            <Feature title="Personal dashboard" text="Upcoming appointments, completed visits, and alerts stay available in one place." />
            <Feature title="Secure recovery" text="Password change is allowed only after matching name, email, and mobile records." />
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

        {content}
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

function PasswordHint() {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
      Use 8 to 32 characters with uppercase, lowercase, number, and special character.
    </p>
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
