-- Add earnings growth fields to fi_settings
alter table fi_settings
  add column if not exists salary_growth_rate numeric(5,2) not null default 0,
  add column if not exists salary_jumps       jsonb        not null default '[]';
