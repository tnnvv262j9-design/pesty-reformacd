// Config Module Script

const configHtml = `
<div class="view-header">
    <h2 class="view-title">Configuración de la <span class="highlight">Empresa</span></h2>
</div>
<form id="settings-form">
    <h3 class="form-section-title">Información General y de Contacto</h3>
    <div class="form-grid">
        <div class="form-group">
            <label for="setting-company-name">Nombre de la Empresa</label>
            <input type="text" id="setting-company-name" required>
        </div>
        <div class="form-group">
            <label for="setting-contact-phone">Teléfono de Contacto (para WhatsApp)</label>
            <input type="tel" id="setting-contact-phone" placeholder="Ej: 8991234567" required>
        </div>
        <div class="form-group">
            <label for="setting-contact-email">Email de Contacto</label>
            <input type="email" id="setting-contact-email">
        </div>
        <div class="form-group">
            <label for="setting-contact-address">Dirección de la Empresa</label>
            <input type="text" id="setting-contact-address">
        </div>
        <div class="form-group full-width">
            <label for="setting-sanitary-license">Licencia Sanitaria</label>
            <input type="text" id="setting-sanitary-license" placeholder="Ej: No. de Licencia 2023-12345">
        </div>
    </div>

    <h3 class="form-section-title" data-i18n="settings.personalization">Personalización y Marca</h3>
    <div class="form-grid">
        <div class="form-group">
            <label for="setting-brand-color" data-i18n="settings.brand_color">Color Principal</label>
            <input type="color" id="setting-brand-color" style="padding: 5px; height: 50px;">
        </div>
        <div class="form-group">
            <label for="setting-theme" data-i18n="settings.theme">Tema de la Interfaz</label>
          <select id="setting-theme" data-custom-select>
                <option value="dark" data-i18n="settings.theme_dark">Oscuro</option>
                <option value="light" data-i18n="settings.theme_light">Claro</option>
            </select>
        </div>
        <div class="form-group">
            <label for="setting-language" data-i18n="settings.language">Idioma</label>
          <select id="setting-language" data-custom-select>
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇺🇸 English</option>
            </select>
        </div>
    </div>
    
    <div class="form-group full-width">
        <div class="settings-toggle">
            <input type="checkbox" id="setting-disable-glow">
            <label for="setting-disable-glow">Desactivar Brillo (Texto Plano)</label>
        </div>
        <small style="color: var(--text-medium); margin-top: 5px; display: block;">Activa esta opción si prefieres un diseño plano sin efectos de neón ni sombras brillantes.</small>
    </div>

    <h3 class="form-section-title">Personalización de Servicios</h3>
    <div class="form-grid">
        <div class="form-group full-width">
            <label>Tipos de Tratamiento / Servicio</label>
            <div class="input-group" style="margin-bottom: 15px;">
                <input type="text" id="new-treatment-method" placeholder="Nuevo tipo de servicio...">
                <button type="button" class="action-btn" id="add-treatment-method-btn">Agregar</button>
            </div>
            <div id="treatment-methods-container" class="treatment-methods-list">
                <!-- Items will be injected here -->
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                <button type="button" class="cta-button" id="save-treatment-methods-btn" style="width: auto; padding: 8px 16px; font-size: 0.9rem;">
                    💾 Guardar Metodos
                </button>
            </div>
            <small style="color: var(--text-medium); margin-top: 5px; display: block;">
                Estos son las opciones que aparecerán al crear o editar un servicio.
            </small>
        </div>
        
        <div class="form-group full-width">
            <label>Plagas a Tratar (Catálogo)</label>
            <div class="input-group" style="margin-bottom: 15px;">
                <input type="text" id="new-pest-item" placeholder="Nueva plaga...">
                <button type="button" class="action-btn" id="add-pest-btn">Agregar</button>
            </div>
            <div id="pests-container" class="treatment-methods-list">
                <!-- Items will be injected here -->
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                <button type="button" class="cta-button" id="save-pests-btn" style="width: auto; padding: 8px 16px; font-size: 0.9rem;">
                    💾 Guardar Plagas
                </button>
            </div>
            <small style="color: var(--text-medium); margin-top: 5px; display: block;">
                Estas opciones aparecerán en el reporte de servicio.
            </small>
        </div>

        <div class="form-group full-width">
            <label>Áreas Tratadas (Catálogo)</label>
            <div class="input-group" style="margin-bottom: 15px;">
                <input type="text" id="new-area-item" placeholder="Nueva área...">
                <button type="button" class="action-btn" id="add-area-btn">Agregar</button>
            </div>
            <div id="areas-container" class="treatment-methods-list">
                <!-- Items will be injected here -->
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                <button type="button" class="cta-button" id="save-areas-btn" style="width: auto; padding: 8px 16px; font-size: 0.9rem;">
                    💾 Guardar Áreas
                </button>
            </div>
            <small style="color: var(--text-medium); margin-top: 5px; display: block;">
                Estas opciones aparecerán en la selección de áreas del reporte.
            </small>
        </div>
    </div>

    <div class="form-group full-width">
        <div class="settings-toggle">
            <input type="checkbox" id="setting-privacy-mode">
            <label for="setting-privacy-mode">Modo Privacidad (Grabar Video)</label>
        </div>
        <small style="color: var(--text-medium); margin-top: 5px; display: block;">Oculta nombres, teléfonos y direcciones de clientes y técnicos para proteger datos sensibles.</small>
    </div>

    <div class="form-group full-width">
        <label for="setting-logo-file">Logo de la Empresa</label>
        <div class="logo-upload-container">
            <div class="file-upload-area">
                <input type="file" id="setting-logo-file" accept="image/*" style="display: none;">
                <input type="hidden" id="setting-logo-url">
                <div class="file-upload-button" onclick="document.getElementById('setting-logo-file').click()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7,10 12,15 17,10"></polyline>
                        <line x="12" y="15" x2="12" y="3"></line>
                    </svg>
                    <span>Seleccionar archivo de imagen</span>
                </div>
                <div class="file-upload-info">
                    <small>Formatos soportados: JPG, PNG, GIF, WebP, SVG (máx. 5MB)</small>
                </div>
                
                <div id="upload-progress-container" class="hidden" style="margin-top: 10px;">
                    <div style="width: 100%; background-color: rgba(0,0,0,0.1); height: 4px; border-radius: 2px; overflow: hidden;">
                        <div id="upload-progress-bar" style="width: 0%; height: 100%; background-color: var(--accent-primary); transition: width 0.3s ease;"></div>
                    </div>
                    <small style="color: var(--text-medium); display: block; text-align: center; margin-top: 5px; font-size: 0.8rem;">Subiendo...</small>
                </div>
            </div>
            
            <img src="" alt="Vista previa del logo" id="setting-logo-preview" class="logo-preview hidden">
        </div>
    </div>

    <h3 class="form-section-title" data-i18n="settings.regional">Configuración Regional y de Documentos</h3>
    <div class="form-grid">
        <div class="form-group">
            <label for="setting-currency" data-i18n="settings.currency">Moneda</label>
          <select id="setting-currency" data-custom-select>
                <option value="USD">🇺🇸 Dólar Estadounidense (USD)</option>
                <option value="EUR">🇪🇺 Euro (EUR)</option>
                <option value="MXN">🇲🇽 Peso Mexicano (MXN)</option>
                <option value="COP">🇨🇴 Peso Colombiano (COP)</option>
                <option value="ARS">🇦🇷 Peso Argentino (ARS)</option>
                <option value="CLP">🇨🇱 Peso Chileno (CLP)</option>
                <option value="PEN">🇵🇪 Sol Peruano (PEN)</option>
                <option value="GTQ">🇬🇹 Quetzal Guatemalteco (GTQ)</option>
                <option value="GBP">🇬🇧 Libra Esterlina (GBP)</option>
                <option value="CAD">🇨🇦 Dólar Canadiense (CAD)</option>
                <option value="AUD">🇦🇺 Dólar Australiano (AUD)</option>
                <option value="CUSTOM">⚙️ Personalizada</option>
            </select>
        </div>
        <div class="form-group" id="custom-currency-group" style="display: none;">
            <label for="setting-currency-symbol" data-i18n="settings.currency_symbol">Símbolo de Moneda</label>
            <input type="text" id="setting-currency-symbol" maxlength="5">
        </div>
        <div class="form-group">
            <label for="setting-currency-decimals" data-i18n="settings.currency_decimals">Decimales en Moneda</label>
            <input type="number" id="setting-currency-decimals" min="0" max="4">
        </div>
        <div class="form-group">
            <label for="setting-date-format">Formato de Fecha</label>
          <select id="setting-date-format" data-custom-select>
                <option value="YYYY-MM-DD">Año-Mes-Día (2025-07-28)</option>
                <option value="DD/MM/YYYY">Día/Mes/Año (28/07/2025)</option>
                <option value="MM/DD/YYYY">Mes/Día/Año (07/28/2025)</option>
            </select>
        </div>
        <div class="form-group">
            <label for="setting-time-format">Formato de Hora</label>
          <select id="setting-time-format" data-custom-select>
                <option value="24h">24 Horas (14:30)</option>
                <option value="12h">12 Horas (02:30 PM)</option>
            </select>
        </div>
    </div>
    <div class="form-group full-width">
        <label for="setting-report-footer">Texto de Pie de Página para Reportes</label>
        <textarea id="setting-report-footer"></textarea>
    </div>

    <h3 class="form-section-title">Seguridad</h3>
    <div class="form-grid">
        <div class="form-group full-width">
            <button type="button" class="action-btn" onclick="openChangePasswordModal()" style="width: auto;">
                🔒 Cambiar Contraseña
            </button>
            <p style="font-size: 0.85rem; color: var(--text-medium); margin-top: 5px;">
                Se enviará un código de verificación a tu correo electrónico para autorizar el cambio.
            </p>
        </div>
    </div>

    <button type="submit" class="cta-button" style="width:100%; margin-top: 30px;">Guardar Cambios</button>
</form>

<!-- Modal Cambio de Contraseña -->
<div id="change-password-modal" class="modal no-print">
    <div class="modal-content" style="max-width: 400px;">
        <span class="modal-close" onclick="closeModal('change-password-modal')">×</span>
        <h2>Cambiar Contraseña</h2>
        
        <div id="cp-step-1">
            <p>Para proteger tu cuenta, enviaremos un código de verificación a: <strong id="cp-user-email"></strong></p>
            <button type="button" class="cta-button" onclick="sendChangePasswordCode()" style="width: 100%; margin-top: 15px;">Enviar Código</button>
        </div>

        <div id="cp-step-2" class="hidden">
            <form id="change-password-form">
                <div class="form-group full-width">
                    <label for="cp-code">Código de Verificación</label>
                    <input type="text" id="cp-code" required placeholder="Código de 6 dígitos" maxlength="6">
                </div>
                <div class="form-group full-width">
                    <label for="cp-new-password">Nueva Contraseña</label>
                    <input type="password" id="cp-new-password" required placeholder="Mínimo 8 caracteres">
                </div>
                <div class="form-group full-width">
                    <label for="cp-confirm-password">Confirmar Contraseña</label>
                    <input type="password" id="cp-confirm-password" required placeholder="Repetir contraseña">
                </div>
                <button type="submit" class="cta-button" style="width: 100%; margin-top: 15px;">Actualizar Contraseña</button>
            </form>
        </div>
    </div>
</div>

<!-- Modal Editar Servicio -->
<div id="edit-treatment-modal" class="modal no-print">
    <div class="modal-content" style="max-width: 400px;">
        <span class="modal-close" onclick="closeModal('edit-treatment-modal')">×</span>
        <h2>Editar Servicio</h2>
        <form id="edit-treatment-form">
            <div class="form-group full-width">
                <label for="edit-treatment-name">Nombre del Servicio</label>
                <input type="text" id="edit-treatment-name" required placeholder="Nombre del servicio">
                <input type="hidden" id="edit-treatment-index">
            </div>
            <button type="submit" class="cta-button" style="width: 100%; margin-top: 15px;">Guardar Cambios</button>
        </form>
    </div>
</div>

<!-- Modal Editar Plaga -->
<div id="edit-pest-modal" class="modal no-print">
    <div class="modal-content" style="max-width: 400px;">
        <span class="modal-close" onclick="closeModal('edit-pest-modal')">×</span>
        <h2>Editar Plaga</h2>
        <form id="edit-pest-form">
            <div class="form-group full-width">
                <label for="edit-pest-name">Nombre de la Plaga</label>
                <input type="text" id="edit-pest-name" required placeholder="Nombre de la plaga">
                <input type="hidden" id="edit-pest-index">
            </div>
            <button type="submit" class="cta-button" style="width: 100%; margin-top: 15px;">Guardar Cambios</button>
        </form>
    </div>
</div>

<!-- Modal Editar Área -->
<div id="edit-area-modal" class="modal no-print">
    <div class="modal-content" style="max-width: 400px;">
        <span class="modal-close" onclick="closeModal('edit-area-modal')">×</span>
        <h2>Editar Área</h2>
        <form id="edit-area-form">
            <div class="form-group full-width">
                <label for="edit-area-name">Nombre del Área</label>
                <input type="text" id="edit-area-name" required placeholder="Nombre del área">
                <input type="hidden" id="edit-area-index">
            </div>
            <button type="submit" class="cta-button" style="width: 100%; margin-top: 15px;">Guardar Cambios</button>
        </form>
    </div>
</div>
`;

