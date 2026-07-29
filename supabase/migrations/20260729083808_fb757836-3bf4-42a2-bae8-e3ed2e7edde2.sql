insert into public.gyms (slug, name, status, address, phone, hours)
values ('preview', 'Member App', 'active', 'Preview workspace', '', '[]'::jsonb)
on conflict (slug) do update set status = 'active', name = 'Member App';