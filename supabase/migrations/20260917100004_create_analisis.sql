create extension if not exists pgcrypto;

-- Historial de escaneos. Append-only: nadie actualiza ni borra estas filas,
-- ni siquiera el dueño — es un registro, no algo editable.
create table public.analisis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  especie_id text not null,
  nombre_comun text,
  nombre_cientifico text,
  tipo text not null check (tipo in ('planta', 'animal')),
  rareza text not null check (rareza in ('legendary', 'rare', 'common')),
  confianza integer,
  imagen_path text not null,
  xp_ganada integer not null,
  es_nueva boolean not null,
  fecha timestamptz not null default now()
);

alter table public.analisis enable row level security;

create policy "analisis_select_own" on public.analisis
  for select using (auth.uid() = usuario_id);

-- Solo lectura por el dueño; la escritura la hace la función registrar_analisis.

-- Reemplazan los índices compuestos de firestore.indexes.json.
create index analisis_usuario_fecha_idx on public.analisis (usuario_id, fecha desc);
create index analisis_usuario_especie_fecha_idx on public.analisis (usuario_id, especie_id, fecha desc);
