/* =========================================================
   BioCoreZ3 — Perfil con datos reales (Supabase)
   ========================================================= */
function xpParaNivelPerfil(nivel) { return nivel * 100; }

document.addEventListener('DOMContentLoaded', async () => {
  const nombreEl = document.querySelector('[data-perfil-nombre]');
  if (!nombreEl) return; // no estamos en perfil.html

  const perfil = await window.__perfilListo;
  if (!perfil) return;

  nombreEl.textContent = perfil.nombre;
  document.querySelector('[data-perfil-email]').textContent = perfil.email || '';
  document.querySelector('[data-perfil-nivel-badge]').textContent = perfil.nivel;

  const meta = xpParaNivelPerfil(perfil.nivel);
  const pct = Math.min(100, Math.round((perfil.xp / meta) * 100));
  document.querySelector('[data-perfil-falta-nivel]').textContent = `${Math.max(meta - perfil.xp, 0)} EXP para el nivel ${perfil.nivel + 1}`;
  document.querySelector('[data-perfil-xp-actual]').textContent = `${perfil.xp} / ${meta} XP`;
  document.querySelector('[data-perfil-xp-pct]').textContent = `${pct}%`;
  document.querySelector('[data-perfil-barra]').style.width = `${pct}%`;
  document.querySelector('[data-perfil-xp-total]').textContent = perfil.xp;
  document.querySelector('[data-perfil-monedas]').textContent = perfil.monedas;

  // Los totales vienen de contadores en el perfil (actualizados por el
  // backend en cada escaneo) en vez de contar TODO el historial de "analisis",
  // que crece sin límite con cada re-escaneo. Las dos queries de abajo se
  // acotan a lo que cada sección realmente necesita mostrar.
  const sieteDiasAtras = new Date();
  sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 6);
  sieteDiasAtras.setHours(0, 0, 0, 0);

  const [{ data: registros }, { data: registrosSemana }, { data: inventario }] = await Promise.all([
    sb.from('analisis').select('*').eq('usuario_id', perfil.uid).order('fecha', { ascending: false }).limit(10),
    sb.from('analisis').select('*').eq('usuario_id', perfil.uid).gte('fecha', sieteDiasAtras.toISOString()).order('fecha', { ascending: false }),
    sb.from('inventario').select('*').eq('usuario_id', perfil.uid).order('comprado_en', { ascending: false }),
  ]);

  document.querySelector('[data-perfil-especies]').textContent = perfil.especies_unicas ?? '—';
  document.querySelector('[data-perfil-escaneos]').textContent = perfil.escaneos_totales ?? '—';

  // Inventario comprado en la tienda
  const invCont = document.querySelector('[data-perfil-inventario]');
  invCont.innerHTML = '';
  if (inventario.length === 0) {
    invCont.innerHTML = `<p style="color:var(--muted); grid-column:1/-1;">Aún no has comprado nada. <a href="tienda.html" style="color:var(--teal-deep); font-weight:700;">Visita la tienda</a>.</p>`;
  }
  inventario.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card-light card-pad badge-card';
    const fecha = item.comprado_en ? new Date(item.comprado_en).toLocaleDateString() : '';
    card.innerHTML = `
      <div class="icon-circle" style="background:var(--mint-100);">🎒</div>
      <b style="display:block; margin-bottom:4px;">${item.nombre}</b>
      <span style="font-size:.72rem; color:var(--muted); text-transform:uppercase; display:block; margin-bottom:8px;">${item.precio_pagado} créditos</span>
      <span style="font-size:.72rem; color:var(--muted);"><i class="fa-regular fa-clock"></i> ${fecha}</span>
    `;
    invCont.appendChild(card);
  });

  // Actividad reciente = escaneos + compras, mezclados por fecha
  const actividad = [
    ...registros.slice(0, 10).map(r => ({
      icono: r.tipo === 'planta' ? 'fa-seedling' : 'fa-paw',
      texto: `Escaneaste ${r.nombre_comun}`,
      detalle: `+${r.xp_ganada ?? 10} XP${r.es_nueva ? ' (+bono nueva especie)' : ''}`,
      fecha: r.fecha ? new Date(r.fecha) : null,
    })),
    ...inventario.slice(0, 10).map(item => ({
      icono: 'fa-bag-shopping',
      texto: `Adquiriste ${item.nombre}`,
      detalle: `-${item.precio_pagado} créditos`,
      fecha: item.comprado_en ? new Date(item.comprado_en) : null,
    })),
  ].filter(a => a.fecha).sort((a, b) => b.fecha - a.fecha).slice(0, 10);

  const actCont = document.querySelector('[data-perfil-actividad]');
  actCont.innerHTML = '';
  if (actividad.length === 0) {
    actCont.innerHTML = '<p style="color:var(--muted);">Sin actividad todavía.</p>';
  }
  actividad.forEach(a => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.style.cssText = 'border-color:var(--line); color:var(--ink);';
    row.innerHTML = `
      <div style="width:40px; height:40px; border-radius:50%; background:var(--mint-100); display:flex; align-items:center; justify-content:center; color:var(--teal-deep);"><i class="fa-solid ${a.icono}"></i></div>
      <div class="info"><b style="color:var(--ink);">${a.texto}</b><span style="color:var(--muted); font-style:normal;">${a.detalle}</span></div>
      <div class="time" style="color:var(--muted);">${a.fecha.toLocaleString()}</div>
    `;
    actCont.appendChild(row);
  });

  // Gráfica de contribución: escaneos de los últimos 7 días
  if (window.Chart) {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dias.push(d);
    }
    const conteos = dias.map(d =>
      registrosSemana.filter(r => {
        const f = r.fecha ? new Date(r.fecha) : null;
        return f && f.toDateString() === d.toDateString();
      }).length
    );

    new Chart(document.querySelector('#contribChart'), {
      type: 'line',
      data: {
        labels: dias.map(d => d.toLocaleDateString('es', { weekday: 'short' })),
        datasets: [{
          data: conteos,
          borderColor: '#0e5c46', backgroundColor: 'rgba(14,92,70,.12)',
          tension: .5, fill: true, pointRadius: 0, borderWidth: 3,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { display: false },
          x: { grid: { display: false }, ticks: { color: 'rgba(15,46,38,.6)', font: { size: 10 } } },
        },
      },
    });
  }
});
