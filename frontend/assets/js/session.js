/* =========================================================
   BioCoreZ3 — Sesión compartida (Supabase)
   Se carga en TODAS las páginas después de supabase-config.js.
   - En páginas protegidas (.app): exige sesión, pinta datos reales
     del usuario en el user-chip y ata "Salir" a signOut().
   - En páginas públicas (.auth-page): si ya hay sesión, redirige.
   ========================================================= */
window.__perfilListo = new Promise((resolve) => {

  // onAuthStateChange no solo dispara una vez: también vuelve a disparar en
  // cada refresco automático del token (~cada hora) y cada vez que se llama
  // signInWithPassword/updateUser en la misma pestaña (p. ej. al verificar la
  // contraseña actual antes de cambiarla, en configuracion.js). Sin esta
  // guarda, cada uno de esos eventos repetidos intentaría volver a suscribir
  // el mismo canal de Realtime ya suscrito y reventaría con un error.
  let uidInicializado = null;

  sb.auth.onAuthStateChange(async (event, session) => {
    // Todas las páginas son privadas salvo index.html/registro.html (.auth-page).
    const enPaginaAuth = !!document.querySelector('.auth-page');
    const user = session?.user;

    if (!user) {
      uidInicializado = null;
      resolve(null);
      if (!enPaginaAuth) location.href = 'index.html';
      return;
    }

    if (enPaginaAuth) {
      location.href = 'dashboard.html';
      return;
    }

    if (uidInicializado === user.id) {
      // Mismo usuario que ya estaba inicializado: solo refresca los datos
      // visibles, sin re-atar listeners ni re-suscribir Realtime.
      const { data: perfil } = await sb.from('usuarios').select('*').eq('id', user.id).single();
      if (perfil) pintarUserChip(perfil);
      return;
    }
    uidInicializado = user.id;

    document.querySelector('#logoutLink, .logout-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      sb.auth.signOut();
    });

    const { data: perfil, error } = await sb.from('usuarios').select('*').eq('id', user.id).single();
    if (error || !perfil) return;

    window.perfilActual = { ...perfil, uid: perfil.id };
    pintarUserChip(perfil);
    resolve(window.perfilActual);
    document.dispatchEvent(new CustomEvent('perfil-actualizado', { detail: window.perfilActual }));

    // Reemplaza el onSnapshot de Firestore: se suscribe a cambios en la fila
    // del perfil (xp/nivel/monedas los actualiza el backend) para mantener
    // el user-chip y el saldo de la tienda en vivo sin recargar la página.
    sb.channel(`usuarios-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'usuarios', filter: `id=eq.${user.id}`,
      }, (payload) => {
        window.perfilActual = { ...payload.new, uid: payload.new.id };
        pintarUserChip(payload.new);
        document.dispatchEvent(new CustomEvent('perfil-actualizado', { detail: window.perfilActual }));
      })
      .subscribe();
  });
});

function pintarUserChip(perfil) {
  document.querySelectorAll('.user-chip .name').forEach(el => el.textContent = perfil.nombre || 'Explorador');
  document.querySelectorAll('.user-chip .lvl').forEach(el => el.textContent = `Nivel ${perfil.nivel} · ${perfil.xp} XP`);
  document.querySelectorAll('.user-chip img').forEach(el => { if (perfil.avatar_url) el.src = perfil.avatar_url; });
}