window.openChangePasswordModal = function() {
    if (!AppState.currentUser) return;
    
    document.getElementById('cp-user-email').textContent = AppState.currentUser.email;
    document.getElementById('cp-step-1').classList.remove('hidden');
    document.getElementById('cp-step-2').classList.add('hidden');
    
    // Reset inputs
    ['cp-code', 'cp-new-password', 'cp-confirm-password'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });

    openModal('change-password-modal');
};

window.sendChangePasswordCode = async function() {
    const btn = document.querySelector('#cp-step-1 button');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const result = await apiCall('request_password_change.php', {
            method: 'POST',
            body: JSON.stringify({ email: AppState.currentUser.email })
        });

        if (result.success) {
            showAlert('Código enviado a tu correo.', 'Código Enviado');
            document.getElementById('cp-step-1').classList.add('hidden');
            document.getElementById('cp-step-2').classList.remove('hidden');
        } else {
            showAlert(result.message || 'Error al enviar el código.', 'Error');
        }
    } catch (e) {
        console.error(e);
        showAlert('Error de conexión', 'Error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

window.handleChangePasswordSubmit = async function(e) {
    e.preventDefault();
    
    const code = document.getElementById('cp-code').value;
    const newPassword = document.getElementById('cp-new-password').value;
    const confirmPassword = document.getElementById('cp-confirm-password').value;

    if (newPassword !== confirmPassword) {
        showAlert('Las contraseñas no coinciden.', 'Error');
        return;
    }

    if (newPassword.length < 8) {
        showAlert('La contraseña debe tener al menos 8 caracteres.', 'Error');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    try {
        const result = await apiCall('confirm_password_change.php', {
            method: 'POST',
            body: JSON.stringify({
                email: AppState.currentUser.email,
                code: code,
                new_password: newPassword
            })
        });

        if (result.success) {
            showAlert('Contraseña actualizada correctamente. Por favor inicia sesión nuevamente.', 'Éxito');
            closeModal('change-password-modal');
            // Force logout
            setTimeout(() => {
                document.getElementById('logout-btn').click();
            }, 2000);
        } else {
            showAlert(result.message || 'Error al actualizar contraseña.', 'Error');
        }
    } catch (e) {
        console.error(e);
        showAlert('Error de conexión', 'Error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

async function loadConfigView() {
    const container = document.getElementById('settings-view');
    if (!container) return;
    
    // Check if already loaded (if it has children other than comments)
    if (container.querySelector('#settings-form')) return;

    try {
        container.innerHTML = configHtml;
            
        // Re-attach listener
        if (document.getElementById('settings-form')) {
            // Assuming addFormSubmitListener is available globally from main script
            if (window.addFormSubmitListener) {
                window.addFormSubmitListener('settings-form', handleSaveSettings, true);
            } else {
                document.getElementById('settings-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    handleSaveSettings();
                });
            }
        }

        // Inicializar selects personalizados en esta vista
        if (window.createCustomSelect) {
            container.querySelectorAll('[data-custom-select]').forEach(window.createCustomSelect);
        }

        // Event listener para el selector de idioma
        const languageSelector = document.getElementById('setting-language');
        if (languageSelector) {
            languageSelector.addEventListener('change', (e) => {
                if (window.i18n) {
                    window.i18n.setLanguage(e.target.value);
                }
            });
        }
        
        // Event listener para el selector de moneda
        const currencySelector = document.getElementById('setting-currency');
        if (currencySelector) {
            currencySelector.addEventListener('change', function() {
                const customGroup = document.getElementById('custom-currency-group');
                if (this.value === 'CUSTOM') {
                    customGroup.style.display = 'block';
                } else {
                    customGroup.style.display = 'none';
                    // Auto-fill currency symbol based on selection
                    if (window.i18n) {
                        const symbol = window.i18n.getCurrencySymbol(this.value);
                        if(document.getElementById('setting-currency-symbol')) {
                            document.getElementById('setting-currency-symbol').value = symbol;
                        }
                    }
                }
            });
        }

        // Init logo system
    initLogoSystem();
    
    // Init treatment methods
    initTreatmentMethods();
    
    // Init common pests
    initCommonPests();

    // Init treated areas
    initTreatedAreas();

    // Listen for password change form submit
        const cpForm = document.getElementById('change-password-form');
        if (cpForm) {
            cpForm.addEventListener('submit', window.handleChangePasswordSubmit);
        }
        
        // Listen for edit treatment form submit
        const etForm = document.getElementById('edit-treatment-form');
        if (etForm) {
            etForm.addEventListener('submit', window.handleEditTreatmentSubmit);
        }
        
        // Listen for edit pest form submit
        const epForm = document.getElementById('edit-pest-form');
        if (epForm) {
            epForm.addEventListener('submit', window.handleEditPestSubmit);
        }

        // Listen for edit area form submit
        const eaForm = document.getElementById('edit-area-form');
        if (eaForm) {
            eaForm.addEventListener('submit', window.handleEditAreaSubmit);
        }

    } catch (e) {
        console.error('Error loading config view', e);
    }
}



// Hook into the global render function if possible, or exposing a check function
// Modifying renderSettingsView to set initial state is done above.



function initLogoSystem() {
    const logoFileInput = getEl('setting-logo-file');
    const logoPreview = getEl('setting-logo-preview');
    
    if (logoFileInput) {
        // Event listener para subida de archivos
        logoFileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                uploadLogoFile(file);
            }
        });
    }
}

function updateLogoPreview(logoUrl) {
    const logoPreview = getEl('setting-logo-preview');
    if (logoUrl) {
        // Agregar timestamp para evitar caché del navegador
        const fullLogoUrl = getFullImagePath(logoUrl) + '?t=' + Date.now();
        logoPreview.src = fullLogoUrl;
        logoPreview.classList.remove('hidden');
        logoPreview.onerror = function() {
            this.classList.add('hidden');
        };
        logoPreview.onload = function() {
            this.classList.remove('hidden');
        };
    } else {
        logoPreview.classList.add('hidden');
    }
}

function showUploadProgress() {
    const container = document.getElementById('upload-progress-container');
    const bar = document.getElementById('upload-progress-bar');
    if (container && bar) {
        container.classList.remove('hidden');
        // Simular progreso
        let width = 0;
        bar.style.width = '0%';
        window.uploadInterval = setInterval(() => {
            if (width >= 90) {
                clearInterval(window.uploadInterval);
            } else {
                width += 5;
                bar.style.width = width + '%';
            }
        }, 100);
    }
}

function hideUploadProgress() {
    const container = document.getElementById('upload-progress-container');
    const bar = document.getElementById('upload-progress-bar');
    if (container && bar) {
        if (window.uploadInterval) clearInterval(window.uploadInterval);
        bar.style.width = '100%';
        setTimeout(() => {
            container.classList.add('hidden');
            bar.style.width = '0%';
        }, 500);
    }
}

async function uploadLogoFile(file) {
    const formData = new FormData();
    formData.append('logo', file);
    
    // Mostrar el nombre del archivo seleccionado
    const uploadButton = document.querySelector('.file-upload-button span');
    const originalText = uploadButton.textContent;
    uploadButton.textContent = `Archivo seleccionado: ${file.name}`;
    
    // Mostrar progreso de carga
    showUploadProgress();
    
    try {
        const response = await fetch('api/upload_logo.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error('Server response is not valid JSON:', text);
            throw new Error('Invalid JSON response from server');
        }
        
        if (result.success) {
            // Actualizar el campo oculto de URL con la nueva ruta
            getEl('setting-logo-url').value = result.logo_url;
            updateLogoPreview(result.logo_url);
            
            // Actualizar inmediatamente el logo en el header
            if (AppState.currentUser) {
                AppState.currentUser.logo_url = result.logo_url;
                applySettings(AppState.currentUser);
                
                // Forzar recarga del logo con timestamp para evitar caché
                const headerLogo = getEl('header').querySelector('.logo-img');
                if (headerLogo) {
                    const logoUrl = getFullImagePath(result.logo_url);
                    headerLogo.src = logoUrl + '?t=' + Date.now();
                }
            }
            
            // Cambiar el texto del botón para mostrar éxito
            uploadButton.textContent = '✓ Logo subido exitosamente';
            uploadButton.style.color = '#10b981';
            
            // Restaurar el texto original después de 3 segundos
            setTimeout(() => {
                uploadButton.textContent = originalText;
                uploadButton.style.color = '';
            }, 3000);
        } else {
            throw new Error(result.message || 'Error desconocido');
        }
    } catch (error) {
        console.error('Error al subir logo:', error);
        showAlert('Error al subir el logo: ' + error.message, 'Error');
        uploadButton.textContent = originalText;
    } finally {
        hideUploadProgress();
    }
}

async function renderSettingsView() {
    await loadConfigView();

    const user = AppState.currentUser;
    if (!user) return;

    if (document.getElementById('setting-company-name')) getEl('setting-company-name').value = user.name || '';
    if (document.getElementById('setting-contact-phone')) getEl('setting-contact-phone').value = user.contact_phone || '';
    if (document.getElementById('setting-contact-email')) getEl('setting-contact-email').value = user.contact_email || '';
    if (document.getElementById('setting-contact-address')) getEl('setting-contact-address').value = user.contact_address || '';
    if (document.getElementById('setting-sanitary-license')) getEl('setting-sanitary-license').value = user.sanitary_license || '';
    if (document.getElementById('setting-brand-color')) getEl('setting-brand-color').value = user.brand_color || '#34D399';
    if (document.getElementById('setting-theme')) getEl('setting-theme').value = user.theme || 'dark';
    
    if (getEl('setting-disable-glow')) {
        getEl('setting-disable-glow').checked = user.disable_glow == 1 || user.disable_glow === 'true' || user.disable_glow === true;
    }
    
    // Privacy Mode (LocalStorage)
    const privacyModeToggle = getEl('setting-privacy-mode');
    if (privacyModeToggle) {
        privacyModeToggle.checked = localStorage.getItem('privacyMode') === 'true';
        privacyModeToggle.addEventListener('change', function() {
            localStorage.setItem('privacyMode', this.checked);
            if (this.checked) {
                showAlert('Modo Privacidad activado. Los datos sensibles se ocultarán en las tablas.', 'Información');
            } else {
                showAlert('Modo Privacidad desactivado.', 'Información');
            }
        });
    }
    
    if (document.getElementById('setting-logo-url')) getEl('setting-logo-url').value = user.logo_url || '';
    
    // Set currency selector
    const currencySelect = getEl('setting-currency');
    if (currencySelect) {
        const currencyCode = user.currency_code || 'USD';
        if (currencyCode === 'CUSTOM' || !currencySelect.querySelector(`option[value="${currencyCode}"]`)) {
            currencySelect.value = 'CUSTOM';
            if (getEl('custom-currency-group')) getEl('custom-currency-group').style.display = 'block';
        } else {
            currencySelect.value = currencyCode;
            if (getEl('custom-currency-group')) getEl('custom-currency-group').style.display = 'none';
        }
    }
    
    if (document.getElementById('setting-currency-symbol')) getEl('setting-currency-symbol').value = user.currency_symbol || '$';
    if (document.getElementById('setting-currency-decimals')) getEl('setting-currency-decimals').value = user.currency_decimals || 2;
    if (document.getElementById('setting-date-format')) getEl('setting-date-format').value = user.date_format || 'YYYY-MM-DD';
    if (document.getElementById('setting-time-format')) getEl('setting-time-format').value = user.time_format || '24h';
    if (document.getElementById('setting-language')) getEl('setting-language').value = user.language || 'es';
    if (document.getElementById('setting-report-footer')) getEl('setting-report-footer').value = user.report_footer_text || '';

    // Re-init custom selects para reflejar valores establecidos
    if (window.createCustomSelect) {
        document.querySelectorAll('#settings-view [data-custom-select]').forEach(el => {
            const wrapper = el.nextElementSibling;
            if (wrapper && wrapper.classList.contains('custom-select-container')) {
                wrapper.remove();
                el.style.display = 'block';
            }
            window.createCustomSelect(el);
        });
    }

    const logoPreview = getEl('setting-logo-preview');
    if (logoPreview) {
        if (user.logo_url) {
            logoPreview.src = getFullImagePath(user.logo_url);
            logoPreview.classList.remove('hidden');
        } else {
            logoPreview.classList.add('hidden');
        }
    }
}

async function handleSaveSettings() {
    // Convertir URL absoluta del logo a relativa antes de guardar
    let logoUrl = getEl('setting-logo-url').value;
    if (logoUrl && logoUrl.startsWith('http')) {
        try {
            const url = new URL(logoUrl);
            logoUrl = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
        } catch (e) {
            // Si no se puede parsear, mantener el valor original
        }
    }
    
    const payload = {
        company_id: AppState.currentUser.companyId,
        user_id: AppState.currentUser.id,
        name: getEl('setting-company-name').value,
        contact_phone: getEl('setting-contact-phone').value,
        contact_email: getEl('setting-contact-email').value,
        contact_address: getEl('setting-contact-address').value,
        sanitary_license: getEl('setting-sanitary-license').value,
        brand_color: getEl('setting-brand-color').value,
        theme: getEl('setting-theme').value,
        disable_glow: getEl('setting-disable-glow') && getEl('setting-disable-glow').checked ? 1 : 0,
        logo_url: logoUrl,
        currency_code: getEl('setting-currency').value,
        currency_symbol: getEl('setting-currency-symbol').value,
        currency_decimals: parseInt(getEl('setting-currency-decimals').value, 10),
        date_format: getEl('setting-date-format').value,
        time_format: getEl('setting-time-format').value,
        language: getEl('setting-language').value,
        report_footer_text: getEl('setting-report-footer').value,
        treatment_methods: AppState.currentTreatmentMethods || [],
        common_pests: AppState.currentCommonPests || [],
        treated_areas: AppState.currentTreatedAreas || []
    };

    const result = await apiCall('save_settings.php', { method: 'POST', body: JSON.stringify(payload) });

    if (result.success) {
        AppState.currentUser = { ...AppState.currentUser, ...payload };
        
        // Update global AppState.treatmentMethods immediately
        if (AppState.currentTreatmentMethods) {
            AppState.treatmentMethods = AppState.currentTreatmentMethods;
        }
        if (AppState.currentCommonPests) {
            AppState.commonPests = AppState.currentCommonPests;
        }
        if (AppState.currentTreatedAreas) {
            AppState.treatedAreas = AppState.currentTreatedAreas;
        }

        sessionStorage.setItem('pestyUser', JSON.stringify(AppState.currentUser));
        applySettings(AppState.currentUser);
        
        showAlert('Configuración guardada exitosamente.', 'Éxito');
    } else {
        showAlert(result.message || 'No se pudo guardar la configuración.', 'Error');
    }
}

// Expose functions to window
window.renderSettingsView = renderSettingsView;
window.handleSaveSettings = handleSaveSettings;

// Treatment Methods Management
function initTreatmentMethods() {
    // Ensure AppState is available
    const AppState = window.AppState;
    if (!AppState) return;

    // Clone current methods to avoid modifying global state directly until save
    AppState.currentTreatmentMethods = [...(AppState.treatmentMethods || [])];

    const input = document.getElementById('new-treatment-method');
    const addBtn = document.getElementById('add-treatment-method-btn');

    if (addBtn) {
        addBtn.onclick = () => {
            if (!input) return;
            const method = input.value.trim();
            if (method) {
                if (!AppState.currentTreatmentMethods.includes(method)) {
                    AppState.currentTreatmentMethods.push(method);
                    renderTreatmentMethodsTags();
                    input.value = '';
                } else {
                    showAlert('Este método ya existe.', 'Aviso');
                }
            }
        };
    }

    if (input) {
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (addBtn) addBtn.click();
            }
        };
    }

    const saveMethodsBtn = document.getElementById('save-treatment-methods-btn');
    if (saveMethodsBtn) {
        saveMethodsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Reuse the main save function to persist changes
            if (window.handleSaveSettings) {
                window.handleSaveSettings();
            }
        });
    }

    renderTreatmentMethodsTags();
}

