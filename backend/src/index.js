import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { buildDailySlots } from './slots.js';
import { supabase } from './supabase.js';
import { endOfIstDayUtc, getIstToday, isoToIstDate, startOfIstDayUtc } from './time.js';

const app = express();
const port = process.env.PORT || 4000;

// ✅ FIXED: Use the array we defined
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_ORIGIN,
  process.env.ADMIN_ORIGIN
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    }
  })
);

app.use(express.json());

function normalizeService(service) {
  if (!service) {
    return service;
  }

  if (service.name === 'Coaching Discovery Call' && service.duration_minutes !== 30) {
    return {
      ...service,
      duration_minutes: 30
    };
  }

  return service;
}

function getRoleFromIdentity(profile, user) {
  return profile?.role || user?.app_metadata?.role || user?.user_metadata?.role || 'user';
}

async function findOrCreateProfile(user) {
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  const metadata = user.user_metadata || {};
  const fallbackName = metadata.full_name || metadata.owner_name || user.email?.split('@')[0] || 'CareDesk User';
  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      business_name: metadata.business_name || fallbackName,
      owner_name: metadata.full_name || metadata.owner_name || fallbackName,
      phone: metadata.phone || null
    })
    .select()
    .single();

  if (createError) {
    throw createError;
  }

  return createdProfile;
}

async function tryGetUserFromToken(req) {
  const token = req.header('authorization')?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

function buildGeneratedAlerts(appointments, storedAlerts = []) {
  const now = Date.now();
  const storedByAppointmentId = new Map(
    storedAlerts
      .filter((alert) => alert.appointment_id)
      .map((alert) => [alert.appointment_id, alert])
  );

  return appointments
    .flatMap((appointment) => {
      const startsAt = new Date(appointment.starts_at).getTime();
      const msUntilStart = startsAt - now;
      if (msUntilStart <= 0 || msUntilStart > 60 * 60 * 1000) {
        return [];
      }

      const storedAlert = storedByAppointmentId.get(appointment.id);
      return [
        {
          id: storedAlert?.id || `reminder-${appointment.id}`,
          level: 'warning',
          status: storedAlert?.status || 'unread',
          title: 'Your consultation starts within 1 hour',
          message: `${appointment.service_name} starts soon. Please be ready for your session.`,
          remind_at: storedAlert?.remind_at || new Date(startsAt - 60 * 60 * 1000).toISOString(),
          appointment_id: appointment.id
        }
      ];
    })
    .sort((a, b) => new Date(b.remind_at).getTime() - new Date(a.remind_at).getTime());
}

async function fetchUserAlerts(user, appointments) {
  const { data, error } = await supabase
    .from('appointment_alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('remind_at', { ascending: false })
    .limit(12);

  if (error) {
    return buildGeneratedAlerts(appointments);
  }

  return buildGeneratedAlerts(appointments, data || []);
}

async function createAppointmentAlerts(appointment, serviceName, userId) {
  if (!userId) {
    return;
  }

  const startsAt = new Date(appointment.starts_at);
  const oneHourBefore = new Date(startsAt.getTime() - 60 * 60 * 1000);
  if (oneHourBefore.getTime() > Date.now()) {
    await supabase.from('appointment_alerts').insert({
      appointment_id: appointment.id,
      user_id: userId,
      level: 'warning',
      status: 'unread',
      title: 'Your consultation starts within 1 hour',
      message: `${serviceName} starts in 1 hour. Please be ready for your session.`,
      remind_at: oneHourBefore.toISOString()
    });
  }
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

async function requireUser(req, res, next) {
  const token = req.header('authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }

  req.user = data.user;
  try {
    req.profile = await findOrCreateProfile(data.user);
    req.role = getRoleFromIdentity(req.profile, data.user);
  } catch (profileError) {
    res.status(500).json({ error: profileError.message });
    return;
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.role !== 'admin') {
    res.status(403).json({ error: 'Admin access only.' });
    return;
  }

  next();
}

const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startsAt: z.string().datetime(),
  lead: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
    inquiry: z.string().optional().default('')
  })
});
const registerSchema = z.object({
  fullName: z.string().min(2).max(60).regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z
    .string()
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|in|org|net|edu|co\.in)$/i),
  password: z
    .string()
    .min(6)
    .max(8)
    .regex(/^.{6,8}$/)
});
const recoverPasswordSchema = z.object({
  fullName: z.string().min(2).max(60).regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/),
  email: z
    .string()
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|in|org|net|edu|co\.in)$/i),
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6).max(8).regex(/^.{6,8}$/)
});
const verifyPasswordResetSchema = z.object({
  fullName: z.string().min(2).max(60).regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/),
  email: z
    .string()
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|in|org|net|edu|co\.in)$/i),
  currentPassword: z.string().min(6)
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration details.' });
    return;
  }

  const { fullName, phone, email, password } = parsed.data;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
      role: 'user'
    }
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  try {
    await findOrCreateProfile(data.user);
  } catch (profileError) {
    res.status(500).json({ error: profileError.message });
    return;
  }

  res.status(201).json({ ok: true });
});

