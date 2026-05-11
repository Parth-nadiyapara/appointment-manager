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

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
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
    .select('starts_at')
    .gte('starts_at', dayStart)
    .lte('starts_at', dayEnd)
    .neq('status', 'cancelled');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ slots: buildDailySlots(date, service.duration_minutes, appointments) });
});

app.post('/api/bookings', async (req, res) => {
  const parsed = bookingSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid booking request.' });
    return;
  }

  const { serviceId, startsAt, date, lead } = parsed.data;

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

  const { data: existing, error: existingError } = await supabase
    .from('appointments')
    .select('id')
    .eq('starts_at', startsAt)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (existingError) {
    res.status(500).json({ error: existingError.message });
    return;
  }

  if (existing) {
    res.status(409).json({ error: 'That slot was just booked. Please choose another time.' });
    return;
  }

  const endsAt = new Date(new Date(startsAt).getTime() + service.duration_minutes * 60 * 1000).toISOString();

  const { data: savedLead, error: leadError } = await supabase
    .from('leads')
    .upsert(
      {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        inquiry: lead.inquiry,
        status: 'New'
      },
      { onConflict: 'email' }
    )
    .select()
    .single();

  if (leadError) {
    res.status(500).json({ error: leadError.message });
    return;
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      lead_id: savedLead.id,
      service_id: serviceId,
      customer_name: lead.name,
      customer_email: lead.email,
      customer_phone: lead.phone,
      starts_at: startsAt,
      ends_at: endsAt,
      status: 'booked'
    })
    .select()
    .single();

  if (appointmentError) {
    if (appointmentError.code === '23505') {
      res.status(409).json({ error: 'That slot was just booked. Please choose another time.' });
      return;
    }

    res.status(500).json({ error: appointmentError.message });
    return;
  }

  res.status(201).json({ appointment, lead: savedLead });
});

app.get('/api/admin/dashboard', requireUser, async (req, res) => {
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

app.patch('/api/admin/leads/:id/status', requireUser, async (req, res) => {
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