function renderTreatmentMethodsTags() {
    const AppState = window.AppState;
    const container = document.getElementById('treatment-methods-container');
    if (!container || !AppState) return;

    container.innerHTML = '';
    
    if (!AppState.currentTreatmentMethods || AppState.currentTreatmentMethods.length === 0) {
        container.innerHTML = '<span style="color: var(--text-medium); font-style: italic; padding: 10px;">No hay métodos definidos. Agrega uno nuevo arriba.</span>';
        return;
    }

    AppState.currentTreatmentMethods.forEach((method, index) => {
        const item = document.createElement('div');
        item.className = 'treatment-method-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'treatment-method-name';
        nameSpan.textContent = method;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'treatment-method-actions';
        
        // Botón Editar
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'treatment-action-btn edit';
        editBtn.title = 'Editar';
        editBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        `;
        // Use event listener instead of onclick for better reliability
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            editTreatmentMethod(index);
        });
        
        // Botón Eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'treatment-action-btn delete';
        deleteBtn.title = 'Eliminar';
        deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        `;
        // Use event listener instead of onclick for better reliability
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeTreatmentMethod(index);
        });

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        item.appendChild(nameSpan);
        item.appendChild(actionsDiv);
        
        container.appendChild(item);
    });
}

window.removeTreatmentMethod = function(index) {
    const AppState = window.AppState;
    if (AppState && AppState.currentTreatmentMethods) {
        AppState.currentTreatmentMethods.splice(index, 1);
        renderTreatmentMethodsTags();
    }
};

