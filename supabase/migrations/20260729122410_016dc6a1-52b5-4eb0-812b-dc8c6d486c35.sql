ALTER TABLE public.gym_members
  ADD CONSTRAINT gym_members_user_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;