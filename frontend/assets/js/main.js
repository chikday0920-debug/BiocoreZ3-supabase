/* =========================================================
   BioCoreZ3 — Shared interactivity
   ========================================================= */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[BioCoreZ3] No se pudo registrar el service worker.', err);
    });
  });
}

/* ---------- Botón "Instalar app" (evento beforeinstallprompt) ---------- */
let bicPromptEvent = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  bicPromptEvent = e;
  mostrarBotonInstalarPWA();
});

window.addEventListener('appinstalled', () => {
  bicPromptEvent = null;
  document.querySelector('#pwaInstallBtn')?.remove();
});

function mostrarBotonInstalarPWA() {
  if (document.querySelector('#pwaInstallBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'pwaInstallBtn';
  btn.type = 'button';
  btn.innerHTML = '<i class="fa-solid fa-download"></i> Instalar app';
  btn.style.cssText = 'position:fixed; right:20px; bottom:20px; z-index:999; display:flex; align-items:center; gap:8px; padding:10px 18px; border:none; border-radius:999px; background:#0e5c46; color:#fff; font-weight:700; font-size:.85rem; cursor:pointer; box-shadow:0 8px 24px rgba(0,0,0,.3);';
  btn.addEventListener('click', async () => {
    if (!bicPromptEvent) return;
    btn.disabled = true;
    bicPromptEvent.prompt();
    const { outcome } = await bicPromptEvent.userChoice;
    bicPromptEvent = null;
    btn.remove();
    if (outcome === 'accepted') window.showToast?.('¡App instalada!', 'fa-circle-check');
  });
  document.body.appendChild(btn);
}

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Mobile sidebar ---------- */
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop?.classList.toggle('show');
    });
    backdrop?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
    });
  }

  /* ---------- Active nav link ---------- */
  const current = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    if (link.dataset.page === current) link.classList.add('active');
  });

  /* ---------- Password show/hide ---------- */
  document.querySelectorAll('.toggle-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (!input) return;
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.querySelector('i')?.classList.toggle('fa-eye');
      btn.querySelector('i')?.classList.toggle('fa-eye-slash');
      btn.setAttribute('aria-label', isPass ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  });

  /* ---------- Decorative tab groups (no panel switching) ---------- */
  document.querySelectorAll('.tabs:not([data-tabs])').forEach(group => {
    const buttons = group.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      if (btn.hasAttribute('data-filter-type')) return; // handled by gaiadex filter logic
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  /* ---------- Generic tabs ---------- */
  document.querySelectorAll('[data-tabs]').forEach(tabGroup => {
    const targetSel = tabGroup.dataset.tabs;
    const buttons = tabGroup.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll(`${targetSel} > [data-tab-panel]`).forEach(p => {
          p.style.display = p.dataset.tabPanel === btn.dataset.tab ? '' : 'none';
        });
      });
    });
  });

  /* ---------- Toast ---------- */
  window.showToast = (msg, icon = 'fa-circle-check') => {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
    toast.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  };

  /* ---------- Gaiadex filters ---------- */
  const gaiadexGrid = document.querySelector('[data-gaiadex-grid]');
  if (gaiadexGrid) {
    const filterBtns = document.querySelectorAll('[data-filter-type]');
    const searchInput = document.querySelector('#gaiadexSearch');
    const rareRange = document.querySelector('#rareRange');
    const emptyState = document.querySelector('[data-gaiadex-empty]');

    // Las tarjetas se pintan de forma asíncrona (gaiadex.js, datos reales de
    // Firestore), así que se re-consultan en cada filtrado en vez de cachearlas
    // una sola vez al cargar la página.
    const applyFilters = window.applyGaiadexFilters = () => {
      const activeType = document.querySelector('[data-filter-type].active')?.dataset.filterType || 'todas';
      const query = (searchInput?.value || '').toLowerCase().trim();
      const cards = [...gaiadexGrid.querySelectorAll('.species-card')];
      let visible = 0;
      cards.forEach(card => {
        const type = card.dataset.type;
        const name = card.dataset.name.toLowerCase();
        const matchesType = activeType === 'todas' || type === activeType;
        const matchesQuery = !query || name.includes(query);
        const show = matchesType && matchesQuery;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      if (emptyState) emptyState.style.display = visible === 0 ? '' : 'none';
    };

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilters();
      });
    });
    searchInput?.addEventListener('input', applyFilters);
    rareRange?.addEventListener('input', applyFilters);

    document.querySelectorAll('[data-clear-filters]').forEach(b => b.addEventListener('click', () => {
      filterBtns.forEach(btn => btn.classList.remove('active'));
      document.querySelector('[data-filter-type="todas"]')?.classList.add('active');
      if (searchInput) searchInput.value = '';
      document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
      applyFilters();
    }));
  }

  // El escáner (scanner.js), la tienda (tienda.js), las gráficas con datos
  // reales (dashboard.js / perfil.js) y el guardado de ajustes
  // (configuracion.js) reemplazan lo que antes vivía aquí.
});