window.editTreatmentMethod = function(index) {
    const AppState = window.AppState;
    if (AppState && AppState.currentTreatmentMethods) {
        const currentMethod = AppState.currentTreatmentMethods[index];
        
        const input = document.getElementById('edit-treatment-name');
        const indexInput = document.getElementById('edit-treatment-index');
        
        if (input && indexInput) {
            input.value = currentMethod;
            indexInput.value = index;
            openModal('edit-treatment-modal');
            setTimeout(() => input.focus(), 100);
        }
    }
};

window.handleEditTreatmentSubmit = function(e) {
    e.preventDefault();
    const indexInput = document.getElementById('edit-treatment-index');
    const nameInput = document.getElementById('edit-treatment-name');
    
    if (!indexInput || !nameInput) return;
    
    const index = parseInt(indexInput.value, 10);
    const newName = nameInput.value.trim();
    
    if (!newName) {
        showAlert('El nombre no puede estar vacío.', 'Aviso');
        return;
    }
    
    const AppState = window.AppState;
    if (AppState && AppState.currentTreatmentMethods) {
        const currentMethod = AppState.currentTreatmentMethods[index];
        
        if (newName !== currentMethod) {
            // Check for duplicates
             if (AppState.currentTreatmentMethods.includes(newName)) {
                showAlert('Este método ya existe.', 'Aviso');
                return;
            }
            AppState.currentTreatmentMethods[index] = newName;
            renderTreatmentMethodsTags();
        }
        closeModal('edit-treatment-modal');
    }
};

