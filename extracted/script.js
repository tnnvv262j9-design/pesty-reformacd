import { AppState } from './js/state.js';
import { apiCall } from './js/api.js';
import { Toast, showAlert, showConfirm, openModal, closeModal, createCustomSelect, getEl, applySettings } from './js/ui.js';
import { formatDate, formatCurrency, escapeHtml, getFullImagePath } from './js/utils.js';
import { checkSession as authCheckSession, handleLogout, processSuccessfulLogin } from './js/auth.js';
import { initParticles } from './js/particles.js';
import { loadMaintenanceConfig, isFeatureInMaintenance, checkMaintenanceAndAlert } from './js/maintenance.js';
import { checkPermissions, hasModuleAccess } from './js/permissions.js';

// --- GLOBAL UI HELPERS (Available immediately) ---

window.getEl = (id) => document.getElementById(id);

window.openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Z-Index Management for overlapping modals
        if (modalId === 'registration-modal') {
            modal.style.zIndex = '10001';
        }

        if (window.initInputValidations) {
            window.initInputValidations(modal);
        }
    }
};

window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = '';
        modal.style.zIndex = '';
        const otherActiveModals = document.querySelectorAll('.modal.active').length;
        if (otherActiveModals === 0) {
            document.body.style.overflow = '';
        }
    }
};

window.showRegistrationModal = function() {
    console.log('Opening registration modal...');
    window.openModal('registration-modal');
};

window.showLoginModal = function() {
    window.openModal('login-modal');
};

window.copySignatureLink = async (id) => {
    try {
        const response = await fetch(`api/generate_token.php?id=${id}`);
        const data = await response.json();
        
        if (data.success) {
            const link = `${window.location.origin}/sign.php?id=${encodeURIComponent(data.token)}`;
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(link);
                if (window.Toast) {
                    window.Toast.success('Link seguro copiado al portapapeles.');
                } else {
                    alert('Link seguro copiado al portapapeles:\n' + link);
                }
            } else {
                prompt('Copia este link seguro:', link);
            }
        } else {
            if (window.Toast) window.Toast.error('Error al generar link seguro: ' + (data.message || ''));
            else alert('Error al generar link seguro');
        }
    } catch (e) {
        console.error(e);
        if (window.Toast) window.Toast.error('Error al conectar con el servidor');
        else alert('Error al conectar con el servidor');
    }
};

// --- PARTICLE BACKGROUND ANIMATION ---

