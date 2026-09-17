-- Fotos de escaneo (privado) y fotos de perfil (público de lectura).
-- Reemplazan storage.rules.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('scans', 'scans', false, 10485760, array['image/*']),
  ('avatars', 'avatars', true, 5242880, array['image/*'])
on conflict (id) do nothing;

-- scans/{uid}/{fileName}: cada usuario solo lee/escribe dentro de su propia carpeta.
create policy "scans_select_own" on storage.objects
  for select using (bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "scans_insert_own" on storage.objects
  for insert with check (bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "scans_update_own" on storage.objects
  for update using (bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "scans_delete_own" on storage.objects
  for delete using (bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]);

-- avatars/{uid}/{fileName}: lectura pública (bucket público, sin política de
-- select necesaria), solo el dueño puede escribir la suya.
create policy "avatars_insert_own" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_delete_own" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