// Common Pests Management
function initCommonPests() {
    // Ensure AppState is available
    const AppState = window.AppState;
    if (!AppState) return;

    // Clone current pests to avoid modifying global state directly until save
    AppState.currentCommonPests = [...(AppState.commonPests || [])];

    const input = document.getElementById('new-pest-item');
    const addBtn = document.getElementById('add-pest-btn');

    if (addBtn) {
        addBtn.onclick = () => {
            if (!input) return;
            const pest = input.value.trim();
            if (pest) {
                if (!AppState.currentCommonPests.includes(pest)) {
                    AppState.currentCommonPests.push(pest);
                    renderCommonPestsTags();
                    input.value = '';
                } else {
                    showAlert('Esta plaga ya existe.', 'Aviso');
                }
            }
        };
    }

    if (input) {
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (addBtn) addBtn.click();
            }
        };
    }

    const savePestsBtn = document.getElementById('save-pests-btn');
    if (savePestsBtn) {
        savePestsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Reuse the main save function to persist changes
            if (window.handleSaveSettings) {
                window.handleSaveSettings();
            }
        });
    }

    renderCommonPestsTags();
}

function renderCommonPestsTags() {
    const AppState = window.AppState;
    const container = document.getElementById('pests-container');
    if (!container || !AppState) return;

    container.innerHTML = '';
    
    if (!AppState.currentCommonPests || AppState.currentCommonPests.length === 0) {
        container.innerHTML = '<span style="color: var(--text-medium); font-style: italic; padding: 10px;">No hay plagas definidas. Agrega una nueva arriba.</span>';
        return;
    }

    AppState.currentCommonPests.forEach((pest, index) => {
        const item = document.createElement('div');
        item.className = 'treatment-method-item'; // Reuse existing class for styling
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'treatment-method-name';
        nameSpan.textContent = pest;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'treatment-method-actions';
        
        // Botón Editar
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'treatment-action-btn edit';
        editBtn.title = 'Editar';
        editBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        `;
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            editPest(index);
        });
        
        // Botón Eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'treatment-action-btn delete';
        deleteBtn.title = 'Eliminar';
        deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        `;
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removePest(index);
        });

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        item.appendChild(nameSpan);
        item.appendChild(actionsDiv);
        
        container.appendChild(item);
    });
}

