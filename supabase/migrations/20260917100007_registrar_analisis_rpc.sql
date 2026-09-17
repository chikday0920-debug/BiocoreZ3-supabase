-- Reemplaza la transacción de analyzePlant (backend/functions/index.js).
-- Solo la Edge Function analyze-plant la llama (con un cliente service_role),
-- nunca se expone al cliente directamente.
create or replace function public.registrar_analisis(
  p_usuario_id uuid,
  p_especie_id text,
  p_nombre_comun text,
  p_nombre_cientifico text,
  p_tipo text,
  p_rareza text,
  p_confianza integer,
  p_imagen_path text
)
returns table (analisis_id uuid, es_nueva boolean, xp_ganada integer, nivel_final integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.usuarios%rowtype;
  v_es_nueva boolean;
  v_xp_ganada integer;
  v_nuevo_xp integer;
  v_nuevo_nivel integer;
  v_xp_para_nivel integer;
  v_analisis_id uuid;
begin
  -- Lock de fila: mismo propósito que la transacción optimista de Firestore,
  -- serializa lecturas/escrituras concurrentes de xp/nivel del mismo usuario.
  select * into v_perfil from public.usuarios where id = p_usuario_id for update;
  if not found then
    raise exception 'usuario-no-encontrado';
  end if;

  v_es_nueva := not exists (
    select 1 from public.analisis
    where usuario_id = p_usuario_id and especie_id = p_especie_id
  );

  v_xp_ganada := 10 + (case when v_es_nueva then 25 else 0 end);

  -- Mismo algoritmo que xpParaNivel(nivel)=nivel*100 en index.js: acarrea el
  -- excedente de xp entre niveles.
  v_nuevo_xp := v_perfil.xp + v_xp_ganada;
  v_nuevo_nivel := v_perfil.nivel;
  v_xp_para_nivel := v_nuevo_nivel * 100;
  while v_nuevo_xp >= v_xp_para_nivel loop
    v_nuevo_xp := v_nuevo_xp - v_xp_para_nivel;
    v_nuevo_nivel := v_nuevo_nivel + 1;
    v_xp_para_nivel := v_nuevo_nivel * 100;
  end loop;

  insert into public.analisis (
    usuario_id, especie_id, nombre_comun, nombre_cientifico, tipo, rareza,
    confianza, imagen_path, xp_ganada, es_nueva
  ) values (
    p_usuario_id, p_especie_id, p_nombre_comun, p_nombre_cientifico, p_tipo, p_rareza,
    p_confianza, p_imagen_path, v_xp_ganada, v_es_nueva
  )
  returning id into v_analisis_id;

  update public.usuarios set
    xp = v_nuevo_xp,
    nivel = v_nuevo_nivel,
    escaneos_totales = escaneos_totales + 1,
    especies_unicas = especies_unicas + (case when v_es_nueva then 1 else 0 end)
  where id = p_usuario_id;

  -- merge/upsert: se actualiza la ficha con la foto/confianza más reciente de
  -- esa especie, pero primera_vez solo se fija una vez (default de columna).
  insert into public.especies_vistas (
    usuario_id, especie_id, nombre_comun, nombre_cientifico, tipo, rareza,
    confianza, imagen_path, ultima_vez
  ) values (
    p_usuario_id, p_especie_id, p_nombre_comun, p_nombre_cientifico, p_tipo, p_rareza,
    p_confianza, p_imagen_path, now()
  )
  on conflict (usuario_id, especie_id) do update set
    nombre_comun = excluded.nombre_comun,
    nombre_cientifico = excluded.nombre_cientifico,
    tipo = excluded.tipo,
    rareza = excluded.rareza,
    confianza = excluded.confianza,
    imagen_path = excluded.imagen_path,
    ultima_vez = now();

  return query select v_analisis_id, v_es_nueva, v_xp_ganada, v_nuevo_nivel;
end;
$$;

-- Supabase concede EXECUTE a anon/authenticated por defecto en funciones
-- nuevas del schema public (más allá de "PUBLIC" como pseudo-rol) — hay que
-- revocarlo explícitamente de cada rol, no solo de PUBLIC, o cualquier
-- usuario autenticado podría llamar esta función con el uid de otra persona.
revoke all on function public.registrar_analisis(uuid, text, text, text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.registrar_analisis(uuid, text, text, text, text, text, integer, text)
  to service_role;
