
-- Add slug column
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS slug TEXT;

-- Turkish-aware slugify
CREATE OR REPLACE FUNCTION public.slugify_tr(input TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE s TEXT;
BEGIN
  IF input IS NULL THEN RETURN ''; END IF;
  s := input;
  s := translate(s, 'çÇğĞıIİöÖşŞüÜ', 'ccggiiiooossuu');
  s := lower(s);
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  s := left(s, 80);
  s := regexp_replace(s, '-+$', '', 'g');
  IF s = '' THEN s := 'ilan'; END IF;
  RETURN s;
END; $$;

-- Backfill unique slugs
DO $$
DECLARE r RECORD; base TEXT; candidate TEXT; n INT;
BEGIN
  FOR r IN SELECT id, title FROM public.listings WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    base := public.slugify_tr(r.title);
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.listings WHERE slug = candidate AND id <> r.id) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE public.listings SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.listings ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS listings_slug_key ON public.listings (slug);

-- Trigger to assign slug on insert/update
CREATE OR REPLACE FUNCTION public.listings_assign_slug()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base TEXT; candidate TEXT; n INT;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := public.slugify_tr(NEW.title);
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.listings WHERE slug = candidate AND id <> NEW.id) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS listings_assign_slug_trg ON public.listings;
CREATE TRIGGER listings_assign_slug_trg
  BEFORE INSERT OR UPDATE OF title, slug ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_assign_slug();
