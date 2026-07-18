-- Reviews: prevent self-approval
DROP POLICY IF EXISTS "Users update own pending reviews" ON public.reviews;
CREATE POLICY "Users update own pending reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid() AND status = 'pending')
WITH CHECK (reviewer_id = auth.uid() AND status = 'pending');

-- Category groups: hide non-visible rows from public
DROP POLICY IF EXISTS "category_groups readable" ON public.category_groups;
CREATE POLICY "Public reads visible category groups"
ON public.category_groups
FOR SELECT
TO anon, authenticated
USING (visible = true);

CREATE POLICY "Admins read all category groups"
ON public.category_groups
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Category overrides: same treatment
DROP POLICY IF EXISTS "category_overrides readable" ON public.category_overrides;
CREATE POLICY "Public reads visible category overrides"
ON public.category_overrides
FOR SELECT
TO anon, authenticated
USING (visible = true);

CREATE POLICY "Admins read all category overrides"
ON public.category_overrides
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