window.removePest = function(index) {
    const AppState = window.AppState;
    if (AppState && AppState.currentCommonPests) {
        AppState.currentCommonPests.splice(index, 1);
        renderCommonPestsTags();
    }
};

window.editPest = function(index) {
    const AppState = window.AppState;
    if (AppState && AppState.currentCommonPests) {
        const currentPest = AppState.currentCommonPests[index];
        
        const input = document.getElementById('edit-pest-name');
        const indexInput = document.getElementById('edit-pest-index');
        
        if (input && indexInput) {
            input.value = currentPest;
            indexInput.value = index;
            openModal('edit-pest-modal');
            setTimeout(() => input.focus(), 100);
        }
    }
};

window.handleEditPestSubmit = function(e) {
    e.preventDefault();
    const indexInput = document.getElementById('edit-pest-index');
    const nameInput = document.getElementById('edit-pest-name');
    
    if (!indexInput || !nameInput) return;
    
    const index = parseInt(indexInput.value, 10);
    const newName = nameInput.value.trim();
    
    if (!newName) {
        showAlert('El nombre no puede estar vacío.', 'Aviso');
        return;
    }
    
    const AppState = window.AppState;
    if (AppState && AppState.currentCommonPests) {
        const currentPest = AppState.currentCommonPests[index];
        
        if (newName !== currentPest) {
            // Check for duplicates
             if (AppState.currentCommonPests.includes(newName)) {
                showAlert('Esta plaga ya existe.', 'Aviso');
                return;
            }
            AppState.currentCommonPests[index] = newName;
            renderCommonPestsTags();
        }
        closeModal('edit-pest-modal');
    }
};

