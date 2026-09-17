-- Catálogo de la tienda. Público de lectura, nadie escribe desde el cliente
-- (solo la función comprar_item, vía SECURITY DEFINER, lee de aquí).
create table public.tienda (
  id text primary key,
  nombre text not null,
  categoria text,
  precio integer not null,
  emoji text,
  descripcion text,
  imagen_url text
);

alter table public.tienda enable row level security;

create policy "tienda_select_all" on public.tienda
  for select using (true);

-- Fichas de referencia curadas (opcional, alimenta especie.html). Público de
-- lectura, nadie escribe desde el cliente.
create table public.especies (
  id text primary key,
  nombre_comun text,
  nombre_cientifico text,
  tipo text check (tipo in ('planta', 'animal')),
  imagen_url text,
  descripcion text
);

alter table public.especies enable row level security;

create policy "especies_select_all" on public.especies
  for select using (true);
