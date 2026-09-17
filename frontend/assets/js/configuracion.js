/* =========================================================
   BioCoreZ3 — Configuración: datos de cuenta reales (Supabase)
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  const nombreInput = document.querySelector('#configNombre');
  if (!nombreInput) return; // no estamos en configuracion.html

  const perfil = await window.__perfilListo;
  if (!perfil) return;

  const bioInput = document.querySelector('#configBio');
  const avatarImg = document.querySelector('[data-config-avatar]');

  nombreInput.value = perfil.nombre;
  bioInput.value = perfil.bio || '';
  document.querySelector('[data-config-email]').value = perfil.email || '';
  document.querySelector('[data-config-nombre-pill]').textContent = perfil.nombre;
  document.querySelector('[data-config-lvl-pill]').textContent = `LVL ${perfil.nivel}`;
  document.querySelector('[data-config-xp-pill]').textContent = `${perfil.xp} XP`;
  if (perfil.avatar_url) avatarImg.src = perfil.avatar_url;

  document.querySelector('#resetSettings')?.addEventListener('click', () => {
    nombreInput.value = perfil.nombre;
    bioInput.value = perfil.bio || '';
    showToast('Cambios sin guardar descartados.', 'fa-rotate-left');
  });

  /* ---------- Guardar nombre y biografía ---------- */
  document.querySelector('#saveSettings')?.addEventListener('click', async () => {
    const nuevoNombre = nombreInput.value.trim();
    const nuevaBio = bioInput.value.trim();
    if (!nuevoNombre) {
      showToast('El nombre no puede estar vacío.', 'fa-triangle-exclamation');
      return;
    }
    const cambios = {};
    if (nuevoNombre !== perfil.nombre) cambios.nombre = nuevoNombre;
    if (nuevaBio !== (perfil.bio || '')) cambios.bio = nuevaBio;
    if (Object.keys(cambios).length === 0) {
      showToast('No hay cambios para guardar.', 'fa-circle-info');
      return;
    }
    try {
      const { error } = await sb.from('usuarios').update(cambios).eq('id', perfil.uid);
      if (error) throw error;
      Object.assign(perfil, cambios);
      showToast('Cambios guardados correctamente.', 'fa-floppy-disk');
    } catch (err) {
      showToast('No se pudieron guardar los cambios.', 'fa-triangle-exclamation');
    }
  });

  /* ---------- Foto de perfil ---------- */
  const avatarBtn = document.querySelector('#avatarUploadBtn');
  const avatarFile = document.querySelector('#avatarFile');
  avatarBtn?.addEventListener('click', () => avatarFile.click());
  avatarFile?.addEventListener('change', async () => {
    const file = avatarFile.files[0];
    if (!file) return;
    avatarBtn.disabled = true;
    try {
      const path = `${perfil.uid}/avatar.jpg`;
      const { error: uploadError } = await sb.storage.from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path);
      // Evita que el navegador siga mostrando la imagen vieja cacheada bajo
      // la misma URL fija (la ruta siempre se sobrescribe).
      const url = `${publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await sb.from('usuarios').update({ avatar_url: url }).eq('id', perfil.uid);
      if (updateError) throw updateError;

      avatarImg.src = url;
      perfil.avatar_url = url;
      showToast('Foto de perfil actualizada.', 'fa-circle-check');
    } catch (err) {
      showToast('No se pudo actualizar la foto de perfil.', 'fa-triangle-exclamation');
    } finally {
      avatarBtn.disabled = false;
      avatarFile.value = '';
    }
  });

  /* ---------- Cambiar contraseña ---------- */
  const { data: { user } } = await sb.auth.getUser();
  const usaPassword = user?.app_metadata?.provider === 'email';
  const changePasswordBtn = document.querySelector('#changePasswordBtn');
  const passwordDialog = document.querySelector('#changePasswordDialog');
  const passwordForm = document.querySelector('#changePasswordForm');

  if (!usaPassword) {
    // Cuentas iniciadas con Google no tienen contraseña que cambiar aquí.
    changePasswordBtn?.closest('.settings-row')?.remove();
  } else {
    changePasswordBtn?.addEventListener('click', () => {
      passwordForm.reset();
      passwordDialog.showModal();
    });
    document.querySelector('#cancelPasswordChange')?.addEventListener('click', () => passwordDialog.close());

    passwordForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPass = document.querySelector('#currentPass').value;
      const newPass = document.querySelector('#newPass').value;
      const submitBtn = passwordForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        const { error: loginError } = await sb.auth.signInWithPassword({ email: user.email, password: currentPass });
        if (loginError) throw loginError;
        const { error: updateError } = await sb.auth.updateUser({ password: newPass });
        if (updateError) throw updateError;
        passwordDialog.close();
        showToast('Contraseña actualizada correctamente.', 'fa-circle-check');
      } catch (err) {
        const mensajes = {
          invalid_credentials: 'La contraseña actual es incorrecta.',
          weak_password: 'La contraseña nueva debe tener al menos 6 caracteres.',
          same_password: 'La nueva contraseña debe ser diferente a la actual.',
        };
        showToast(mensajes[err.code] || 'No se pudo actualizar la contraseña.', 'fa-triangle-exclamation');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
});
