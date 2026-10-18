CREATE TABLE public.medicine_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  stock numeric NOT NULL DEFAULT 0,
  daily_usage numeric NOT NULL DEFAULT 0,
  expiry_date date,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicine_stock TO authenticated;
GRANT ALL ON public.medicine_stock TO service_role;
ALTER TABLE public.medicine_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock select" ON public.medicine_stock FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own stock insert" ON public.medicine_stock FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own stock update" ON public.medicine_stock FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own stock delete" ON public.medicine_stock FOR DELETE TO authenticated USING (auth.uid() = user_id);