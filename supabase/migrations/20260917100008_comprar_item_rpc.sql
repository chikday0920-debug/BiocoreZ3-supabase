-- Reemplaza la Cloud Function callable comprarItem. A diferencia del
-- comportamiento original en Firebase (que volvía a cobrar si el usuario ya
-- tenía el ítem), aquí se bloquea la recompra explícitamente.
create or replace function public.comprar_item(p_item_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.tienda%rowtype;
  v_usuario public.usuarios%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  select * into v_item from public.tienda where id = p_item_id;
  if not found then
    raise exception 'item-not-found';
  end if;

  if exists (select 1 from public.inventario where usuario_id = v_uid and item_id = p_item_id) then
    raise exception 'ya-tienes-este-item';
  end if;

  select * into v_usuario from public.usuarios where id = v_uid for update;

  if v_usuario.monedas < v_item.precio then
    raise exception 'monedas-insuficientes';
  end if;

  update public.usuarios set monedas = monedas - v_item.precio where id = v_uid;

  insert into public.inventario (usuario_id, item_id, nombre, imagen_url, precio_pagado)
  values (v_uid, p_item_id, v_item.nombre, v_item.imagen_url, v_item.precio);

  return json_build_object('ok', true);
end;
$$;

-- Igual que en registrar_analisis: revocar explícitamente de anon además de
-- PUBLIC, ya que Supabase concede EXECUTE por defecto a ambos roles.
revoke all on function public.comprar_item(text) from public, anon, authenticated;
grant execute on function public.comprar_item(text) to authenticated;
