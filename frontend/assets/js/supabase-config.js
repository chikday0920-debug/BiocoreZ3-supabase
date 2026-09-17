/* =========================================================
   BioCoreZ3 — Supabase init
   Reemplaza firebase-config.js. Ambos pares URL+anon key son públicos (la
   seguridad real la dan las políticas RLS en supabase/migrations/ y las
   reglas de Storage), así que no pasa nada por tenerlos en el cliente.
   ========================================================= */
const SUPABASE_LOCAL = {
  url: 'http://127.0.0.1:54321',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
};

const SUPABASE_PROD = {
  url: 'https://zyaeftypvugquynggofa.supabase.co',
  anonKey: 'sb_publishable_CuXzB7QZLo37qykkDUYTqQ_xCaCqLLD',
};

const enLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const config = enLocal ? SUPABASE_LOCAL : SUPABASE_PROD;

const sb = window.supabase.createClient(config.url, config.anonKey);

if (enLocal) {
  console.log('[BioCoreZ3] Conectado a Supabase local (supabase start).');
}
