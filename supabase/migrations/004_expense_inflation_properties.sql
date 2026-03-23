-- Per-expense inflation rate (annual %)
alter table budget_items
  add column if not exists inflation_rate numeric(5,2) not null default 3;

-- Savings allocation and property purchases in fi_settings
alter table fi_settings
  add column if not exists savings_allocation jsonb not null default '[]',
  add column if not exists property_purchases jsonb not null default '[]';