// Treated Areas Management
function initTreatedAreas() {
    // Ensure AppState is available
    const AppState = window.AppState;
    if (!AppState) return;

    // Clone current areas to avoid modifying global state directly until save
    AppState.currentTreatedAreas = [...(AppState.treatedAreas || [])];

    const input = document.getElementById('new-area-item');
    const addBtn = document.getElementById('add-area-btn');

    if (addBtn) {
        addBtn.onclick = () => {
            if (!input) return;
            const area = input.value.trim();
            if (area) {
                if (!AppState.currentTreatedAreas.includes(area)) {
                    AppState.currentTreatedAreas.push(area);
                    renderTreatedAreasTags();
                    input.value = '';
                } else {
                    showAlert('Esta área ya existe.', 'Aviso');
                }
            }
        };
    }

    if (input) {
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (addBtn) addBtn.click();
            }
        };
    }

    const saveAreasBtn = document.getElementById('save-areas-btn');
    if (saveAreasBtn) {
        saveAreasBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Reuse the main save function to persist changes
            if (window.handleSaveSettings) {
                window.handleSaveSettings();
            }
        });
    }

    renderTreatedAreasTags();
}

function renderTreatedAreasTags() {
    const AppState = window.AppState;
    const container = document.getElementById('areas-container');
    if (!container || !AppState) return;

    container.innerHTML = '';
    
    if (!AppState.currentTreatedAreas || AppState.currentTreatedAreas.length === 0) {
        container.innerHTML = '<span style="color: var(--text-medium); font-style: italic; padding: 10px;">No hay áreas definidas. Agrega una nueva arriba.</span>';
        return;
    }

    AppState.currentTreatedAreas.forEach((area, index) => {
        const item = document.createElement('div');
        item.className = 'treatment-method-item'; // Reuse existing class for styling
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'treatment-method-name';
        nameSpan.textContent = area;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'treatment-method-actions';
        
        // Botón Editar
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'treatment-action-btn edit';
        editBtn.title = 'Editar';
        editBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        `;
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            editArea(index);
        });
        
        // Botón Eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'treatment-action-btn delete';
        deleteBtn.title = 'Eliminar';
        deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        `;
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeArea(index);
        });

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        item.appendChild(nameSpan);
        item.appendChild(actionsDiv);
        
        container.appendChild(item);
    });
}

