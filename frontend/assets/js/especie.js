/* =========================================================
   BioCoreZ3 — Ficha de especie dinámica (especie.html?id=...)
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  const wrap = document.querySelector('[data-especie-wrap]');
  if (!wrap) return;

  const perfil = await window.__perfilListo;
  if (!perfil) return;

  const especieId = new URLSearchParams(location.search).get('id');
  if (!especieId) {
    wrap.innerHTML = '<p style="color:#fff;">No se especificó ninguna especie.</p>';
    return;
  }

  const rarezaTexto = { legendary: 'Legendario', rare: 'Rara', common: 'Común' };

  const { data: refDoc } = await sb.from('especies').select('*').eq('id', especieId).maybeSingle();

  let datos;
  if (refDoc) {
    datos = refDoc;
  } else {
    const { data: registros } = await sb.from('analisis')
      .select('*')
      .eq('usuario_id', perfil.uid)
      .eq('especie_id', especieId)
      .order('fecha', { ascending: false })
      .limit(1);
    if (!registros || registros.length === 0) {
      wrap.innerHTML = '<p style="color:#fff;">No se encontró esa especie en tu Gaiadex.</p>';
      return;
    }
    datos = registros[0];
  }

  document.querySelector('title').textContent = `${datos.nombre_comun} · BioCoreZ3`;
  document.querySelector('[data-especie-nombre]').textContent = datos.nombre_comun;
  document.querySelector('[data-especie-cientifico]').textContent = datos.nombre_cientifico;
  document.querySelector('[data-especie-tipo]').textContent = datos.tipo === 'planta' ? 'Planta' : 'Animal';
  document.querySelector('[data-especie-rareza]').textContent = rarezaTexto[datos.rareza] || 'Común';
  document.querySelector('[data-especie-confianza]').textContent = datos.confianza ? `${datos.confianza}%` : '—';
  document.querySelector('[data-especie-fecha]').textContent = datos.fecha
    ? new Date(datos.fecha).toLocaleDateString() : '—';

  if (datos.descripcion) {
    document.querySelector('[data-especie-descripcion]').textContent = datos.descripcion;
    document.querySelector('[data-especie-about-card]').style.display = '';
  }

  const img = document.querySelector('[data-especie-img]');
  if (datos.imagen_path) {
    sb.storage.from('scans').createSignedUrl(datos.imagen_path, 3600)
      .then(({ data }) => { if (data) img.src = data.signedUrl; })
      .catch(() => {});
  } else if (datos.imagen_url) {
    img.src = datos.imagen_url;
  }
});
