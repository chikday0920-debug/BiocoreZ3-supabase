-- Perfil de usuario. id = auth.users.id (mismo patrón que el doc-id-es-uid de Firestore).
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default 'Explorador',
  email text,
  avatar_url text,
  bio text,
  nivel integer not null default 1,
  xp integer not null default 0,
  monedas integer not null default 100,
  escaneos_totales integer not null default 0,
  especies_unicas integer not null default 0,
  creado_en timestamptz not null default now()
);

alter table public.usuarios enable row level security;

create policy "usuarios_select_own" on public.usuarios
  for select using (auth.uid() = id);

create policy "usuarios_update_own" on public.usuarios
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Firestore's rules restringían al cliente a editar solo nombre/avatarUrl/bio.
-- RLS no puede expresar una restricción por columna, así que se combina la
-- política de fila de arriba con privilegios a nivel de columna.
revoke update on public.usuarios from authenticated;
grant update (nombre, avatar_url, bio) on public.usuarios to authenticated;

-- nivel/xp/monedas/escaneos_totales/especies_unicas: nunca los toca el
-- cliente directamente, solo las funciones SECURITY DEFINER (ver migraciones
-- de registrar_analisis y comprar_item) y el trigger de creación de usuario.