window.removeArea = function(index) {
    const AppState = window.AppState;
    if (AppState && AppState.currentTreatedAreas) {
        AppState.currentTreatedAreas.splice(index, 1);
        renderTreatedAreasTags();
    }
};

window.editArea = function(index) {
    const AppState = window.AppState;
    if (AppState && AppState.currentTreatedAreas) {
        const currentArea = AppState.currentTreatedAreas[index];
        
        const input = document.getElementById('edit-area-name');
        const indexInput = document.getElementById('edit-area-index');
        
        if (input && indexInput) {
            input.value = currentArea;
            indexInput.value = index;
            openModal('edit-area-modal');
            setTimeout(() => input.focus(), 100);
        }
    }
};

window.handleEditAreaSubmit = function(e) {
    e.preventDefault();
    const indexInput = document.getElementById('edit-area-index');
    const nameInput = document.getElementById('edit-area-name');
    
    if (!indexInput || !nameInput) return;
    
    const index = parseInt(indexInput.value, 10);
    const newName = nameInput.value.trim();
    
    if (!newName) {
        showAlert('El nombre no puede estar vacío.', 'Aviso');
        return;
    }
    
    const AppState = window.AppState;
    if (AppState && AppState.currentTreatedAreas) {
        const currentArea = AppState.currentTreatedAreas[index];
        
        if (newName !== currentArea) {
            // Check for duplicates
             if (AppState.currentTreatedAreas.includes(newName)) {
                showAlert('Esta área ya existe.', 'Aviso');
                return;
            }
            AppState.currentTreatedAreas[index] = newName;
            renderTreatedAreasTags();
        }
        closeModal('edit-area-modal');
    }
};
