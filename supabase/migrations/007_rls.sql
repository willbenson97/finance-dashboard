-- ── Add user_id to every table ────────────────────────────────────────────
-- Using auth.uid() as default means new inserts are automatically tagged
-- to the currently-authenticated user — no hook changes required.

alter table assets
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

alter table positions
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

alter table asset_categories
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

alter table budget_items
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

alter table fi_settings
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

alter table debts
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- ── Fix category uniqueness: name only needs to be unique per user ─────────
alter table asset_categories drop constraint if exists asset_categories_name_key;
alter table asset_categories
  add constraint asset_categories_user_name_key unique (user_id, name);

-- ── Enable RLS on all tables ───────────────────────────────────────────────
alter table assets           enable row level security;
alter table positions        enable row level security;
alter table asset_categories enable row level security;
alter table budget_items     enable row level security;
alter table fi_settings      enable row level security;
alter table debts            enable row level security;

-- ── Policies: users can only see and modify their own rows ────────────────
-- assets
create policy "assets: own rows" on assets
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- positions
create policy "positions: own rows" on positions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- asset_categories
create policy "categories: own rows" on asset_categories
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- budget_items
create policy "budget_items: own rows" on budget_items
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- fi_settings
create policy "fi_settings: own rows" on fi_settings
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- debts
create policy "debts: own rows" on debts
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