app.post('/api/auth/recover-password', async (req, res) => {
  const parsed = recoverPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid recovery request.' });
    return;
  }

  const { fullName, email, currentPassword, newPassword } = parsed.data;
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword
  });

  if (signInError || !signInData.user) {
    res.status(403).json({ error: 'The provided credentials do not match our records.' });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('owner_name')
    .eq('id', signInData.user.id)
    .maybeSingle();

  if (profileError) {
    res.status(500).json({ error: profileError.message });
    return;
  }

  const savedName = normalizeName(profile?.owner_name || signInData.user.user_metadata?.full_name);

  if (savedName !== normalizeName(fullName)) {
    res.status(403).json({ error: 'The provided credentials do not match our records.' });
    return;
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(signInData.user.id, {
    password: newPassword
  });

  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  res.json({ ok: true });
});

app.post('/api/auth/verify-password-reset', async (req, res) => {
  const parsed = verifyPasswordResetSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid recovery request.' });
    return;
  }

  const { fullName, email, currentPassword } = parsed.data;
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword
  });

  if (signInError || !signInData.user) {
    res.status(403).json({ error: 'The provided credentials do not match our records.' });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('owner_name')
    .eq('id', signInData.user.id)
    .maybeSingle();

  if (profileError) {
    res.status(500).json({ error: profileError.message });
    return;
  }

  const savedName = normalizeName(profile?.owner_name || signInData.user.user_metadata?.full_name);

  if (savedName !== normalizeName(fullName)) {
    res.status(403).json({ error: 'The provided credentials do not match our records.' });
    return;
  }

  res.json({ ok: true });
});

app.get('/api/me', requireUser, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email
    },
    profile: req.profile,
    role: req.role
  });
});

app.get('/api/services', async (req, res) => {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price')
    .eq('active', true)
    .order('name');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ services: data.map(normalizeService) });
});

app.get('/api/availability', async (req, res) => {
  const serviceId = String(req.query.serviceId || '');
  const date = String(req.query.date || '');

  if (!serviceId || !date) {
    res.status(400).json({ error: 'serviceId and date are required.' });
    return;
  }

  const { data: serviceData, error: serviceError } = await supabase
    .from('services')
    .select('name, duration_minutes')
    .eq('id', serviceId)
    .single();

  if (serviceError) {
    res.status(404).json({ error: 'Service not found.' });
    return;
  }
  const service = normalizeService(serviceData);

  const dayStart = startOfIstDayUtc(date);
  const dayEnd = endOfIstDayUtc(date);
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('starts_at, ends_at')
    .gte('starts_at', dayStart)
    .lte('starts_at', dayEnd)
    .neq('status', 'cancelled');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ slots: buildDailySlots(date, service.duration_minutes, appointments) });
});

app.post('/api/bookings', requireUser, async (req, res) => {
  const parsed = bookingSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid booking request.' });
    return;
  }

  const { serviceId, startsAt, date, lead } = parsed.data;
  const authenticatedUser = req.user;

  const { data: serviceData, error: serviceError } = await supabase
    .from('services')
    .select('id, name, duration_minutes')
    .eq('id', serviceId)
    .single();

  if (serviceError) {
    res.status(404).json({ error: 'Service not found.' });
    return;
  }
  const service = normalizeService(serviceData);

  if (isoToIstDate(startsAt) !== date) {
    res.status(400).json({ error: 'Selected slot does not belong to the chosen IST date.' });
    return;
  }

  if (new Date(startsAt).getTime() <= Date.now()) {
    res.status(409).json({ error: 'That time has already passed in IST. Please choose a later slot.' });
    return;
  }

  const endsAt = new Date(new Date(startsAt).getTime() + service.duration_minutes * 60 * 1000).toISOString();

  const { data: existingAppointments, error: existingError } = await supabase
    .from('appointments')
    .select('id, starts_at, ends_at')
    .lt('starts_at', endsAt)
    .gt('ends_at', startsAt)
    .neq('status', 'cancelled')
    .limit(1);

  if (existingError) {
    res.status(500).json({ error: existingError.message });
    return;
  }

  if ((existingAppointments || []).length > 0) {
    res.status(409).json({ error: 'That slot was just booked. Please choose another time.' });
    return;
  }

  const leadPayload = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    inquiry: lead.inquiry,
    status: 'New'
  };

  const primaryLeadPayload = authenticatedUser?.id ? { ...leadPayload, user_id: authenticatedUser.id } : leadPayload;
  let { data: savedLead, error: leadError } = await supabase
    .from('leads')
    .upsert(primaryLeadPayload, { onConflict: 'email' })
    .select()
    .single();

  if (leadError && leadError.message?.includes('user_id')) {
    const retry = await supabase.from('leads').upsert(leadPayload, { onConflict: 'email' }).select().single();
    savedLead = retry.data;
    leadError = retry.error;
  }

  if (leadError) {
    res.status(500).json({ error: leadError.message });
    return;
  }

  const appointmentPayload = {
    lead_id: savedLead.id,
    service_id: serviceId,
    customer_name: lead.name,
    customer_email: lead.email,
    customer_phone: lead.phone,
    starts_at: startsAt,
    ends_at: endsAt,
    status: 'booked'
  };
  const primaryAppointmentPayload = authenticatedUser?.id
    ? { ...appointmentPayload, customer_user_id: authenticatedUser.id }
    : appointmentPayload;

  let { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert(primaryAppointmentPayload)
    .select()
    .single();

  if (appointmentError && appointmentError.message?.includes('customer_user_id')) {
    const retry = await supabase.from('appointments').insert(appointmentPayload).select().single();
    appointment = retry.data;
    appointmentError = retry.error;
  }

  if (appointmentError) {
    if (appointmentError.code === '23505') {
      res.status(409).json({ error: 'That slot was just booked. Please choose another time.' });
      return;
    }

    res.status(500).json({ error: appointmentError.message });
    return;
  }

  await createAppointmentAlerts(appointment, service.name, authenticatedUser?.id || null);

  res.status(201).json({ appointment, lead: savedLead });
});

