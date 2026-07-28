UPDATE public.profiles
SET is_platform_admin = true,
    role = 'staff',
    name = 'Nuvo Owner',
    gym_id = (SELECT id FROM public.gyms WHERE slug = 'platform')
WHERE id = 'dc6fc0cc-2562-45b1-add1-0156ec9cc070';