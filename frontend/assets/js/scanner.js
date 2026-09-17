/* =========================================================
   BioCoreZ3 — Escáner real (Supabase Storage + Edge Function analyze-plant)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const scanTrigger = document.querySelector('#scanTrigger');
  if (!scanTrigger) return; // no estamos en escaner.html

  const fileInput = document.querySelector('#scanFile');
  const preview = document.querySelector('#scanPreview');
  const placeholder = document.querySelector('#scanFramePlaceholder');
  const statusEl = document.querySelector('#scanStatus');
  const confEl = document.querySelector('#confValue');
  const modeButtons = document.querySelectorAll('[data-scan-mode]');

  let archivoSeleccionado = null;
  let modoActual = 'planta';

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      modoActual = btn.dataset.scanMode;
    });
  });

  document.querySelector('#pickImageBtn')?.addEventListener('click', () => fileInput.click());
  document.querySelector('#pickImageBtn2')?.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    archivoSeleccionado = fileInput.files[0] || null;
    if (!archivoSeleccionado) return;
    preview.src = URL.createObjectURL(archivoSeleccionado);
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    scanTrigger.disabled = false;
  });

  scanTrigger.addEventListener('click', async () => {
    if (!archivoSeleccionado) return;
    const perfil = await window.__perfilListo;
    if (!perfil) return;

    scanTrigger.disabled = true;
    statusEl.innerHTML = '<div class="spin-ring"></div><b>Subiendo muestra…</b><span>Cargando imagen a la red BioCoreZ3.</span>';
    if (confEl) confEl.textContent = '0%';

    try {
      const storagePath = `${perfil.uid}/${Date.now()}-${archivoSeleccionado.name}`;
      const { error: uploadError } = await sb.storage.from('scans')
        .upload(storagePath, archivoSeleccionado, { contentType: archivoSeleccionado.type });
      if (uploadError) throw new Error(uploadError.message);

      statusEl.innerHTML = '<div class="spin-ring"></div><b>Analizando muestra…</b><span>El motor neuronal está identificando la especie.</span>';

      const { data, error } = await sb.functions.invoke('analyze-plant', {
        body: { storagePath, modo: modoActual },
      });

      if (error) {
        let mensaje = 'No se pudo identificar la especie.';
        try {
          const body = await error.context.json();
          mensaje = body.error || mensaje;
        } catch { /* respuesta sin JSON, se queda el mensaje genérico */ }
        throw new Error(mensaje);
      }

      if (confEl) confEl.textContent = data.confianza + '%';
      statusEl.innerHTML = `
        <i class="fa-solid fa-circle-check" style="font-size:2rem;color:#c3f53c"></i>
        <b>Especie identificada</b>
        <span>${data.nombreCientifico} — ${data.nombreComun}</span>
      `;
      showToast(
        data.esNueva ? `¡Nueva especie registrada! +${data.xpGanada} XP` : `+${data.xpGanada} XP`,
        'fa-star'
      );
    } catch (err) {
      statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size:1.6rem;color:#fca5a5"></i><b>No se pudo analizar</b><span>${err.message}</span>`;
      showToast(err.message, 'fa-triangle-exclamation');
    } finally {
      scanTrigger.disabled = false;
    }
  });
});
