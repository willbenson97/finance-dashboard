-- Asset categories (user-defined)
create table if not exists asset_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  return_rate numeric(5, 2) not null default 7,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now()
);
alter table asset_categories disable row level security;

-- Budget items (income / tax / expense line items)
create table if not exists budget_items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null check (type in ('income', 'tax', 'expense')),
  amount     numeric(15, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table budget_items disable row level security;

create trigger budget_items_updated_at before update on budget_items
  for each row execute function update_updated_at();

-- Replace hardcoded category text with FK on assets
alter table assets drop column if exists category;
alter table assets
  add column if not exists category_id uuid references asset_categories(id) on delete set null;

-- Same for positions
alter table positions drop column if exists category;
alter table positions
  add column if not exists category_id uuid references asset_categories(id) on delete set null;

-- Remove per-category and monthly savings columns from fi_settings
alter table fi_settings
  drop column if exists return_cash,
  drop column if exists return_retirement,
  drop column if exists return_stocks,
  drop column if exists return_private_equity,
  drop column if exists monthly_savings,
  drop column if exists expected_return;
