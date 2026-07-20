ALTER TABLE public.bookings DROP CONSTRAINT bookings_member_id_class_id_key;

CREATE UNIQUE INDEX bookings_unique_upcoming_slot
  ON public.bookings (
    member_id,
    COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid),
    class_id
  )
  WHERE status = 'upcoming';