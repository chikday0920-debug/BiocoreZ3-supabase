/* =========================================================
   BioCoreZ3 — Dashboard con datos reales (Supabase)
   ========================================================= */
function xpParaNivel(nivel) { return nivel * 100; }

document.addEventListener('DOMContentLoaded', async () => {
  const statEscaneos = document.querySelector('[data-stat-escaneos]');
  if (!statEscaneos) return; // no estamos en dashboard.html

  const perfil = await window.__perfilListo;
  if (!perfil) return;

  // Los totales (escaneos/especies) vienen de contadores en el perfil,
  // actualizados por el backend en cada escaneo — así no hace falta traer
  // TODO el historial de "analisis" (que crece sin límite) solo para contarlo.
  // Para la lista de recientes y la gráfica solo necesitamos los últimos 6
  // meses, así que acotamos la consulta a esa ventana.
  const cortePeriodo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
  const { data: registros } = await sb.from('analisis')
    .select('*')
    .eq('usuario_id', perfil.uid)
    .gte('fecha', cortePeriodo.toISOString())
    .order('fecha', { ascending: false });

  statEscaneos.textContent = perfil.escaneos_totales ?? registros.length;
  document.querySelector('[data-stat-xp]').innerHTML = `${perfil.xp} <small style="font-size:.9rem; opacity:.8;">XP</small>`;
  document.querySelector('[data-stat-nivel]').textContent = perfil.nivel;
  document.querySelector('[data-stat-especies]').textContent = perfil.especies_unicas ?? new Set(registros.map(r => r.especie_id)).size;

  document.querySelector('[data-nivel-titulo]').textContent = `NIVEL ${perfil.nivel}`;
  document.querySelector('[data-nivel-xp-actual]').textContent = `${perfil.xp} XP`;
  const faltante = Math.max(xpParaNivel(perfil.nivel) - perfil.xp, 0);
  document.querySelector('[data-nivel-xp-falta]').textContent = `${faltante} XP`;
  document.querySelector('[data-nivel-barra]').style.width = `${Math.min(100, (perfil.xp / xpParaNivel(perfil.nivel)) * 100)}%`;

  const rarezaTexto = { legendary: 'Legendary', rare: 'Rare', common: 'Common' };
  const rarezaClase = { legendary: 'pill-legendary', rare: 'pill-rare', common: 'pill-common' };
  const cont = document.querySelector('[data-escaneos-recientes]');
  cont.innerHTML = '';
  if (registros.length === 0) {
    cont.innerHTML = `<p style="color:var(--muted); font-size:.85rem;">Aún no tienes escaneos. <a href="escaner.html" style="color:var(--teal-deep); font-weight:700;">Escanea tu primera muestra</a>.</p>`;
  }
  registros.slice(0, 5).forEach(r => {
    const row = document.createElement('div');
    row.className = 'list-row';
    const fecha = r.fecha ? new Date(r.fecha).toLocaleString() : '';
    row.innerHTML = `
      <div style="width:44px;height:44px;border-radius:10px;background:var(--mint-100);display:flex;align-items:center;justify-content:center;">
        <i class="fa-solid ${r.tipo === 'planta' ? 'fa-seedling' : 'fa-paw'}" style="color:var(--teal-deep);"></i>
      </div>
      <div class="info"><b>${r.nombre_comun} <span class="pill ${rarezaClase[r.rareza] || 'pill-common'}" style="margin-left:6px;">${rarezaTexto[r.rareza] || 'Common'}</span></b><span>${r.nombre_cientifico}</span></div>
      <div class="time">${fecha}</div>
    `;
    cont.appendChild(row);
  });

  // Gráfica: escaneos por mes (últimos 6 meses) usando los mismos colores que el mock original.
  if (window.Chart) {
    const ahora = new Date();
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      meses.push({ etiqueta: m.toLocaleDateString('es', { month: 'short' }), anio: m.getFullYear(), mes: m.getMonth() });
    }
    const escaneosPorMes = meses.map(m =>
      registros.filter(r => {
        const f = r.fecha ? new Date(r.fecha) : null;
        return f && f.getFullYear() === m.anio && f.getMonth() === m.mes;
      }).length
    );
    const especiesPorMes = meses.map(m =>
      registros.filter(r => {
        const f = r.fecha ? new Date(r.fecha) : null;
        return f && r.es_nueva && f.getFullYear() === m.anio && f.getMonth() === m.mes;
      }).length
    );

    new Chart(document.querySelector('#statsChart'), {
      type: 'line',
      data: {
        labels: meses.map(m => m.etiqueta),
        datasets: [
          { label: 'Escaneos', data: escaneosPorMes, borderColor: 'rgba(195,245,60,1)', backgroundColor: 'rgba(195,245,60,.15)', tension: .45, fill: true, pointRadius: 0, borderWidth: 3 },
          { label: 'Especies nuevas', data: especiesPorMes, borderColor: 'rgba(20,184,166,1)', backgroundColor: 'rgba(20,184,166,.12)', tension: .45, fill: true, pointRadius: 0, borderWidth: 3 },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, grid: { color: 'rgba(255,255,255,.15)' }, ticks: { color: 'rgba(255,255,255,.8)' } },
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,.8)' } },
        },
      },
    });
  }
});
