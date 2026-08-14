
-- Storage policies (service_role bypasses, but allow anon read via signed URLs unnecessary; we serve via server route with admin client, so no extra policies required for objects. Still add permissive service_role via default).

-- Broadcasts table
CREATE TABLE public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_id text,
  image_content_type text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.broadcasts TO anon, authenticated;
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read broadcasts" ON public.broadcasts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert broadcasts" ON public.broadcasts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public delete broadcasts" ON public.broadcasts FOR DELETE TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
ALTER TABLE public.broadcasts REPLICA IDENTITY FULL;

-- Notification subscribers (whitelist)
CREATE TABLE public.notification_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.notification_subscribers TO anon, authenticated;
GRANT ALL ON public.notification_subscribers TO service_role;
ALTER TABLE public.notification_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert subscribers" ON public.notification_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public read subscribers count" ON public.notification_subscribers FOR SELECT TO anon, authenticated USING (true);
