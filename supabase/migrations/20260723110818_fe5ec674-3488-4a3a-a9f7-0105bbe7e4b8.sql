CREATE TABLE public.apps (
  id text PRIMARY KEY,
  app_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  download_url text NOT NULL DEFAULT '',
  icon_id text,
  icon_external_url text,
  icon_content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.apps TO anon;
GRANT SELECT, INSERT, DELETE ON public.apps TO authenticated;
GRANT ALL ON public.apps TO service_role;

ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read apps"
  ON public.apps FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert apps"
  ON public.apps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can delete apps"
  ON public.apps FOR DELETE
  TO anon, authenticated
  USING (true);