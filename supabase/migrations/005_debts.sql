create table debts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null default 'other',
  current_balance numeric not null default 0,
  interest_rate numeric not null default 0,   -- annual %
  monthly_payment numeric not null default 0,
  created_at timestamptz default now()
);
alter table debts disable row level security;
