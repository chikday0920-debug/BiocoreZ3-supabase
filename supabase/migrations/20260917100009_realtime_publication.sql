-- Habilita Realtime en usuarios para que session.js pueda suscribirse a
-- cambios de xp/nivel/monedas en vivo (reemplaza el onSnapshot de Firestore).
-- La suscripción sigue respetando la política "usuarios_select_own".
alter publication supabase_realtime add table public.usuarios;
