(function () {
    function buildModalHTML() {
        return `
            <div id="forgot-password-modal" class="modal active">
                <div class="modal-content forgot-password-content">
                    <span class="modal-close" data-close="forgot-password-modal" onclick="window.__fpClose && window.__fpClose()">×</span>
                    <p class="fp-subtitle">Ingresa tu correo y te enviaremos una contraseña temporal.</p>
                    <form id="forgot-password-form" class="fp-form">
                        <div class="form-group full-width">
                            <label for="fp-email">Correo Electrónico</label>
                            <input type="email" id="fp-email" required placeholder="tu@empresa.com" autocomplete="email">
                        </div>
                        <button type="submit" class="cta-button fp-submit">Enviar instrucciones</button>
                        <p class="fp-privacy">Usamos tu email solo para enviarte la contraseña temporal.</p>
                    </form>
                </div>
            </div>
        `;
    }

    function openForgotPasswordModal() {
        // Garantizar instancia única del modal
        document.querySelectorAll('#forgot-password-modal').forEach(el => el.remove());

        const temp = document.createElement('div');
        temp.innerHTML = buildModalHTML();
        const modal = temp.firstElementChild;
        document.body.appendChild(modal);

        const form = modal.querySelector('#forgot-password-form');
        form.addEventListener('submit', handleSubmit);

        const closeBtn = modal.querySelector('[data-close="forgot-password-modal"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                close();
            });
        }

        // Cerrar al hacer clic en el fondo (backdrop)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                close();
            }
        });

        // Cerrar con tecla Escape
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                close();
            }
        };
        document.addEventListener('keydown', escHandler, { once: true });

        // Exponer cierre simple por si falla cualquier listener
        window.__fpClose = () => {
            close();
        };

        function close() {
            // Ocultar con el sistema global si existe y remover el nodo para liberar memoria
            if (typeof window.closeModal === 'function') window.closeModal('forgot-password-modal');
            // Asegurar retiro del DOM
            document.querySelectorAll('#forgot-password-modal').forEach(el => el.remove());
            // Limpieza
            if (window.__fpClose) {
                try { delete window.__fpClose; } catch (_) { window.__fpClose = undefined; }
            }
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('fp-email').value.trim();
        const btn = e.target.querySelector('button[type="submit"]');
        const original = btn.textContent;

        if (!email) {
            if (typeof window.showAlert === 'function') {
                window.showAlert('Ingresa un correo válido.', 'Campos requeridos');
            }
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<div class="spinner small"></div> Procesando...';

        try {
            const result = await (typeof window.apiCall === 'function'
                ? window.apiCall('forgot_password.php', {
                    method: 'POST',
                    body: JSON.stringify({ email: email.toLowerCase() })
                })
                : (async () => {
                    const resp = await fetch('api/forgot_password.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email.toLowerCase() })
                    });
                    const text = await resp.text();
                    const trimmed = text.trim();
                    let json;
                    try {
                        json = JSON.parse(trimmed);
                    } catch {
                        json = { success: false, message: trimmed || 'Respuesta no válida del servidor' };
                    }
                    if (!resp.ok && json && !json.success) {
                        throw new Error(json.message || `Error HTTP ${resp.status}`);
                    }
                    return json;
                })());

            if (result && result.success) {
                if (typeof window.showAlert === 'function') {
                    window.showAlert(result.message, 'Correo enviado');
                }
                if (typeof window.closeModal === 'function') {
                    window.closeModal('forgot-password-modal');
                } else {
                    document.getElementById('forgot-password-modal')?.remove();
                }
            } else {
                if (typeof window.showAlert === 'function') {
                    window.showAlert((result && result.message) || 'Error al enviar el correo.', 'Error');
                }
            }
        } catch (err) {
            console.error(err);
            if (typeof window.showAlert === 'function') {
                window.showAlert('Error de conexión', 'Error');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = original;
        }
    }

    function attachListener() {
        const link = document.getElementById('forgot-password-link');
        if (link) {
            link.classList.add('forgot-password-link');
            // Evitar enlazar múltiples veces
            if (link.dataset.fpBound === '1') return;
            link.dataset.fpBound = '1';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openForgotPasswordModal();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachListener);
    } else {
        attachListener();
    }
})();

