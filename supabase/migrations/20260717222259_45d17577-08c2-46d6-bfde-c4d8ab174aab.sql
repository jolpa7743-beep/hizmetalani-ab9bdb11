-- profiles tablosuna herkesin görebileceği güvenli bir SELECT policy ekle.
-- profiles_public view'ü security_invoker=on ile çalıştığı için, ziyaretçilerin
-- başkalarının profilini görmesi bu policy olmadan mümkün değildi ("Üye bulunamadı").
CREATE POLICY "Public can view profiles via public view"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);