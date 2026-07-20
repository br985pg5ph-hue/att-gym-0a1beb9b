-- Placeholder Amman, Jordan business data for the gym_info row.
-- Replace with the gym's real street address, phone number, and
-- lat/lng coordinates once confirmed by the business.
UPDATE public.gym_info
SET
  address = 'King Abdullah II St, Amman, Jordan',
  phone = '+962 6 000 0000',
  lat = 31.963158,
  lng = 35.930359
WHERE id = 1;