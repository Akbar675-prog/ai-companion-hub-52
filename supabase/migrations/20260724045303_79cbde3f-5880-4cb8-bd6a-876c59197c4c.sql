
ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS apk_id text,
  ADD COLUMN IF NOT EXISTS apk_content_type text,
  ADD COLUMN IF NOT EXISTS apk_size bigint;