app.get('/api/user/dashboard', requireUser, async (req, res) => {
  const nowIso = new Date().toISOString();
  const userEmail = req.user.email || '';

  let { data: appointmentsData, error: appointmentsError } = await supabase
    .from('appointments')
    .select('id, service_id, customer_name, customer_email, starts_at, ends_at, status, services(name)')
    .or(`customer_email.eq.${userEmail},customer_user_id.eq.${req.user.id}`)
    .order('starts_at', { ascending: true })
    .limit(30);

  if (appointmentsError && appointmentsError.message?.includes('customer_user_id')) {
    const retry = await supabase
      .from('appointments')
      .select('id, service_id, customer_name, customer_email, starts_at, ends_at, status, services(name)')
      .eq('customer_email', userEmail)
      .order('starts_at', { ascending: true })
      .limit(30);
    appointmentsData = retry.data;
    appointmentsError = retry.error;
  }

  if (appointmentsError) {
    res.status(500).json({ error: appointmentsError.message });
    return;
  }

  const appointments = (appointmentsData || []).map((appointment) => {
    const hasCompleted = new Date(appointment.ends_at).getTime() < Date.now() || appointment.status === 'completed';
    return {
      ...appointment,
      service_name: appointment.services?.name || 'Appointment',
      timeline_status: hasCompleted ? 'completed' : new Date(appointment.starts_at).toISOString() <= nowIso ? 'in_progress' : 'upcoming'
    };
  });

  const alerts = await fetchUserAlerts(req.user, appointments);
  const unreadAlerts = alerts.filter((alert) => alert.status !== 'read').length;

  res.json({
    profile: req.profile,
    role: req.role,
    kpis: {
      totalBookings: appointments.length,
      upcomingCount: appointments.filter((appointment) => appointment.timeline_status === 'upcoming').length,
      completedCount: appointments.filter((appointment) => appointment.timeline_status === 'completed').length,
      unreadAlerts
    },
    appointments,
    alerts
  });
});

app.patch('/api/user/alerts/:id/read', requireUser, async (req, res) => {
  const { data, error } = await supabase
    .from('appointment_alerts')
    .update({ status: 'read' })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .maybeSingle();

  if (error) {
    if (error.message?.includes('appointment_alerts')) {
      res.json({ alert: null });
      return;
    }
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ alert: data });
});

app.get('/api/admin/dashboard', requireUser, requireAdmin, async (req, res) => {
  const today = getIstToday();
  const dayStart = startOfIstDayUtc(today);
  const dayEnd = endOfIstDayUtc(today);

  const [leadsResult, todayAppointmentsResult, appointmentsResult] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(25),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('starts_at', dayStart)
      .lte('starts_at', dayEnd)
      .neq('status', 'cancelled'),
    supabase
      .from('appointments')
      .select('id, lead_id, service_id, customer_name, starts_at, services(name)')
      .gte('starts_at', new Date().toISOString())
      .neq('status', 'cancelled')
      .order('starts_at')
      .limit(12),
  ]);

  if (leadsResult.error || todayAppointmentsResult.error || appointmentsResult.error) {
    res.status(500).json({
      error:
        leadsResult.error?.message ||
        todayAppointmentsResult.error?.message ||
        appointmentsResult.error?.message
    });
    return;
  }

  const leads = leadsResult.data.map((lead) => ({
    ...lead,
    status_locked: false
  }));
  const pendingFollowUps = leads.filter(
    (lead) => lead.status === 'New' || lead.status === 'Contacted'
  ).length;
  const appointments = appointmentsResult.data.map((appointment) => ({
    ...appointment,
    service_name: appointment.services?.name || 'Appointment'
  }));

  res.json({
    kpis: {
      totalLeads: leadsResult.count || 0,
      appointmentsToday: todayAppointmentsResult.count || 0,
      pendingFollowUps
    },
    leads,
    appointments
  });
});

app.patch('/api/admin/leads/:id/status', requireUser, requireAdmin, async (req, res) => {
  const status = z.enum(['New', 'Contacted', 'Converted', 'Lost']).safeParse(req.body.status);

  if (!status.success) {
    res.status(400).json({ error: 'Invalid lead status.' });
    return;
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ status: status.data })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ lead: data });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
