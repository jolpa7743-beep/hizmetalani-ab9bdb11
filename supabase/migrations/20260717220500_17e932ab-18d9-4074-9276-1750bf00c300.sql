ALTER TABLE public.mod_actions DROP CONSTRAINT IF EXISTS mod_actions_target_type_check;
ALTER TABLE public.mod_actions ADD CONSTRAINT mod_actions_target_type_check
  CHECK (target_type IN ('review','report','payment','user','listing','ticket'));