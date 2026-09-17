-- Ítems comprados en la tienda. Un usuario posee cada ítem a lo sumo una vez
-- (PK compuesta = antiguo doc-id de la subcolección inventario/{itemId}).
create table public.inventario (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  item_id text not null references public.tienda(id),
  nombre text not null,
  imagen_url text,
  precio_pagado integer not null,
  comprado_en timestamptz not null default now(),
  primary key (usuario_id, item_id)
);

alter table public.inventario enable row level security;

create policy "inventario_select_own" on public.inventario
  for select using (auth.uid() = usuario_id);

-- Solo lectura por el dueño; la escritura la hace la función comprar_item.

-- Un registro por especie distinta ya vista por el usuario (alimenta
-- gaiadex.html sin tener que leer todo el historial de "analisis").
create table public.especies_vistas (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  especie_id text not null,
  nombre_comun text,
  nombre_cientifico text,
  tipo text not null check (tipo in ('planta', 'animal')),
  rareza text not null check (rareza in ('legendary', 'rare', 'common')),
  confianza integer,
  imagen_path text,
  ultima_vez timestamptz not null default now(),
  primera_vez timestamptz not null default now(),
  primary key (usuario_id, especie_id)
);

alter table public.especies_vistas enable row level security;

create policy "especies_vistas_select_own" on public.especies_vistas
  for select using (auth.uid() = usuario_id);

-- Solo lectura por el dueño; la escritura la hace la función registrar_analisis.