// Add global click handler for modal backdrop closing
document.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
        // Ignore login modal - it should not be closed by clicking backdrop
        if (modal.id === 'login-modal') return;

        // If the click target is the modal container itself (the backdrop)
        if (e.target === modal) {
            console.log(`Closing modal ${modal.id} via backdrop click`);
            closeModal(modal.id);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Initialize internationalization system
    if (window.I18n) {
        window.i18n = new I18n();
        window.i18n.init();
    }
    
    // Initialize global input validations
    if (window.initInputValidations) {
        window.initInputValidations();
    }
    
    // Mobile detection removed
    
    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hidden');
    }, 2000);

    // --- Input Validations & Masks ---
    window.applyPhoneMask = (input) => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Solo números
            if (value.length > 10) value = value.slice(0, 10);
            
            let formatted = '';
            if (value.length > 0) {
                formatted = '(' + value.slice(0, 3);
                if (value.length > 3) {
                    formatted += ') ' + value.slice(3, 6);
                    if (value.length > 6) {
                        formatted += '-' + value.slice(6, 10);
                    }
                }
            }
            e.target.value = formatted;
        });
    };

    window.validateEmail = (input) => {
        const validate = () => {
            const email = input.value;
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email && !re.test(email)) {
                input.style.borderColor = 'var(--error-color)';
                if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('email-error')) {
                    const error = document.createElement('div');
                    error.className = 'email-error';
                    error.style.color = 'var(--error-color)';
                    error.style.fontSize = '0.8rem';
                    error.style.marginTop = '5px';
                    error.textContent = 'Formato de email inválido';
                    input.parentNode.appendChild(error);
                }
            } else {
                input.style.borderColor = '';
                const error = input.parentNode.querySelector('.email-error');
                if (error) error.remove();
            }
        };
        input.addEventListener('blur', validate);
        input.addEventListener('input', validate);
    };

    window.initInputValidations = (container = document) => {
        container.querySelectorAll('input[type="tel"]').forEach(window.applyPhoneMask);
        container.querySelectorAll('input[type="email"]').forEach(window.validateEmail);
    };

    function init() {
        if (window.checkSession) window.checkSession(); 
        if (window.loadMaintenanceConfig) window.loadMaintenanceConfig();
        handleUpgradeReturn();

        // Event listeners para formularios de login
        getEl('login-form-email').addEventListener('submit', handleLogin);
        getEl('login-form-code').addEventListener('submit', handleLogin);

        getEl('logout-btn').addEventListener('click', handleLogout);
        
        // Los event listeners de navegación se configuran en showApp()
        
        // Event listeners para pestañas de login
        const loginTabs = document.querySelectorAll('.login-tab');
        loginTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.getAttribute('data-tab');
                switchLoginTab(tabType);
            });
        });
        
        // Los formularios de login ya tienen sus event listeners configurados arriba
        
        // Event listeners para botones de suscripción (landing / marketing)
        const planButtons = document.querySelectorAll('.plan-button');
        planButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const plan = button.getAttribute('data-plan');
                handlePlanSelection(plan);
            });
        });

        
        const addFormSubmitListener = (formId, handler, requiresAdmin = false) => {
            const form = getEl(formId);
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (checkPermissions(requiresAdmin)) {
                        const btn = form.querySelector('button[type="submit"]');
                        if (btn) {
                            if (btn.disabled) return; // Prevenir doble envío si ya está deshabilitado
                            btn.disabled = true;
                            const originalText = btn.textContent;
                            btn.innerHTML = '<div class="spinner small"></div> Procesando...';
                            
                            try {
                                await handler(e); // Pasar evento por si acaso
                            } catch (error) {
                                console.error("Error en submit handler:", error);
                            } finally {
                                if (document.body.contains(btn)) {
                                    btn.disabled = false;
                                    btn.textContent = originalText;
                                }
                            }
                        } else {
                            handler(e);
                        }
                    }
                });
            }
        };

        // Expose variables to window for modules
        window.AppState = AppState;
        window.getEl = getEl;
        window.showAlert = showAlert;
        window.checkPermissions = checkPermissions;
        window.apiCall = apiCall;
        window.applySettings = applySettings;
        window.addFormSubmitListener = addFormSubmitListener;
        window.formatDate = formatDate;
        window.escapeHtml = escapeHtml;
        window.createCustomSelect = createCustomSelect;
        window.showConfirm = showConfirm;
        window.subscribePlan = subscribePlan;
        window.processSuccessfulLogin = processSuccessfulLogin;




        
        // Event listeners para cálculo automático en notas de pago
        const subtotalInput = getEl('payment-note-subtotal');
        if (subtotalInput) subtotalInput.addEventListener('input', calculatePaymentNoteTotal);
        
        const taxRateInput = getEl('payment-note-tax-rate');
        if (taxRateInput) taxRateInput.addEventListener('input', calculatePaymentNoteTotal);
        
        addFormSubmitListener('service-report-form', handleSaveServiceReport, false);
        addFormSubmitListener('service-form', handleSaveService, true); // <-- Restaurado
        addFormSubmitListener('expense-form', handleSaveExpense, true); // <-- Restaurado
        addFormSubmitListener('invoice-form', handleSaveInvoice, true); // <-- Restaurado
        addFormSubmitListener('payment-note-form', handleSavePaymentNote, true); // <-- Restaurado
        addFormSubmitListener('reminder-form', handleSaveReminder, true);
        addFormSubmitListener('add-company-form', handleSaveCompany, true);

        
        const safeAddListener = (id, event, handler) => {
            const el = getEl(id);
            if (el) el.addEventListener(event, handler);
        };

        safeAddListener('service-client-name', 'blur', checkExistingClient);
        safeAddListener('service-tech-name', 'blur', checkExistingTech);
        
        const addReminderBtn = getEl('add-reminder-btn');
        if (addReminderBtn) {
            addReminderBtn.addEventListener('click', () => {
                if (checkPermissions(true)) {
                    const date = addReminderBtn.dataset.date;
                    openReminderModal(date);
                }
            });
        }
        
        safeAddListener('report-photos-before', 'change', (e) => handlePhotoSelection(e, 'before', 25));
        safeAddListener('report-photos-after', 'change', (e) => handlePhotoSelection(e, 'after', 25));
        safeAddListener('signature-clear-btn', 'click', () => AppState.signaturePad.clear());
        safeAddListener('signature-save-btn', 'click', handleSaveSignature);
        
        const warrantyCheckbox = getEl('warranty-applies-checkbox');
        if (warrantyCheckbox) {
            warrantyCheckbox.addEventListener('change', (e) => {
                getEl('report-warranty-duration-group').classList.toggle('hidden', !e.target.checked);
            });
        }
        
        safeAddListener('services-table', 'click', (e) => {
            const row = e.target.closest('tr.service-row');
            if (row && !e.target.closest('.action-cell')) {
                toggleServiceDetails(row);
            }
        });
        
        safeAddListener('stat-card-today', 'click', () => showTodayServices(true));
        safeAddListener('stat-card-pending', 'click', showPendingServices);
        safeAddListener('stat-card-clients', 'click', () => { if(checkPermissions(true)) showActiveClients(); });
        safeAddListener('stat-card-completed', 'click', showCompletedServices);
        safeAddListener('details-list-content', 'click', handleDetailsListClick);

        const addFilterListener = (id, handler) => {
            const element = getEl(id);
            if (element) {
                element.addEventListener('input', handler);
            }
        };


        addFilterListener('expense-search', renderExpensesTable);

        addFilterListener('invoice-search', renderInvoicesTable);
        addFilterListener('payment-note-search', renderPaymentNotesTable); // <-- NUEVO
        

        const serviceFilterDate = getEl('service-filter-date');
        if (serviceFilterDate) serviceFilterDate.addEventListener('change', renderServicesTable);
        
        // Restricciones de módulos eliminadas - funcionalidad completa disponible
    }

    async function checkSession() {
        const currentAppState = window.AppState || AppState;
        const storedUser = sessionStorage.getItem('pestyUser');
        if (storedUser && currentAppState) {
            currentAppState.currentUser = JSON.parse(storedUser);
            if (window.applySettings) window.applySettings(currentAppState.currentUser);
            await loadInitialData();
            showApp();
        }
    }

    // Funciones para manejo de pestañas de login
    function switchLoginTab(tabName) {
        // Cambiar pestañas activas
        document.querySelectorAll('.login-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.login-form-tab').forEach(form => form.classList.remove('active'));
        
        // Activar la pestaña correcta
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        // Activar el formulario correcto
        const activeForm = getEl(`login-form-${tabName}`);
        if (activeForm) activeForm.classList.add('active');
        
        // Limpiar campos
        clearLoginFields();
    }
    
    // Suscripción dentro de la app para empresas existentes con Ecart Pay
    async function subscribePlan(planCode) {
        if (!AppState.currentUser || !AppState.currentUser.companyId) {
            showAlert('Primero inicia sesión con tu empresa para suscribirte.', 'Error');
            return;
        }

        const email = (
            AppState.currentUser.contact_email ||
            AppState.currentUser.email ||
            AppState.currentUser.username ||
            ''
        ).trim();
        
        const name = (AppState.currentUser.name || 'Cliente').trim();
        const phone = (AppState.currentUser.contact_phone || '5555555555').trim();
        
        if (!email) {
            showAlert('No se encontró un correo electrónico para la suscripción. Actualiza tus datos de usuario.', 'Error');
            return;
        }

        try {
            const result = await apiCall('create_ecartpay_subscription.php', {
                method: 'POST',
                body: JSON.stringify({
                    company_id: AppState.currentUser.companyId,
                    plan: planCode,
                    email: email,
                    name: name,
                    phone: phone
                })
            });

            if (result.success && (result.payment_link || result.checkout_link)) {
                window.location.href = result.payment_link || result.checkout_link;
            } else {
                showAlert(result.message || 'Error al procesar la suscripción con Ecart Pay.', 'Error');
            }
        } catch (error) {
            console.error('Error al suscribirse:', error);
            showAlert('Error de conexión al procesar la suscripción.', 'Error');
        }
    }
    
    // Actualización de plan
    window.upgradePlan = async function (fromPlan, toPlan) {
        return subscribePlan(toPlan);
    };

    function handleUpgradeReturn() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            showAlert('¡Pago exitoso! Tu plan se actualizará en unos momentos.', 'Éxito');
            // Limpiar URL
            const url = new URL(window.location.href);
            url.searchParams.delete('payment');
            url.searchParams.delete('plan');
            window.history.replaceState({}, '', url);
        } else if (params.get('payment') === 'failure') {
            showAlert('Hubo un problema con tu pago. Por favor intenta de nuevo.', 'Error');
            const url = new URL(window.location.href);
            url.searchParams.delete('payment');
            window.history.replaceState({}, '', url);
        }
    }
    
    function clearLoginFields() {
        const fields = ['access-code', 'login-email', 'login-password', 'login-2fa-code'];
        fields.forEach(fieldId => {
            const field = getEl(fieldId);
            if (field) {
                field.value = '';
                field.classList.remove('shake');
            }
        });
        
        // Ocultar grupo 2FA
        const twoFAGroup = getEl('2fa-group');
        if (twoFAGroup) twoFAGroup.style.display = 'none';
    }
    
    // Funciones para manejo de suscripciones (landing)
    function handlePlanSelection(planType) {
        console.log('Plan seleccionado:', planType);
        
        // Datos de los planes
        const planData = {
            pesty: {
                name: 'Plan Pesty',
                price: 199,
                description: 'Ideal para independientes. Gestión básica de servicios y reportes.'
            },
            pesty_core: {
                name: 'Plan Pesty Core',
                price: 399,
                description: 'Acceso a certificados, análisis avanzado y soporte prioritario.'
            },
            enterprise: {
                name: 'Plan Empresarial',
                price: 699,
                description: 'Todo ilimitado, gestión de múltiples sucursales y personalización total.'
            }
        };
        
        const selectedPlan = planData[planType];
        if (!selectedPlan) {
            showAlert('Plan no válido', 'Error');
            return;
        }
        
        // Mostrar modal de registro de empresa
        showCompanyRegistrationModal(selectedPlan);
    }
    
    function showCompanyRegistrationModal(planData) {
        // Crear modal dinámicamente si no existe
        let modal = document.getElementById('company-registration-modal');
        if (!modal) {
            modal = createCompanyRegistrationModal();
            document.body.appendChild(modal);
        }
        
        // Actualizar información del plan seleccionado
        const planInfo = modal.querySelector('.selected-plan-info');
        planInfo.innerHTML = `
            <h4>${planData.name}</h4>
            <p class="plan-price-display">$${planData.price} MXN/mes</p>
            <p class="plan-description">${planData.description}</p>
        `;
        
        // Mostrar modal
        modal.classList.add('active');
        
        // Configurar el formulario con el plan seleccionado
        const form = modal.querySelector('#company-registration-form');
        form.dataset.selectedPlan = JSON.stringify(planData);
    }
    
    function createCompanyRegistrationModal() {
        const modalHTML = `
            <div id="company-registration-modal" class="modal no-print">
                <div class="modal-content">
                    <span class="modal-close" onclick="closeModal('company-registration-modal')">×</span>
                    <h2>Registro de Empresa</h2>
                    
                    <div class="selected-plan-info"></div>
                    
                    <form id="company-registration-form">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="company-name">Nombre de la Empresa</label>
                                <input type="text" id="company-name" required placeholder="Ej: Control de Plagas ABC">
                            </div>
                            <div class="form-group">
                                <label for="company-email">Email Corporativo</label>
                                <input type="email" id="company-email" required placeholder="admin@empresa.com">
                            </div>
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="company-password">Contraseña</label>
                                <input type="password" id="company-password" required placeholder="Mínimo 8 caracteres">
                            </div>
                            <div class="form-group">
                                <label for="company-password-confirm">Confirmar Contraseña</label>
                                <input type="password" id="company-password-confirm" required placeholder="Repetir contraseña">
                            </div>
                        </div>
                        <div class="form-group full-width">
                            <label for="company-phone">Teléfono de Contacto</label>
                            <input type="tel" id="company-phone" placeholder="Ej: +52 899 123 4567">
                        </div>
                        
                        <div class="form-group full-width">
                            <label class="checkbox-container">
                                <input type="checkbox" id="terms-accepted" required>
                                <span class="checkmark"></span>
                                Acepto los <a href="#" target="_blank">términos y condiciones</a> y la <a href="#" target="_blank">política de privacidad</a>
                            </label>
                        </div>
                        
                        <button type="submit" class="cta-button" style="width:100%; margin-top: 20px;">Crear Cuenta</button>
                    </form>
                </div>
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;
        const modal = tempDiv.firstElementChild;
        
        // Agregar event listeners
        const form = modal.querySelector('#company-registration-form');
        form.addEventListener('submit', handleCompanyRegistration);
        
        return modal;
    }
    
    async function handleCompanyRegistration(e) {
        e.preventDefault();
        
        const form = e.target;
        const planData = JSON.parse(form.dataset.selectedPlan);
        
        // Map plan display names to internal codes
        const planCodeMap = {
            'Plan Pesty': 'pesty',
            'Plan Pesty Core': 'pesty_core',
            'Plan Empresarial': 'enterprise'
        };
        const planCode = planCodeMap[planData.name] || 'pesty';
        
        const formData = {
            company_name: getEl('company-name').value,
            email: getEl('company-email').value,
            password: getEl('company-password').value,
            password_confirm: getEl('company-password-confirm').value,
            phone: getEl('company-phone').value,
            plan: planData,
            plan_code: planCode
        };
        
        // Validar contraseñas
        if (formData.password !== formData.password_confirm) {
            showAlert('Las contraseñas no coinciden', 'Error de Validación');
            return;
        }
        
        if (formData.password.length < 8) {
            showAlert('La contraseña debe tener al menos 8 caracteres', 'Error de Validación');
            return;
        }
        
        // Mostrar spinner de carga
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
        try {
            // Llamar al backend para registrar la empresa
            const response = await fetch('api/register_company.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Error en el servidor');
            }
            
            if (result.success) {
                // Cerrar modal de registro
                closeModal('company-registration-modal');
                
                // Procesar pago con Ecart Pay
                await processPayment(result.data, formData);
                
            } else {
                throw new Error(result.message || 'Error desconocido');
            }
            
        } catch (error) {
            console.error('Error en el registro:', error);
            showAlert(error.message || 'Error al procesar el registro. Inténtalo de nuevo.', 'Error');
        } finally {
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
    
    function showAccessCodeInfo(companyData) {
        const message = `
            <div style="text-align: center; padding: 20px;">
                <h3 style="color: var(--accent-primary); margin-bottom: 15px;">¡Registro Completado!</h3>
                <p style="margin-bottom: 15px;">Tu empresa ha sido registrada exitosamente.</p>
                <div style="background: var(--bg-medium); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Código de Acceso:</strong></p>
                    <p style="font-size: 1.2rem; font-weight: bold; color: var(--accent-primary); margin: 10px 0;">${companyData.access_code}</p>
                    <p style="font-size: 0.9rem; color: var(--text-medium);">Guarda este código para acceder a tu cuenta</p>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-medium);">Período de prueba hasta: ${new Date(companyData.trial_ends_at).toLocaleDateString()}</p>
            </div>
        `;
        
        // Crear modal personalizado para mostrar la información
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <span class="modal-close" onclick="this.parentElement.parentElement.remove()">×</span>
                ${message}
                <button class="cta-button" onclick="this.parentElement.parentElement.remove()" style="width: 100%; margin-top: 15px;">Entendido</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Función para procesar pago con Ecart Pay
    async function processPayment(companyData, formData) {
        console.log('Procesando pago inicial con Ecart Pay:', formData);
        
        try {
            const result = await apiCall('create_ecartpay_order.php', {
                method: 'POST',
                body: JSON.stringify({
                    company_id: companyData.id,
                    plan: formData.plan_code || 'pesty',
                    payer_email: formData.email
                })
            });

            if (result.success && result.payment_link) {
                window.location.href = result.payment_link;
            } else {
                // If payment link creation fails, still show access info since company is registered
                showAccessCodeInfo(companyData);
                showAlert(result.message || 'Error al generar el link de pago. Por favor contacta a soporte.', 'Error');
            }
        } catch (error) {
            console.error('Error Ecart Pay:', error);
            // Still show access info on error
            showAccessCodeInfo(companyData);
            showAlert('Error al conectar con Ecart Pay. Por favor contacta a soporte.', 'Error');
        }
    }
    
    // Lógica de recuperar contraseña movida al módulo dedicado: modulos/auth/forgot_password.js

    async function handleLogin(e) {
        e.preventDefault();
        const activeTab = document.querySelector('.login-form-tab.active');
        
        if (activeTab.id === 'login-form-email') {
            await handleEmailLogin();
        } else {
            await handleAccessCodeLogin();
        }
    }
    
    async function handleEmailLogin() {
        const emailInput = getEl('login-email');
        const passwordInput = getEl('login-password');
        const twoFAInput = getEl('login-2fa-code');
        const spinner = getEl('login-spinner-email');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const twoFACode = twoFAInput.value.trim();
        
        if (!email || !password) {
            showAlert('Por favor ingrese email y contraseña.', 'Campos Requeridos');
            return;
        }
        
        spinner.style.display = 'block';
        emailInput.disabled = true;
        passwordInput.disabled = true;
        twoFAInput.disabled = true;
        
        const loginData = {
            login_type: 'email',
            email: email,
            password: password
        };
        
        if (twoFACode) {
            loginData.two_factor_code = twoFACode;
        }
        
        const result = await apiCall('login.php', { 
            method: 'POST', 
            body: JSON.stringify(loginData) 
        });
        
        spinner.style.display = 'none';
        emailInput.disabled = false;
        passwordInput.disabled = false;
        twoFAInput.disabled = false;
        
        if (result.success && result.user) {
            processSuccessfulLogin(result.user);
        } else if (result.requires_2fa) {
            // Mostrar campo 2FA
            getEl('2fa-group').style.display = 'block';
            twoFAInput.focus();
            showAlert('Se ha enviado un código de verificación a su email.', 'Verificación 2FA');
        } else {
            showAlert(result.message || 'Email o contraseña incorrectos.', 'Error de Acceso');
            emailInput.classList.add('shake');
            passwordInput.classList.add('shake');
            setTimeout(() => {
                emailInput.classList.remove('shake');
                passwordInput.classList.remove('shake');
            }, 500);
        }
    }
    
    async function handleAccessCodeLogin() {
        const codeInput = getEl('access-code');
        const spinner = getEl('login-spinner-code');
        const code = codeInput.value;
        if (!code) return;

        spinner.style.display = 'block';
        codeInput.disabled = true;

        const result = await apiCall('login.php', { 
            method: 'POST', 
            body: JSON.stringify({ 
                login_type: 'access_code',
                access_code: code 
            }) 
        });
        
        spinner.style.display = 'none';
        codeInput.disabled = false;

        if (result.success && result.user) {
            processSuccessfulLogin(result.user);
        } else {
            showAlert(result.message || 'Código de acceso no válido.', 'Error de Acceso');
            codeInput.classList.add('shake');
            setTimeout(() => {
                codeInput.classList.remove('shake');
            }, 500);
        }
    }
    
    function processSuccessfulLogin(user) {
        AppState.currentUser = user;
        if (typeof AppState.currentUser.module_access === 'string') {
            try {
                AppState.currentUser.module_access = JSON.parse(AppState.currentUser.module_access);
            } catch(e) {
                AppState.currentUser.module_access = { modules: [], actions: [] };
            }
        }

        sessionStorage.setItem('pestyUser', JSON.stringify(user));
        applySettings(user);
        loadInitialData().then(() => showApp());
    }

    async function loadInitialData() {
        const currentAppState = window.AppState || AppState;
        const currentApiCall = window.apiCall || apiCall;
        
        if (!currentAppState || !currentAppState.currentUser) return;
        const { companyId, type, id } = currentAppState.currentUser;
        const result = await currentApiCall(`get_initial_data.php?company_id=${companyId}&user_type=${type}&user_id=${id}`);
        if (result.success) {
            currentAppState.db = result.data;
            
            // Actualizar datos del usuario con la configuración más reciente de la base de datos
            if (result.user) {
                // Mantener campos importantes del usuario actual
                const updatedUser = {
                    ...currentAppState.currentUser,
                    ...result.user,
                    companyId: currentAppState.currentUser.companyId,
                    type: currentAppState.currentUser.type,
                    id: currentAppState.currentUser.id
                };
                
                currentAppState.currentUser = updatedUser;
                sessionStorage.setItem('pestyUser', JSON.stringify(updatedUser));
                
                // Aplicar configuraciones actualizadas
                if (window.applySettings) window.applySettings(updatedUser);
            }

            // Update Chat Badge
            updateChatBadge(result.unread_chat || 0);
            
            // Actualizar widget de suscripción
            if (typeof renderSubscriptionWidget === 'function') {
                renderSubscriptionWidget();
            }
        } else {
            showAlert("Error al cargar los datos iniciales. La aplicación puede no funcionar correctamente.", "Error de Datos");
            AppState.db = { services: [], clients: [], technicians: [], quotes: [], invoices: [], expenses: [], reminders: [], payment_notes: [], chemicals: [] };
        }
    }

    window.updateChatBadge = function(count) {
        const btn = document.querySelector('.main-nav-btn[data-view="chat-view"]');
        if (!btn) return;
        
        let badge = btn.querySelector('.nav-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                badge.style.cssText = 'background: var(--error-color); color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; margin-left: 8px; vertical-align: middle;';
                btn.appendChild(badge);
            }
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            if (badge) badge.style.display = 'none';
        }
    };

    function handleLogout() {
        if (window.appPollingInterval) clearInterval(window.appPollingInterval);
        sessionStorage.removeItem('pestyUser');
        AppState.currentUser = null;
        getEl('app-container').classList.add('hidden');
        getEl('main-nav').classList.add('hidden'); // Ocultar nav al salir
        getEl('logout-btn').classList.add('hidden');
        getEl('welcome-message').textContent = '';
        getEl('login-modal').classList.add('active');
        getEl('access-code').value = '';
        // Solo aplicar configuraciones básicas de UI, no sobrescribir configuraciones del usuario
        applySettings({ theme: 'dark', brand_color: '#34D399' });
        if (AppState.calendar) {
            AppState.calendar.destroy();
            AppState.calendarInitialized = false;
        }
        if (AppState.statsInitialized) {
            Object.values(AppState.charts).forEach(chart => chart.destroy());
            AppState.statsInitialized = false;
        }
    }
    
    function showApp() {
        getEl('login-modal').classList.remove('active');
        getEl('app-container').classList.remove('hidden');
        getEl('main-nav').classList.remove('hidden'); // Mostrar nav al entrar
        
        // FORZAR VISIBILIDAD PARA TODOS
        const nav = getEl('main-nav');
        if (nav) {
            nav.style.display = 'flex';
            nav.style.opacity = '1';
            nav.style.visibility = 'visible';
            nav.classList.remove('mobile-open');
            nav.classList.remove('hidden');
        }
        
        getEl('logout-btn').classList.remove('hidden');
        
        // Start polling for real-time updates (every 30 seconds)
        if (window.appPollingInterval) clearInterval(window.appPollingInterval);
        window.appPollingInterval = setInterval(() => {
            const currentView = document.querySelector('.main-nav-btn.active')?.dataset.view;
            
            // Background data refresh
            loadInitialData().then(() => {
                if (currentView === 'dashboard-view') {
                    loadDashboardStats();
                    renderDashboard();
                } else if (currentView === 'stats-view' && window.renderStatisticsView) {
                    window.renderStatisticsView();
                }
            });
        }, 30000);

        const welcomeEl = getEl('welcome-message');
        let photoHtml = '';
        if (AppState.currentUser.photo) {
            photoHtml = `<img src="${AppState.currentUser.photo}" style="width: 35px; height: 35px; border-radius: 50%; vertical-align: middle; margin-right: 10px; border: 2px solid var(--accent-primary); object-fit: cover;">`;
        }
        welcomeEl.style.display = 'flex';
        welcomeEl.style.alignItems = 'center';
        welcomeEl.innerHTML = `${photoHtml}<span>Hola de nuevo, <span style="color: var(--accent-primary); font-weight: 700;">${AppState.currentUser.name}</span>! 👋</span>`;
        
        const badge = document.querySelector('.subscription-badge');
        if (badge) {
            const plan = AppState.currentUser.plan || 'trial';
            const planNameEl = badge.querySelector('.plan-name');
            const iconEl = badge.querySelector('.info-icon');
            
            if (!plan || plan === 'trial' || plan === 'pesty') {
                if (planNameEl) planNameEl.textContent = 'ACTUALIZAR';
                if (iconEl) iconEl.textContent = '↑';
                badge.style.borderColor = 'var(--accent-primary)';
            } else {
                const planNames = {
                    pesty: 'PESTY',
                    pesty_core: 'PESTY CORE',
                    enterprise: 'Plan Empresarial'
                };
                if (planNameEl) planNameEl.textContent = planNames[plan] || plan.toUpperCase();
                if (iconEl) iconEl.textContent = 'i';
                badge.style.borderColor = 'var(--accent-primary)';
            }
        }
        handleUpgradeReturn();
        
        // Mostrar/ocultar botón hamburguesa según tamaño de pantalla
        setupMobileMenu();
        
        // Configurar event listeners de navegación
        const navButtons = document.querySelectorAll('.main-nav-btn');
        navButtons.forEach(btn => {
            // Remover event listeners existentes para evitar duplicados
            btn.removeEventListener('click', handleNavClick);
            btn.addEventListener('click', handleNavClick);
        });
        
        setupPermissions();
        populateFilters(); 
        renderAllViews();
        document.querySelectorAll('[data-custom-select]').forEach(createCustomSelect);
        if (window.initFeedbackForm) {
            window.initFeedbackForm();
        }
        document.querySelector('.main-nav-btn[data-view="dashboard-view"]').click();
    }
    
    // Función para manejar el menú móvil (global)
    window.toggleMobileMenu = function() {
        const nav = document.querySelector('.main-nav');
        const overlay = getEl('nav-overlay');
        
        console.log('toggleMobileMenu llamado', { nav: !!nav, overlay: !!overlay });
        
        if (nav) {
            const isOpen = nav.classList.contains('mobile-open');
            if (isOpen) {
                nav.classList.remove('mobile-open');
                if (overlay) overlay.classList.remove('active');
            } else {
                nav.classList.add('mobile-open');
                if (overlay) overlay.classList.add('active');
            }
            console.log('Menú ahora:', nav.classList.contains('mobile-open') ? 'abierto' : 'cerrado');
        } else {
            console.error('Menú no encontrado');
        }
    };
    
    // Configurar menú móvil
    function setupMobileMenu() {
        const mobileToggle = getEl('mobile-menu-toggle');
        if (!mobileToggle) {
            console.log('Botón hamburguesa no encontrado');
            return;
        }
        
        // Mostrar/ocultar según tamaño de pantalla
        function checkScreenSize() {
            if (window.innerWidth <= 768) {
                mobileToggle.classList.remove('hidden');
                // Asegurar que el menú esté oculto por defecto
                const nav = document.querySelector('.main-nav');
                const overlay = getEl('nav-overlay');
                if (nav) {
                    nav.classList.remove('mobile-open');
                    nav.style.display = 'block'; // Asegurar que esté visible
                }
                if (overlay) overlay.classList.remove('active');
            } else {
                mobileToggle.classList.add('hidden');
                // Cerrar menú si está abierto
                const nav = document.querySelector('.main-nav');
                const overlay = getEl('nav-overlay');
                if (nav) {
                    nav.classList.remove('mobile-open');
                    nav.classList.remove('hidden'); // Asegurar que no tenga clase hidden
                    nav.style.display = ''; // Limpiar estilos en línea para que el CSS de escritorio funcione
                }
                if (overlay) overlay.classList.remove('active');
            }
        }
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        // Cerrar menú al hacer clic en un botón de navegación
        const navButtons = document.querySelectorAll('.main-nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    setTimeout(() => {
                        window.toggleMobileMenu();
                    }, 100);
                }
            });
        });
        
        console.log('Menú móvil configurado');
    }

    // --- FORCE ADMIN VIEW RENDER FOR DEBUGGING ---
    window.debugOpenAdmin = async () => {
        const adminBtn = getEl('nav-admin-btn');
        if (adminBtn) adminBtn.style.display = 'flex';
        
        getEl('admin-view').classList.remove('hidden');
        
        // Load script manually
        const script = document.createElement('script');
        script.src = 'modulos/admin/script.js?v=' + Date.now();
        script.onload = () => {
            console.log('Admin script loaded via debug');
            if (window.renderAdminView) window.renderAdminView();
        };
        document.body.appendChild(script);
    };

    function setupPermissions() {
        const user = AppState.currentUser;
        console.log('SetupPermissions User:', user);
        
        const isTech = user.type === 'tech';
        const isSuperAdmin = user.isSuperAdmin === true;
        console.log('isSuperAdmin Final:', isSuperAdmin);

        const moduleAccess = user.module_access?.modules || [];

        // Reset visibility first - FORCE DISPLAY FLEX
        document.querySelectorAll('.main-nav-btn').forEach(btn => {
            btn.classList.remove('hidden');
            btn.style.display = 'flex'; // Force display flex for buttons
        });

        // Hide admin-only elements for techs
        document.querySelectorAll('[data-admin-only]').forEach(el => {
            if (isTech) el.classList.add('hidden'); // Use class hidden logic
            if (isTech) el.style.display = 'none'; // Force style hide
        });
        
        // --- NUEVO: Ocultar botón de Biblioteca para técnicos ---
        const libraryBtn = document.querySelector('.main-nav-btn[data-view="library-view"]');
        if (libraryBtn) {
            if (isTech) {
                libraryBtn.classList.add('hidden');
                libraryBtn.style.display = 'none';
            }
        }
        
        // --- Ocultar elementos específicos en Configuración para técnicos ---
        if (isTech) {
            // Ocultar sección de Actividad de configuración
            const auditLogCard = getEl('audit-log-card');
            if (auditLogCard) auditLogCard.style.display = 'none';
            
            // Ocultar sección de Uso del Plan
            const usageStatsCard = getEl('usage-stats-card');
            if (usageStatsCard) usageStatsCard.style.display = 'none';
            
            // Ocultar modal de Nuestros Planes (si existe un botón o acceso directo)
            // Generalmente esto está en botones específicos, que ya deberían estar cubiertos por clases admin-only
            // Pero aseguramos ocultar cualquier elemento relacionado con planes
            const planBadges = document.querySelectorAll('.subscription-badge');
            planBadges.forEach(el => el.style.display = 'none');
        }
        // -------------------------------------------------------

        // Ocultar botón de prueba si ya se usó
        const trialBtn = document.getElementById('pesty-trial-btn');
        if (trialBtn) {
            if (user.trial_used == 1 || user.plan === 'pesty' || user.plan === 'pesty_core' || user.plan === 'enterprise') {
                trialBtn.style.display = 'none';
            } else {
                trialBtn.style.display = 'block';
            }
        }

        // Module access logic
        if (!isSuperAdmin && !isTech && moduleAccess.length > 0) {
            document.querySelectorAll('.main-nav-btn').forEach(btn => {
                const view = btn.dataset.view.replace('-view', '');
                if (view === 'companies') return; 
                if (view === 'routes') return; // Routes visibility is handled separately based on plan 
                
                // Allow dashboard always
                if (view === 'dashboard') return;

                // Permitir Rutas si es Plan Enterprise, aunque no tenga el módulo explícito
                if (view === 'routes') {
                    const uPlan = user.plan || '';
                    if (uPlan === 'enterprise' || uPlan === '3') return;
                }

                // Special exception for chemicals if limit > 0
                if (view === 'chemicals' && parseInt(user.limit_chemicals || 0) > 0) {
                     return;
                }

                const hasAccess = moduleAccess.includes(view);
                if (!hasAccess) {
                    btn.classList.add('hidden');
                    btn.style.display = 'none';
                }
            });
        }

        // Enforce Chemical Limit (Hide if limit is 0 or undefined, unless SuperAdmin)
        if (!isSuperAdmin && parseInt(user.limit_chemicals || 0) <= 0) {
             const chemBtn = document.querySelector('.main-nav-btn[data-view="chemicals-view"]');
             if (chemBtn) {
                 chemBtn.classList.add('hidden');
                 chemBtn.style.display = 'none';
             }
        }

        // Hide unreleased Cebaderos module for technicians
        if (isTech) {
            const cebBtn = document.querySelector('.main-nav-btn[data-view="cebaderos-view"]');
            if (cebBtn) {
                cebBtn.classList.add('hidden');
                cebBtn.style.display = 'none';
            }
            const cebView = getEl('cebaderos-view');
            if (cebView) {
                cebView.classList.add('hidden');
            }
        }

        // --- NUEVO: Ocultar botón de Rutas si no es Plan Empresarial ---
        // Plan Empresarial se identifica como 'enterprise' en el campo 'plan'
        
        const userPlan = user.plan || '';
        const isEnterprise = userPlan === 'enterprise' || userPlan === '3'; // Verificamos ambos por si acaso
        
        // Bloqueo estricto: Si NO es enterprise Y NO es SuperAdmin, OCULTAR SIEMPRE
        if (!isEnterprise && !isSuperAdmin) {
            const routesBtn = document.querySelector('.main-nav-btn[data-view="routes-view"]');
            if (routesBtn) {
                routesBtn.classList.add('hidden');
                routesBtn.style.display = 'none';
            }
        }

        // --- NUEVO: Ocultar botón de Certificados si no es Pesty Core o superior ---
        const isPestyCoreOrHigher = ['pesty_core', 'enterprise'].includes(userPlan);
        if (!isPestyCoreOrHigher && !isSuperAdmin) {
            const certBtn = document.querySelector('.main-nav-btn[data-view="certificates-view"]');
            if (certBtn) {
                certBtn.classList.add('hidden');
                certBtn.style.display = 'none';
            }
        }
        
        // ---------------------------------------------------------------

        // Special handling for Companies button
        const companiesBtn = getEl('nav-companies-btn');
        if (companiesBtn) {
            companiesBtn.style.display = isSuperAdmin ? 'flex' : 'none';
        }

        // Special handling for Admin button
        const adminBtn = getEl('nav-admin-btn');
        if (adminBtn) {
            console.log('Admin Button found, setting display:', isSuperAdmin ? 'flex' : 'none');
            adminBtn.style.display = isSuperAdmin ? 'flex' : 'none';
        } else {
            console.error('Admin Button NOT found in DOM');
        }

        // Special handling for Email Sender button
        const emailSenderBtn = getEl('nav-email-sender-btn');
        if (emailSenderBtn) {
            emailSenderBtn.style.display = isSuperAdmin ? 'flex' : 'none';
        }
    }

    function showGlobalLoader() {
        const loader = getEl('global-loader');
        if (loader) loader.classList.remove('hidden');
    }

    function hideGlobalLoader() {
        const loader = getEl('global-loader');
        if (loader) loader.classList.add('hidden');
    }

    function handleNavClick(e) { 
        const clickedView = e.currentTarget.dataset.view; 
        showGlobalLoader();
        
        // Guard: prevent access to unreleased Cebaderos module for techs or if no access
        if (clickedView === 'cebaderos-view') {
            const user = AppState.currentUser || {};
            if (user.type === 'tech' || !hasModuleAccess('cebaderos')) {
                hideGlobalLoader();
                showAlert('Módulo no disponible', 'Próximamente');
                return;
            }
        }
        
        document.querySelectorAll('.main-nav-btn').forEach(b => b.classList.remove('active')); 
        e.currentTarget.classList.add('active'); 
        document.querySelectorAll('.view-container').forEach(view => view.classList.add('hidden')); 
        const targetView = getEl(clickedView); 
        targetView.classList.remove('hidden'); 
        targetView.style.animation = 'none'; 
        targetView.offsetHeight; 
        targetView.style.animation = null; 
        if (clickedView === 'dashboard-view') {
            loadDashboardStats();
            renderDashboard();
        }
        if (clickedView === 'services-view') {
            renderServicesTable();
        }
        if (clickedView === 'calendar-view') {
            if (window.renderCalendarView) window.renderCalendarView();
        } 
        if (clickedView === 'stats-view' && AppState.currentUser.type !== 'tech') { 
            if (!hasModuleAccess('stats')) {
                hideGlobalLoader();
                showAlert('Módulo no disponible en tu plan actual.', 'Mejorar Plan');
                return;
            }
            if (window.renderStatisticsView) window.renderStatisticsView();
        }
        if (clickedView === 'settings-view') {
            if (window.renderSettingsView) window.renderSettingsView();
        }
        if (clickedView === 'companies-view') {
            renderCompaniesView();
        }
        if (clickedView === 'library-view') {
            if (!hasModuleAccess('library')) {
                hideGlobalLoader();
                showAlert('Módulo no disponible en tu plan actual.', 'Mejorar Plan');
                return;
            }
            if (window.renderDocumentLibrary) window.renderDocumentLibrary();
        }
        if (clickedView === 'expenses-view') {
            if (!hasModuleAccess('expenses')) {
                hideGlobalLoader();
                showAlert('Módulo no disponible en tu plan actual.', 'Mejorar Plan');
                return;
            }
            if (window.renderExpensesView) window.renderExpensesView();
        }
        if (clickedView === 'chemicals-view') {
            if (!hasModuleAccess('chemicals')) {
                hideGlobalLoader();
                showAlert('Módulo no disponible en tu plan actual.', 'Mejorar Plan');
                return;
            }
            if (window.renderChemicalsView) window.renderChemicalsView();
        }
        if (clickedView === 'epp-view') {
            if (!hasModuleAccess('epp')) {
                hideGlobalLoader();
                showAlert('Módulo no disponible en tu plan actual.', 'Mejorar Plan');
                return;
            }
            if (window.renderEppView) window.renderEppView();
        }
        if (clickedView === 'payment-notes-view') {
            if (window.renderPaymentNotesView) window.renderPaymentNotesView();
        }
        if (clickedView === 'certificates-view') {
            const user = AppState.currentUser || {};
            const userPlan = user.plan || '';
            const isPestyCoreOrHigher = ['pesty_core', 'enterprise'].includes(userPlan);
            
            if (!isPestyCoreOrHigher && !user.isSuperAdmin) {
                hideGlobalLoader();
                const certBtn = document.querySelector('.main-nav-btn[data-view="certificates-view"]');
                if (certBtn) {
                    certBtn.classList.add('hidden');
                    certBtn.style.display = 'none';
                }
                document.querySelector('.main-nav-btn[data-view="dashboard-view"]').click();
                return;
            }
            if (window.renderCertificatesView) window.renderCertificatesView();
        }
        if (clickedView === 'techs-view') {
            if (window.renderTechsView) window.renderTechsView();
        }
        if (clickedView === 'clients-view') {
            if (window.renderClientsView) window.renderClientsView();
        }
        if (clickedView === 'quotes-view') {
            if (window.renderQuotesView) window.renderQuotesView();
        }
        if (clickedView === 'routes-view') {
            const user = AppState.currentUser || {};
            // Verificar Plan Empresarial (enterprise)
            const userPlan = user.plan || '';
            const isEnterprise = userPlan === 'enterprise' || userPlan === '3';
            const hasExplicitAccess = hasModuleAccess('routes');
            
            // Si no es plan empresarial Y no es SuperAdmin, bloquear
            if (!isEnterprise && !user.isSuperAdmin) {
                hideGlobalLoader();
                // Ocultar botón de navegación también para evitar confusión futura
                const routesBtn = document.querySelector('.main-nav-btn[data-view="routes-view"]');
                if (routesBtn) {
                    routesBtn.classList.add('hidden');
                    routesBtn.style.display = 'none';
                }
                // Si el usuario intentó acceder directamente, redirigir al dashboard
                document.querySelector('.main-nav-btn[data-view="dashboard-view"]').click();
                return;
            }
            
            if (window.renderRoutesView) window.renderRoutesView();
        }
        if (clickedView === 'invoices-view') {
            renderInvoicesTable();
        }
        if (clickedView === 'admin-view') {
            console.log('Rendering Admin View...');
            if (window.renderAdminView) {
                window.renderAdminView();
            } else {
                console.error('renderAdminView not defined! Check if modulos/admin/script.js is loaded.');
                // Intentar carga dinámica de emergencia
                const script = document.createElement('script');
                script.src = 'modulos/admin/script.js?v=' + Date.now();
                script.onload = () => {
                    if (window.renderAdminView) window.renderAdminView();
                };
                document.body.appendChild(script);
            }
        }
        
        if (clickedView === 'email-sender-view') {
            console.log('Intentando renderizar Email Sender View...');
            if (window.renderEmailSenderView) {
                console.log('Función renderEmailSenderView encontrada, ejecutando...');
                window.renderEmailSenderView();
            } else {
                console.warn('renderEmailSenderView NO encontrada. Iniciando carga manual del script...');
                const script = document.createElement('script');
                script.src = 'modulos/email_sender/script.js?v=' + Date.now();
                script.onload = () => {
                    console.log('Script de Email Sender cargado exitosamente.');
                    if (window.renderEmailSenderView) {
                        console.log('Función renderEmailSenderView disponible tras carga, ejecutando...');
                        window.renderEmailSenderView();
                    } else {
                        console.error('ERROR CRÍTICO: El script cargó pero window.renderEmailSenderView sigue indefinido.');
                        alert('Error: No se pudo cargar el módulo de correos. Revisa la consola.');
                    }
                };
                script.onerror = (e) => {
                    console.error('Error al cargar el script modulos/email_sender/script.js', e);
                    alert('Error de red al cargar el módulo.');
                };
                document.body.appendChild(script);
            }
        }
        
        if (clickedView === 'cebaderos-view') {
            if (window.renderCebaderosView) window.renderCebaderosView();
        }
        if (clickedView === 'certificates-view') {
            if (window.renderCertificatesView) {
                window.renderCertificatesView();
            } else {
                const script = document.createElement('script');
                script.src = 'modulos/certificates/script.js?v=' + Date.now();
                script.onload = () => {
                    if (window.renderCertificatesView) window.renderCertificatesView();
                };
                document.body.appendChild(script);
            }
        }
        if (clickedView === 'chat-view') {
            if (window.renderChatView) {
                window.renderChatView();
            } else {
                const script = document.createElement('script');
                script.src = 'modulos/chat/script.js?v=' + Date.now();
                script.onload = () => {
                    if (window.renderChatView) window.renderChatView();
                };
                document.body.appendChild(script);
            }
        }
        
        setTimeout(hideGlobalLoader, 600);
    }
    
    window.refreshAllDataAndViews = async function() { 
        await loadInitialData(); 
        
        // Refetch detailed stats if we are on dashboard or stats view
        const currentView = document.querySelector('.main-nav-btn.active')?.dataset.view;
        if (currentView === 'dashboard-view') {
            loadDashboardStats();
        }
        if (currentView === 'stats-view') {
            // Stats view usually fetches its own data on render, but we can force it
        }

        populateFilters(); 
        renderAllViews();
        document.querySelectorAll('[data-custom-select]').forEach(createCustomSelect);
        if (AppState.calendar) AppState.calendar.refetchEvents(); 
    }

    function renderAllViews() {
        // Only render visible views to save resources, but always update data
        const currentView = document.querySelector('.main-nav-btn.active')?.dataset.view;
        
        if (currentView === 'dashboard-view' || !currentView) {
            renderDashboard();
        }
        
        // These are cheap to render or needed for background updates
        renderServicesTable(); 
        
        if (AppState.currentUser.type !== 'tech') {
            if (currentView === 'clients-view' && window.renderClientsView) window.renderClientsView(); 
            if (currentView === 'techs-view' && window.renderTechsView) window.renderTechsView(); 
            
            if (currentView === 'expenses-view') {
                if (window.renderExpensesView) window.renderExpensesView();
                // Forzar recarga de servicios si estamos en gastos
                if (AppState.db.services.length === 0) {
                     loadInitialData().then(() => {
                         if (window.renderExpensesView) window.renderExpensesView();
                     });
                }
            }
            if (currentView === 'chemicals-view' && window.renderChemicalsView) window.renderChemicalsView();
            if (currentView === 'cebaderos-view' && window.renderCebaderosView) window.renderCebaderosView();
            if (currentView === 'quotes-view' && window.renderQuotesView) window.renderQuotesView();
            if (currentView === 'invoices-view') renderInvoicesTable();
            if (currentView === 'payment-notes-view' && window.renderPaymentNotesView) window.renderPaymentNotesView();

            if (currentView === 'stats-view' && window.renderStatisticsView) {
                renderStatisticsView();
            }
            
            if (currentView === 'chat-view' && window.renderChatView) {
                // Chat has its own polling, but we can trigger a refresh if needed
                // window.renderChatView(); // Re-rendering might be too heavy, chat script handles its own polling
            }
        }
    }

    window.formatCurrency = (value) => {
        const settings = AppState.currentUser;
        if (window.i18n && typeof window.i18n.formatUserCurrency === 'function') {
            return window.i18n.formatUserCurrency(value, {
                currency_symbol: settings.currency_symbol || '$',
                currency_decimals: settings.currency_decimals || 2,
                currency_code: settings.currency_code || 'USD'
            });
        }
        // Fallback para compatibilidad usando configuración del usuario
        const val = parseFloat(value || 0);
        const currencyCode = settings.currency_code || 'USD';
        const locale = settings.language === 'es' ? 'es-ES' : 'en-US';
        
        return val.toLocaleString(locale, { 
            style: 'currency', 
            currency: currencyCode,
            minimumFractionDigits: settings.currency_decimals || 2, 
            maximumFractionDigits: settings.currency_decimals || 2 
        }).replace(currencyCode, '').replace(/[$€£¥]/g, settings.currency_symbol || '$').trim();
    };

    const formatStockNumber = (value) => {
        const num = parseFloat(value || 0);
        // Si es un número entero, no mostrar decimales
        if (num % 1 === 0) {
            return num.toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0});
        }
        // Si tiene decimales, mostrar hasta 3 decimales pero sin ceros innecesarios
        return num.toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 3});
    };

    const formatDate = (dateInput) => {
        if (!dateInput) return 'N/A';
        
        let dateString;
        if (dateInput instanceof Date) {
           
            dateString = dateInput.toISOString().split('T')[0];
        } else if (typeof dateInput === 'string') {
            dateString = dateInput;
        } else {
            return 'N/A';
        }
        
        const settings = AppState.currentUser;
        const [year, month, day] = dateString.split('-');
        switch(settings.date_format) {
            case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
            case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
            default: return dateString;
        }
    };

    window.formatTime = (timeString) => {
        if (!timeString) return '';
        const settings = AppState.currentUser;
        if (settings.time_format === '12h') {
            let [hours, minutes] = timeString.split(':');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
        }
        return timeString;
    };

    async function loadDashboardStats() { 
        const currentAppState = window.AppState || AppState;
        const currentApiCall = window.apiCall || apiCall;
        if (!currentAppState || !currentAppState.currentUser) return;

        const result = await currentApiCall(`get_dashboard_stats.php?company_id=${currentAppState.currentUser.companyId}`); 
        if (result.success) { 
            const stats = result.stats; 
            getEl('stat-today-services').textContent = stats.today_services || 0; 
            getEl('stat-pending-services').textContent = stats.pending_services || 0; 
            getEl('stat-active-clients').textContent = stats.active_clients || 0; 
            getEl('stat-month-completed').textContent = stats.month_completed_services || 0; 
        } 
    }

    async function loadUsageStats() {
        const currentAppState = window.AppState || AppState;
        const currentApiCall = window.apiCall || apiCall;
        const container = getEl('plan-usage-stats');
        if (!container) return;
        
        if (!currentAppState || !currentAppState.currentUser || !currentAppState.currentUser.companyId) return;

        const result = await currentApiCall(`get_usage_stats.php?company_id=${currentAppState.currentUser.companyId}`, { method: 'GET' });
        
        if (result.success && result.stats) {
            let html = '';
            for (const [key, stat] of Object.entries(result.stats)) {
                let color = 'var(--accent-primary)';
                if (stat.percent >= 90) color = '#ef4444';
                else if (stat.percent >= 75) color = '#f59e0b';
                const limitLabel = (stat.limit && stat.limit >= 999999) ? 'Ilimitado' : (stat.limit ?? 0);
                
                html += `
                    <div class="usage-item">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.85rem;">
                            <span style="color: var(--text-light); font-weight: 500;">${stat.label}</span>
                            <span style="color: var(--text-medium); font-size: 0.8rem;">${stat.current} / ${limitLabel}</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${Math.min(stat.percent, 100)}%; height: 100%; background: ${color}; transition: width 0.5s ease;"></div>
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p style="color: var(--text-medium); font-size: 0.8rem; text-align: center;">No disponible</p>';
        }
    }

    // --- NEW WIDGETS LOGIC ---
    let miniCalendarDate = new Date();

    function renderMiniCalendar() {
        const container = getEl('dashboard-mini-calendar');
        const card = getEl('dashboard-calendar-card');
        if (!container || !card) return;
        if (!hasModuleAccess('calendar')) {
            card.style.display = 'none';
            return;
        } else {
            card.style.display = 'block';
        }
        
        // Calculate start of week (Monday)
        const current = new Date(miniCalendarDate);
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const startOfWeek = new Date(current.setDate(diff));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        // Update header
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const startMonth = monthNames[startOfWeek.getMonth()];
        const endMonth = monthNames[endOfWeek.getMonth()];
        const year = startOfWeek.getFullYear();
        
        let headerText = `${startOfWeek.getDate()} ${startMonth} - ${endOfWeek.getDate()} ${endMonth} ${year}`;
        if (startOfWeek.getFullYear() !== endOfWeek.getFullYear()) {
             headerText = `${startOfWeek.getDate()} ${startMonth} ${startOfWeek.getFullYear()} - ${endOfWeek.getDate()} ${endMonth} ${endOfWeek.getFullYear()}`;
        }
        getEl('mini-cal-month-year').textContent = headerText;
        
        // Events (Services) for this week
        const services = AppState.db.services || [];
        const isPrivacy = window.isPrivacyMode && window.isPrivacyMode();
        const clientMap = (AppState.db.clients || []).reduce((map, client) => (map[client.id] = isPrivacy ? { ...client, full_name: 'Cliente Oculto' } : client, map), {});
        
        let html = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">';
        
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().slice(0, 10);
            const isToday = new Date().toISOString().slice(0, 10) === dateStr;
            
            // Filter services for this day
            const dayServices = services.filter(s => s.service_date === dateStr && s.status !== 'Cancelado');
            dayServices.sort((a, b) => a.service_time.localeCompare(b.service_time));
            
            const headerBg = isToday ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)';
            const headerColor = isToday ? '#000' : 'var(--text-medium)';
            const fontWeight = isToday ? 'bold' : 'normal';
            
            html += `<div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="background: ${headerBg}; color: ${headerColor}; padding: 4px; text-align: center; border-radius: 4px; font-size: 0.75rem; font-weight: ${fontWeight}; cursor: pointer;" onclick="window.openCalendarDate('${dateStr}')">
                    ${days[i]} ${date.getDate()}
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px; min-height: 50px;">`;
            
            if (dayServices.length > 0) {
                dayServices.forEach(s => {
                    const client = clientMap[s.client_id];
                    const color = s.status === 'Realizado' ? 'var(--accent-primary)' : 'var(--accent-secondary)';
                    html += `
                        <div onclick="window.showServiceInfoModal(${s.id})" style="background: rgba(255,255,255,0.05); border-left: 2px solid ${color}; padding: 3px; border-radius: 2px; cursor: pointer; font-size: 0.7rem; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                            <div style="font-weight: bold; opacity: 0.9;">${formatTime(s.service_time)}</div>
                            <div style="overflow: hidden; text-overflow: ellipsis;">${client ? client.full_name : 'N/A'}</div>
                        </div>
                    `;
                });
            } else {
                 html += `<div style="height: 100%; display: flex; align-items: center; justify-content: center; opacity: 0.1; font-size: 0.7rem;">-</div>`;
            }
            
            html += `</div></div>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        // Attach listeners
        const prevBtn = getEl('mini-cal-prev');
        const nextBtn = getEl('mini-cal-next');
        
        if(prevBtn) prevBtn.onclick = () => { miniCalendarDate.setDate(miniCalendarDate.getDate() - 7); renderMiniCalendar(); };
        if(nextBtn) nextBtn.onclick = () => { miniCalendarDate.setDate(miniCalendarDate.getDate() + 7); renderMiniCalendar(); };
    }
    
    window.openCalendarDate = (dateStr) => {
        // Switch to calendar view and go to date
        document.querySelector('.main-nav-btn[data-view="calendar-view"]').click();
        setTimeout(() => {
            if (AppState.calendar) {
                AppState.calendar.changeView('timeGridDay', dateStr);
            }
        }, 500);
    };

    async function loadDashboardChemicalAlerts() {
        const list = getEl('dashboard-chemical-alerts-list');
        if (!list) return;
        
        // Hide if technician
        if (AppState.currentUser.type === 'tech') {
            const card = getEl('dashboard-chemical-alerts-card');
            if (card) card.style.display = 'none';
            return;
        }

        const chemCard = getEl('dashboard-chemical-alerts-card');
        const hasChemModule = hasModuleAccess('chemicals');
        const chemLimit = parseInt(AppState.currentUser.limit_chemicals || 0);
        if (!hasChemModule || chemLimit <= 0) {
            if (chemCard) chemCard.style.display = 'none';
            return;
        }

        try {
            const user = AppState.currentUser;
            if (!user) return;
            const companyId = user.companyId || user.company_id;
            
            const response = await fetch(`api/get_chemical_stats.php?company_id=${companyId}`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.alerts) {
                const alerts = result.data.alerts;
                list.innerHTML = '';
                
                if (alerts.length > 0) {
                    alerts.forEach(alert => {
                        const isExhausted = alert.status === 'Agotado';
                        const color = isExhausted ? 'var(--error-color)' : '#f59e0b'; // warning color
                        
                        list.innerHTML += `
                            <div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: 600; color: var(--text-light); font-size: 0.9rem;">${alert.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-medium);">Stock: ${alert.current_stock}ml</div>
                                </div>
                                <span style="font-size: 0.75rem; padding: 2px 8px; border-radius: 10px; background: ${color}20; color: ${color}; border: 1px solid ${color};">
                                    ${alert.status}
                                </span>
                            </div>
                        `;
                    });
                } else {
                    list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-medium); font-size: 0.9rem;">✅ Inventario saludable</div>';
                }
            } else {
                list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-medium); font-size: 0.9rem;">No disponible</div>';
            }
        } catch (e) {
            console.error('Error loading dashboard alerts:', e);
            list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--error-color); font-size: 0.9rem;">Error al cargar</div>';
        }
    }

    function renderMonthlyStatsWidget() {
        const container = getEl('dashboard-month-stats-grid');
        const card = getEl('dashboard-monthly-stats-card');
        
        // Hide for technicians
        if (AppState.currentUser.type === 'tech') {
            if (card) card.style.display = 'none';
            return;
        } else {
            if (card) card.style.display = 'block';
        }

        // Hide if company does not have access to stats module
        if (!hasModuleAccess('stats')) {
            if (card) card.style.display = 'none';
            return;
        }

        if (!container) return;
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // 1. Ingresos (Income) - MATCHING STATS MODULE LOGIC (Service Price for Realized Services)
        // Stats module: calculateTotal(currentPeriodServices, 'price', 'status', 'Realizado');
        const income = (AppState.db.services || [])
            .filter(s => {
                const d = new Date(s.service_date + 'T00:00:00'); // Ensure correct parsing
                return s.status === 'Realizado' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, s) => sum + parseFloat(s.price || 0), 0);

        // 2. Servicios Realizados
        const servicesCount = (AppState.db.services || [])
            .filter(s => {
                const d = new Date(s.service_date + 'T00:00:00');
                return s.status === 'Realizado' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            }).length;

        // 3. Gastos (Expenses)
        const expenses = (AppState.db.expenses || [])
            .filter(e => {
                const d = new Date(e.date + 'T00:00:00');
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

        // 4. Beneficio Neto (Net Profit)
        const netProfit = income - expenses;
        const profitColor = netProfit >= 0 ? 'var(--accent-primary)' : 'var(--error-color)';

        // Render Cards
        const stats = [
            { title: '💰 Ingresos', value: formatCurrency(income) },
            { title: '📦 Servicios', value: servicesCount },
            { title: '💸 Gastos', value: formatCurrency(expenses) },
            { title: '📈 Beneficio', value: formatCurrency(netProfit), color: profitColor }
        ];

        let html = '';
        stats.forEach(s => {
            const valueStyle = s.color ? `color: ${s.color};` : '';
            html += `
                <div class="stat-card" style="padding: 15px; background: rgba(255,255,255,0.03);">
                    <div class="stat-title" style="font-size: 0.8rem; margin-bottom: 5px;">${s.title}</div>
                    <div class="stat-value" style="font-size: 1.2rem; ${valueStyle}">${s.value}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    function renderDashboard() {
        renderMiniCalendar();
        
        // --- Chemical Alerts Widget Logic ---
        const alertCard = getEl('dashboard-chemical-alerts-card');
        if (alertCard) {
            if (AppState.currentUser.type === 'tech') {
                alertCard.style.display = 'none';
            } else {
                const hasChemModule = hasModuleAccess('chemicals');
                const chemLimit = parseInt(AppState.currentUser.limit_chemicals || 0);
                if (!hasChemModule || chemLimit <= 0) {
                    alertCard.style.display = 'none';
                } else {
                    alertCard.style.display = 'block';
                    loadDashboardChemicalAlerts();
                }
            }
        }
        
        renderMonthlyStatsWidget();
        renderSubscriptionWidget();
        loadUsageStats();
        const upcomingList = getEl('upcoming-services-list');
        const activityList = getEl('activity-list');
        upcomingList.innerHTML = '';
        activityList.innerHTML = '';

        const clientMap = AppState.db.clients.reduce((map, client) => (map[client.id] = client, map), {});
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingServices = AppState.db.services
            .filter(s => new Date(s.service_date + 'T00:00:00') >= today && s.status === 'Pendiente')
            .sort((a, b) => new Date(a.service_date) - new Date(b.service_date))
            .slice(0, 5);
        
        if (upcomingServices.length > 0) {
            upcomingServices.forEach(s => {
                const client = clientMap[s.client_id];
                const serviceDate = new Date(s.service_date + 'T00:00:00');
                const dateString = serviceDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
                upcomingList.innerHTML += `<li class="dashboard-list-item"><div class="item-main-info">${client ? client.full_name : 'N/A'}<span>${s.service_type || 'Servicio'}</span></div><div class="item-side-info">${dateString}<br>${formatTime(s.service_time)}</div></li>`;
            });
        } else {
            upcomingList.innerHTML = '<p style="text-align:center; color:var(--text-medium); padding: 20px 0;">No hay servicios próximos.</p>';
        }

        const todayStr = today.toISOString().slice(0, 10);
        const todaysReminders = (AppState.db.reminders || []).filter(r => r.date === todayStr);
        todaysReminders.forEach(r => {
            activityList.innerHTML += `<li class="dashboard-list-item reminder"><div class="item-main-info">📌 Recordatorio<span>${r.text}</span></div></li>`;
        });

        const recentActivity = AppState.db.services
            .filter(s => s.status !== 'Pendiente')
            .sort((a, b) => new Date(b.service_date) - new Date(a.service_date))
            .slice(0, 5);

        if (recentActivity.length > 0) {
             recentActivity.forEach(s => {
                const client = clientMap[s.client_id];
                activityList.innerHTML += `<li class="dashboard-list-item"><div class="item-main-info">${client ? client.full_name : 'N/A'}<span>Servicio ${s.status.toLowerCase()}</span></div><div class="item-side-info"><span class="status-pill ${s.status.toLowerCase()}">${s.status}</span></div></li>`;
            });
        }
        
        if (activityList.innerHTML === '') {
            activityList.innerHTML = '<p style="text-align:center; color:var(--text-medium); padding: 20px 0;">No hay actividad reciente.</p>';
        }

        loadDashboardAuditLog();
    }

    async function loadDashboardAuditLog() {
        const card = getEl('audit-log-card');
        const list = getEl('audit-log-list');
        if (!card || !list) {
            return;
        }
        const companyId = AppState.currentUser && AppState.currentUser.companyId ? AppState.currentUser.companyId : null;
        if (!companyId) {
            list.innerHTML = '<p style="text-align:center; color:var(--text-medium); padding: 10px 0;">Sin datos de compañía.</p>';
            return;
        }
        try {
            list.innerHTML = '<p style="text-align:center; color:var(--text-medium); padding: 10px 0;">Cargando actividad...</p>';
            const res = await fetch('api/get_audit_log.php?company_id=' + encodeURIComponent(companyId) + '&limit=10');
            const data = await res.json();
            if (!data.success) {
                list.innerHTML = '<p style="text-align:center; color:var(--error-color); padding: 10px 0;">No se pudo cargar la actividad.</p>';
                return;
            }
            const items = data.items || [];
            if (items.length === 0) {
                list.innerHTML = '<p style="text-align:center; color:var(--text-medium); padding: 10px 0;">Sin cambios registrados aún.</p>';
                return;
            }
            let html = '';
            items.forEach(item => {
                const date = new Date(item.created_at);
                const dateStr = isNaN(date.getTime()) ? item.created_at : date.toLocaleString('es-ES');
                const moduleLabel = item.module || '';
                const actionLabel = item.action || '';
                const description = item.description || '';
                html += '<div class="dashboard-list-item" style="border-bottom: 1px solid rgba(148,163,184,0.2); padding: 8px 0;">' +
                    '<div class="item-main-info" style="display:flex; flex-direction:column;">' +
                    '<span style="font-size:0.85rem; color:var(--text-high);">' + moduleLabel + ' · ' + actionLabel + '</span>' +
                    '<span style="font-size:0.8rem; color:var(--text-medium); margin-top:2px;">' + description + '</span>' +
                    '</div>' +
                    '<div class="item-side-info" style="font-size:0.75rem; color:var(--text-low); text-align:right;">' + dateStr + '</div>' +
                    '</div>';
            });
            list.innerHTML = html;
        } catch (e) {
            console.error(e);
            list.innerHTML = '<p style="text-align:center; color:var(--error-color); padding: 10px 0;">Error al cargar actividad.</p>';
        }
    }

    function renderSubscriptionWidget() {
        const widget = getEl('subscription-status-widget');
        if (!widget || !AppState.currentUser) return;

        const user = AppState.currentUser;
        const plan = user.plan || 'trial';
        const expiryDate = user.subscription_expiry; // Usamos el campo real de la base de datos
        
        const planNames = {
            'trial': 'Prueba Gratuita',
            'pesty': 'Plan Pesty',
            'pesty_core': 'Plan Pesty Core',
            'enterprise': 'Plan Empresarial'
        };

        const planName = planNames[plan] || 'Suscripción Activa';
        
        if (plan === 'trial' || !expiryDate) {
            widget.innerHTML = `
                <div style="text-align: center; padding: 10px;">
                    <p style="margin: 0 0 15px 0; color: var(--text-high); font-size: 1.1rem; font-weight: 600;">Estás usando la <span style="color: var(--accent-primary);">${planName}</span></p>
                    <div style="background: rgba(52, 211, 153, 0.1); border: 1px dashed var(--accent-primary); padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                        <p style="margin: 0; font-size: 0.9rem; line-height: 1.5; color: var(--text-medium);">
                            🚀 ¡Desbloquea todo el potencial de Pesty! Suscríbete hoy para obtener servicios ilimitados, reportes personalizados y soporte prioritario.
                        </p>
                    </div>
                    <button class="cta-button" onclick="openPlansModal()" style="width: 100%;">🚀 Ver Planes y Suscribirme</button>
                </div>
            `;
            return;
        }

        // Calcular progreso de la suscripción
        const now = new Date();
        const expiry = new Date(expiryDate);
        
        // La fecha de inicio es 1 mes antes del vencimiento (asumiendo suscripciones mensuales)
        const start = user.created_at ? new Date(user.created_at) : new Date(expiry.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        // Ajustar start si es más de 30 días antes del vencimiento (para periodos recurrentes)
        let effectiveStart = start;
        const monthInMs = 30 * 24 * 60 * 60 * 1000;
        if (expiry.getTime() - start.getTime() > monthInMs + (24 * 60 * 60 * 1000)) {
            effectiveStart = new Date(expiry.getTime() - monthInMs);
        }

        const total = expiry.getTime() - effectiveStart.getTime();
        const elapsed = now.getTime() - effectiveStart.getTime();
        let progress = Math.max(0, Math.min(100, (elapsed / total) * 100));
        
        const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isExpiringSoon = progress >= 80;
        const isExpired = daysRemaining <= 0;

        let statusLabel = 'Activo';
        let statusClass = 'subscription-status-active';
        let barClass = '';

        if (isExpired) {
            statusLabel = 'Vencido';
            statusClass = 'subscription-status-expired';
            barClass = 'danger';
            progress = 100;
        } else if (isExpiringSoon) {
            statusLabel = 'Por Vencer';
            statusClass = 'subscription-status-warning';
            barClass = 'warning';
        }

        widget.innerHTML = `
            <div class="subscription-widget-container">
                <div class="subscription-details-row">
                    <div>
                        <p style="margin: 0; font-size: 0.8rem; color: var(--text-low); text-transform: uppercase;">Plan Actual</p>
                        <p style="margin: 2px 0 0 0; font-size: 1.1rem; font-weight: 700; color: var(--text-high);">${planName}</p>
                    </div>
                    <span class="subscription-status-label ${statusClass}">${statusLabel}</span>
                </div>

                <div class="subscription-video-bar-container">
                    <div id="sub-progress-bar" class="subscription-video-bar-progress ${barClass}" style="width: 0%;">
                        <div class="subscription-video-bar-indicator"></div>
                    </div>
                </div>

                <div class="subscription-footer-info">
                    <p style="margin: 0; color: var(--text-medium);">
                        ${isExpired ? 'Suscripción finalizada' : `Vence el <strong>${formatDate(expiry)}</strong>`}
                    </p>
                    <p style="margin: 0; text-align: right; color: var(--text-low);">
                        ${isExpired ? '' : `Faltan <strong>${daysRemaining} días</strong>`}
                    </p>
                </div>

                <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <a href="#" onclick="openPlansModal(); return false;" style="font-size: 0.85rem; color: var(--accent-secondary); text-decoration: none; font-weight: 600;">Mejorar Plan →</a>
                    <button class="cta-button" onclick="openPlansModal()" style="padding: 6px 12px; font-size: 0.8rem;">Renovar</button>
                </div>
            </div>
        `;

        // Animación de la barra después de un breve delay
        setTimeout(() => {
            const bar = document.getElementById('sub-progress-bar');
            if (bar) {
                bar.style.width = `${progress}%`;
                bar.parentElement.classList.add('subscription-video-bar-progress-loaded');
            }
        }, 300);
    }

    function showDetailsListModal(title, items, type, isClickable = false) {
        const titleEl = getEl('details-list-title');
        const contentEl = getEl('details-list-content');
        titleEl.textContent = title;
        let html = '';
        if (items.length === 0) {
            html = '<p style="text-align: center; color: var(--text-medium); padding: 20px 0;">No hay elementos para mostrar.</p>';
        } else {
            if (type === 'service') {
                const clientMap = AppState.db.clients.reduce((map, client) => (map[client.id] = client, map), {});
                items.forEach(s => {
                    const client = clientMap[s.client_id];
                    let site = null;
                    if (s.client_site_id && Array.isArray(AppState.db.client_sites)) {
                        site = AppState.db.client_sites.find(siteItem => siteItem.id == s.client_site_id);
                    }
                    const address = site && site.address ? site.address : (client ? client.address : 'N/A');
                    const clickableClass = isClickable ? 'clickable-service' : '';
                    const dataAttribute = isClickable ? `data-service-id="${s.id}"` : '';
                    html += `<div class="details-list-item ${clickableClass}" ${dataAttribute}>
                                <h4>${client ? client.full_name : 'Cliente no encontrado'}</h4>
                                <p><strong>Fecha:</strong> ${formatDate(s.service_date)} ${formatTime(s.service_time)}</p>
                                <p><strong>Dirección:</strong> ${address}</p>
                                <p><strong>Estado:</strong> <span class="status-pill ${s.status.toLowerCase()}">${s.status}</span></p>
                            </div>`;
                });
            } else if (type === 'client') {
                items.forEach(c => {
                    html += `<div class="details-list-item">
                                <h4>${c.full_name}</h4>
                                <p><strong>Teléfono:</strong> ${c.phone || 'N/A'}</p>
                                <p><strong>Dirección:</strong> ${c.address || 'N/A'}</p>
                            </div>`;
                });
            }
        }
        contentEl.innerHTML = html;
        openModal('details-list-modal');
    }

    function showTodayServices(isClickable = false) { const today = new Date().toISOString().slice(0, 10); const servicesToday = AppState.db.services.filter(s => s.service_date === today); showDetailsListModal('Citas para Hoy', servicesToday, 'service', isClickable); }
    function showPendingServices() { const pendingServices = AppState.db.services.filter(s => s.status === 'Pendiente'); showDetailsListModal('Servicios Pendientes', pendingServices, 'service'); }
    function showActiveClients() { showDetailsListModal('Clientes Activos', AppState.db.clients, 'client'); }
    function showCompletedServices() { const today = new Date(); const currentMonth = today.getMonth(); const currentYear = today.getFullYear(); const completedServices = AppState.db.services.filter(s => { const serviceDate = new Date(s.service_date); return s.status === 'Realizado' && serviceDate.getMonth() === currentMonth && serviceDate.getFullYear() === currentYear; }); showDetailsListModal('Servicios Realizados este Mes', completedServices, 'service'); }
    
    function handleDetailsListClick(e) {
        const item = e.target.closest('.clickable-service');
        if (item) {
            const serviceId = item.dataset.serviceId;
            closeModal('details-list-modal');
            document.querySelector('.main-nav-btn[data-view="services-view"]').click();
            
            setTimeout(() => {
                findAndExpandServiceRow(serviceId);
            }, 100);
        }
    }

    function findAndExpandServiceRow(serviceId) {
        const row = document.querySelector(`.service-row[data-service-id="${serviceId}"]`);
        if (row) {
            const detailsRow = row.nextElementSibling;
            if (detailsRow && !detailsRow.classList.contains('active')) {
                detailsRow.classList.add('active');
            }
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }


    

    



    
    function populateFilters() { 
        // Filter out null elements (e.g. elements in modules that might not be loaded yet)
        const techFilters = [getEl('service-filter-tech')].filter(Boolean); 
        techFilters.forEach(filter => { 
            const firstOption = filter.querySelector('option'); 
            filter.innerHTML = ''; 
            if(firstOption) filter.appendChild(firstOption.cloneNode(true)); 
        }); 
        AppState.db.technicians.forEach(t => { 
            const option = `<option value="${t.id}">${t.name}</option>`; 
            techFilters.forEach(filter => filter.innerHTML += option); 
        }); 
        
        const clientSelects = [getEl('quote-client'), getEl('invoice-client')].filter(Boolean); 
        clientSelects.forEach(select => {
            select.innerHTML = '<option value="" disabled selected>Seleccione un cliente...</option>';
            AppState.db.clients.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.full_name}</option>`;
            });
        });

        // Zone and Freq filters removed from here as they are now handled in clients module script
        
        const expenseCatFilter = getEl('expense-filter-category'); 
        if (expenseCatFilter) {
            expenseCatFilter.innerHTML = '<option value="">Toda Categoría</option>'; 
            const expenseCatDatalist = getEl('expense-categories-datalist'); 
            if (expenseCatDatalist) {
                expenseCatDatalist.innerHTML = ''; 
                AppState.expenseCategories.forEach(cat => { expenseCatFilter.innerHTML += `<option value="${cat}">${cat}</option>`; expenseCatDatalist.innerHTML += `<option value="${cat}">`; }); 
            }
        }
    }
    
    // Helper global para modo privacidad
    window.isPrivacyMode = () => localStorage.getItem('privacyMode') === 'true';

    function renderServicesTable() {
        const table = getEl('services-table');
        if (!table.querySelector('thead')) { table.innerHTML = '<thead><tr><th>Fecha</th><th>Cliente</th><th>Técnico</th><th>Tipo</th><th>Precio</th><th>Estado</th><th class="action-cell">Acciones</th></tr></thead><tbody></tbody>'; }
        const tableBody = table.querySelector('tbody');
        const statusFilter = getEl('service-filter-status').value;
        const techFilter = getEl('service-filter-tech').value;
        const dateFilter = getEl('service-filter-date').value;
        
        const isPrivacy = window.isPrivacyMode();
        const clientMap = AppState.db.clients.reduce((map, client) => (map[client.id] = isPrivacy ? { ...client, full_name: 'Cliente Oculto', address: 'Dirección Oculta', phone: '555-****' } : client, map), {});
        const techMap = AppState.db.technicians.reduce((map, tech) => (map[tech.id] = isPrivacy ? 'Técnico Oculto' : tech.name, map), {});
        
        const filteredServices = AppState.db.services.filter(s => {
            const statusMatch = !statusFilter || s.status === statusFilter;
            const techMatch = !techFilter || s.technician_id == techFilter;
            const dateMatch = !dateFilter || s.service_date === dateFilter;
            return statusMatch && techMatch && dateMatch;
        });

        let html = '';
        filteredServices.sort((a, b) => new Date(b.service_date + ' ' + b.service_time) - new Date(a.service_date + ' ' + a.service_time)).forEach(s => {
            const client = clientMap[s.client_id];
            const baseClientName = client ? client.full_name : 'Cliente Desconocido';
            const clientPhone = client ? client.phone : '';
            const techName = techMap[s.technician_id] || 'Técnico Desconocido';
            
            const price = formatCurrency(s.price);
            const reportIcon = s.report_data ? '✔️' : '📝';
        
            let site = null;
            if (s.client_site_id && Array.isArray(AppState.db.client_sites)) {
                site = AppState.db.client_sites.find(siteItem => siteItem.id == s.client_site_id);
            }
        
            const clientName = site && site.name ? `${baseClientName} - ${site.name}` : baseClientName;
        
            let clientAddress = client ? client.address : '';
            if (site && site.address) {
                clientAddress = site.address;
            }
        
            const mapLink = (clientAddress && !isPrivacy) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientAddress)}` : '#';
            
            let whatsappButtonHtml = '';
            if (clientPhone && !isPrivacy) {
                const cleanPhone = clientPhone.replace(/\D/g, '');
                if (cleanPhone) {
                    const whatsappLink = `https://wa.me/${cleanPhone}`;
                    whatsappButtonHtml = `<a href="${whatsappLink}" target="_blank" class="map-button" style="background-color: #25D366; border: none; color: white;" onclick="if(checkMaintenanceAndAlert('services_whatsapp')) { event.preventDefault(); return; } event.stopPropagation();"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.536 0 1.52 1.115 2.988 1.264 3.186.149.198 2.19 3.349 5.273 4.695 2.151.94 2.988.754 3.533.703.607-.056 1.862-.767 2.124-1.507.262-.74.262-1.376.184-1.507-.078-.131-.276-.209-.573-.358zM12 21.698c-1.769 0-3.425-.46-4.861-1.263l-.348-.202-3.61 1.156.964-3.515-.226-.368C3.105 16.056 2.63 14.223 2.63 12.31c0-5.322 4.33-9.651 9.651-9.651 5.322 0 9.651 4.33 9.651 9.651 0 5.322-4.33 9.651-9.651 9.651z"/></svg> WhatsApp</a>`;
                }
            }
            
            // Verificar permisos de módulos
            const moduleAccess = AppState.currentUser.module_access?.modules || [];
            const hasAccess = (feature) => moduleAccess.length === 0 || moduleAccess.includes(feature);

            let actionButtonsHtml = '';
            const isTech = AppState.currentUser.type === 'tech';
            
            if (hasAccess('feature_service_report')) {
                // Botón de Análisis Previo
                actionButtonsHtml += `<button class="action-btn analysis" style="border-color: #8B5CF6; color: #8B5CF6;" onclick="event.stopPropagation(); openAnalysisModal(${s.id})">🔍 Análisis</button>`;
                
                actionButtonsHtml += `<button class="action-btn info" onclick="if(checkMaintenanceAndAlert('services_report')) return; event.stopPropagation(); openServiceReportForm(${s.id})">${reportIcon} Reporte</button>`;
                
                // Botón de Certificado para servicios realizados (Solo Pesty Core y superiores)
                const userPlan = AppState.currentUser.plan || 'trial';
                const isSuperAdmin = AppState.currentUser.isSuperAdmin === true;
                const hasCertificateAccess = isSuperAdmin || ['pesty_core', 'enterprise'].includes(userPlan);

                if (s.status === 'Realizado' && hasCertificateAccess) {
                    const certLabel = AppState.currentUser.language === 'en' ? '📜 Certificate' : '📜 Certificado';
                    actionButtonsHtml += `<button class="action-btn success" style="background-color: #10B981; color: white;" onclick="event.stopPropagation(); if(window.openCertificateGenerator) { window.openCertificateGenerator(${s.id}); }">${certLabel}</button>`;
                }
            }
            
            if (!isTech) {
                // <-- NUEVO: Botón para crear nota de pago rápida -->
                if (s.status === 'Realizado' && hasAccess('feature_payments')) {
                    actionButtonsHtml += `<button class="action-btn payment" onclick="if(checkMaintenanceAndAlert('services_payment')) return; event.stopPropagation(); openPaymentNoteModal(null, { serviceId: ${s.id}, clientId: ${s.client_id}, amount: ${s.price} })">💰 Registrar Pago</button>`;
                }
                
                if (hasAccess('feature_reschedule')) {
                    actionButtonsHtml += `<button class="action-btn warning" onclick="if(checkMaintenanceAndAlert('services_reschedule')) return; event.stopPropagation(); reScheduleService(${s.id})">🔄 Reagendar</button>`;
                }
                
                actionButtonsHtml += `<button class="action-btn edit" onclick="if(checkMaintenanceAndAlert('services_edit')) return; event.stopPropagation(); openServiceModal(${s.id})">✏️ Editar</button>`;
                actionButtonsHtml += `<button class="action-btn delete" onclick="if(checkMaintenanceAndAlert('services_delete')) return; event.stopPropagation(); deleteService(${s.id})">🗑️ Borrar</button>`;
            }

            let nextServiceHtml = '';
            if (s.reinforcement_days && s.service_date) {
                 const serviceDateObj = new Date(s.service_date + 'T00:00:00');
                 const nextDateObj = new Date(serviceDateObj);
                 nextDateObj.setDate(serviceDateObj.getDate() + parseInt(s.reinforcement_days));
                 const nextDateStr = formatDate(nextDateObj);
                 nextServiceHtml = `<div style="margin-top: 10px; padding: 10px; background-color: rgba(52, 211, 153, 0.1); border-left: 3px solid var(--accent-primary); border-radius: 4px;">
                    <p style="margin: 0; color: var(--accent-primary); font-weight: bold;">📅 Recomendación de Refuerzo</p>
                    <p style="margin: 5px 0 0 0;">Basado en el nivel de infestación, se recomienda el próximo servicio en <strong>${s.reinforcement_days} días</strong>.</p>
                    <p style="margin: 5px 0 0 0;">Fecha sugerida: <strong>${nextDateStr}</strong></p>
                 </div>`;
            }

            let signatureLinkHtml = '';
            if (hasAccess('feature_signature_link')) {
                signatureLinkHtml = `<button class="map-button" style="background-color: var(--accent-secondary); color: #000; border: none;" onclick="if(checkMaintenanceAndAlert('services_signature')) return; event.stopPropagation(); copySignatureLink(${s.id})">🔗 Firma</button>`;
            }

            // Botón de WhatsApp genérico si hay teléfono
            if (clientPhone && !isPrivacy && !whatsappButtonHtml) {
                 const cleanPhone = clientPhone.replace(/\D/g, '');
                 if (cleanPhone) {
                    const whatsappLink = `https://wa.me/${cleanPhone}`;
                    whatsappButtonHtml = `<a href="${whatsappLink}" target="_blank" class="map-button" style="background-color: #25D366; border: none; color: white;" onclick="if(checkMaintenanceAndAlert('services_whatsapp')) { event.preventDefault(); return; } event.stopPropagation();"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.536 0 1.52 1.115 2.988 1.264 3.186.149.198 2.19 3.349 5.273 4.695 2.151.94 2.988.754 3.533.703.607-.056 1.862-.767 2.124-1.507.262-.74.262-1.376.184-1.507-.078-.131-.276-.209-.573-.358zM12 21.698c-1.769 0-3.425-.46-4.861-1.263l-.348-.202-3.61 1.156.964-3.515-.226-.368C3.105 16.056 2.63 14.223 2.63 12.31c0-5.322 4.33-9.651 9.651-9.651 5.322 0 9.651 4.33 9.651 9.651 0 5.322-4.33 9.651-9.651 9.651z"/></svg> WhatsApp</a>`;
                 }
            }

            html += `<tr class="service-row" data-service-id="${s.id}"><td>${formatDate(s.service_date) || 'N/A'} ${formatTime(s.service_time) || ''}</td><td>${clientName}</td><td>${techName}</td><td>${s.service_type || 'N/A'}</td><td>${price}</td><td><span style="color: ${s.status === 'Realizado' ? 'var(--accent-primary)' : s.status === 'Cancelado' ? 'var(--error-color)' : 'var(--accent-secondary)'}; font-weight: bold;">${s.status}</span></td><td class="action-cell">${actionButtonsHtml}</td></tr><tr class="service-details-row" id="details-for-${s.id}"><td colspan="7" class="service-details-cell"><div class="service-details-content"><div><h4>Detalles del Cliente</h4><p><strong>Nombre:</strong> ${clientName}</p><p><strong>Teléfono:</strong> ${clientPhone}</p><p><strong>Dirección:</strong> ${clientAddress}</p>${nextServiceHtml}</div><div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;"><a href="${mapLink}" target="_blank" class="map-button" onclick="if(checkMaintenanceAndAlert('services_map')) { event.preventDefault(); return; } event.stopPropagation();"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Ver en Mapa</a>${whatsappButtonHtml}${signatureLinkHtml}</div></div></td></tr>`;
        });
        tableBody.innerHTML = html || '<tr><td colspan="7" style="text-align:center; padding: 20px;">No se encontraron servicios con los filtros actuales.</td></tr>';
    }

    function toggleServiceDetails(rowElement) { 
        const detailsRow = rowElement.nextElementSibling; 
        if (detailsRow && detailsRow.classList.contains('service-details-row')) { 
            detailsRow.classList.toggle('active'); 
        } 
    }

    // Delegación de eventos para la tabla de servicios
    const servicesTable = getEl('services-table');
    if (servicesTable) {
        servicesTable.addEventListener('click', (e) => {
            const row = e.target.closest('.service-row');
            // Solo activar si se clickea la fila pero NO un botón de acción
            if (row && !e.target.closest('.action-cell')) {
                toggleServiceDetails(row);
            }
        });
    }

    let serviceClientOptionsMap = {};

    function getServiceClientDisplayLabel(client, site) {
        if (!client) return '';
        if (site) {
            const baseName = client.full_name || '';
            const siteName = site.name || '';
            const code = site.code ? ` (${site.code})` : '';
            return `${baseName} - ${siteName}${code} (SUCURSAL)`;
        }
        return client.full_name || '';
    }

    function shouldShowClientSiteSelect(client) {
        if (!client) return false;
        const freq = (client.frequency || '').toLowerCase();
        const type = (client.type || '').toLowerCase();
        const isResidential = type === 'casa' || type === 'residencial';
        const isRecurrent = freq === 'mensual' || freq === 'bimestral' || freq === 'trimestral' || freq === 'anual';
        return isRecurrent && !isResidential;
    }

    function populateServiceClientSites(clientId, selectedSiteId = null) {
        const siteSelect = getEl('service-client-site');
        const group = getEl('service-client-site-group');
        if (!siteSelect || !group) return;

        siteSelect.innerHTML = '';

        const baseOption = document.createElement('option');
        baseOption.value = '';
        baseOption.textContent = 'Sucursal principal';
        siteSelect.appendChild(baseOption);

        const sites = AppState.db.client_sites || [];
        if (clientId && sites.length > 0) {
            sites
                .filter(s => s.client_id == clientId)
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = s.name + (s.code ? ` (${s.code})` : '');
                    siteSelect.appendChild(opt);
                });
        }

        if (selectedSiteId) {
            siteSelect.value = String(selectedSiteId);
        } else {
            siteSelect.value = '';
        }

        if (window.createCustomSelect) {
            const container = siteSelect.parentElement ? siteSelect.parentElement.querySelector('.custom-select-container') : null;
            if (container) {
                window.createCustomSelect(siteSelect);
            }
        }

        const client = clientId ? (AppState.db.clients || []).find(c => c.id == clientId) : null;
        if (client && shouldShowClientSiteSelect(client)) {
            group.classList.remove('hidden');
        } else {
            group.classList.add('hidden');
        }
    }

    function checkExistingClient() {
        const clientNameInput = getEl('service-client-name');
        const newClientFields = getEl('new-client-fields');
        if (!clientNameInput || !newClientFields) return;

        const rawName = clientNameInput.value.trim();
        const key = rawName.toLowerCase();
        const group = getEl('service-client-site-group');
        if (group) group.classList.add('hidden');

        if (!rawName) {
            newClientFields.classList.add('hidden');
            return;
        }

        const mapped = serviceClientOptionsMap[key];
        if (mapped) {
            newClientFields.classList.add('hidden');
        } else {
            newClientFields.classList.remove('hidden');
        }
    }
    function checkExistingTech() { const techNameInput = getEl('service-tech-name'); const newTechFields = getEl('new-tech-fields'); const techName = techNameInput.value.trim().toLowerCase(); if (!techName) { newTechFields.classList.add('hidden'); return; } const techExists = AppState.db.technicians.some(t => t.name.toLowerCase() === techName); if (techExists) { newTechFields.classList.add('hidden'); } else { newTechFields.classList.remove('hidden'); } }
    
        function createCustomAutocomplete(inputId, listId, options, onSelectCallback) {
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        if (!input || !list) return;

        // Store options directly on the input element
        input.autocompleteOptions = options;
        input.autocompleteCallback = onSelectCallback;

        // If listeners already attached, just update data and return
        if (input.dataset.autocompleteActive === "true") return;

        input.dataset.autocompleteActive = "true";
        let currentFocus = -1;

        input.addEventListener("input", function(e) {
            const val = this.value;
            closeAllLists();
            if (!val) return false;
            currentFocus = -1;

            const opts = this.autocompleteOptions || [];
            const matches = opts.filter(opt => opt.label.toLowerCase().includes(val.toLowerCase()));

            if (matches.length === 0) {
                list.innerHTML = '<div class="autocomplete-no-results">Sin resultados. Se creará nuevo.</div>';
                list.classList.add("visible");
                return;
            }

            // Limit to 20 items for performance
            matches.slice(0, 20).forEach(opt => {
                const item = document.createElement("div");
                item.className = "autocomplete-item";
                item.innerHTML = `<div><strong>${opt.label}</strong></div>`;
                if(opt.meta) item.innerHTML += `<div class="meta-info">${opt.meta}</div>`;
                
                item.addEventListener("click", function(e) {
                    input.value = opt.value;
                    closeAllLists();
                    if (input.autocompleteCallback) input.autocompleteCallback(opt.value);
                });
                list.appendChild(item);
            });
            list.classList.add("visible");
        });

        input.addEventListener("keydown", function(e) {
            let x = list.getElementsByClassName("autocomplete-item");
            if (e.keyCode == 40) { // Down
                currentFocus++;
                addActive(x);
            } else if (e.keyCode == 38) { // Up
                currentFocus--;
                addActive(x);
            } else if (e.keyCode == 13) { // Enter
                e.preventDefault();
                if (currentFocus > -1) {
                    if (x) x[currentFocus].click();
                }
            }
        });

        function addActive(x) {
            if (!x) return false;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            x[currentFocus].classList.add("focused");
            x[currentFocus].scrollIntoView({ block: "nearest" });
        }

        function removeActive(x) {
            for (let i = 0; i < x.length; i++) {
                x[i].classList.remove("focused");
            }
        }

        function closeAllLists(elmnt) {
            list.innerHTML = "";
            list.classList.remove("visible");
        }

        document.addEventListener("click", function(e) {
            if (e.target !== input && !list.contains(e.target)) {
                closeAllLists();
            }
        });
    }
    
    window.createCustomAutocomplete = createCustomAutocomplete;

    window.openServiceModal = (id = null, reScheduleData = null) => { 
        if (!checkPermissions(true)) return;
        getEl('service-form').reset(); 
        getEl('service-id').value = ''; 
        getEl('new-client-fields').classList.add('hidden'); 
        getEl('new-tech-fields').classList.add('hidden');
        const statusGroup = getEl('service-status-group'); 
        
        const clientOptions = [];
        serviceClientOptionsMap = {};
        const sites = AppState.db.client_sites || [];
        const clients = AppState.db.clients || [];
        
        clients.forEach(c => {
            if (!c.full_name) return;
            const baseLabel = getServiceClientDisplayLabel(c, null);
            clientOptions.push({ label: baseLabel, value: baseLabel, meta: 'Cliente' });
            serviceClientOptionsMap[baseLabel.toLowerCase()] = { clientId: c.id, clientSiteId: null };
            if (sites.length > 0) {
                const clientSites = sites.filter(s => s.client_id == c.id);
                clientSites.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                clientSites.forEach(s => {
                    const label = getServiceClientDisplayLabel(c, s);
                    clientOptions.push({ label: label, value: label, meta: s.name });
                    serviceClientOptionsMap[label.toLowerCase()] = { clientId: c.id, clientSiteId: s.id };
                });
            }
        });

        if (window.createCustomAutocomplete) {
             window.createCustomAutocomplete('service-client-name', 'client-autocomplete-list', clientOptions, (val) => {
                 checkExistingClient();
             });
        }
        
        const siteGroup = getEl('service-client-site-group');
        if (siteGroup) siteGroup.classList.add('hidden');
        
        const techOptions = [];
        if (AppState.db.technicians) {
            AppState.db.technicians.forEach(t => {
                techOptions.push({ label: t.name, value: t.name, meta: 'Técnico' });
            });
        }
        
        if (window.createCustomAutocomplete) {
             window.createCustomAutocomplete('service-tech-name', 'tech-autocomplete-list', techOptions, (val) => {
                 checkExistingTech();
             });
        }

        const pestsContainer = getEl('service-pests'); 
        pestsContainer.innerHTML = ''; 
        AppState.commonPests.forEach(pest => { 
            pestsContainer.innerHTML += `
                <label class="neon-checkbox-wrapper">
                    <input type="checkbox" name="pests" value="${pest}">
                    <div class="neon-checkmark">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span class="neon-label">${pest}</span>
                </label>
            `; 
        });
        // Agregar opción "Otros" con campo de texto
        pestsContainer.innerHTML += `
            <label class="neon-checkbox-wrapper other-pest-option">
                <input type="checkbox" name="pests" value="" id="other-pest-checkbox">
                <div class="neon-checkmark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <span class="neon-label">Otros:</span>
                <input type="text" id="other-pest-input" placeholder="Especificar..." style="margin-left: 10px; padding: 5px; border: 1px solid var(--border-color); border-radius: 3px; background: var(--bg-dark); color: var(--text-primary); width: 150px;" disabled>
            </label>
        `;
        
        // Manejar la opción "Otros"
        const otherCheckbox = getEl('other-pest-checkbox');
        const otherInput = getEl('other-pest-input');
        
        otherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                otherInput.disabled = false;
                otherInput.focus();
            } else {
                otherInput.disabled = true;
                otherInput.value = '';
                this.value = '';
            }
        });
        
        otherInput.addEventListener('input', function() {
            if (this.value.trim()) {
                otherCheckbox.value = this.value.trim();
            } else {
                otherCheckbox.value = '';
            }
        }); 
        
        // Crear checkboxes para tipos de servicio
        const serviceTypesContainer = getEl('service-types');
        serviceTypesContainer.innerHTML = '';
        const serviceTypes = AppState.treatmentMethods || [
            'Líquido por aspersión',
            'Gel',
            'Polvo seco',
            'Polvo soluble',
            'Nebulización fría',
            'Termonebulización (humo caliente)',
            'Nebulización desinfectante',
            'Cebos en bloque o pasta',
            'Cebos granulares',
            'Trampas adhesivas',
            'Trampas mecánicas',
            'Lámparas UV',
            'Inyección localizada',
            'Barreras químicas'
        ];
        serviceTypes.forEach(type => {
            serviceTypesContainer.innerHTML += `
                <label class="neon-checkbox-wrapper">
                    <input type="checkbox" name="service-types" value="${type}">
                    <div class="neon-checkmark">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span class="neon-label">${type}</span>
                </label>
            `;
        });
        
        // Agregar event listeners para debugging de checkboxes
        setTimeout(() => {
            document.querySelectorAll('#service-types input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    console.log('Checkbox changed:', this.value, 'Checked:', this.checked);
                });
            });
        }, 100);
        
        if (id && !reScheduleData) { 
            const service = AppState.db.services.find(s => s.id == id); 
            if (!service) return; 
            const client = AppState.db.clients.find(c => c.id == service.client_id);
        const isHotel = client && client.type === 'Hotel';
        const isCasino = client && client.type === 'Casino';
        const isMaquiladora = client && client.type === 'Maquiladora';
        const isAlmacen = client && (client.type === 'Almacén' || client.type === 'Almacen');
        const isLocal = client && client.type === 'Negocio Local'; 
            const tech = AppState.db.technicians.find(t => t.id == service.technician_id);
            const siteEdit = service.client_site_id && Array.isArray(AppState.db.client_sites) ? AppState.db.client_sites.find(s => s.id == service.client_site_id) : null;
            getEl('service-modal-title').textContent = 'Editar Servicio'; 
            getEl('service-id').value = service.id; 
            getEl('service-client-name').value = getServiceClientDisplayLabel(client, siteEdit); 
            getEl('service-tech-name').value = tech ? tech.name : '';
            const serviceDate = new Date(service.service_date + 'T00:00:00');
            getEl('service-date').value = formatDate(serviceDate);
            getEl('service-date').dataset.isoDate = service.service_date; 
            const timeInput = getEl('service-time');
            if (service.service_time) {
                timeInput.dataset.time24 = service.service_time;
                // Convert 24-hour to 12-hour format for display
                const [hours, minutes] = service.service_time.split(':').map(Number);
                let displayHour = hours;
                let period = 'AM';
                if (hours === 0) {
                    displayHour = 12;
                } else if (hours > 12) {
                    displayHour = hours - 12;
                    period = 'PM';
                } else if (hours === 12) {
                    period = 'PM';
                }
                timeInput.value = `${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
            } else {
                timeInput.dataset.time24 = '';
                timeInput.value = '';
            }
            // Marcar tipos de servicio seleccionados
            const selectedServiceTypes = service.service_type ? service.service_type.split(', ') : [];
            document.querySelectorAll('#service-types input[type="checkbox"]').forEach(box => {
                if (selectedServiceTypes.includes(box.value)) {
                    box.checked = true;
                }
            });
            getEl('service-price').value = service.price; 
            getEl('service-notes').value = service.notes; 
            statusGroup.classList.remove('hidden'); 
            getEl('service-status').value = service.status; 
            const selectedPests = service.pests ? service.pests.split(', ') : [];
            document.querySelectorAll('#service-pests input[type="checkbox"]').forEach(box => { 
                if (selectedPests.includes(box.value)) {
                    box.checked = true;
                } else if (box.id === 'other-pest-checkbox') {
                    // Verificar si hay plagas que no están en la lista común
                    const otherPests = selectedPests.filter(pest => !AppState.commonPests.includes(pest));
                    if (otherPests.length > 0) {
                        box.checked = true;
                        box.value = otherPests.join(', ');
                        const otherInput = getEl('other-pest-input');
                        otherInput.value = otherPests.join(', ');
                        otherInput.disabled = false;
                    }
                }
            }); 
            const group = getEl('service-client-site-group');
            if (group) group.classList.add('hidden');
        } else if (reScheduleData) {
            const client = AppState.db.clients.find(c => c.id == reScheduleData.client_id); 
            const tech = AppState.db.technicians.find(t => t.id == reScheduleData.technician_id);
            const siteRes = reScheduleData.client_site_id && Array.isArray(AppState.db.client_sites) ? AppState.db.client_sites.find(s => s.id == reScheduleData.client_site_id) : null;
            getEl('service-modal-title').textContent = 'Reagendar Servicio';
            getEl('service-client-name').value = getServiceClientDisplayLabel(client, siteRes); 
            getEl('service-tech-name').value = tech ? tech.name : '';
            const today = new Date();
            getEl('service-date').value = formatDate(today);
            getEl('service-date').dataset.isoDate = today.toISOString().split('T')[0];
            const timeInput = getEl('service-time');
            if (reScheduleData.service_time) {
                timeInput.dataset.time24 = reScheduleData.service_time;
                // Convert 24-hour to 12-hour format for display
                const [hours, minutes] = reScheduleData.service_time.split(':').map(Number);
                let displayHour = hours;
                let period = 'AM';
                if (hours === 0) {
                    displayHour = 12;
                } else if (hours > 12) {
                    displayHour = hours - 12;
                    period = 'PM';
                } else if (hours === 12) {
                    period = 'PM';
                }
                timeInput.value = `${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
            } else {
                timeInput.dataset.time24 = '';
                timeInput.value = '';
            }
            // Marcar tipos de servicio seleccionados para re-agendamiento
            const selectedServiceTypesReschedule = reScheduleData.service_type ? reScheduleData.service_type.split(', ') : [];
            document.querySelectorAll('#service-types input[type="checkbox"]').forEach(box => {
                if (selectedServiceTypesReschedule.includes(box.value)) {
                    box.checked = true;
                }
            });
            getEl('service-price').value = reScheduleData.price; 
            getEl('service-notes').value = `Servicio de refuerzo basado en el servicio #${reScheduleData.id}.\n\nNotas originales:\n${reScheduleData.notes}`; 
            statusGroup.classList.add('hidden');
            const selectedPests = reScheduleData.pests ? reScheduleData.pests.split(', ') : []; 
            document.querySelectorAll('#service-pests input[type="checkbox"]').forEach(box => { 
                if (selectedPests.includes(box.value)) {
                    box.checked = true;
                } else if (box.id === 'other-pest-checkbox') {
                    // Verificar si hay plagas que no están en la lista común
                    const otherPests = selectedPests.filter(pest => !AppState.commonPests.includes(pest));
                    if (otherPests.length > 0) {
                        box.checked = true;
                        box.value = otherPests.join(', ');
                        const otherInput = getEl('other-pest-input');
                        otherInput.value = otherPests.join(', ');
                        otherInput.disabled = false;
                    }
                }
            }); 
            const groupRes = getEl('service-client-site-group');
            if (groupRes) groupRes.classList.add('hidden');
        } else { 
            getEl('service-modal-title').textContent = 'Agendar Nuevo Servicio'; 
            statusGroup.classList.add('hidden'); 
        } 
        
        document.querySelectorAll('#service-modal [data-custom-select]').forEach(createCustomSelect);
        openModal('service-modal'); 
    };

    async function handleSaveService() { 
        // Validar que los elementos existen antes de acceder a sus valores
        const clientNameEl = getEl('service-client-name');
        const techNameEl = getEl('service-tech-name');
        
        if (!clientNameEl || !techNameEl) {
            showAlert('Error: No se pudieron encontrar los campos requeridos del formulario.');
            return;
        }
        
        const clientName = clientNameEl.value.trim(); 
        const techName = techNameEl.value.trim(); 
        if (!clientName || !techName) { showAlert('El nombre del cliente y del técnico no pueden estar vacíos.'); return; } 
        
        const clientKey = clientName.toLowerCase();
        let clientId; 
        let clientSiteId = null;
        const mappedClient = serviceClientOptionsMap[clientKey];
        if (mappedClient) {
            clientId = mappedClient.clientId;
            clientSiteId = mappedClient.clientSiteId;
        } else {
            let client = AppState.db.clients.find(c => c.full_name.toLowerCase() === clientKey); 
            if (client) { 
                clientId = client.id; 
            } else { 
                const newClientPhoneEl = getEl('service-new-client-phone');
                const newClientAddressEl = getEl('service-new-client-address');
                
                if (!newClientPhoneEl || !newClientAddressEl) {
                    showAlert('Error: No se pudieron encontrar los campos para cliente nuevo.');
                    return;
                }
                
                const newClientPhone = newClientPhoneEl.value; 
                const newClientAddress = newClientAddressEl.value; 
                if (!newClientPhone || !newClientAddress) { showAlert('Para un cliente nuevo, por favor complete el teléfono y la dirección.'); return; } 
                const newClientPayload = { company_id: AppState.currentUser.companyId, full_name: clientName, phone: newClientPhone, address: newClientAddress }; 
                const result = await apiCall('add_client.php', { method: 'POST', body: JSON.stringify(newClientPayload) }); 
                if (result.success && result.client_id) { clientId = result.client_id; } else { showAlert('Error al crear el nuevo cliente: ' + (result.message || 'Error desconocido.')); return; } 
            } 
        } 
        
        let tech = AppState.db.technicians.find(t => t.name.toLowerCase() === techName.toLowerCase());
        let techId;
        let newTechData = null;
        if(tech) {
            techId = tech.id;
        } else {
            const newTechPhoneEl = getEl('service-new-tech-phone');
            const newTechAddressEl = getEl('service-new-tech-address');
            
            if (!newTechPhoneEl || !newTechAddressEl) {
                showAlert('Error: No se pudieron encontrar los campos para técnico nuevo.');
                return;
            }
            
            const newTechPhone = newTechPhoneEl.value;
            const newTechAddress = newTechAddressEl.value;
            if (!newTechPhone || !newTechAddress) { showAlert('Para un técnico nuevo, por favor complete el teléfono y la dirección.'); return; }
            newTechData = { name: techName, phone: newTechPhone, address: newTechAddress };
        }

        const serviceIdEl = getEl('service-id');
        const serviceDateEl = getEl('service-date');
        const serviceTimeEl = getEl('service-time');
        const serviceNotesEl = getEl('service-notes');
        const servicePriceEl = getEl('service-price');
        
        if (!serviceIdEl || !serviceDateEl || !serviceTimeEl || !serviceNotesEl || !servicePriceEl) {
            showAlert('Error: No se pudieron encontrar todos los campos del formulario.');
            return;
        }
        
        const id = serviceIdEl.value; 
        const clientSiteSelectEl = getEl('service-client-site');
        if (!clientSiteId && clientSiteSelectEl && clientSiteSelectEl.value) {
            clientSiteId = parseInt(clientSiteSelectEl.value, 10);
        }
        const selectedPests = Array.from(document.querySelectorAll('#service-pests input:checked')).map(el => el.value); 
        const selectedServiceTypes = Array.from(document.querySelectorAll('#service-types input:checked')).map(el => el.value);
        
        if (selectedServiceTypes.length === 0) {
            showAlert('Por favor seleccione al menos un tipo de servicio.');
            return;
        }
        
        const payload = { 
            id: id || null, 
            company_id: AppState.currentUser.companyId, 
            client_id: clientId, 
            client_site_id: clientSiteId,
            technician_id: techId,
            new_technician: newTechData,
            service_date: serviceDateEl.dataset.isoDate || serviceDateEl.value, 
            service_time: serviceTimeEl.dataset.time24 || serviceTimeEl.value, 
            service_type: selectedServiceTypes.join(', '), 
            pests: selectedPests.join(', '), 
            notes: serviceNotesEl.value, 
            price: servicePriceEl.value 
        }; 
        
        if (id) { 
            const serviceStatusEl = getEl('service-status');
            if (serviceStatusEl) {
                payload.status = serviceStatusEl.value;
            }
        } 
        
        const endpoint = id ? 'edit_service.php' : 'add_service.php'; 
        
        // Validar y limpiar el payload antes de convertir a JSON
        try {
            // Limpiar valores que podrían causar problemas en JSON
            Object.keys(payload).forEach(key => {
                if (typeof payload[key] === 'string') {
                    // Escapar caracteres problemáticos
                    payload[key] = payload[key].replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                }
            });
            
            const jsonPayload = JSON.stringify(payload);
            const result = await apiCall(endpoint, { method: 'POST', body: jsonPayload }); 
            
            if (result.success) { 
                await refreshAllDataAndViews(); 
                closeModal('service-modal'); 
            } else { 
                showAlert(result.message || 'Ocurrió un error al guardar el servicio.', 'Error'); 
            }
        } catch (jsonError) {
            console.error('Error al generar JSON:', jsonError, 'Payload:', payload);
            showAlert('Error al procesar los datos del formulario. Verifique que no haya caracteres especiales.', 'Error');
        } 
    }

    window.deleteService = async (id) => { 
        if (!checkPermissions(true)) return;
        showConfirm('¿Seguro que quieres eliminar este servicio? Esta acción no se puede deshacer.', 'Confirmar Eliminación', async (confirmed) => { 
            if (confirmed) { 
                const result = await apiCall(`delete_service.php?id=${id}`, { method: 'GET' }); 
                if (result.success) { 
                    await refreshAllDataAndViews(); 
                } else { 
                    showAlert(result.message || 'No se pudo eliminar el servicio.', 'Error'); 
                } 
            } 
        }); 
    };
    window.clearServiceFilters = () => { 
        ['service-filter-status', 'service-filter-tech'].forEach(id => {
            const select = getEl(id);
            select.value = '';
            const customSelectTrigger = select.parentElement.querySelector('.custom-select-trigger');
            if (customSelectTrigger) {
                customSelectTrigger.textContent = select.options[0].textContent;
                customSelectTrigger.parentElement.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                customSelectTrigger.parentElement.querySelector('.custom-option').classList.add('selected');
            }
        });
        getEl('service-filter-date').value = ''; 
        renderServicesTable(); 
    };

    

    
    window.openServiceReportForm = (id) => { 
        const service = AppState.db.services.find(s => s.id == id); 
        if (!service) { showAlert('Servicio no encontrado.', 'Error'); return; } 
        
        if (AppState.currentUser.type === 'tech' && AppState.currentUser.id != service.technician_id) {
            showAlert('No tienes permiso para generar un reporte para un servicio que no te fue asignado.', 'Acceso Denegado');
            return;
        }

        let reportData = service.report_data; 
        if (typeof reportData === 'string' && reportData) { 
            try { reportData = JSON.parse(reportData); } 
            catch (e) { console.error("Error al parsear datos del reporte:", e); reportData = null; } 
        } 
        
        if (reportData) {
            if (AppState.currentUser.type === 'tech') {
                // Técnicos: Solo ver PDF si ya existe reporte
                displayPrintableDocument(id, 'service');
            } else if (AppState.currentUser.type === 'company' && AppState.currentUser.companyId !== 999) { 
                // Admins: Preguntar si ver o editar
                showConfirm("Este servicio ya tiene un reporte guardado. ¿Desea verlo? <br><br>(Presione 'Cancelar' para editar el reporte existente).", "Reporte Existente", (confirmed) => { 
                    if (confirmed) { displayPrintableDocument(id, 'service'); } 
                    else { _fillServiceReportForm(service, reportData); } 
                }); 
            } else {
                _fillServiceReportForm(service, reportData);
            }
        } else { 
            _fillServiceReportForm(service, reportData); 
        } 
    };

    function _fillServiceReportForm(service, reportData) { 
        const client = AppState.db.clients.find(c => c.id == service.client_id);
        let serviceAddress = client ? client.address : 'N/A';
        if (service.client_site_id && Array.isArray(AppState.db.client_sites)) {
            const site = AppState.db.client_sites.find(siteItem => siteItem.id == service.client_site_id);
            if (site && site.address) {
                serviceAddress = site.address;
            }
        }
        const technician = AppState.db.technicians.find(t => t.id == service.technician_id); 
        getEl('service-report-form').reset(); 

        // Detect Client Type
        const isHotel = client && client.type === 'Hotel';
        const isCasino = client && client.type === 'Casino';
        const isMaquiladora = client && client.type === 'Maquiladora';
        const isAlmacen = client && (client.type === 'Almacén' || client.type === 'Almacen');
        const isLocal = client && client.type === 'Negocio Local';

        const standardSections = getEl('standard-report-sections');
        const hotelSections = getEl('hotel-report-sections');
        const casinoSections = getEl('casino-report-sections');
        const maquiladoraSections = getEl('maquiladora-report-sections');
        const almacenSections = getEl('almacen-report-sections');
        const localSections = getEl('local-report-sections');

        // Reset visibility
        if (standardSections) standardSections.classList.add('hidden');
        if (hotelSections) hotelSections.classList.add('hidden');
        if (casinoSections) casinoSections.classList.add('hidden');
        if (maquiladoraSections) maquiladoraSections.classList.add('hidden');
        if (almacenSections) almacenSections.classList.add('hidden');
        if (localSections) localSections.classList.add('hidden');

        if (isHotel) {
            if (hotelSections) hotelSections.classList.remove('hidden');
            
            // Populate Hotel Specifics
            const hotelAreasGroup = getEl('report-hotel-areas-group');
            if (hotelAreasGroup) {
                hotelAreasGroup.innerHTML = '';
                
                // Clear grid layout style to allow blocks for categories
                hotelAreasGroup.style.display = 'block';
                hotelAreasGroup.style.gridTemplateColumns = 'none';

                for (const [category, areas] of Object.entries(AppState.hotelAreas)) {
                    let categoryHtml = `
                    <div class="hotel-area-category" style="margin-bottom: 15px;">
                        <h4 style="color: var(--accent-primary); margin-bottom: 10px; font-size: 0.9em; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">${category}</h4>
                        <div class="styled-checkbox-group" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
                    `;
                    
                    areas.forEach(area => {
                        categoryHtml += `
                        <label class="neon-checkbox-wrapper">
                            <input type="checkbox" name="hotel-areas" value="${area}">
                            <div class="neon-checkmark">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span class="neon-label">${area}</span>
                        </label>
                        `;
                    });

                    categoryHtml += `</div>`;

                    // Add specific field for rooms if it's the specific category
                    if (category === 'Áreas Tratadas – Huéspedes') {
                         categoryHtml += `
                            <div class="form-group" style="margin-top: 10px;">
                                <label style="font-size: 0.9em; color: #aaa;">Habitaciones tratadas (ej. 201–215, 301, 305)</label>
                                <input type="text" id="report-hotel-treated-rooms" class="form-control" placeholder="Ingrese números de habitaciones...">
                            </div>
                         `;
                    }

                    categoryHtml += `</div>`;
                    hotelAreasGroup.innerHTML += categoryHtml;
                }
            }

            const hotelPestsGroup = getEl('report-hotel-pests-group');
            if (hotelPestsGroup) {
                hotelPestsGroup.innerHTML = '';
                AppState.commonPests.forEach(pest => {
                    hotelPestsGroup.innerHTML += `
                    <label class="neon-checkbox-wrapper">
                        <input type="checkbox" name="hotel-pests" value="${pest}">
                        <div class="neon-checkmark">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span class="neon-label">${pest}</span>
                    </label>
                    `;
                });
            }

            const hotelMethodsGroup = getEl('report-hotel-methods-group');
            if (hotelMethodsGroup) {
                hotelMethodsGroup.innerHTML = '';
                AppState.treatmentMethods.forEach(method => {
                    hotelMethodsGroup.innerHTML += `
                    <label class="neon-checkbox-wrapper">
                        <input type="checkbox" name="hotel-methods" value="${method}">
                        <div class="neon-checkmark">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span class="neon-label">${method}</span>
                    </label>
                    `;
                });
            }

        } else if (isCasino) {
            if (casinoSections) casinoSections.classList.remove('hidden');

            // Populate Casino Specifics
            const casinoAreasGroup = getEl('report-casino-areas-group');
            if (casinoAreasGroup) {
                casinoAreasGroup.innerHTML = '';
                
                // Clear grid layout style to allow blocks for categories
                casinoAreasGroup.style.display = 'block';
                casinoAreasGroup.style.gridTemplateColumns = 'none';

                for (const [category, areas] of Object.entries(AppState.casinoAreas)) {
                    let categoryHtml = `
                    <div class="casino-area-category" style="margin-bottom: 15px;">
                        <h4 style="color: var(--accent-primary); margin-bottom: 10px; font-size: 0.9em; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">${category}</h4>
                        <div class="styled-checkbox-group" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
                    `;
                    
                    areas.forEach(area => {
                        categoryHtml += `
                        <label class="neon-checkbox-wrapper">
                            <input type="checkbox" name="casino-areas" value="${area}">
                            <div class="neon-checkmark">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span class="neon-label">${area}</span>
                        </label>
                        `;
                    });

                    categoryHtml += `</div>`;

                    // Add specific field for machines if it's the specific category
                    if (category === 'Áreas de Juego') {
                         categoryHtml += `
                            <div class="form-group" style="margin-top: 10px;">
                                <label style="font-size: 0.9em; color: #aaa;">Máquinas tratadas (ej. Slot 101, Mesa 5)</label>
                                <input type="text" id="report-casino-treated-machines" class="form-control" placeholder="Ingrese IDs de máquinas...">
                            </div>
                         `;
                    }

                    categoryHtml += `</div>`;
                    casinoAreasGroup.innerHTML += categoryHtml;
                }
            }

            const casinoPestsGroup = getEl('report-casino-pests-group');
            if (casinoPestsGroup) {
                casinoPestsGroup.innerHTML = '';
                AppState.commonPests.forEach(pest => {
                    casinoPestsGroup.innerHTML += `
                    <label class="neon-checkbox-wrapper">
                        <input type="checkbox" name="casino-pests" value="${pest}">
                        <div class="neon-checkmark">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span class="neon-label">${pest}</span>
                    </label>
                    `;
                });
            }

            const casinoMethodsGroup = getEl('report-casino-methods-group');
            if (casinoMethodsGroup) {
                casinoMethodsGroup.innerHTML = '';
                AppState.treatmentMethods.forEach(method => {
                    casinoMethodsGroup.innerHTML += `
                    <label class="neon-checkbox-wrapper">
                        <input type="checkbox" name="casino-methods" value="${method}">
                        <div class="neon-checkmark">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span class="neon-label">${method}</span>
                    </label>
                    `;
                });
            }
        
        } else if (isMaquiladora) {
            if (maquiladoraSections) maquiladoraSections.classList.remove('hidden');

            const maquiladoraAreasGroup = getEl('report-maquiladora-areas-group');
            if (maquiladoraAreasGroup) {
                maquiladoraAreasGroup.innerHTML = '';
                maquiladoraAreasGroup.style.display = 'block';
                maquiladoraAreasGroup.style.gridTemplateColumns = 'none';

                for (const [category, areas] of Object.entries(AppState.maquiladoraAreas)) {
                    let categoryHtml = `
                    <div class="maquiladora-area-category" style="margin-bottom: 15px;">
                        <h4 style="color: var(--accent-primary); margin-bottom: 10px; font-size: 0.9em; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">${category}</h4>
                        <div class="styled-checkbox-group" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
                    `;
                    areas.forEach(area => {
                        categoryHtml += `
                        <label class="neon-checkbox-wrapper">
                            <input type="checkbox" name="maquiladora-areas" value="${area}">
                            <div class="neon-checkmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                            <span class="neon-label">${area}</span>
                        </label>`;
                    });
                    categoryHtml += `</div></div>`;
                    maquiladoraAreasGroup.innerHTML += categoryHtml;
                }
            }
            
            // Pests & Methods Population
            const pGroup = getEl('report-maquiladora-pests-group');
            if(pGroup) {
                pGroup.innerHTML = '';
                AppState.commonPests.forEach(p => {
                    pGroup.innerHTML += `<label class="neon-checkbox-wrapper"><input type="checkbox" name="maquiladora-pests" value="${p}"><div class="neon-checkmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div><span class="neon-label">${p}</span></label>`;
                });
            }
            const mGroup = getEl('report-maquiladora-methods-group');
            if(mGroup) {
                mGroup.innerHTML = '';
                AppState.treatmentMethods.forEach(m => {
                    mGroup.innerHTML += `<label class="neon-checkbox-wrapper"><input type="checkbox" name="maquiladora-methods" value="${m}"><div class="neon-checkmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div><span class="neon-label">${m}</span></label>`;
                });
            }

        } else if (isAlmacen) {
            if (almacenSections) almacenSections.classList.remove('hidden');

            const almacenAreasGroup = getEl('report-almacen-areas-group');
            if (almacenAreasGroup) {
                almacenAreasGroup.innerHTML = '';
                almacenAreasGroup.style.display = 'block';
                almacenAreasGroup.style.gridTemplateColumns = 'none';

                for (const [category, areas] of Object.entries(AppState.almacenAreas)) {
                    let categoryHtml = `
                    <div class="almacen-area-category" style="margin-bottom: 15px;">
                        <h4 style="color: var(--accent-primary); margin-bottom: 10px; font-size: 0.9em; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">${category}</h4>
                        <div class="styled-checkbox-group" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
                    `;
                    areas.forEach(area => {
                        categoryHtml += `
                        <label class="neon-checkbox-wrapper">
                            <input type="checkbox" name="almacen-areas" value="${area}">
                            <div class="neon-checkmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                            <span class="neon-label">${area}</span>
                        </label>`;
                    });
                    categoryHtml += `</div></div>`;
                    almacenAreasGroup.innerHTML += categoryHtml;
                }
            }

            // Pests & Methods Population
            const pGroup = getEl('report-almacen-pests-group');
            if(pGroup) {
                pGroup.innerHTML = '';
                AppState.commonPests.forEach(p => {
                    pGroup.innerHTML += `<label class="neon-checkbox-wrapper"><input type="checkbox" name="almacen-pests" value="${p}"><div class="neon-checkmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div><span class="neon-label">${p}</span></label>`;
                });
            }
            const mGroup = getEl('report-almacen-methods-group');
            if(mGroup) {
                mGroup.innerHTML = '';
                AppState.treatmentMethods.forEach(m => {
                    mGroup.innerHTML += `<label class="neon-checkbox-wrapper"><input type="checkbox" name="almacen-methods" value="${m}"><div class="neon-checkmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div><span class="neon-label">${m}</span></label>`;
                });
            }

        } else if (isLocal) {
            if (localSections) localSections.classList.remove('hidden');

            const localAreasGroup = getEl('report-local-areas-group');
            if (localAreasGroup) {
                localAreasGroup.innerHTML = '';
                localAreasGroup.style.display = 'block';
                localAreasGroup.style.gridTemplateColumns = 'none';

                for (const [category, areas] of Object.entries(AppState.localAreas)) {
                    let categoryHtml = `
                    <div class="local-area-category" style="margin-bottom: 15px;">
                        <h4 style="color: var(--accent-primary); margin-bottom: 10px; font-size: 0.9em; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">${category}</h4>
                        <div class="styled-checkbox-group" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
                    `;
                    areas.forEach(area => {
                        categoryHtml += `
                        <label class="neon-checkbox-wrapper">
                            <input type="checkbox" name="local-areas" value="${area}">
                            <div class="neon-checkmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                            <span class="neon-label">${area}</span>
                        </label>`;
                    });
                    categoryHtml += `</div></div>`;
                    localAreasGroup.innerHTML += categoryHtml;
                }
            }

            // Pests & Methods Population
            const pGroup = getEl('report-local-pests-group');
            if(pGroup) {
                pGroup.innerHTML = '';
                AppState.commonPests.forEach(p => {
                    pGroup.innerHTML += `<label class="neon-checkbox-wrapper"><input type="checkbox" name="local-pests" value="${p}"><div class="neon-checkmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div><span class="neon-label">${p}</span></label>`;
                });
            }
            const mGroup = getEl('report-local-methods-group');
            if(mGroup) {
                mGroup.innerHTML = '';
                AppState.treatmentMethods.forEach(m => {
                    mGroup.innerHTML += `<label class="neon-checkbox-wrapper"><input type="checkbox" name="local-methods" value="${m}"><div class="neon-checkmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div><span class="neon-label">${m}</span></label>`;
                });
            }

        } else {

            if (standardSections) standardSections.classList.remove('hidden');
            if (hotelSections) hotelSections.classList.add('hidden');
            if (casinoSections) casinoSections.classList.add('hidden');
            
            // Poblar checklist de plagas
            const pestsGroup = getEl('report-detected-pests-group');
            pestsGroup.innerHTML = '';
            AppState.commonPests.forEach(pest => {
                pestsGroup.innerHTML += `
                <label class="neon-checkbox-wrapper">
                    <input type="checkbox" name="detected-pests" value="${pest}">
                    <div class="neon-checkmark">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span class="neon-label">${pest}</span>
                </label>
            `;
            });
            
            const methodsContainer = getEl('report-treatment-methods-group'); 
            methodsContainer.innerHTML = ''; 
            AppState.treatmentMethods.forEach(method => { 
                methodsContainer.innerHTML += `
                    <label class="neon-checkbox-wrapper">
                        <input type="checkbox" name="treatment-methods" value="${method}">
                        <div class="neon-checkmark">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span class="neon-label">${method}</span>
                    </label>
                `; 
            }); 
            
            const areasContainer = getEl('report-affected-areas-group'); 
            areasContainer.innerHTML = ''; 
            AppState.treatedAreas.forEach(area => { 
                areasContainer.innerHTML += `
                    <label class="neon-checkbox-wrapper">
                        <input type="checkbox" name="affected-areas" value="${area}">
                        <div class="neon-checkmark">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span class="neon-label">${area}</span>
                    </label>
                `; 
            }); 
        }
        
 
        getEl('report-photo-previews-before').innerHTML = ''; 
        getEl('report-photo-previews-after').innerHTML = ''; 
        AppState.tempSignatures = { techSignature: null, clientSignature: null }; 
        updateSignaturePlaceholder('techSignature', null); 
        updateSignaturePlaceholder('clientSignature', null); 
        
        getEl('report-service-id').value = service.id; 
        getEl('report-client-name').value = client ? client.full_name : 'N/A'; 
        getEl('report-client-phone').value = client ? client.phone : 'N/A'; 
        let reportAddress = client ? client.address : 'N/A';
        if (service.client_site_id && Array.isArray(AppState.db.client_sites)) {
            const site = AppState.db.client_sites.find(siteItem => siteItem.id == service.client_site_id);
            if (site && site.address) {
                reportAddress = site.address;
            }
        }
        getEl('report-client-address').value = reportAddress; 
        getEl('report-service-date').value = `${formatDate(service.service_date)} ${formatTime(service.service_time)}`; 
        getEl('report-service-tech').value = technician ? technician.name : 'N/A'; 
        getEl('report-service-type').value = service.service_type || 'N/A'; 
        
        // Si hay plagas previamente seleccionadas, marcarlas (Standard & Casino & Others)
        if (service.pests) {
            const selectedPests = service.pests.split(', ');
            setTimeout(() => {
                if (isCasino) {
                    document.querySelectorAll('#report-casino-pests-group input').forEach(box => {
                        if (selectedPests.includes(box.value)) box.checked = true;
                    });
                } else if (isMaquiladora) {
                     document.querySelectorAll('#report-maquiladora-pests-group input').forEach(box => {
                        if (selectedPests.includes(box.value)) box.checked = true;
                    });
                } else if (isAlmacen) {
                     document.querySelectorAll('#report-almacen-pests-group input').forEach(box => {
                        if (selectedPests.includes(box.value)) box.checked = true;
                    });
                } else if (isLocal) {
                     document.querySelectorAll('#report-local-pests-group input').forEach(box => {
                        if (selectedPests.includes(box.value)) box.checked = true;
                    });
                } else if (!isHotel) {
                    document.querySelectorAll('#report-detected-pests-group input').forEach(box => {
                        if (selectedPests.includes(box.value)) box.checked = true;
                    });
                }
            }, 100);
        }
        
        // Si hay tipos de servicio previamente seleccionados, pre-seleccionar métodos de tratamiento correspondientes
        if (service.service_type) {
            const selectedServiceTypes = service.service_type.split(', ');
            setTimeout(() => {
                if (isCasino) {
                    document.querySelectorAll('#report-casino-methods-group input').forEach(box => {
                        if (selectedServiceTypes.includes(box.value)) box.checked = true;
                    });
                } else if (isMaquiladora) {
                    document.querySelectorAll('#report-maquiladora-methods-group input').forEach(box => {
                        if (selectedServiceTypes.includes(box.value)) box.checked = true;
                    });
                } else if (isAlmacen) {
                    document.querySelectorAll('#report-almacen-methods-group input').forEach(box => {
                        if (selectedServiceTypes.includes(box.value)) box.checked = true;
                    });
                } else if (isLocal) {
                    document.querySelectorAll('#report-local-methods-group input').forEach(box => {
                        if (selectedServiceTypes.includes(box.value)) box.checked = true;
                    });
                } else if (!isHotel) {
                    document.querySelectorAll('#report-treatment-methods-group input').forEach(box => {
                        if (selectedServiceTypes.includes(box.value)) box.checked = true;
                    });
                }
            }, 100);
        }
        
        // Initialize Chemicals Section
        initReportChemicals(service, reportData);

        // Los campos de recomendaciones ahora son textareas editables vacías
        
        if (reportData) {
            getEl('report-client-contact').value = reportData.clientContact || '';
            getEl('report-service-duration').value = reportData.serviceDuration || '';
            
            // Standard Fields
            if (isHotel) {
                // Hotel Fields Population
                if (reportData.hotelAreas) {
                    const selectedAreas = reportData.hotelAreas.split(', ');
                    document.querySelectorAll('#report-hotel-areas-group input').forEach(box => {
                        if (selectedAreas.includes(box.value)) box.checked = true;
                    });
                }
                if (reportData.hotelPests) {
                    const selectedPests = reportData.hotelPests.split(', ');
                    document.querySelectorAll('#report-hotel-pests-group input').forEach(box => {
                        if (selectedPests.includes(box.value)) box.checked = true;
                    });
                }
                 if (reportData.hotelMethods) {
                    const selectedMethods = reportData.hotelMethods.split(', ');
                    document.querySelectorAll('#report-hotel-methods-group input').forEach(box => {
                        if (selectedMethods.includes(box.value)) box.checked = true;
                    });
                }
                if (getEl('report-hotel-room-activity')) getEl('report-hotel-room-activity').value = reportData.hotelRoomActivity || '';
                if (getEl('report-hotel-infestation-level')) getEl('report-hotel-infestation-level').value = reportData.hotelInfestationLevel || 'Nulo';
                if (getEl('report-hotel-housekeeping')) getEl('report-hotel-housekeeping').value = reportData.hotelHousekeeping || '';
                if (getEl('report-hotel-maintenance')) getEl('report-hotel-maintenance').value = reportData.hotelMaintenance || '';
                if (getEl('report-hotel-treated-rooms')) getEl('report-hotel-treated-rooms').value = reportData.hotelTreatedRooms || '';
                
                // Missing Hotel Fields Population
                if (reportData.hotelTreatmentType) {
                    const selectedTypes = reportData.hotelTreatmentType.split(', ');
                    document.querySelectorAll('#report-hotel-treatment-type-group input').forEach(box => {
                        if (selectedTypes.includes(box.value)) box.checked = true;
                    });
                }
                if (getEl('report-hotel-treatment-reason')) getEl('report-hotel-treatment-reason').value = reportData.hotelTreatmentReason || '';
                
                if (reportData.hotelInspectionMethods) {
                    const selectedMethods = reportData.hotelInspectionMethods.split(', ');
                    document.querySelectorAll('#report-hotel-inspection-method-group input').forEach(box => {
                        if (selectedMethods.includes(box.value)) box.checked = true;
                    });
                }
                
                if (getEl('report-hotel-conditions')) getEl('report-hotel-conditions').value = reportData.hotelConditions || '';
                if (getEl('report-hotel-sanitary-risks')) getEl('report-hotel-sanitary-risks').value = reportData.hotelSanitaryRisks || '';
                if (getEl('report-hotel-recommendations')) getEl('report-hotel-recommendations').value = reportData.hotelRecommendations || '';
            } else if (isCasino) {
                // Casino Fields Population
                if (reportData.casinoAreas) {
                    const selectedAreas = reportData.casinoAreas.split(', ');
                    document.querySelectorAll('#report-casino-areas-group input').forEach(box => {
                        if (selectedAreas.includes(box.value)) box.checked = true;
                    });
                }
                if (reportData.casinoPests) {
                    const selectedPests = reportData.casinoPests.split(', ');
                    document.querySelectorAll('#report-casino-pests-group input').forEach(box => {
                        if (selectedPests.includes(box.value)) box.checked = true;
                    });
                }
                if (reportData.casinoMethods) {
                    const selectedMethods = reportData.casinoMethods.split(', ');
                    document.querySelectorAll('#report-casino-methods-group input').forEach(box => {
                        if (selectedMethods.includes(box.value)) box.checked = true;
                    });
                }
                
                if (getEl('report-casino-room-activity')) getEl('report-casino-room-activity').value = reportData.casinoRoomActivity || '';
                if (getEl('report-casino-infestation-level')) getEl('report-casino-infestation-level').value = reportData.casinoInfestationLevel || 'Nulo';
                if (getEl('report-casino-housekeeping')) getEl('report-casino-housekeeping').value = reportData.casinoHousekeeping || '';
                if (getEl('report-casino-maintenance')) getEl('report-casino-maintenance').value = reportData.casinoMaintenance || '';
                if (getEl('report-casino-treated-machines')) getEl('report-casino-treated-machines').value = reportData.casinoTreatedMachines || '';
                
                if (reportData.casinoTreatmentType) {
                    const selectedTypes = reportData.casinoTreatmentType.split(', ');
                    document.querySelectorAll('#report-casino-treatment-type-group input').forEach(box => {
                        if (selectedTypes.includes(box.value)) box.checked = true;
                    });
                }
                if (getEl('report-casino-treatment-reason')) getEl('report-casino-treatment-reason').value = reportData.casinoTreatmentReason || '';
                
                if (reportData.casinoInspectionMethods) {
                    const selectedMethods = reportData.casinoInspectionMethods.split(', ');
                    document.querySelectorAll('#report-casino-inspection-method-group input').forEach(box => {
                        if (selectedMethods.includes(box.value)) box.checked = true;
                    });
                }
                
                if (getEl('report-casino-conditions')) getEl('report-casino-conditions').value = reportData.casinoConditions || '';
                if (getEl('report-casino-sanitary-risks')) getEl('report-casino-sanitary-risks').value = reportData.casinoSanitaryRisks || '';
                if (getEl('report-casino-recommendations')) getEl('report-casino-recommendations').value = reportData.casinoRecommendations || '';
            } else {
                getEl('report-infestation-level').value = reportData.infestationLevel || 'Leve';
                getEl('report-inspection-method').value = reportData.inspectionMethod || 'Inspección Visual';
                
                if (reportData.affectedAreas) {
                    const selectedAreas = reportData.affectedAreas.split(', ');
                    document.querySelectorAll('#report-affected-areas-group input').forEach(box => {
                        if (selectedAreas.includes(box.value)) box.checked = true;
                    });
                }
                
                if (reportData.treatmentMethod) {
                    const selectedMethods = reportData.treatmentMethod.split(', ');
                    document.querySelectorAll('#report-treatment-methods-group input').forEach(box => {
                        if (selectedMethods.includes(box.value)) box.checked = true;
                    });
                }
                 // Llenar checklist de plagas detectadas (Standard)
                if (reportData.detectedPests) {
                     const selectedPests = reportData.detectedPests.split(', ');
                     document.querySelectorAll('#report-detected-pests-group input').forEach(box => {
                        if (selectedPests.includes(box.value)) box.checked = true;
                     });
                }
            }
            
            // Populate Photos
            const beforeContainer = getEl('report-photo-previews-before');
            const afterContainer = getEl('report-photo-previews-after');
            
            // Helper to add existing photo
            const addExistingPhoto = (container, path) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'photo-preview-item existing-photo';
                previewItem.dataset.path = path;
                // Check if path already starts with api/ or uploads/
                const srcPath = path.startsWith('api/') ? path : (path.startsWith('uploads/') ? `api/${path}` : path);
                previewItem.innerHTML = `<img src="${srcPath}" alt="Vista previa"><span class="remove-photo" style="position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; width: 20px; height: 20px; text-align: center; cursor: pointer; line-height: 18px; font-size: 14px;" onclick="this.parentElement.remove()">×</span>`;
                container.appendChild(previewItem);
            };

            if (reportData.photos_before && Array.isArray(reportData.photos_before)) {
                reportData.photos_before.forEach(path => addExistingPhoto(beforeContainer, path));
            } else if (reportData.photos && Array.isArray(reportData.photos)) {
                // Fallback for old format if needed, though usually mixed
                // We might not know if it's before or after, maybe just put in before?
                // Or better, ignore if we have separate arrays.
            }
            
            if (reportData.photos_after && Array.isArray(reportData.photos_after)) {
                reportData.photos_after.forEach(path => addExistingPhoto(afterContainer, path));
            }
            if (reportData.safetyRecommendations) {
                getEl('report-safety-recommendations').value = reportData.safetyRecommendations;
            }
            
            if (reportData.recommendations) {
                getEl('report-recommendations').value = reportData.recommendations;
            }
            
            if (reportData.appliesWarranty === 'si') {
                getEl('warranty-applies-checkbox').checked = true;
                getEl('report-warranty-duration-group').classList.remove('hidden');
                
                const warrantySelect = getEl('report-warranty-duration');
                const savedDuration = reportData.warrantyDuration || '3 Meses';
                
                let optionExists = false;
                for (let i = 0; i < warrantySelect.options.length; i++) {
                    if (warrantySelect.options[i].value === savedDuration) {
                        optionExists = true;
                        break;
                    }
                }
                
                if (!optionExists) {
                    const newOpt = document.createElement('option');
                    newOpt.value = savedDuration;
                    newOpt.textContent = savedDuration;
                    warrantySelect.appendChild(newOpt);
                }
                
                warrantySelect.value = savedDuration;
            } else {
                getEl('warranty-applies-checkbox').checked = false;
                getEl('report-warranty-duration-group').classList.add('hidden');
            }
            
            AppState.tempSignatures.techSignature = reportData.techSignature;
            AppState.tempSignatures.clientSignature = reportData.clientSignature;
            updateSignaturePlaceholder('techSignature', getFullImagePath(reportData.techSignature));
            updateSignaturePlaceholder('clientSignature', getFullImagePath(reportData.clientSignature));
        } else {
            // No hay datos previos, no marcar ningún checkbox por defecto
            getEl('warranty-applies-checkbox').checked = false;
            getEl('report-warranty-duration-group').classList.add('hidden');
        }
        
        document.querySelectorAll('#service-report-form-modal [data-custom-select]').forEach(createCustomSelect);
        openModal('service-report-form-modal');
    }
    function handlePhotoSelection(event, type, maxFiles) { 
        const previewContainer = getEl(`report-photo-previews-${type}`); 
        previewContainer.innerHTML = ''; 
        const files = event.target.files; 
        if (files.length > maxFiles) { 
            showAlert(`Puede subir un máximo de ${maxFiles} fotos para ${type === 'before' ? 'antes' : 'después'} del servicio.`); 
            event.target.value = ""; 
            return; 
        } 
        for (const file of files) { 
            const reader = new FileReader(); 
            reader.onload = (e) => { 
                const previewItem = document.createElement('div'); 
                previewItem.className = 'photo-preview-item'; 
                previewItem.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`; 
                previewContainer.appendChild(previewItem); 
            }; 
            reader.readAsDataURL(file); 
        } 
    }
    async function handleSaveServiceReport() { 
        const serviceId = getEl('report-service-id').value;
        
        // Obtener el servicio y los datos del reporte existente si hay
        const service = AppState.db.services.find(s => s.id == serviceId);
        let reportData = null;
        if (service && service.report_data) {
            try {
                reportData = typeof service.report_data === 'string' ? JSON.parse(service.report_data) : service.report_data;
            } catch (e) {
                console.error("Error al parsear datos del reporte existente:", e);
            }
        }
        

        
        // Detect Client Type
        const client = AppState.db.clients.find(c => c.id == service.client_id);
        const isHotel = client && client.type === 'Hotel';
        const isCasino = client && client.type === 'Casino';
        const isMaquiladora = client && client.type === 'Maquiladora';
        const isAlmacen = client && (client.type === 'Almacén' || client.type === 'Almacen');
        const isLocal = client && client.type === 'Negocio Local';

        // Crear un FormData para enviar archivos
        const formData = new FormData();
        
        // Collect existing photos
        const existingPhotosBefore = Array.from(document.querySelectorAll('#report-photo-previews-before .existing-photo')).map(el => el.dataset.path);
        const existingPhotosAfter = Array.from(document.querySelectorAll('#report-photo-previews-after .existing-photo')).map(el => el.dataset.path);
        
        formData.append('existing_photos_before', JSON.stringify(existingPhotosBefore));
        formData.append('existing_photos_after', JSON.stringify(existingPhotosAfter));
        
        formData.append('service_id', serviceId);
        formData.append('clientContact', getEl('report-client-contact').value);
        formData.append('serviceDuration', getEl('report-service-duration').value);

        if (isHotel) {
             const selectedHotelAreas = Array.from(document.querySelectorAll('#report-hotel-areas-group input:checked')).map(el => el.value);
             const selectedHotelPests = Array.from(document.querySelectorAll('#report-hotel-pests-group input:checked')).map(el => el.value);
             const selectedHotelMethods = Array.from(document.querySelectorAll('#report-hotel-methods-group input:checked')).map(el => el.value);
             
             // New Fields for Hotel Report
             const selectedHotelTreatmentTypes = Array.from(document.querySelectorAll('#report-hotel-treatment-type-group input:checked')).map(el => el.value);
             const selectedHotelInspectionMethods = Array.from(document.querySelectorAll('#report-hotel-inspection-method-group input:checked')).map(el => el.value);

             formData.append('hotelAreas', selectedHotelAreas.join(', '));
             formData.append('hotelPests', selectedHotelPests.join(', '));
             formData.append('hotelMethods', selectedHotelMethods.join(', '));
             formData.append('hotelRoomActivity', getEl('report-hotel-room-activity').value);
             formData.append('hotelInfestationLevel', getEl('report-hotel-infestation-level').value);
             formData.append('hotelHousekeeping', getEl('report-hotel-housekeeping').value);
             formData.append('hotelMaintenance', getEl('report-hotel-maintenance').value);
             formData.append('hotelTreatedRooms', getEl('report-hotel-treated-rooms') ? getEl('report-hotel-treated-rooms').value : '');
             
             // Append new hotel fields
             formData.append('hotelTreatmentType', selectedHotelTreatmentTypes.join(', '));
             formData.append('hotelTreatmentReason', getEl('report-hotel-treatment-reason').value);
             formData.append('hotelInspectionMethods', selectedHotelInspectionMethods.join(', '));
             formData.append('hotelConditions', getEl('report-hotel-conditions').value);
             formData.append('hotelSanitaryRisks', getEl('report-hotel-sanitary-risks').value);
             formData.append('hotelRecommendations', getEl('report-hotel-recommendations').value);
             
             // Map to standard fields for backward compatibility/analytics if needed
             formData.append('detectedPests', selectedHotelPests.join(', '));
             formData.append('infestationLevel', getEl('report-hotel-infestation-level').value);
             formData.append('affectedAreas', selectedHotelAreas.join(', '));
             formData.append('treatmentMethod', selectedHotelMethods.join(', '));
        } else if (isCasino) {
             const selectedCasinoAreas = Array.from(document.querySelectorAll('#report-casino-areas-group input:checked')).map(el => el.value);
             const selectedCasinoPests = Array.from(document.querySelectorAll('#report-casino-pests-group input:checked')).map(el => el.value);
             const selectedCasinoMethods = Array.from(document.querySelectorAll('#report-casino-methods-group input:checked')).map(el => el.value);
             
             // New Fields for Casino Report
             const selectedCasinoTreatmentTypes = Array.from(document.querySelectorAll('#report-casino-treatment-type-group input:checked')).map(el => el.value);
             const selectedCasinoInspectionMethods = Array.from(document.querySelectorAll('#report-casino-inspection-method-group input:checked')).map(el => el.value);

             formData.append('casinoAreas', selectedCasinoAreas.join(', '));
             formData.append('casinoPests', selectedCasinoPests.join(', '));
             formData.append('casinoMethods', selectedCasinoMethods.join(', '));
             formData.append('casinoRoomActivity', getEl('report-casino-room-activity').value);
             formData.append('casinoInfestationLevel', getEl('report-casino-infestation-level').value);
             formData.append('casinoHousekeeping', getEl('report-casino-housekeeping').value);
             formData.append('casinoMaintenance', getEl('report-casino-maintenance').value);
             formData.append('casinoTreatedMachines', getEl('report-casino-treated-machines') ? getEl('report-casino-treated-machines').value : '');
             
             // Append new casino fields
             formData.append('casinoTreatmentType', selectedCasinoTreatmentTypes.join(', '));
             formData.append('casinoTreatmentReason', getEl('report-casino-treatment-reason').value);
             formData.append('casinoInspectionMethods', selectedCasinoInspectionMethods.join(', '));
             formData.append('casinoConditions', getEl('report-casino-conditions').value);
             formData.append('casinoSanitaryRisks', getEl('report-casino-sanitary-risks').value);
             formData.append('casinoRecommendations', getEl('report-casino-recommendations').value);
             
             // Map to standard fields for backward compatibility/analytics if needed
             formData.append('detectedPests', selectedCasinoPests.join(', '));
             formData.append('infestationLevel', getEl('report-casino-infestation-level').value);
             formData.append('affectedAreas', selectedCasinoAreas.join(', '));
             formData.append('treatmentMethod', selectedCasinoMethods.join(', '));
        } else if (isMaquiladora) {
             const selectedMaquiladoraAreas = Array.from(document.querySelectorAll('#report-maquiladora-areas-group input:checked')).map(el => el.value);
             const selectedMaquiladoraPests = Array.from(document.querySelectorAll('#report-maquiladora-pests-group input:checked')).map(el => el.value);
             const selectedMaquiladoraMethods = Array.from(document.querySelectorAll('#report-maquiladora-methods-group input:checked')).map(el => el.value);
             
             // New Fields for Maquiladora Report
             const selectedMaquiladoraTreatmentTypes = Array.from(document.querySelectorAll('#report-maquiladora-treatment-type-group input:checked')).map(el => el.value);
             const selectedMaquiladoraInspectionMethods = Array.from(document.querySelectorAll('#report-maquiladora-inspection-method-group input:checked')).map(el => el.value);

             formData.append('maquiladoraAreas', selectedMaquiladoraAreas.join(', '));
             formData.append('maquiladoraPests', selectedMaquiladoraPests.join(', '));
             formData.append('maquiladoraMethods', selectedMaquiladoraMethods.join(', '));
             formData.append('maquiladoraActivityDetail', getEl('report-maquiladora-activity-detail').value);
             formData.append('maquiladoraInfestationLevel', getEl('report-maquiladora-infestation-level').value);
             formData.append('maquiladoraHousekeeping', getEl('report-maquiladora-housekeeping').value);
             formData.append('maquiladoraMaintenance', getEl('report-maquiladora-maintenance').value);
             
             // Append new Maquiladora fields
             formData.append('maquiladoraTreatmentType', selectedMaquiladoraTreatmentTypes.join(', '));
             formData.append('maquiladoraTreatmentReason', getEl('report-maquiladora-treatment-reason').value);
             formData.append('maquiladoraInspectionMethods', selectedMaquiladoraInspectionMethods.join(', '));
             formData.append('maquiladoraConditions', getEl('report-maquiladora-conditions').value);
             formData.append('maquiladoraSanitaryRisks', getEl('report-maquiladora-sanitary-risks').value);
             formData.append('maquiladoraRecommendations', getEl('report-maquiladora-recommendations').value);
             
             // Map to standard fields
             formData.append('detectedPests', selectedMaquiladoraPests.join(', '));
             formData.append('infestationLevel', getEl('report-maquiladora-infestation-level').value);
             formData.append('affectedAreas', selectedMaquiladoraAreas.join(', '));
             formData.append('treatmentMethod', selectedMaquiladoraMethods.join(', '));

        } else if (isAlmacen) {
             const selectedAlmacenAreas = Array.from(document.querySelectorAll('#report-almacen-areas-group input:checked')).map(el => el.value);
             const selectedAlmacenPests = Array.from(document.querySelectorAll('#report-almacen-pests-group input:checked')).map(el => el.value);
             const selectedAlmacenMethods = Array.from(document.querySelectorAll('#report-almacen-methods-group input:checked')).map(el => el.value);
             
             // New Fields for Almacen Report
             const selectedAlmacenTreatmentTypes = Array.from(document.querySelectorAll('#report-almacen-treatment-type-group input:checked')).map(el => el.value);
             const selectedAlmacenInspectionMethods = Array.from(document.querySelectorAll('#report-almacen-inspection-method-group input:checked')).map(el => el.value);

             formData.append('almacenAreas', selectedAlmacenAreas.join(', '));
             formData.append('almacenPests', selectedAlmacenPests.join(', '));
             formData.append('almacenMethods', selectedAlmacenMethods.join(', '));
             formData.append('almacenActivityDetail', getEl('report-almacen-activity-detail').value);
             formData.append('almacenInfestationLevel', getEl('report-almacen-infestation-level').value);
             formData.append('almacenHousekeeping', getEl('report-almacen-housekeeping').value);
             formData.append('almacenMaintenance', getEl('report-almacen-maintenance').value);
             
             // Append new Almacen fields
             formData.append('almacenTreatmentType', selectedAlmacenTreatmentTypes.join(', '));
             formData.append('almacenTreatmentReason', getEl('report-almacen-treatment-reason').value);
             formData.append('almacenInspectionMethods', selectedAlmacenInspectionMethods.join(', '));
             formData.append('almacenConditions', getEl('report-almacen-conditions').value);
             formData.append('almacenSanitaryRisks', getEl('report-almacen-sanitary-risks').value);
             formData.append('almacenRecommendations', getEl('report-almacen-recommendations').value);
             
             // Map to standard fields
             formData.append('detectedPests', selectedAlmacenPests.join(', '));
             formData.append('infestationLevel', getEl('report-almacen-infestation-level').value);
             formData.append('affectedAreas', selectedAlmacenAreas.join(', '));
             formData.append('treatmentMethod', selectedAlmacenMethods.join(', '));

        } else if (isLocal) {
             const selectedLocalAreas = Array.from(document.querySelectorAll('#report-local-areas-group input:checked')).map(el => el.value);
             const selectedLocalPests = Array.from(document.querySelectorAll('#report-local-pests-group input:checked')).map(el => el.value);
             const selectedLocalMethods = Array.from(document.querySelectorAll('#report-local-methods-group input:checked')).map(el => el.value);
             
             // New Fields for Local Report
             const selectedLocalTreatmentTypes = Array.from(document.querySelectorAll('#report-local-treatment-type-group input:checked')).map(el => el.value);
             const selectedLocalInspectionMethods = Array.from(document.querySelectorAll('#report-local-inspection-method-group input:checked')).map(el => el.value);

             formData.append('localAreas', selectedLocalAreas.join(', '));
             formData.append('localPests', selectedLocalPests.join(', '));
             formData.append('localMethods', selectedLocalMethods.join(', '));
             formData.append('localActivityDetail', getEl('report-local-activity-detail').value);
             formData.append('localInfestationLevel', getEl('report-local-infestation-level').value);
             formData.append('localHousekeeping', getEl('report-local-housekeeping').value);
             formData.append('localMaintenance', getEl('report-local-maintenance').value);
             
             // Append new Local fields
             formData.append('localTreatmentType', selectedLocalTreatmentTypes.join(', '));
             formData.append('localTreatmentReason', getEl('report-local-treatment-reason').value);
             formData.append('localInspectionMethods', selectedLocalInspectionMethods.join(', '));
             formData.append('localConditions', getEl('report-local-conditions').value);
             formData.append('localSanitaryRisks', getEl('report-local-sanitary-risks').value);
             formData.append('localRecommendations', getEl('report-local-recommendations').value);
             
             // Map to standard fields
             formData.append('detectedPests', selectedLocalPests.join(', '));
             formData.append('infestationLevel', getEl('report-local-infestation-level').value);
             formData.append('affectedAreas', selectedLocalAreas.join(', '));
             formData.append('treatmentMethod', selectedLocalMethods.join(', '));
        } else {
            const selectedMethods = Array.from(document.querySelectorAll('#report-treatment-methods-group input:checked')).map(el => el.value);
            const selectedAreas = Array.from(document.querySelectorAll('#report-affected-areas-group input:checked')).map(el => el.value);
            const selectedPests = Array.from(document.querySelectorAll('#report-detected-pests-group input:checked')).map(el => el.value);
            
            formData.append('detectedPests', selectedPests.join(', '));
            formData.append('infestationLevel', getEl('report-infestation-level').value);
            formData.append('affectedAreas', selectedAreas.join(', '));
            formData.append('inspectionMethod', getEl('report-inspection-method').value);
            formData.append('treatmentMethod', selectedMethods.join(', '));
        }
 
        // Obtener recomendaciones de los textareas
        formData.append('safetyRecommendations', getEl('report-safety-recommendations').value);
        formData.append('recommendations', getEl('report-recommendations').value);
        formData.append('appliesWarranty', getEl('warranty-applies-checkbox').checked ? 'si' : 'no');
        formData.append('warrantyDuration', getEl('report-warranty-duration').value);

        // Append Chemicals Data
        const chemicalsData = getEl('report-chemicals-data').value;
        formData.append('chemicals_data', chemicalsData);
        
        // Procesar firmas
        if (AppState.tempSignatures.techSignature) {
            // Convertir la firma de base64 a Blob
            if (AppState.tempSignatures.techSignature.startsWith('data:image')) {
                const techSignatureBlob = await dataURLtoBlob(AppState.tempSignatures.techSignature);
                formData.append('techSignature', techSignatureBlob, 'tech_signature.png');
            } else {
                // Si ya es una URL, solo pasamos la referencia
                formData.append('techSignatureUrl', AppState.tempSignatures.techSignature);
            }
        }
        
        if (AppState.tempSignatures.clientSignature) {
            // Convertir la firma de base64 a Blob
            if (AppState.tempSignatures.clientSignature.startsWith('data:image')) {
                const clientSignatureBlob = await dataURLtoBlob(AppState.tempSignatures.clientSignature);
                formData.append('clientSignature', clientSignatureBlob, 'client_signature.png');
            } else {
                // Si ya es una URL, solo pasamos la referencia
                formData.append('clientSignatureUrl', AppState.tempSignatures.clientSignature);
            }
        }
        
        // Mostrar indicador de carga temprano para informar sobre la compresión
        showAlert('Optimizando imágenes...', 'Procesando');

        const photoFilesBefore = getEl('report-photos-before').files;
        if (photoFilesBefore.length > 0) {
            const compressedFiles = await Promise.all(
                Array.from(photoFilesBefore).map(file => compressImageFile(file, 1024, 1024, 0.6))
            );
            compressedFiles.forEach(file => formData.append('photos_before[]', file));
        }
        
        const photoFilesAfter = getEl('report-photos-after').files;
        if (photoFilesAfter.length > 0) {
            const compressedFiles = await Promise.all(
                Array.from(photoFilesAfter).map(file => compressImageFile(file, 1024, 1024, 0.6))
            );
            compressedFiles.forEach(file => formData.append('photos_after[]', file));
        }
        
        // Si no hay fotos nuevas, mantener las existentes
        if (photoFilesBefore.length === 0 && photoFilesAfter.length === 0 && reportData && reportData.photos) {
            formData.append('existing_photos', JSON.stringify(reportData.photos));
        }
        
        // Actualizar indicador de carga
        showAlert('Subiendo reporte y fotos...', 'Guardando');
        
        // Deshabilitar el botón de envío para evitar múltiples envíos
        const submitBtn = document.querySelector('#service-report-form button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';
        }
        
        // Enviar datos usando fetch directamente para mejor control
        try {
            const response = await fetch(`${AppState.apiBaseUrl || 'api/'}save_service_report.php`, {
                method: 'POST',
                body: formData,
                // No establecer Content-Type, fetch lo hará automáticamente con el boundary correcto
            });
            
            const result = await response.json();
            
            if (result.success) {
                showAlert(result.message, 'Éxito');
                closeModal('service-report-form-modal');
                await refreshAllDataAndViews();
                displayPrintableDocument(serviceId, 'service');
            } else {
                showAlert('Error: ' + (result.message || 'No se pudo guardar el reporte.'), 'Error');
            }
        } catch (error) {
            console.error('Error al guardar el reporte:', error);
            showAlert('Error de conexión al guardar el reporte. Intente nuevamente.', 'Error');
        } finally {
            // Rehabilitar el botón de envío
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }
    
    async function dataURLtoBlob(dataURL) {
        const response = await fetch(dataURL);
        return await response.blob();
    }
    
    async function compressImageFile(file, maxWidth, maxHeight, quality) {
        if (!file || !file.type.startsWith('image/')) return file;
        return new Promise((resolve) => {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = () => {
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(file);
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    if (!canvas.toBlob) {
                        resolve(file);
                        return;
                    }
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        const optimized = new File([blob], file.name, { type: 'image/jpeg' });
                        resolve(optimized);
                    }, 'image/jpeg', quality);
                };
                img.onerror = () => resolve(file);
                img.src = reader.result;
            };
            reader.onerror = () => resolve(file);
            reader.readAsDataURL(file);
        });
    }
    
    window.openSignatureModal = (target) => {
        if (!checkPermissions(false)) return;
        AppState.currentSignatureTarget = target;
        const title = target === 'techSignature' ? 'Firma del Técnico' : 'Firma del Cliente';
        getEl('signature-modal-title').textContent = title;
        openModal('signature-modal');
        const canvas = getEl('signature-canvas');
        
        if (AppState.signaturePad) {
            AppState.signaturePad.clear();
        } else {
            const signatureOptions = {
                backgroundColor: 'rgb(255, 255, 255)',
                throttle: 8,
                minDistance: 0
            };
            AppState.signaturePad = new SignaturePad(canvas, signatureOptions);
        }

        function resizeCanvas() {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext("2d", { willReadFrequently: true }).scale(ratio, ratio);
            AppState.signaturePad.clear();
        }

        if (AppState.resizeHandler) window.removeEventListener('resize', AppState.resizeHandler);
        AppState.resizeHandler = resizeCanvas;
        window.addEventListener('resize', AppState.resizeHandler);
        resizeCanvas();

        const existingSignature = AppState.tempSignatures[AppState.currentSignatureTarget];
        if (existingSignature && existingSignature.startsWith('data:image')) {
            AppState.signaturePad.fromDataURL(existingSignature);
        }
    };

    function handleSaveSignature() { if (AppState.signaturePad.isEmpty()) { showAlert("Por favor, proporcione una firma."); return; } const dataURL = AppState.signaturePad.toDataURL(); AppState.tempSignatures[AppState.currentSignatureTarget] = dataURL; updateSignaturePlaceholder(AppState.currentSignatureTarget, dataURL); closeModal('signature-modal'); }
    function updateSignaturePlaceholder(target, dataURL) { const placeholderId = target === 'techSignature' ? 'tech-signature-placeholder' : 'client-signature-placeholder'; const placeholder = getEl(placeholderId); if (dataURL) { placeholder.innerHTML = `<img src="${dataURL}" alt="Firma capturada" style="display:block; max-width:100%; max-height:100%; object-fit:contain;">`; } else { placeholder.innerHTML = '<span>🖊️ Hacer clic para firmar</span>'; } }
    
    window.displayPrintableDocument = (id, type) => {
        let html = '', title = '';
        AppState.currentDocumentForPdf = { id, type };
        
        // Reset and show/hide options
        const optionsDiv = getEl('printable-document-options');
        const showCostsCheckbox = getEl('print-option-show-costs');
        
        if (showCostsCheckbox) showCostsCheckbox.checked = false;

        if (type === 'service' && AppState.currentUser && AppState.currentUser.type === 'company') {
            optionsDiv.style.display = 'block';
        } else {
            optionsDiv.style.display = 'none';
        }

        generateAndShowDocument(id, type);
    };

    window.refreshPrintableDocument = () => {
        const { id, type } = AppState.currentDocumentForPdf;
        generateAndShowDocument(id, type);
    };

    function generateAndShowDocument(id, type) {
        let html = '', title = '';
        const showCosts = getEl('print-option-show-costs').checked;
        const options = { showCosts };

        if (type === 'service') { 
            html = generateServiceReportHtml(id, options); 
            title = `Reporte de Servicio #${id}`;
        } else if (type === 'quote') {
            html = generateQuoteHtml(id);
            title = `Cotización #Q${id}`;
        } else if (type === 'invoice') {
            html = generateInvoiceHtml(id);
            title = `Factura #F${id}`;
        } else if (type === 'payment_note') { 
            html = generatePaymentNoteHtml(id);
            title = `Nota de Pago #${id}`;
        }

        if (!html) { showAlert('No se pudieron generar los datos para el documento.', 'Error'); return; }
        getEl('printable-document-title').textContent = title;
        getEl('printable-document-area').innerHTML = html;
        openModal('printable-document-modal');
    }

    window.downloadDocumentAsPDF = async function downloadDocumentAsPDF() {
        const { type, id } = AppState.currentDocumentForPdf;
        // Seleccionar directamente la hoja A4, no el contenedor con scroll
        const reportElement = getEl('printable-document-area').querySelector('.report-sheet');
        if (!reportElement) return;

        const downloadButton = getEl('printable-document-modal').querySelector('.cta-button');
        const originalButtonText = downloadButton.textContent;
        downloadButton.textContent = 'Generando...';
        downloadButton.disabled = true;

        document.body.classList.add('pdf-generating');

        try {
            const { jsPDF } = window.jspdf;
            
            // Asegurar que todas las imágenes estén cargadas antes de capturar
            const images = Array.from(reportElement.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            const canvas = await html2canvas(reportElement, {
                scale: 2, // Calidad alta (2x)
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff', // Fondo blanco para la hoja
                windowWidth: 1600, // Simular pantalla ancha para evitar estilos móviles
                onclone: (clonedDoc) => {
                    clonedDoc.body.classList.remove('pdf-generating');
                    const clonedSheet = clonedDoc.querySelector('.report-sheet');
                    if (clonedSheet) {
                        // Asegurar dimensiones A4 exactas en la captura
                        clonedSheet.style.width = '210mm';
                        clonedSheet.style.minHeight = '297mm';
                        clonedSheet.style.margin = '0';
                        clonedSheet.style.boxShadow = 'none';
                        // Forzar fondo blanco
                        clonedSheet.style.backgroundColor = '#ffffff';
                    }
                }
            });

            // USAR JPEG para optimizar tamaño
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            // Crear PDF A4
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
            const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
            const margin = 0; // Sin márgenes adicionales (la hoja ya tiene padding de 15mm)
            
            // Ajustar imagen al ancho total de la página PDF
            const imgWidth = pageWidth; 
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            // Primera página
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Páginas adicionales si es necesario
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            const filename = `${type}-${id || 'pesty'}.pdf`;
            pdf.save(filename);

        } catch (err) {
            console.error("Error al generar PDF:", err);
            showAlert("Hubo un error al generar el PDF: " + err.message, "Error de PDF");
        } finally {
            document.body.classList.remove('pdf-generating');
            downloadButton.textContent = originalButtonText;
            downloadButton.disabled = false;
        }
    };
    
const getFullImagePath = (path) => {
if (!path || path.startsWith('data:image')) {
    return path;
}

// Si ya es una URL completa, convertirla a relativa
if (path.startsWith('http')) {
    // Extraer solo la parte de la ruta después del dominio
    try {
        const url = new URL(path);
        return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    } catch (e) {
        return path;
    }
}


if (path.startsWith('api/uploads/')) {
    return path;
}

// Para archivos subidos (que están en uploads/), usar api/uploads/
if (path.startsWith('uploads/')) {
    return `api/${path}`;
}

// Para otros archivos, usar la ruta de la API
const apiBase = AppState.apiBaseUrl || 'api/';

// Usar ruta relativa en lugar de absoluta
const relativePath = `${apiBase}${path}`;

// Reemplazamos dobles barras que podrían ocurrir
return relativePath.replace(/\/\/+/g, "/");
};
window.getFullImagePath = getFullImagePath;
    function generateServiceReportHtml(id, options = {}) {
        const service = AppState.db.services.find(s => s.id == id);
        let reportData = service ? service.report_data : null;
        if (typeof reportData === 'string' && reportData) { try { reportData = JSON.parse(reportData); } catch (e) { reportData = null; } }
        if (!service || !reportData) return null;
        
        const client = AppState.db.clients.find(c => c.id == service.client_id);
        const isHotel = client && client.type === 'Hotel';
        const isCasino = client && client.type === 'Casino';
        const isMaquiladora = client && client.type === 'Maquiladora';
        const isAlmacen = client && (client.type === 'Almacén' || client.type === 'Almacen');
        const isLocal = client && client.type === 'Negocio Local';
        const technician = AppState.db.technicians.find(t => t.id == service.technician_id);
        const settings = AppState.currentUser;
        const logoUrl = getFullImagePath(settings.logo_url);
        const report = reportData;

        // Calcular dirección del servicio (Sucursal o Principal)
        let serviceAddress = client ? client.address : 'N/A';
        if (service.client_site_id) {
            const site = AppState.db.client_sites.find(s => s.id == service.client_site_id);
            if (site) {
                serviceAddress = `${site.name} - ${site.address}`;
            }
        }

        // --- Generar HTML de Químicos ---
        let chemicalsHtml = '';
        if (report.chemicals && Array.isArray(report.chemicals) && report.chemicals.length > 0) {
            const showCosts = options && options.showCosts;
            
            let tableHeader = '<thead><tr><th>Químico</th><th class="text-right">Cantidad</th>';
            if (showCosts) {
                tableHeader += '<th class="text-right">Costo</th>';
            }
            tableHeader += '</tr></thead>';
            
            let tableBody = '<tbody>';
            let totalCost = 0;
            
            report.chemicals.forEach(chem => {
                // Support both formats (saved in DB vs temp object)
                const name = chem.name || chem.chemical_name || 'Químico';
                const qty = chem.quantity || 0;
                const unit = chem.unit || 'ml';

                let details = `${name}`;
                if (chem.active_ingredient) details += ` | Ingrediente: ${chem.active_ingredient}`;
                if (chem.rsco) details += ` | Registro: ${chem.rsco}`;
                if (chem.batch_number) details += ` | Lote: ${chem.batch_number}`;
                if (chem.expiration_date) {
                    const date = new Date(chem.expiration_date + 'T00:00:00');
                    const options = { year: 'numeric', month: 'short' };
                    const formattedDate = date.toLocaleDateString('es-ES', options);
                    const finalDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
                    details += ` (Cad: ${finalDate})`;
                }
                
                tableBody += `<tr>
                    <td>${details}</td>
                    <td class="text-right">${qty} ${unit}</td>`;
                
                if (showCosts) {
                    const cost = parseFloat(chem.cost_calculated || chem.cost_at_time || 0);
                    totalCost += cost;
                    tableBody += `<td class="text-right">$${cost.toFixed(2)}</td>`;
                }
                
                tableBody += '</tr>';
            });
            
            if (showCosts) {
                tableBody += `<tr>
                    <td colspan="2" class="text-right" style="font-weight:bold;">Total:</td>
                    <td class="text-right" style="font-weight:bold;">$${totalCost.toFixed(2)}</td>
                </tr>`;
            }
            
            tableBody += '</tbody>';
            
            chemicalsHtml = `
                <div class="report-section">
                    <div class="section-title">
                        <h2>Uso de Químicos</h2>
                        <div class="underline"></div>
                    </div>
                    <div style="display:block;">
                        <table class="report-items-table">
                            ${tableHeader}
                            ${tableBody}
                        </table>
                    </div>
                </div>
            `;
        }
        // --------------------------------

        const techSignaturePath = getFullImagePath(report.techSignature);
        const clientSignaturePath = getFullImagePath(report.clientSignature);
        const techSignatureHtml = techSignaturePath ? `<img src="${techSignaturePath}" alt="Firma Técnico" class="signature-img">` : `<span>(Sin firma)</span>`;
        const clientSignatureHtml = clientSignaturePath ? `<img src="${clientSignaturePath}" alt="Firma Cliente" class="signature-img">` : `<span>(Sin firma)</span>`;
        
        // Mostrar fotos separadas por tipo si están disponibles
        let photosBeforeHtml = '';
        let photosAfterHtml = '';
        if (report.photos_before && Array.isArray(report.photos_before) && report.photos_before.length > 0) {
            photosBeforeHtml = `<div class="report-section"><div class="section-title"><h2>Fotos Antes del Servicio</h2><div class="underline"></div></div><div class="report-photos-grid">${report.photos_before.map(p => `<img src="${getFullImagePath(p)}" alt="Antes del servicio" class="evidence-img">`).join('')}</div></div>`;
        }
        if (report.photos_after && Array.isArray(report.photos_after) && report.photos_after.length > 0) {
            photosAfterHtml = `<div class="report-section"><div class="section-title"><h2>Fotos Después del Servicio</h2><div class="underline"></div></div><div class="report-photos-grid">${report.photos_after.map(p => `<img src="${getFullImagePath(p)}" alt="Después del servicio" class="evidence-img">`).join('')}</div></div>`;
        }
        
        let warrantyHtml = 'No aplica';
        if (report.appliesWarranty === 'si') { warrantyHtml = `Sí, con una duración de <strong>${report.warrantyDuration}</strong>.`; }

        // Preparar información de próximo refuerzo
        let reinforcementHtml = '';
        if (service.reinforcement_days) {
             const nextDate = new Date(service.service_date);
             // Corregir zona horaria al crear la fecha desde string
             const userTimezoneOffset = nextDate.getTimezoneOffset() * 60000;
             const serviceDateCorrected = new Date(nextDate.getTime() + userTimezoneOffset);
             
             // Sumar días de refuerzo
             serviceDateCorrected.setDate(serviceDateCorrected.getDate() + parseInt(service.reinforcement_days));
             
             const nextDateStr = serviceDateCorrected.toLocaleDateString('es-ES', { 
                 weekday: 'long', 
                 year: 'numeric', 
                 month: 'long', 
                 day: 'numeric' 
             });
             
             reinforcementHtml = `
                <div style="display:flex; gap:12px; align-items:flex-start;">
                    <div style="flex:1;">
                        <div class="info-label">Garantía del servicio</div>
                        <div class="info-value">${warrantyHtml}</div>
                    </div>
                    <div style="flex:1;">
                        <div style="background-color: rgba(52, 211, 153, 0.1); padding: 12px; border-radius: 8px; border:1px dashed var(--accent-primary);">
                            <div style="font-weight:700; color:var(--accent-primary); margin-bottom:4px;">Próximo refuerzo</div>
                            <div style="color:#4b5563; font-size:0.9rem;">
                                ${service.reinforcement_days} días<br/>
                                ${nextDateStr}
                            </div>
                        </div>
                    </div>
                </div>
             `;
        } else {
             reinforcementHtml = `
                <div style="flex:1;">
                    <div class="info-label">Garantía del servicio</div>
                    <div class="info-value">${warrantyHtml}</div>
                </div>
             `;
        }

        const companyName = settings.name || 'tu compañía de confianza';
        const footerText = settings.report_footer_text || `Gracias por confiar en ${companyName}.`;
        
        // Generar folio personalizado con iniciales de la empresa
        const companyInitials = companyName.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 3) || 'PST';
        const formattedFolio = `${companyInitials}-${service.id.toString().padStart(4, '0')}`;
        
        // Mostrar las recomendaciones completas
        const recommendations = report.recommendations || 'Ninguna.';
        const safetyRecommendations = report.safetyRecommendations || '';
        
        // Función para formatear recomendaciones
        function formatRecommendations(text, type) {
            if (!text || !text.trim()) {
                return `<div style="background-color: #fef2f2; border:1px solid #fecaca; border-radius: 8px; padding:16px;">
                    <div style="font-weight:700; color:#dc2626; text-align:center; margin-bottom:12px;">Recomendaciones de Seguridad</div>
                    <div style="color:#7f1d1d; line-height:1.6; font-size:0.95rem;"></div>
                </div>`;
            }
            
            // Dividir el texto en líneas y formatear cada una
            const lines = text.split('\n').filter(line => line.trim());
            const formattedLines = lines.map(line => {
                // Remover numeración si existe (1.-, 2.-, etc.)
                const cleanLine = line.replace(/^\d+\.?-?\s*/, '').trim();
                return cleanLine ? `<p>${cleanLine}</p>` : '';
            }).filter(line => line).join('');
            
            return `<div style="background-color: #fef2f2; border:1px solid #fecaca; border-radius: 8px; padding:16px;">
                <div style="font-weight:700; color:#dc2626; text-align:center; margin-bottom:12px;">Recomendaciones de Seguridad</div>
                <div style="color:#7f1d1d; line-height:1.6; font-size:0.95rem;">${formattedLines}</div>
            </div>`;
        }
        
        const formattedSafetyRecommendations = formatRecommendations(safetyRecommendations, 'safety');

        // Helper function to get data based on client type
        function getReportData(key) {
            if (isLocal) return report[`local${key.charAt(0).toUpperCase()}${key.slice(1)}`] || report[key];
            if (isHotel) return report[`hotel${key.charAt(0).toUpperCase()}${key.slice(1)}`] || report[key];
            if (isCasino) return report[`casino${key.charAt(0).toUpperCase()}${key.slice(1)}`] || report[key];
            if (isMaquiladora) return report[`maquiladora${key.charAt(0).toUpperCase()}${key.slice(1)}`] || report[key];
            if (isAlmacen) return report[`almacen${key.charAt(0).toUpperCase()}${key.slice(1)}`] || report[key];
            return report[key];
        }

        const areasInspectadas = getReportData('areas') || getReportData('affectedAreas') || 'No especificado';
        const metodoInspeccion = getReportData('inspectionMethods') || getReportData('inspectionMethod') || 'Inspección Visual';
        const detalleActividad = getReportData('activityDetail') || getReportData('roomActivity') || '';
        const plagasDetectadas = getReportData('pests') || getReportData('detectedPests') || 'Ninguna';
        const nivelInfestacion = getReportData('infestationLevel') || 'Nulo';
        const tipoTratamiento = getReportData('treatmentType') || 'No especificado';
        const motivoTratamiento = getReportData('treatmentReason') || '';
        const metodosAplicacion = getReportData('methods') || getReportData('treatmentMethod') || 'Ninguno';
        const condicionesDetectadas = getReportData('conditions') || 'Ninguna';
        const riesgosSanitarios = getReportData('sanitaryRisks') || 'Ninguno';
        const accionesRecomendadas = getReportData('recommendations') || 'Ninguna';
        const observacionesLimpieza = getReportData('housekeeping') || 'Ninguna';
        const mantenimiento = getReportData('maintenance') || 'Ninguno';

        let notasServicioHtml = '';
        if (service.notes) {
            notasServicioHtml = `
                <div class="report-section">
                    <div class="section-title">
                        <h2>Notas del Servicio</h2>
                        <div class="underline"></div>
                    </div>
                    <div class="info-box">
                        <div class="info-value">${service.notes.replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
            `;
        } else if (report.isRefuerzo) {
            const refuerzoNote = `Servicio de refuerzo basado en el servicio #${report.originalServiceId || 'undefined'}. Notas originales: ${report.originalNotes || ''}`;
            notasServicioHtml = `
                <div class="report-section">
                    <div class="section-title">
                        <h2>Notas del Servicio</h2>
                        <div class="underline"></div>
                    </div>
                    <div class="info-box">
                        <div class="info-value">${refuerzoNote}</div>
                    </div>
                </div>
            `;
        }

        return `<div class="report-sheet-container" style="--report-logo-url: url('${logoUrl}')">
            <div class="report-sheet">
                <div class="report-header">
                    <div class="report-header-info">
                        <h1>Reporte de Servicio</h1>
                        <span>Folio: #${formattedFolio}</span>
                        ${settings.sanitary_license ? `<span>Licencia Sanitaria: ${settings.sanitary_license}</span>` : ''}
                        <span class="powered-by">Powered By Pesty Software</span>
                    </div>
                    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="report-logo">` : ''}
                </div>
                <div class="divider"></div>
                
                <div class="report-section">
                    <div class="section-title">
                        <h2>Datos del Cliente y Servicio</h2>
                        <div class="underline"></div>
                    </div>
                    <div class="info-box">
                        <div class="info-grid-2">
                            <div>
                                <div class="info-label">Cliente</div>
                                <div class="info-value">${client ? client.full_name : 'N/A'}</div>
                            </div>
                            <div>
                                <div class="info-label">Fecha</div>
                                <div class="info-value">${formatDate(service.service_date)}</div>
                            </div>
                        </div>
                        <div style="margin-top:12px;">
                            <div class="info-label">Dirección</div>
                            <div class="info-value">${serviceAddress}</div>
                        </div>
                        <div class="info-grid-2" style="margin-top:12px;">
                            <div>
                                <div class="info-label">Contacto en Sitio</div>
                                <div class="info-value">${report.clientContact || 'N/A'}</div>
                            </div>
                            <div>
                                <div class="info-label">Técnico</div>
                                <div class="info-value">${technician ? technician.name : 'N/A'}</div>
                            </div>
                        </div>
                        <div style="margin-top:12px;">
                            <div class="info-label">Duración del Servicio</div>
                            <div class="info-value">${report.serviceDuration || 'N/A'} minutos</div>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <div class="section-title">
                        <h2>3. Diagnóstico Negocio Local</h2>
                        <div class="underline"></div>
                    </div>
                    <div class="info-box">
                        <div class="info-label">Áreas Inspeccionadas</div>
                        <div class="info-value">${areasInspectadas}</div>
                    </div>
                    <div class="info-grid-2" style="margin-top:12px;">
                        <div class="info-box">
                            <div class="info-label">Método de Inspección</div>
                            <div class="info-value">${metodoInspeccion}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">Detalle de Actividad</div>
                            <div class="info-value">${detalleActividad || 'Sin actividad inusual'}</div>
                        </div>
                    </div>
                    <div class="info-grid-2" style="margin-top:12px;">
                        <div class="info-box">
                            <div class="info-label">Plagas Detectadas</div>
                            <div class="info-value">${plagasDetectadas}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">Nivel de Infestación</div>
                            <div class="info-value">${nivelInfestacion}</div>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <div class="section-title">
                        <h2>4. Estrategia de Control</h2>
                        <div class="underline"></div>
                    </div>
                    <div class="info-grid-3">
                        <div class="info-box">
                            <div class="info-label">Tipo de Tratamiento</div>
                            <div class="info-value">${tipoTratamiento}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">Motivo del Tratamiento</div>
                            <div class="info-value">${motivoTratamiento || 'No especificado'}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">Métodos de Aplicación</div>
                            <div class="info-value">${metodosAplicacion}</div>
                        </div>
                    </div>
                </div>

                ${chemicalsHtml}

                <div class="report-section">
                    <div class="section-title">
                        <h2>7. Evidencia y Observaciones</h2>
                        <div class="underline"></div>
                    </div>
                    <div class="info-grid-2">
                        <div class="info-box">
                            <div class="info-label">Condiciones Detectadas</div>
                            <div class="info-value">${condicionesDetectadas}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">Riesgos Sanitarios Observados</div>
                            <div class="info-value">${riesgosSanitarios}</div>
                        </div>
                    </div>
                    <div class="info-grid-2" style="margin-top:12px;">
                        <div class="info-box">
                            <div class="info-label">Acciones Recomendadas</div>
                            <div class="info-value">${accionesRecomendadas}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">Observaciones de Limpieza</div>
                            <div class="info-value">${observacionesLimpieza}</div>
                        </div>
                    </div>
                    <div style="margin-top:12px;">
                        <div class="info-box">
                            <div class="info-label">Mantenimiento</div>
                            <div class="info-value">${mantenimiento}</div>
                        </div>
                    </div>
                </div>

                ${notasServicioHtml}

                <div class="report-section">
                    <div class="section-title">
                        <h2>Garantía y Seguimiento</h2>
                        <div class="underline"></div>
                    </div>
                    <div class="info-box">
                        ${reinforcementHtml}
                    </div>
                </div>

                <div class="report-section">
                    <div class="section-title">
                        <h2>Recomendaciones</h2>
                        <div class="underline"></div>
                    </div>
                    ${formattedSafetyRecommendations}
                </div>

                ${photosAfterHtml}
                ${photosBeforeHtml}
                
                <div class="report-section">
                    <div class="section-title">
                        <h2>Firma de Conformidad</h2>
                        <div class="underline"></div>
                    </div>
                    <div class="info-grid-2">
                        <div style="text-align:center;">
                            <div class="signature-box">${techSignatureHtml}</div>
                            <div style="margin-top:8px; font-weight:600; color:#374151;">Firma del Técnico</div>
                        </div>
                        <div style="text-align:center;">
                            <div class="signature-box">${clientSignatureHtml}</div>
                            <div style="margin-top:8px; font-weight:600; color:#374151;">Firma del Cliente</div>
                        </div>
                    </div>
                </div>
                
                <div class="report-footer">${footerText}</div>
            </div>
        </div>`;
    }








    
    // Functions related to expenses module have been moved to modulos/expenses/script.js
    // to prevent overwriting the modular logic.

    


    function createCustomSelect(selectElement) {
        const container = selectElement.parentElement;
        if (container.querySelector('.custom-select-container')) {
            container.querySelector('.custom-select-container').remove();
        }
        selectElement.style.display = 'none';

        const customSelect = document.createElement('div');
        customSelect.className = 'custom-select-container';
        
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.tabIndex = 0;
        
        const optionsWrapper = document.createElement('div');
        optionsWrapper.className = 'custom-options';

        let anySelected = false;
        Array.from(selectElement.options).forEach(option => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-option';
            customOption.textContent = option.textContent;
            customOption.dataset.value = option.value;
            if (option.selected) {
                trigger.textContent = option.textContent;
                customOption.classList.add('selected');
                anySelected = true;
            }
            customOption.addEventListener('click', () => {
                trigger.textContent = customOption.textContent;
                selectElement.value = customOption.dataset.value;
                selectElement.dispatchEvent(new Event('change'));
                container.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                customOption.classList.add('selected');
                customSelect.classList.remove('active');
            });
            optionsWrapper.appendChild(customOption);
        });
        if (!anySelected && selectElement.options.length > 0) {
            trigger.textContent = selectElement.options[0].textContent;
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-container.active').forEach(c => {
                if (c !== customSelect) {
                    c.classList.remove('active');
                    const fg = c.closest('.form-group');
                    if (fg) fg.classList.remove('active-select');
                }
            });
            const isActive = customSelect.classList.toggle('active');
            const fg = selectElement.closest('.form-group');
            if (fg) {
                if (isActive) fg.classList.add('active-select');
                else fg.classList.remove('active-select');
            }
        });
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                trigger.click();
            }
        });
        
        customSelect.appendChild(trigger);
        customSelect.appendChild(optionsWrapper);
        selectElement.after(customSelect);
    }

    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-select-container').forEach(container => {
            if (!container.contains(e.target)) {
                container.classList.remove('active');
                const fg = container.closest('.form-group');
                if (fg) fg.classList.remove('active-select');
            }
        });
    });
    
    if (!window.__csScrollBound) {
        window.__csScrollBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.custom-select-container.active').forEach(c => {
                    c.classList.remove('active');
                    const fg = c.closest('.form-group');
                    if (fg) fg.classList.remove('active-select');
                });
            }
        });
    }

    async function renderCompaniesView() {
        const moduleCheckboxesHtml = Object.entries(AppState.availableModules)
            .map(([key, name]) => `
                <label class="neon-checkbox-wrapper">
                    <input type="checkbox" name="module" value="${key}">
                    <div class="neon-checkmark">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span class="neon-label">${name}</span>
                </label>
            `)
            .join('');
        getEl('new-company-modules').innerHTML = moduleCheckboxesHtml;

        const result = await apiCall('get_companies.php');
        const tableBody = getEl('companies-table').querySelector('tbody');
        
        if (!result.success) {
            showAlert(result.message || 'No se pudieron cargar las empresas.', 'Error');
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">Error al cargar la lista de empresas.</td></tr>`;
            return;
        }

        const companies = result.companies;
        tableBody.innerHTML = '';

        const planNames = {
            'pesty': 'Plan Pesty',
            'pesty_core': 'Plan Pesty Core',
            'enterprise': 'Plan Empresarial'
        };

        companies.forEach(company => {
            const row = tableBody.insertRow();
            const companyModules = company.module_access?.modules || [];
            const planName = planNames[company.plan] || company.plan || 'N/A';
            
            row.innerHTML = `
                <td>${company.name}</td>
                <td>${company.admin_code}</td>
                <td><span class="status-pill ${company.plan === 'enterprise' ? 'realizado' : (company.plan === 'pesty_core' ? 'pendiente' : 'normal')}">${planName}</span></td>
                <td class="access-modules-cell" data-company-id="${company.id}">
                    ${Object.entries(AppState.availableModules).map(([key, name]) => {
                        const isChecked = companyModules.includes(key) ? 'checked' : '';
                        return `
            <label class="neon-checkbox-wrapper">
                <input type="checkbox" name="module" value="${key}" ${isChecked}>
                <div class="neon-checkmark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 6L9 17L4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <span class="neon-label">${name}</span>
            </label>
        `;
                    }).join('')}
                </td>
            `;
        });

        tableBody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', handleUpdateCompanyAccess);
        });
    }
       
    async function handleSaveCompany() {
        const name = getEl('new-company-name').value;
        const adminCode = getEl('new-company-admin-code').value;
        const plan = getEl('new-company-plan').value;
        const selectedModules = Array.from(getEl('new-company-modules').querySelectorAll('input:checked')).map(cb => cb.value);

        if (!name || !adminCode) {
            showAlert('El nombre y el código de acceso son obligatorios.', 'Datos incompletos');
            return;
        }

        const payload = { name, admin_code: adminCode, plan, module_access: { modules: selectedModules, actions: [] } };
        const result = await apiCall('add_company.php', { method: 'POST', body: JSON.stringify(payload) });

        if (result.success) {
            showAlert(result.message, 'Éxito');
            getEl('add-company-form').reset();
            renderCompaniesView();
        } else {
            showAlert(result.message, 'Error');
        }
    }

    async function handleUpdateCompanyAccess(event) {
        if (!checkPermissions(true)) return;
        const cell = event.target.closest('.access-modules-cell');
        const companyId = cell.dataset.companyId;
        const selectedModules = Array.from(cell.querySelectorAll('input:checked')).map(cb => cb.value);

        const payload = { company_id: companyId, module_access: { modules: selectedModules, actions: [] } };
        const result = await apiCall('update_company_access.php', { method: 'POST', body: JSON.stringify(payload) });

        if (!result.success) {
            showAlert(result.message, 'Error al actualizar');
            event.target.checked = !event.target.checked;
        }
    }

    // Settings logic moved to modulos/config/script.js


    window.reScheduleService = (serviceId) => {
        if (!checkPermissions(true)) return;
        const serviceToReschedule = AppState.db.services.find(s => s.id == serviceId);
        if (serviceToReschedule) {
            closeModal('client-details-modal');
            const reschedulePayload = { ...serviceToReschedule };
            delete reschedulePayload.id;
            delete reschedulePayload.report_data;
            openServiceModal(null, reschedulePayload);
        } else {
            showAlert('No se encontró el servicio original para reagendar.', 'Error');
        }
    };

    window.showServiceInfoModal = (serviceId) => {
        const service = AppState.db.services.find(s => s.id == serviceId);
        if (!service) return;

        const client = AppState.db.clients.find(c => c.id == service.client_id);
        const tech = AppState.db.technicians.find(t => t.id == service.technician_id);
        let infoAddress = client ? client.address : 'N/A';
        if (service.client_site_id && Array.isArray(AppState.db.client_sites)) {
            const site = AppState.db.client_sites.find(siteItem => siteItem.id == service.client_site_id);
            if (site && site.address) {
                infoAddress = site.address;
            }
        }

        getEl('service-info-client').textContent = client ? client.full_name : 'N/A';
        getEl('service-info-datetime').textContent = `${formatDate(service.service_date)} a las ${formatTime(service.service_time)}`;
        getEl('service-info-address').textContent = infoAddress;
        getEl('service-info-tech').textContent = tech ? tech.name : 'N/A';
        getEl('service-info-status').innerHTML = `<span style="font-weight: bold; color: ${service.status === 'Realizado' ? 'var(--accent-primary)' : service.status === 'Cancelado' ? 'var(--error-color)' : 'var(--accent-secondary)'};">${service.status}</span>`;

        const actionsContainer = getEl('service-info-actions');
        actionsContainer.innerHTML = '';
  
        // Botón de reporte condicional (solo ver, si existe)
        const hasReport = service.report_data && service.report_data !== '{}' && service.report_data !== 'null';
        if (hasReport) {
            actionsContainer.innerHTML += `<button class="action-btn info" onclick="displayPrintableDocument(${service.id}, 'service')">📄 Ver Reporte</button>`;
        }

        if (service.status === 'Pendiente') {
            actionsContainer.innerHTML += `<button class="action-btn" style="background-color: #25D366; border-color: #25D366;" onclick="sendWhatsAppConfirmation(${service.id})">💬 Confirmar</button>`;
        }
        
        openModal('service-info-modal');
    };

    window.sendWhatsAppConfirmation = (serviceId) => {
        const service = AppState.db.services.find(s => s.id == serviceId);
        const client = AppState.db.clients.find(c => c.id == service.client_id);
        const company = AppState.currentUser;

        if (!client || !client.phone) {
            showAlert('El cliente no tiene un número de teléfono registrado.', 'Error');
            return;
        }

        const message = `Hola ${client.full_name}, le recordamos su servicio de fumigación con ${company.name} programado para el día ${formatDate(service.service_date)} a las ${formatTime(service.service_time)}. Por favor, confirme su cita respondiendo a este mensaje. ¡Gracias!`;
        const phone = client.phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/521${phone}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
    };

    window.sendWhatsAppReminder = (reminderId) => {
        if (!checkPermissions(true)) return;
        const reminder = AppState.db.reminders.find(r => r.id == reminderId);
        const company = AppState.currentUser;

        if (!company.contact_phone) {
            showAlert('No hay un número de teléfono de la empresa configurado para enviar el recordatorio.', 'Error');
            return;
        }
        
        const message = `Recordatorio Pesty:\n- ${reminder.text}\n- Fecha: ${formatDate(reminder.date)}`;
        const phone = company.contact_phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/521${phone}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    };





















    // --- QUOTES & INVOICES LOGIC ---



    function renderInvoicesTable() {
        const table = getEl('invoices-table');
        if (!table.querySelector('thead')) {
            table.innerHTML = '<thead><tr><th>Folio</th><th>Cliente</th><th>Fecha Emisión</th><th>Total</th><th>Estado</th><th class="action-cell">Acciones</th></tr></thead><tbody></tbody>';
        }
        const tableBody = table.querySelector('tbody');
        const clientMap = AppState.db.clients.reduce((map, client) => (map[client.id] = client.full_name, map), {});
        const searchTerm = getEl('invoice-search').value.toLowerCase();
        const statusFilter = getEl('invoice-filter-status').value;

        const filteredInvoices = (AppState.db.invoices || []).filter(i => {
            const clientName = clientMap[i.client_id] || '';
            const searchMatch = !searchTerm || clientName.toLowerCase().includes(searchTerm) || i.id.toString().includes(searchTerm);
            const statusMatch = !statusFilter || i.status === statusFilter;
            return searchMatch && statusMatch;
        });

        let html = '';
        filteredInvoices.sort((a, b) => b.id - a.id).forEach(i => {
            html += `<tr>
                <td>#F${i.id}</td>
                <td>${clientMap[i.client_id] || 'N/A'}</td>
                <td>${formatDate(i.issue_date)}</td>
                <td>${formatCurrency(i.total)}</td>
                <td>${i.status}</td>
                <td class="action-cell">
                    <button class="action-btn info" onclick="displayPrintableDocument(${i.id}, 'invoice')">📄 Ver</button>
                    <button class="action-btn" onclick="openInvoiceModal(${i.id})">✏️ Editar</button>
                    <button class="action-btn delete" onclick="deleteInvoice(${i.id})">🗑️ Borrar</button>
                </td>
            </tr>`;
        });
        tableBody.innerHTML = html || '<tr><td colspan="6" style="text-align:center; padding: 20px;">No se encontraron facturas.</td></tr>';
    }

    window.openQuoteModal = (id = null) => {
        if (!checkPermissions(true)) return;
        const form = getEl('quote-form');
        form.reset();
        getEl('quote-id').value = '';
        getEl('quote-line-items').innerHTML = '';
        
        if (id) {
            const quote = AppState.db.quotes.find(q => q.id == id);
            if (!quote) return;
            getEl('quote-modal-title').textContent = `Editar Cotización #Q${id}`;
            getEl('quote-id').value = id;
            getEl('quote-client').value = quote.client_id;
            getEl('quote-status').value = quote.status;
            getEl('quote-issue-date').value = quote.issue_date;
            getEl('quote-due-date').value = quote.due_date;
            getEl('quote-discount').value = quote.discount || 0;
            getEl('quote-notes').value = quote.notes || '';
            const items = typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items;
            items.forEach(item => addDocumentLineItem('quote', item));
        } else {
            getEl('quote-modal-title').textContent = 'Crear Nueva Cotización';
            getEl('quote-issue-date').value = new Date().toISOString().split('T')[0];
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 15);
            getEl('quote-due-date').value = dueDate.toISOString().split('T')[0];
            addDocumentLineItem('quote');
        }
        updateDocumentTotals('quote');
        document.querySelectorAll('#quote-modal [data-custom-select]').forEach(createCustomSelect);
        openModal('quote-modal');
    };

    window.openInvoiceModal = (id = null, quoteData = null) => {
        if (!checkPermissions(true)) return;
        const form = getEl('invoice-form');
        form.reset();
        getEl('invoice-id').value = '';
        getEl('invoice-quote-id').value = '';
        getEl('invoice-line-items').innerHTML = '';

        if (id) {
            const invoice = AppState.db.invoices.find(i => i.id == id);
            if (!invoice) return;
            getEl('invoice-modal-title').textContent = `Editar Factura #F${id}`;
            getEl('invoice-id').value = id;
            getEl('invoice-quote-id').value = invoice.quote_id || '';
            
            // Datos del Receptor
            getEl('invoice-client').value = invoice.client_id;
            getEl('invoice-client-rfc').value = invoice.client_rfc || '';
            getEl('invoice-cfdi-use').value = invoice.cfdi_use || 'G03';
            getEl('invoice-tax-regime').value = invoice.tax_regime || '601';
            
            // Datos de la Factura
            getEl('invoice-issue-date').value = invoice.issue_date;
            getEl('invoice-status').value = invoice.status;
            getEl('invoice-payment-method').value = invoice.payment_method || '99';
            getEl('invoice-payment-form').value = invoice.payment_form || '99';
            
            // Datos del Emisor
            getEl('invoice-issuer-rfc').value = invoice.issuer_rfc || '';
            getEl('invoice-expedition-place').value = invoice.expedition_place || '';
            
            // Información Adicional
            getEl('invoice-currency').value = invoice.currency || 'MXN';
            getEl('invoice-exchange-rate').value = invoice.exchange_rate || '1.00';
            getEl('invoice-notes').value = invoice.notes || '';
            
            const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
            items.forEach(item => addDocumentLineItem('invoice', item));
        } else if (quoteData) {
            getEl('invoice-modal-title').textContent = `Crear Factura desde Cotización #Q${quoteData.id}`;
            getEl('invoice-quote-id').value = quoteData.id;
            getEl('invoice-client').value = quoteData.client_id;
            getEl('invoice-issue-date').value = new Date().toISOString().split('T')[0];
            
            // Valores por defecto para nueva factura desde cotización
            getEl('invoice-cfdi-use').value = 'G03';
            getEl('invoice-tax-regime').value = '601';
            getEl('invoice-payment-method').value = '99';
            getEl('invoice-payment-form').value = '99';
            getEl('invoice-currency').value = 'MXN';
            getEl('invoice-exchange-rate').value = '1.00';
            
            getEl('invoice-notes').value = `Basado en la cotización #Q${quoteData.id}.\n${quoteData.notes || ''}`;
            const items = typeof quoteData.items === 'string' ? JSON.parse(quoteData.items) : quoteData.items;
            items.forEach(item => addDocumentLineItem('invoice', item));
        } else {
            getEl('invoice-modal-title').textContent = 'Crear Nueva Factura';
            getEl('invoice-issue-date').value = new Date().toISOString().split('T')[0];
            
            // Valores por defecto para nueva factura
            getEl('invoice-cfdi-use').value = 'G03';
            getEl('invoice-tax-regime').value = '601';
            getEl('invoice-payment-method').value = '99';
            getEl('invoice-payment-form').value = '99';
            getEl('invoice-currency').value = 'MXN';
            getEl('invoice-exchange-rate').value = '1.00';
            
            addDocumentLineItem('invoice');
        }
        updateDocumentTotals('invoice');
        document.querySelectorAll('#invoice-modal [data-custom-select]').forEach(createCustomSelect);
        openModal('invoice-modal');
    };

    window.addDocumentLineItem = (type, item = {}) => {
        const container = getEl(`${type}-line-items`);
        const row = document.createElement('div');
        row.className = 'line-item-row';
        row.innerHTML = `
            <input type="text" placeholder="Descripción del servicio o producto" value="${item.description || ''}" class="line-item-description">
            <input type="number" value="${item.quantity || 1}" min="0" step="1" class="line-item-quantity">
            <input type="number" value="${item.price || 0}" min="0" step="0.01" class="line-item-price">
            <div class="line-item-total">${formatCurrency((item.quantity || 1) * (item.price || 0))}</div>
            <button type="button" class="action-btn delete" onclick="this.parentElement.remove(); updateDocumentTotals('${type}')">×</button>
        `;
        container.appendChild(row);
        row.querySelectorAll('input').forEach(input => input.addEventListener('input', () => updateDocumentTotals(type)));
    };

    window.updateDocumentTotals = (type) => {
        let subtotal = 0;
        getEl(`${type}-line-items`).querySelectorAll('.line-item-row').forEach(row => {
            const quantity = parseFloat(row.querySelector('.line-item-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.line-item-price').value) || 0;
            const total = quantity * price;
            row.querySelector('.line-item-total').textContent = formatCurrency(total);
            subtotal += total;
        });

        if (type === 'quote') {
            const discount = parseFloat(getEl('quote-discount').value) || 0;
            const total = subtotal - discount;
            getEl('quote-subtotal').textContent = formatCurrency(subtotal);
            getEl('quote-total').textContent = formatCurrency(total);
        } else if (type === 'invoice') {
            const tax = subtotal * 0.16;
            const total = subtotal + tax;
            getEl('invoice-subtotal').textContent = formatCurrency(subtotal);
            getEl('invoice-tax').textContent = formatCurrency(tax);
            getEl('invoice-total').textContent = formatCurrency(total);
        }
    };



    async function handleSaveQuote() {
        const id = getEl('quote-id').value;
        const items = Array.from(getEl('quote-line-items').querySelectorAll('.line-item-row')).map(row => ({
            description: row.querySelector('.line-item-description').value,
            quantity: parseFloat(row.querySelector('.line-item-quantity').value),
            price: parseFloat(row.querySelector('.line-item-price').value)
        }));
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const discount = parseFloat(getEl('quote-discount').value) || 0;

        const payload = {
            id: id || null,
            company_id: AppState.currentUser.companyId,
            client_id: getEl('quote-client').value,
            issue_date: getEl('quote-issue-date').value,
            due_date: getEl('quote-due-date').value,
            items: items,
            subtotal: subtotal,
            discount: discount,
            total: subtotal - discount,
            status: getEl('quote-status').value,
            notes: getEl('quote-notes').value
        };
        
        const endpoint = id ? 'edit_quote.php' : 'add_quote.php';
        const result = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(payload) });
        if (result.success) {
            await refreshAllDataAndViews();
            closeModal('quote-modal');
        } else {
            showAlert(result.message, 'Error');
        }
    }

    async function handleSaveInvoice() {
        const id = getEl('invoice-id').value;
        const items = Array.from(getEl('invoice-line-items').querySelectorAll('.line-item-row')).map(row => ({
            description: row.querySelector('.line-item-description').value,
            quantity: parseFloat(row.querySelector('.line-item-quantity').value),
            price: parseFloat(row.querySelector('.line-item-price').value)
        }));
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const tax = subtotal * 0.16;

        const payload = {
            id: id || null,
            company_id: AppState.currentUser.companyId,
            
            // Datos del Receptor
            client_id: getEl('invoice-client').value,
            client_rfc: getEl('invoice-client-rfc').value,
            cfdi_use: getEl('invoice-cfdi-use').value,
            tax_regime: getEl('invoice-tax-regime').value,
            
            // Datos de la Factura
            quote_id: getEl('invoice-quote-id').value || null,
            issue_date: getEl('invoice-issue-date').value,
            status: getEl('invoice-status').value,
            payment_method: getEl('invoice-payment-method').value,
            payment_form: getEl('invoice-payment-form').value,
            
            // Datos del Emisor
            issuer_rfc: getEl('invoice-issuer-rfc').value,
            expedition_place: getEl('invoice-expedition-place').value,
            
            // Información Adicional
            currency: getEl('invoice-currency').value,
            exchange_rate: parseFloat(getEl('invoice-exchange-rate').value) || 1.00,
            notes: getEl('invoice-notes').value,
            
            // Conceptos y totales
            items: items,
            subtotal: subtotal,
            tax: tax,
            total: subtotal + tax
        };
        
        const endpoint = id ? 'edit_invoice.php' : 'add_invoice.php';
        const result = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(payload) });
        if (result.success) {
            await refreshAllDataAndViews();
            closeModal('invoice-modal');
        } else {
            showAlert(result.message, 'Error');
        }
    }



    window.deleteInvoice = async (id) => {
        if (!checkPermissions(true)) return;
        showConfirm('¿Seguro que quieres eliminar esta factura?', 'Confirmar Eliminación', async (confirmed) => {
            if (confirmed) {
                const result = await apiCall(`delete_invoice.php?id=${id}`, { method: 'GET' });
                if (result.success) await refreshAllDataAndViews();
                else showAlert(result.message, 'Error');
            }
        });
    };
    
    window.convertQuoteToInvoice = (quoteId) => {
        const quote = AppState.db.quotes.find(q => q.id == quoteId);
        if (quote) {
            openInvoiceModal(null, quote);
        }
    };

    function generateQuoteHtml(id) {
        const quote = AppState.db.quotes.find(q => q.id == id);
        if (!quote) return null;
        return generateDocumentHtml(quote, 'quote');
    }

    function generateInvoiceHtml(id) {
        const invoice = AppState.db.invoices.find(i => i.id == id);
        if (!invoice) return null;
        return generateDocumentHtml(invoice, 'invoice');
    }

    function generateDocumentHtml(doc, type) {
        const client = AppState.db.clients.find(c => c.id == doc.client_id);
        const settings = AppState.currentUser;
        const logoUrl = getFullImagePath(settings.logo_url);
        const items = typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items;
        
        const docTitle = type === 'quote' ? 'Cotización' : 'Factura';
        const docPrefix = type === 'quote' ? 'Q' : 'F';

        let totalsHtml = `
            <tr><td class="text-right"><strong>Subtotal:</strong></td><td class="text-right">${formatCurrency(doc.subtotal)}</td></tr>
        `;
        if (type === 'quote') {
            totalsHtml += `<tr><td class="text-right"><strong>Descuento:</strong></td><td class="text-right">-${formatCurrency(doc.discount)}</td></tr>`;
        } else {
            totalsHtml += `<tr><td class="text-right"><strong>IVA (16%):</strong></td><td class="text-right">${formatCurrency(doc.tax)}</td></tr>`;
        }
        totalsHtml += `<tr class="grand-total"><td class="text-right"><strong>Total:</strong></td><td class="text-right">${formatCurrency(doc.total)}</td></tr>`;

        // Formato específico para facturas mexicanas
        if (type === 'invoice') {
            return `<div class="report-sheet-container" style="--report-logo-url: url('${logoUrl}')">
                <div class="report-sheet">
                    <div class="report-header">
                        <div class="report-header-info">
                            <h1>FACTURA</h1>
                            <span>Folio: #F${doc.id}</span>
                            <span style="font-size: 0.6em; display: block; margin-top: 2px; color: #999;">Powered By Pesty Software</span>
                        </div>
                        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="report-logo">` : ''}
                    </div>
                    
                    <!-- Datos del Emisor -->
                    <div class="report-section">
                        <div class="section-title"><h2>Datos del Emisor</h2></div>
                        <div class="section-content">
                            <div><strong>Razón Social:</strong> <span>${settings.company_name || 'N/A'}</span></div>
                            <div><strong>RFC:</strong> <span>${doc.issuer_rfc || 'N/A'}</span></div>
                            <div class="full-span"><strong>Lugar de Expedición:</strong> <span>${doc.expedition_place || 'N/A'}</span></div>
                        </div>
                    </div>
                    
                    <!-- Datos del Receptor -->
                    <div class="report-section">
                        <div class="section-title"><h2>Datos del Receptor</h2></div>
                        <div class="section-content">
                            <div><strong>Nombre/Razón Social:</strong> <span>${client ? client.full_name : 'N/A'}</span></div>
                            <div><strong>RFC:</strong> <span>${doc.client_rfc || 'N/A'}</span></div>
                            <div><strong>Uso del CFDI:</strong> <span>${doc.cfdi_use || 'N/A'}</span></div>
                            <div><strong>Régimen Fiscal:</strong> <span>${doc.tax_regime || 'N/A'}</span></div>
                            <div class="full-span"><strong>Dirección:</strong> <span>${client ? client.address : 'N/A'}</span></div>
                        </div>
                    </div>
                    
                    <!-- Datos de la Factura -->
                    <div class="report-section">
                        <div class="section-title"><h2>Datos de la Factura</h2></div>
                        <div class="section-content">
                            <div><strong>Fecha de Emisión:</strong> <span>${formatDate(doc.issue_date)}</span></div>
                            <div><strong>Estado:</strong> <span>${doc.status}</span></div>
                            <div><strong>Método de Pago:</strong> <span>${doc.payment_method || 'N/A'}</span></div>
                            <div><strong>Forma de Pago:</strong> <span>${doc.payment_form || 'N/A'}</span></div>
                            <div><strong>Moneda:</strong> <span>${doc.currency || 'MXN'}</span></div>
                            <div><strong>Tipo de Cambio:</strong> <span>${doc.exchange_rate || '1.00'}</span></div>
                        </div>
                    </div>
                    
                    <!-- Conceptos -->
                    <div class="report-section">
                        <div class="section-title"><h2>Conceptos</h2></div>
                        <table class="report-items-table">
                            <thead><tr><th>Descripción</th><th class="text-right">Cantidad</th><th class="text-right">Precio Unit.</th><th class="text-right">Importe</th></tr></thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td>${item.description}</td>
                                        <td class="text-right">${item.quantity}</td>
                                        <td class="text-right">${formatCurrency(item.price)}</td>
                                        <td class="text-right">${formatCurrency(item.quantity * item.price)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="report-totals">
                            <table><tbody>${totalsHtml}</tbody></table>
                        </div>
                    </div>
                    
                    <div style="clear:both;"></div>
                    <div class="report-section">
                        <div class="section-title"><h2>Observaciones</h2></div>
                        <p>${(doc.notes || 'Sin observaciones adicionales.').replace(/\n/g, '<br>')}</p>
                    </div>
                    <div class="report-footer">${settings.report_footer_text || `Gracias por su preferencia.`}</div>
                </div>
            </div>`;
        }
        
        // Formato para cotizaciones (sin cambios)
        return `<div class="report-sheet-container" style="--report-logo-url: url('${logoUrl}')">
            <div class="report-sheet">
                <div class="report-header">
                    <div class="report-header-info">
                        <h1>${docTitle}</h1>
                        <span>Folio: #${docPrefix}${doc.id}</span>
                        <span style="font-size: 0.6em; display: block; margin-top: 2px; color: #999;">Powered By Pesty Software</span>
                    </div>
                    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="report-logo">` : ''}
                </div>
                <div class="report-meta">
                    <div><strong>Fecha de Emisión:</strong> ${formatDate(doc.issue_date)}</div>
                    ${type === 'quote' ? `<div><strong>Válido hasta:</strong> ${formatDate(doc.due_date)}</div>` : ''}
                    <div><strong>Estado:</strong> ${doc.status}</div>
                </div>
                <div class="report-section">
                    <div class="section-title"><h2>Cliente</h2></div>
                    <div class="section-content">
                        <div><strong>Nombre:</strong> <span>${client ? client.full_name : 'N/A'}</span></div>
                        <div><strong>Teléfono:</strong> <span>${client ? client.phone : 'N/A'}</span></div>
                        <div class="full-span"><strong>Dirección:</strong> <span>${client ? client.address : 'N/A'}</span></div>
                    </div>
                </div>
                <div class="report-section">
                    <div class="section-title"><h2>Conceptos</h2></div>
                    <table class="report-items-table">
                        <thead><tr><th>Descripción</th><th class="text-right">Cantidad</th><th class="text-right">Precio Unit.</th><th class="text-right">Importe</th></tr></thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right">${formatCurrency(item.price)}</td>
                                    <td class="text-right">${formatCurrency(item.quantity * item.price)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="report-totals">
                        <table><tbody>${totalsHtml}</tbody></table>
                    </div>
                </div>
                <div style="clear:both;"></div>
                <div class="report-section">
                    <div class="section-title"><h2>Notas</h2></div>
                    <p>${(doc.notes || 'Sin notas adicionales.').replace(/\n/g, '<br>')}</p>
                </div>
                <div class="report-footer">${settings.report_footer_text || `Gracias por su preferencia.`}</div>
            </div>
        </div>`;
    }



    // What's New Panel Functions
    function checkWhatsNewStatus() {
        const whatsNewDismissed = localStorage.getItem('whatsNewDismissed');
        const currentVersion = '2.2'; // Update this when adding new features
        
        if (!whatsNewDismissed || whatsNewDismissed !== currentVersion) {
            // Show the What's New panel
            setTimeout(() => {
                const whatsNewCard = document.getElementById('whats-new-card');
                if (whatsNewCard) {
                    whatsNewCard.style.display = 'block';
                }
            }, 1000); // Show after 1 second delay
        } else {
             const whatsNewCard = document.getElementById('whats-new-card');
             if (whatsNewCard) {
                 whatsNewCard.style.display = 'none';
             }
        }
    }
    
    window.dismissWhatsNew = () => {
        const whatsNewCard = document.getElementById('whats-new-card');
        const currentVersion = '2.2';
        
        if (whatsNewCard) {
            whatsNewCard.style.display = 'none';
            localStorage.setItem('whatsNewDismissed', currentVersion);
        }
    };

    // All mobile functions removed

    // Pricing Modal Functions
    window.showPricingModal = function() {
        console.log('Opening pricing modal...');
        getEl('pricing-modal').classList.add('active');
        // initializePayPalButtons(); // Removido
    };

    window.closePricingModal = function() {
        getEl('pricing-modal').classList.remove('active');
    };

    // PayPal Integration Removida
    
    init();
    
    // Mobile navigation initialization removed
    
    // Check What's New status after initialization
    setTimeout(checkWhatsNewStatus, 2500); // Show after splash screen
    


    // Generar opciones de garantía hasta 50 años
    const warrantyDurationSelect = getEl('report-warranty-duration');
    if (warrantyDurationSelect) {
        warrantyDurationSelect.innerHTML = ''; // Limpiar opciones existentes
        
        // Opciones de Meses (1-11)
        for (let i = 1; i <= 11; i++) {
            const val = `${i} Mes${i > 1 ? 'es' : ''}`;
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            warrantyDurationSelect.appendChild(opt);
        }
        
        // Opciones de Años (1-50)
        for (let i = 1; i <= 50; i++) {
            const val = `${i} Año${i > 1 ? 's' : ''}`;
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            warrantyDurationSelect.appendChild(opt);
        }
        
        // Seleccionar 3 Meses por defecto si existe, o el primero
        warrantyDurationSelect.value = '3 Meses';
    }
    function initCustomDatePicker() {
        const datePicker = getEl('custom-date-picker');
        const dateInput = getEl('service-date');
        const dropdown = getEl('date-picker-dropdown');
        const prevBtn = getEl('prev-month');
        const nextBtn = getEl('next-month');
        const currentMonthSpan = getEl('current-month');
        const calendar = getEl('date-picker-calendar');
        
        if (!datePicker || !dateInput) return;

        let currentDate = new Date();
        let selectedDate = null;
        
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        
        function formatDateForDisplay(date) {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
        
        function formatDateForInput(date) {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${year}-${month}-${day}`;
        }
        
        function renderCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            currentMonthSpan.textContent = `${months[month]} ${year}`;
            
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());
            
            let calendarHTML = '<div class="calendar-grid">';
            
            // Headers
            weekdays.forEach(day => {
                calendarHTML += `<div class="calendar-header">${day}</div>`;
            });
            
            // Days
            const today = new Date();
            for (let i = 0; i < 42; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                
                const isCurrentMonth = date.getMonth() === month;
                const isToday = date.toDateString() === today.toDateString();
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                
                let classes = 'calendar-day';
                if (!isCurrentMonth) classes += ' other-month';
                if (isToday) classes += ' today';
                if (isSelected) classes += ' selected';
                
                calendarHTML += `<div class="${classes}" data-date="${formatDateForInput(date)}">${date.getDate()}</div>`;
            }
            
            calendarHTML += '</div>';
            calendar.innerHTML = calendarHTML;
            
            // Add click events to days
            calendar.querySelectorAll('.calendar-day').forEach(day => {
                day.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent bubbling to datePicker
                    const dateStr = day.dataset.date;
                    selectedDate = new Date(dateStr + 'T00:00:00');
                    dateInput.value = formatDateForDisplay(selectedDate);
                    dateInput.dataset.isoDate = dateStr;
                    dropdown.classList.remove('show');
                    renderCalendar(); // Re-render to show selection
                });
            });
        }
        
        // Check if already initialized to avoid duplicate listeners
        if (!datePicker.dataset.initialized) {
            // Event listeners
            datePicker.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
                if (dropdown.classList.contains('show')) {
                    renderCalendar();
                }
            });
            
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });
            
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!datePicker.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
            
            datePicker.dataset.initialized = 'true';
        }
        
        // Initialize with current date if editing
        if (dateInput.dataset.isoDate) {
            selectedDate = new Date(dateInput.dataset.isoDate + 'T00:00:00');
            currentDate = new Date(selectedDate);
            // Update display to show the selected date
            dateInput.value = formatDateForDisplay(selectedDate);
        }
        // Always render to ensure correct state when reopening
        if (datePicker.dataset.initialized) {
             renderCalendar();
        }
    }

    // Custom Time Picker
    function initCustomTimePicker() {
        const timePicker = document.getElementById('custom-time-picker');
        const timeInput = document.getElementById('service-time');
        const dropdown = document.getElementById('time-picker-dropdown');
        const hourScroll = document.getElementById('hour-scroll');
        const minuteScroll = document.getElementById('minute-scroll');
        const periodScroll = document.getElementById('period-scroll');
        
        if (!timePicker || !timeInput || !dropdown) return;
        
        let selectedHour = 9; // Default to 9 AM
        let selectedMinute = 0;
        let selectedPeriod = 'AM';
        
        // Define updateTimeDisplay first so it can be used
        function updateTimeDisplay() {
            const hour12 = selectedHour.toString().padStart(2, '0');
            const minute = selectedMinute.toString().padStart(2, '0');
            const displayTime = `${hour12}:${minute} ${selectedPeriod}`;
            
            // Convert to 24-hour format for storage
            let hour24 = selectedHour;
            if (selectedPeriod === 'PM' && selectedHour !== 12) {
                hour24 += 12;
            } else if (selectedPeriod === 'AM' && selectedHour === 12) {
                hour24 = 0;
            }
            
            const time24 = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            timeInput.value = displayTime;
            timeInput.dataset.time24 = time24;
        }

        function selectTimeOption(container, value, updateFunc) {
            container.querySelectorAll('.time-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.value == value) {
                    opt.classList.add('selected');
                    opt.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            });
            updateFunc();
        }

        // Only add options and listeners if NOT initialized
        if (!timePicker.dataset.initialized) {
            // Clear existing content to prevent duplication
            hourScroll.innerHTML = '';
            minuteScroll.innerHTML = '';
            periodScroll.innerHTML = '';

            // Generate hour options (1-12)
            for (let i = 1; i <= 12; i++) {
                const option = document.createElement('div');
                option.className = 'time-option';
                option.dataset.value = i;
                option.textContent = i.toString().padStart(2, '0');
                if (i === selectedHour) option.classList.add('selected');
                hourScroll.appendChild(option);
            }
            
            // Generate minute options (00, 15, 30, 45)
            for (let i = 0; i < 60; i += 15) {
                const option = document.createElement('div');
                option.className = 'time-option';
                option.dataset.value = i;
                option.textContent = i.toString().padStart(2, '0');
                if (i === selectedMinute) option.classList.add('selected');
                minuteScroll.appendChild(option);
            }
            
            // Generate period options (AM, PM)
            ['AM', 'PM'].forEach(period => {
                const option = document.createElement('div');
                option.className = 'time-option';
                option.dataset.value = period;
                option.textContent = period;
                if (period === selectedPeriod) option.classList.add('selected');
                periodScroll.appendChild(option);
            });
            
            // Hour selection
            hourScroll.addEventListener('click', (e) => {
                if (e.target.classList.contains('time-option')) {
                    selectedHour = parseInt(e.target.dataset.value);
                    selectTimeOption(hourScroll, selectedHour, updateTimeDisplay);
                }
            });
            
            // Minute selection
            minuteScroll.addEventListener('click', (e) => {
                if (e.target.classList.contains('time-option')) {
                    selectedMinute = parseInt(e.target.dataset.value);
                    selectTimeOption(minuteScroll, selectedMinute, updateTimeDisplay);
                }
            });
            
            // Period selection
            periodScroll.addEventListener('click', (e) => {
                if (e.target.classList.contains('time-option')) {
                    selectedPeriod = e.target.dataset.value;
                    selectTimeOption(periodScroll, selectedPeriod, updateTimeDisplay);
                }
            });
            
            // Show/hide dropdown
            timeInput.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!timePicker.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });

            timePicker.dataset.initialized = 'true';
        }
        
        // Initialize with existing time if editing
        if (timeInput.dataset.time24) {
            const [hours, minutes] = timeInput.dataset.time24.split(':').map(Number);
            selectedMinute = Math.floor(minutes / 15) * 15; // Round to nearest 15-minute interval
            
            if (hours === 0) {
                selectedHour = 12;
                selectedPeriod = 'AM';
            } else if (hours < 12) {
                selectedHour = hours;
                selectedPeriod = 'AM';
            } else if (hours === 12) {
                selectedHour = 12;
                selectedPeriod = 'PM';
            } else {
                selectedHour = hours - 12;
                selectedPeriod = 'PM';
            }
            
            // Update selections after a small delay to ensure elements are rendered
            setTimeout(() => {
                selectTimeOption(hourScroll, selectedHour, () => {});
                selectTimeOption(minuteScroll, selectedMinute, () => {});
                selectTimeOption(periodScroll, selectedPeriod, updateTimeDisplay);
            }, 50);
        } else {
            // Initialize display with default values
            updateTimeDisplay();
        }
    }
    
    // Initialize custom date and time pickers when service modal opens
    const originalOpenServiceModal = window.openServiceModal;
    window.openServiceModal = function(id = null, reScheduleData = null) {
        if (typeof originalOpenServiceModal === 'function') {
            originalOpenServiceModal(id, reScheduleData);
        } else {
            console.error('originalOpenServiceModal is not a function. Check script loading order.');
        }
        
        setTimeout(() => {
            if (typeof initCustomDatePicker === 'function') initCustomDatePicker();
            if (typeof initCustomTimePicker === 'function') initCustomTimePicker();
        }, 150);
    };

    // Función para manejar el modal de bienvenida
    window.showWelcomeModal = () => {
        if (!sessionStorage.getItem('welcomeShown')) {
            const modal = document.getElementById('welcome-modal');
            if (modal) modal.classList.add('active');
            sessionStorage.setItem('welcomeShown', 'true');
        }
    };

    window.closeWelcomeModal = () => {
        const modal = document.getElementById('welcome-modal');
        if (modal) modal.classList.remove('active');
    };

    // Inicializar la aplicación
    init();

    // Configurar listener de registro
    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const companyName = formData.get('company_name');
            const email = formData.get('email');
            const confirmEmail = formData.get('confirm_email');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirm_password');

            if (email !== confirmEmail) {
                if (window.Toast) window.Toast.error('Los correos electrónicos no coinciden');
                else alert('Los correos electrónicos no coinciden');
                return;
            }
            if (password !== confirmPassword) {
                if (window.Toast) window.Toast.error('Las contraseñas no coinciden');
                else alert('Las contraseñas no coinciden');
                return;
            }
            if (password.length < 8) {
                if (window.Toast) window.Toast.error('La contraseña debe tener al menos 8 caracteres');
                else alert('La contraseña debe tener al menos 8 caracteres');
                return;
            }

            const submitBtn = registrationForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando cuenta...';

            try {
                const result = await window.apiCall('register_user.php', {
                    method: 'POST',
                    body: JSON.stringify({
                        company_name: companyName,
                        email: email,
                        password: password
                    })
                });

                if (result.success) {
                    if (window.Toast) window.Toast.success('¡Cuenta creada! Revisa tu correo para el código de acceso.');
                    else alert('¡Cuenta creada! Revisa tu correo para el código de acceso.');
                    window.closeModal('registration-modal');
                    registrationForm.reset();
                    if (result.user) {
                        window.processSuccessfulLogin(result.user);
                    } else {
                        window.showLoginModal();
                    }
                } else {
                    if (window.Toast) window.Toast.error(result.message || 'Error al registrarse');
                    else alert(result.message || 'Error al registrarse');
                }
            } catch (err) {
                console.error(err);
                if (window.Toast) window.Toast.error('Error de conexión');
                else alert('Error de conexión');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
    
    // Mostrar modal de bienvenida si es necesario
    setTimeout(window.showWelcomeModal, 2000);
});

// --- GLOBAL FUNCTIONS ---

window.registerWithGoogle = function() {
    alert('La funcionalidad de registro con Google estará disponible próximamente.');
};

window.openPlansModal = function() {
    const modal = document.getElementById('plans-modal');
    if (modal) {
        const planMap = { pesty: 'PESTY', pesty_core: 'PESTY CORE', enterprise: 'PLAN EMPRESARIAL', trial: 'PRUEBA' };
        const currentPlan = (window.AppState?.currentUser?.plan) || 'trial';
        const titleEl = document.getElementById('plans-modal-title');
        if (titleEl) {
            const planLabel = planMap[currentPlan] || currentPlan.toUpperCase();
            titleEl.textContent = `Nuestros Planes — Actual: ${planLabel}`;
        }
        
        const btnPesty = document.querySelector("button[onclick=\"subscribePlan('pesty')\"]");
        const btnCore = document.querySelector("button[onclick=\"subscribePlan('pesty_core')\"]");
        const btnEnterprise = document.querySelector("button[onclick=\"subscribePlan('enterprise')\"]");

        if (btnPesty) {
            if (currentPlan === 'pesty') {
                btnPesty.textContent = 'Plan activo';
                btnPesty.disabled = true;
            } else {
                btnPesty.textContent = 'Suscribirme a PESTY';
                btnPesty.disabled = false;
            }
        }
        if (btnCore) {
            if (currentPlan === 'pesty_core') {
                btnCore.textContent = 'Plan activo';
                btnCore.disabled = true;
            } else {
                btnCore.textContent = 'Suscribirme a PESTY CORE';
                btnCore.disabled = false;
            }
        }
        if (btnEnterprise) {
            if (currentPlan === 'enterprise') {
                btnEnterprise.textContent = 'Plan activo';
                btnEnterprise.disabled = true;
            } else {
                btnEnterprise.textContent = 'Suscribirme al PLAN EMPRESARIAL';
                btnEnterprise.disabled = false;
            }
        }
        modal.classList.add('active');
    }
};

window.openFeedbackModal = function() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        const form = document.getElementById('feedback-form');
        if (form) form.reset();
        modal.classList.add('active');
    }
};

window.initFeedbackForm = function() {
    const form = document.getElementById('feedback-form');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const type = document.getElementById('feedback-type').value;
        const message = document.getElementById('feedback-message').value.trim();
        const contact = document.getElementById('feedback-contact').value.trim();
        if (!message) {
            if (window.Toast) window.Toast.warning('Por favor escribe tu mensaje.');
            else alert('Por favor escribe tu mensaje.');
            return;
        }
        const payload = {
            type,
            message,
            contact,
            company_id: window.AppState?.currentUser?.companyId || null,
            user_id: window.AppState?.currentUser?.id || null
        };
        try {
            const res = await fetch('api/send_feedback.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                if (window.Toast) window.Toast.success('¡Gracias! Hemos recibido tu mensaje.');
                else alert('¡Gracias! Hemos recibido tu mensaje.');
                const modal = document.getElementById('feedback-modal');
                if (modal && typeof window.closeModal === 'function') window.closeModal('feedback-modal');
            } else {
                if (window.Toast) window.Toast.error(result.message || 'No se pudo enviar tu mensaje.');
                else alert(result.message || 'No se pudo enviar tu mensaje.');
            }
        } catch (err) {
            console.error(err);
            if (window.Toast) window.Toast.error('Error al enviar tu mensaje.');
            else alert('Error al enviar tu mensaje.');
        }
    });
};

// --- END OF FILE v1.7.3 ---
