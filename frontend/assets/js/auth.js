/* =========================================================
   BioCoreZ3 — Login / Registro reales (Supabase Auth)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  function mensajeError(err) {
    const codigos = {
      invalid_credentials: 'Credenciales incorrectas.',
      email_not_confirmed: 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
      user_already_exists: 'Ya existe una cuenta con ese correo.',
      weak_password: 'La contraseña debe tener al menos 6 caracteres.',
      validation_failed: 'Correo electrónico inválido.',
      over_email_send_rate_limit: 'Espera un momento antes de solicitar otro correo.',
    };
    if (err.code && codigos[err.code]) return codigos[err.code];
    if (/already registered|already exists/i.test(err.message || '')) return codigos.user_already_exists;
    if (/invalid.*email/i.test(err.message || '')) return codigos.validation_failed;
    return 'Ocurrió un error. Intenta de nuevo.';
  }

  const registerForm = document.querySelector('#registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const terms = registerForm.querySelector('#terms');
      if (terms && !terms.checked) {
        showToast('Debes aceptar los Términos de Servicio.', 'fa-triangle-exclamation');
        return;
      }
      const nombre = registerForm.querySelector('#fullName').value.trim();
      const email = registerForm.querySelector('#regEmail').value.trim();
      const pass = registerForm.querySelector('#regPass').value;

      try {
        const { error } = await sb.auth.signUp({
          email,
          password: pass,
          options: {
            data: { full_name: nombre },
            emailRedirectTo: `${location.origin}/index.html`,
          },
        });
        if (error) throw error;
        // Con confirmación de email obligatoria, signUp() NO deja sesión
        // iniciada — no hay a dónde redirigir todavía.
        mostrarConfirmacionEmail(email);
      } catch (err) {
        showToast(mensajeError(err), 'fa-triangle-exclamation');
      }
    });
  }

  function mostrarConfirmacionEmail(email) {
    registerForm.hidden = true;
    const panel = document.querySelector('#registroConfirmacion');
    if (panel) {
      panel.querySelector('[data-confirmacion-email]').textContent = email;
      panel.hidden = false;
    }
  }

  const loginForm = document.querySelector('#loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('#loginEmail').value.trim();
      const pass = loginForm.querySelector('#loginPass').value;

      showToast('Verificando credenciales…', 'fa-shield-halved');
      try {
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        location.href = 'dashboard.html';
      } catch (err) {
        showToast(mensajeError(err), 'fa-triangle-exclamation');
      }
    });
  }

  document.querySelector('#forgotPasswordLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.querySelector('#loginEmail')?.value.trim();
    if (!email) {
      showToast('Escribe tu correo electrónico primero.', 'fa-triangle-exclamation');
      return;
    }
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/index.html`,
      });
      if (error) throw error;
      showToast('Te enviamos un enlace para restablecer tu contraseña.', 'fa-circle-check');
    } catch (err) {
      showToast(mensajeError(err), 'fa-triangle-exclamation');
    }
  });

  document.querySelectorAll('.social-btn').forEach(btn => {
    if (!btn.textContent.includes('Google')) return;
    btn.addEventListener('click', async () => {
      try {
        // Redirect de página completa (no un popup): al volver, session.js
        // detecta la sesión y hace la redirección post-login.
        const { error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${location.origin}/dashboard.html` },
        });
        if (error) throw error;
      } catch (err) {
        showToast(mensajeError(err), 'fa-triangle-exclamation');
      }
    });
  });
});
