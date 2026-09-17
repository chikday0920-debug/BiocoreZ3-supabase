/* =========================================================
   BioCoreZ3 — Gaiadex con datos reales de Supabase
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('[data-gaiadex-grid]');
  if (!grid) return; // no estamos en gaiadex.html

  const perfil = await window.__perfilListo;
  if (!perfil) return;

  const rarezaInfo = {
    legendary: { clase: 'pill-legendary', texto: 'legendario' },
    rare: { clase: 'pill-rare', texto: 'rara' },
    common: { clase: 'pill-common', texto: 'común' },
  };

  // Una especie distinta = una fila en especies_vistas, así no hace falta
  // leer TODO el historial de "analisis" (que crece con cada re-escaneo)
  // solo para deducir qué especies distintas tiene el usuario.
  const { data: especiesVistas } = await sb.from('especies_vistas')
    .select('*')
    .eq('usuario_id', perfil.uid)
    .order('primera_vez', { ascending: false });

  grid.innerHTML = '';

  if (!especiesVistas || especiesVistas.length === 0) {
    grid.innerHTML = `<div class="card-light card-pad" style="grid-column:1/-1; text-align:center; color:var(--muted);">
      Aún no has registrado especies. <a href="escaner.html" style="color:var(--teal-deep); font-weight:700;">Escanea tu primera muestra</a>.
    </div>`;
    return;
  }

  especiesVistas.forEach(d => {
    const rareza = rarezaInfo[d.rareza] || rarezaInfo.common;
    const fecha = d.primera_vez ? new Date(d.primera_vez).toLocaleDateString() : '';
    const card = document.createElement('div');
    card.className = 'species-card';
    card.dataset.type = d.tipo;
    card.dataset.name = d.nombre_comun;
    card.innerHTML = `
      <div class="thumb">
        <img class="thumb-img" alt="${d.nombre_comun}" style="width:100%;height:100%;object-fit:cover;">
        <span class="type-ico"><i class="fa-solid ${d.tipo === 'planta' ? 'fa-seedling' : 'fa-paw'}"></i></span>
        <span class="pill ${rareza.clase} rarity">${rareza.texto}</span>
      </div>
      <div class="body">
        <h3>${d.nombre_comun}</h3>
        <div class="sci">${d.nombre_cientifico}</div>
        <div class="meta">
          <div><b>Confianza IA</b>${d.confianza}%</div>
          <div style="text-align:right;"><b>Registrado</b>${fecha}</div>
        </div>
        <div class="foot"><a href="especie.html?id=${encodeURIComponent(d.especie_id)}"><i class="fa-regular fa-circle-question"></i> Detalles</a></div>
      </div>
    `;
    grid.appendChild(card);

    if (d.imagen_path) {
      sb.storage.from('scans').createSignedUrl(d.imagen_path, 3600)
        .then(({ data }) => { if (data) card.querySelector('.thumb-img').src = data.signedUrl; })
        .catch(() => {});
    }
  });

  window.applyGaiadexFilters?.();
});
