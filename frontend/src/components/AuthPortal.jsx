import React, { useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2, LogIn, ShieldCheck, UserPlus2 } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

const fullNamePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const phonePattern = /^[6-9]\d{9}$/;
const passwordPattern = /^\d{6,8}$/;
const strictEmailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|in|org|net|edu|co\.in)$/i;

function validateEmail(value) {
  return strictEmailPattern.test(value);
}

export default function AuthPortal({ session, role, onNavigate, embedded = false }) {
  const [mode, setMode] = useState('signin');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false
  });
  const [forgotForm, setForgotForm] = useState({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [forgotVerified, setForgotVerified] = useState(false);

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
      return 'Enter a valid full name using letters and one readable space between words.';
    }
    if (!phonePattern.test(form.phone.trim())) {
      return 'Enter a valid 10-digit mobile number.';
    }
    if (!validateEmail(form.email.trim())) {
      return 'Enter a valid email like name@gmail.com or name@domain.in.';
    }
    if (!passwordPattern.test(form.password)) {
      return 'Password must be 6 to 8 digits only.';
    }
    if (form.password !== form.confirmPassword) {
      return 'Password and confirm password must match.';
    }
    if (!form.acceptedTerms) {
      return 'Please accept the terms and conditions to continue.';
    }
    return null;
  }

  function validateForgotIdentity(form) {
    if (!fullNamePattern.test(form.fullName.trim())) {
      return 'Enter your full name using letters and one readable space between words.';
    }
    if (!validateEmail(form.email.trim())) {
      return 'Enter a valid email like name@gmail.com or name@domain.in.';
    }
    if (!passwordPattern.test(form.currentPassword)) {
      return 'Current password must be 6 to 8 digits only.';
    }
    return null;
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage(null);
    if (nextMode !== 'forgot') {
      setForgotVerified(false);
    }
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    if (!validateEmail(signInForm.email.trim())) {
      setMessage({ type: 'error', text: 'Enter a valid email like name@gmail.com or name@domain.in.' });
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
        setMessage({ type: 'success', text: 'Registration complete. Your account is ready for clinic and coaching bookings.' });
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

    const identityError = validateForgotIdentity(forgotForm);
    if (identityError) {
      setMessage({ type: 'error', text: identityError });
      setSubmitting(false);
      return;
    }

    if (!forgotVerified) {
      try {
        await api.verifyPasswordResetIdentity({
          fullName: forgotForm.fullName.trim(),
          email: forgotForm.email.trim(),
          currentPassword: forgotForm.currentPassword
        });
        setForgotVerified(true);
        setMessage({ type: 'success', text: 'Account verified. You can update the password now.' });
      } catch (error) {
        setMessage({ type: 'error', text: error.message });
      }
      setSubmitting(false);
      return;
    }

    if (!passwordPattern.test(forgotForm.newPassword)) {
      setMessage({ type: 'error', text: 'New password must be 6 to 8 digits only.' });
      setSubmitting(false);
      return;
    }

    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirm password must match.' });
      setSubmitting(false);
      return;
    }

    try {
      await api.recoverPassword({
        fullName: forgotForm.fullName.trim(),
        email: forgotForm.email.trim(),
        currentPassword: forgotForm.currentPassword,
        newPassword: forgotForm.newPassword
      });
      setMessage({ type: 'success', text: 'Password updated. You can sign in with your new password now.' });
      setForgotVerified(false);
      setForgotForm({ fullName: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' });
      setMode('signin');
      setSignInForm((current) => ({ ...current, email: forgotForm.email.trim(), password: '' }));
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
                onClick={() => switchMode(id)}
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
                <Heading title="Sign in to CareDesk" text="Log in first, then book and track clinic or coaching appointments from your dashboard." />
                <Input
                  label="Email"
                  type="email"
                  value={signInForm.email}
                  onChange={(event) => setSignInForm((current) => ({ ...current, email: event.target.value.trim() }))}
                />
                <Input
                  label="Password"
                  type="password"
                  value={signInForm.password}
                  onChange={(event) => setSignInForm((current) => ({ ...current, password: event.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  inputMode="numeric"
                  maxLength={8}
                />
                <SubmitButton submitting={submitting} label="Sign in" />
              </form>
            ) : null}

            {mode === 'signup' ? (
              <form onSubmit={handleSignUp} className="space-y-4">
                <Heading title="Create your account" text="Register with valid details before booking a clinic or coaching appointment." />
                <Input
                  label="Full name"
                  value={signUpForm.fullName}
                  onChange={(event) => setSignUpForm((current) => ({ ...current, fullName: event.target.value }))}
                  pattern="[A-Za-z]+( [A-Za-z]+)*"
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
                  onChange={(event) => setSignUpForm((current) => ({ ...current, email: event.target.value.trim() }))}
                />
                <Input
                  label="Password"
                  type="password"
                  value={signUpForm.password}
                  onChange={(event) => setSignUpForm((current) => ({ ...current, password: event.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  inputMode="numeric"
                  minLength={6}
                  maxLength={8}
                />
                <Input
                  label="Confirm password"
                  type="password"
                  value={signUpForm.confirmPassword}
                  onChange={(event) => setSignUpForm((current) => ({ ...current, confirmPassword: event.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  inputMode="numeric"
                  minLength={6}
                  maxLength={8}
                />
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={signUpForm.acceptedTerms}
                    onChange={(event) => setSignUpForm((current) => ({ ...current, acceptedTerms: event.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>I accept the terms and conditions for booking, reminders, and account access.</span>
                </label>
                <PasswordHint />
                <SubmitButton submitting={submitting} label="Register" />
              </form>
            ) : null}

            {mode === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Heading
                  title="Change your password"
                  text={
                    forgotVerified
                      ? 'Your account is confirmed. Enter the new password you want to use next.'
                      : 'Enter your name, email, and current password. If they match CareDesk records, password update will open.'
                  }
                />
                <Input
                  label="Full name"
                  value={forgotForm.fullName}
                  onChange={(event) => setForgotForm((current) => ({ ...current, fullName: event.target.value }))}
                  pattern="[A-Za-z]+( [A-Za-z]+)*"
                />
                <Input
                  label="Email"
                  type="email"
                  value={forgotForm.email}
                  onChange={(event) => setForgotForm((current) => ({ ...current, email: event.target.value.trim() }))}
                />
                <Input
                  label="Current password"
                  type="password"
                  value={forgotForm.currentPassword}
                  onChange={(event) => setForgotForm((current) => ({ ...current, currentPassword: event.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  inputMode="numeric"
                  minLength={6}
                  maxLength={8}
                />
                {forgotVerified ? (
                  <>
                    <Input
                      label="New password"
                      type="password"
                      value={forgotForm.newPassword}
                      onChange={(event) => setForgotForm((current) => ({ ...current, newPassword: event.target.value.replace(/\D/g, '').slice(0, 8) }))}
                      inputMode="numeric"
                      minLength={6}
                      maxLength={8}
                    />
                    <Input
                      label="Confirm new password"
                      type="password"
                      value={forgotForm.confirmPassword}
                      onChange={(event) => setForgotForm((current) => ({ ...current, confirmPassword: event.target.value.replace(/\D/g, '').slice(0, 8) }))}
                      inputMode="numeric"
                      minLength={6}
                      maxLength={8}
                    />
                    <PasswordHint />
                  </>
                ) : null}
                <SubmitButton submitting={submitting} label={forgotVerified ? 'Update password' : 'Check account'} />
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
            Secure sign in for patients, parents, and coaching learners before every appointment request.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
            Register once, stay signed in across refreshes, and manage clinic visits or counseling sessions from one calm dashboard.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Feature title="Required login" text="Booking opens only after a valid CareDesk sign in or registration." />
            <Feature title="Session persistence" text="Supabase keeps patients and learners signed in across refreshes and route changes." />
            <Feature title="Personal dashboard" text="Upcoming appointments, completed visits, and reminders stay available in one place." />
            <Feature title="Secure recovery" text="Password change is allowed only after matching your saved name, email, and current password." />
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
      Use 6 to 8 digits only.
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
