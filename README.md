# Smart Appointment & Lead Management System

A full-stack starter for small clinics and coaching centers. The public page captures leads while booking appointments, and the admin dashboard tracks pipeline status, KPIs, and upcoming appointments.

## Folder Structure

```text
appointment-manager/
  frontend/
    src/
      App.jsx
      components/
        BookingForm.jsx
      lib/
        api.js
        analytics.js
        seo.js
        time.js
      main.jsx
      styles.css
    index.html
    public/
      robots.txt
      sitemap.xml
    package.json
    postcss.config.js
    tailwind.config.js
    .env.example
  backend/
    src/
      index.js
      slots.js
      supabase.js
      time.js
    package.json
    .env.example
  supabase/
    schema.sql
  .env.example
  package.json
  README.md
```

## Setup

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Copy `backend/.env.example` to `backend/.env` and set `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY`.
3. Copy `frontend/.env.example` to `frontend/.env` and set the Supabase anon key values plus the optional Google Analytics measurement id.
4. Install dependencies with `npm install`.
5. Run both apps with `npm run dev`.

The frontend runs on `http://localhost:5173` and the API runs on `http://localhost:4000`.

## Vercel Deployment

Deploy this repo as three separate Vercel projects:

1. Public site
   Root directory: `frontend`
2. Admin site
   Root directory: `admin`
3. API
   Root directory: `backend`

Recommended local dev ports:

- Public frontend: `5173`
- Admin frontend: `5174`
- Backend API: `4000`

Environment variables by project:

- `frontend`
  - `VITE_API_URL=https://your-backend-domain.vercel.app/api`
  - `VITE_SUPABASE_URL=...`
  - `VITE_SUPABASE_ANON_KEY=...`
  - `VITE_GA_MEASUREMENT_ID=...`
  - `VITE_ADMIN_URL=https://your-admin-domain.vercel.app`
- `admin`
  - `VITE_API_URL=https://your-backend-domain.vercel.app/api`
  - `VITE_SUPABASE_URL=...`
  - `VITE_SUPABASE_ANON_KEY=...`
- `backend`
  - `SUPABASE_URL=...`
  - `SUPABASE_SERVICE_ROLE_KEY=...`
  - `CLIENT_ORIGIN=https://your-frontend-domain.vercel.app`
  - `ADMIN_ORIGIN=https://your-admin-domain.vercel.app`
  - `PORT=4000`

The frontend and admin apps both include SPA rewrites through `vercel.json`, so direct page loads should not return Vercel `404 NOT_FOUND`.

## Core Logic

- The booking form requests available slots from `GET /api/availability`.
- `POST /api/bookings` re-checks the selected slot before inserting the appointment.
- The database has a partial unique index on `(service_id, starts_at)` for non-cancelled appointments, which is the final guard against double-booking.
- Availability is calculated in IST, and past same-day slots are filtered before they reach the public page.
- Successful bookings upsert the lead and set `status = 'Converted'`.
- The admin dashboard is protected by Supabase Auth on the client and by bearer-token verification on `/api/admin/*`.
- The dashboard route returns KPI cards, the lead pipeline, and upcoming appointments.

## SEO and Analytics

- `frontend/index.html` includes basic SEO metadata and social-sharing tags.
- `frontend/public/robots.txt` and `frontend/public/sitemap.xml` are included for deployment.
- Google Analytics is wired through `VITE_GA_MEASUREMENT_ID`.
- Replace `https://your-domain.vercel.app` with your real Vercel domain before launch.
