create extension if not exists "pgcrypto";

create type lead_status as enum ('New', 'Contacted', 'Converted', 'Lost');
create type appointment_status as enum ('booked', 'completed', 'cancelled', 'no_show');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  owner_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  duration_minutes int not null check (duration_minutes > 0),
  price numeric(10, 2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  inquiry text,
  status lead_status not null default 'New',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  service_id uuid not null references services(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'booked',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create unique index appointments_unique_active_slot
  on appointments (service_id, starts_at)
  where status <> 'cancelled';

create index appointments_starts_at_idx on appointments (starts_at);
create index leads_status_idx on leads (status);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_set_updated_at
before update on leads
for each row execute function set_updated_at();

-- Optional seed service for first local run.
insert into services (name, duration_minutes, price)
values
  ('Clinic Consultation', 30, 500),
  ('Coaching Discovery Call', 45, 0)
on conflict do nothing;

-- RLS should be enabled before production. Public inserts can be allowed via
-- narrow policies or routed only through the Express API using the service key.
alter table profiles enable row level security;
alter table services enable row level security;
alter table leads enable row level security;
alter table appointments enable row level security;
