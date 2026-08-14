CREATE TABLE public.apps (
  id text NOT NULL PRIMARY KEY,
  app_name text NOT NULL,
  description text DEFAULT ''::text NOT NULL,
  download_url text DEFAULT ''::text NOT NULL,
  icon_id text,
  icon_external_url text,
  icon_content_type text,
  apk_id text,
  apk_content_type text,
  apk_size bigint,
  download_count bigint DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps TO authenticated, anon;
GRANT ALL ON public.apps TO service_role;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read apps" ON public.apps FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can insert apps" ON public.apps FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Anyone can update apps" ON public.apps FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete apps" ON public.apps FOR DELETE TO authenticated, anon USING (true);

CREATE TABLE public.broadcasts (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  title text NOT NULL,
  body text DEFAULT ''::text NOT NULL,
  image_id text,
  image_content_type text,
  url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated, anon;
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read broadcasts" ON public.broadcasts FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "public insert broadcasts" ON public.broadcasts FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "public delete broadcasts" ON public.broadcasts FOR DELETE TO authenticated, anon USING (true);

CREATE TABLE public.notification_subscribers (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  client_id text NOT NULL UNIQUE,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_subscribers TO authenticated, anon;
GRANT ALL ON public.notification_subscribers TO service_role;
ALTER TABLE public.notification_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read subscribers count" ON public.notification_subscribers FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "public insert subscribers" ON public.notification_subscribers FOR INSERT TO authenticated, anon WITH CHECK (true);