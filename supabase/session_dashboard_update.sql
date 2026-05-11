alter table profiles
  add column if not exists role text not null default 'user'
  check (role in ('admin', 'user'));

alter table leads
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table appointments
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create table if not exists appointment_alerts (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  level text not null default 'info' check (level in ('info', 'warning', 'success')),
  status text not null default 'unread' check (status in ('unread', 'read')),
  remind_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists appointments_customer_user_idx on appointments (customer_user_id);
create index if not exists leads_user_idx on leads (user_id);
create index if not exists appointment_alerts_user_idx on appointment_alerts (user_id, remind_at desc);

create or replace function create_profile_for_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, business_name, owner_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'CareDesk User'),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure create_profile_for_new_user();

drop policy if exists "profiles_self_select" on profiles;
create policy "profiles_self_select"
  on profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update"
  on profiles
  for update
  using (auth.uid() = id);

drop policy if exists "appointments_user_select" on appointments;
create policy "appointments_user_select"
  on appointments
  for select
  using (auth.uid() = customer_user_id);

drop policy if exists "alerts_user_select" on appointment_alerts;
create policy "alerts_user_select"
  on appointment_alerts
  for select
  using (auth.uid() = user_id);

drop policy if exists "alerts_user_update" on appointment_alerts;
create policy "alerts_user_update"
  on appointment_alerts
  for update
  using (auth.uid() = user_id);

alter table appointment_alerts enable row level security;
