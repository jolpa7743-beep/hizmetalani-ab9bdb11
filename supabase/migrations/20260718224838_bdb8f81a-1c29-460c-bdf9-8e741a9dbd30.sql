ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS ad_placeholder_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ad_placeholder_url text NOT NULL DEFAULT '/iletisim',
  ADD COLUMN IF NOT EXISTS ad_placeholder_title text NOT NULL DEFAULT 'Buraya Reklam Verebilirsiniz',
  ADD COLUMN IF NOT EXISTS ad_placeholder_subtitle text NOT NULL DEFAULT 'Markanızı binlerce ziyaretçiye ulaştırın — hemen iletişime geçin.';