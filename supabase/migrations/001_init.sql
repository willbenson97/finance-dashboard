-- Assets table (for Net Worth tracker)
create table if not exists assets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null check (category in ('cash', 'retirement', 'stocks', 'private_equity')),
  value       numeric(15, 2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Positions table (for Portfolio analyzer)
create table if not exists positions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  ticker        text,
  category      text not null check (category in ('cash', 'retirement', 'stocks', 'private_equity')),
  shares        numeric(18, 4),
  cost_basis    numeric(15, 2),
  current_value numeric(15, 2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- FI settings (single-row config per user)
create table if not exists fi_settings (
  id                  uuid primary key default gen_random_uuid(),
  current_net_worth   numeric(15, 2) not null default 0,
  monthly_savings     numeric(15, 2) not null default 0,
  expected_return     numeric(5, 2)  not null default 7,
  target_number       numeric(15, 2) not null default 0,
  safe_withdrawal_rate numeric(4, 2) not null default 4,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Auto-update updated_at on any row change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assets_updated_at before update on assets
  for each row execute function update_updated_at();

create trigger positions_updated_at before update on positions
  for each row execute function update_updated_at();

create trigger fi_settings_updated_at before update on fi_settings
  for each row execute function update_updated_at();

-- Disable RLS for single-user personal use (enable & add policies if you add auth)
alter table assets disable row level security;
alter table positions disable row level security;
alter table fi_settings disable row level security;
