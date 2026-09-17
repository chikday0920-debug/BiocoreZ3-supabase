/* =========================================================
   BioCoreZ3 — Tienda real (Supabase + RPC comprar_item)
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('[data-tienda-grid]');
  if (!grid) return; // no estamos en tienda.html

  const perfil = await window.__perfilListo;
  if (!perfil) return;

  document.querySelector('[data-tienda-saldo]').textContent = perfil.monedas;
  document.addEventListener('perfil-actualizado', (e) => {
    document.querySelector('[data-tienda-saldo]').textContent = e.detail.monedas;
  });

  const gradientes = [
    'linear-gradient(160deg,#bff4c8,#7fdb95)', 'linear-gradient(160deg,#fbcfe8,#f9a8d4)',
    'linear-gradient(160deg,#fde68a,#fbbf24)', 'linear-gradient(160deg,#fed7aa,#fb923c)',
    'linear-gradient(160deg,#d9f99d,#a3e635)', 'linear-gradient(160deg,#fdba74,#f97316)',
  ];

  const mensajesCompra = {
    'ya-tienes-este-item': 'Ya tienes este ítem.',
    'monedas-insuficientes': 'No tienes monedas suficientes.',
    'item-not-found': 'Ese ítem ya no está disponible.',
    'unauthenticated': 'Debes iniciar sesión.',
  };

  const { data: items } = await sb.from('tienda').select('*');
  grid.innerHTML = '';

  if (!items || items.length === 0) {
    grid.innerHTML = '<p style="color:#fff; opacity:.8;">El catálogo está vacío por ahora.</p>';
    return;
  }

  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="shop-avatar" style="background:${gradientes[i % gradientes.length]};">${item.emoji || '🎁'}</div>
      <span class="pill pill-common" style="width:max-content; margin-bottom:8px;">${item.categoria || 'ítem'}</span>
      <h4>${item.nombre}</h4>
      <p>${item.descripcion || ''}</p>
      <div class="price-row">
        <span class="price-tag"><i class="fa-solid fa-coins"></i> ${item.precio}</span>
        <button class="btn btn-primary btn-sm" data-buy-id="${item.id}">Adquirir</button>
      </div>
    `;
    card.querySelector('[data-buy-id]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Procesando…';
      try {
        const { error } = await sb.rpc('comprar_item', { p_item_id: item.id });
        if (error) throw error;
        showToast(`"${item.nombre}" añadido a tu inventario.`, 'fa-bag-shopping');
      } catch (err) {
        showToast(mensajesCompra[err.message] || 'No se pudo completar la compra.', 'fa-triangle-exclamation');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Adquirir';
      }
    });
    grid.appendChild(card);
  });
});
