-- Add co-investments column to fi_settings
-- Stores an array of current (distribution-schedule) and future (return-model) vehicles
alter table fi_settings add column if not exists coinvests jsonb default '[]';
