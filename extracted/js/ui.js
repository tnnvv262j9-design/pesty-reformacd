/**
 * UI Utilities and Components
 */
import { getFullImagePath } from './utils.js';

export const getEl = (id) => document.getElementById(id);

// --- Toast Notifications ---
class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', title = '', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const defaultTitles = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${title || defaultTitles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <div class="toast-close">×</div>
        `;

        this.container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        const close = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        };

        toast.querySelector('.toast-close').onclick = close;

        if (duration > 0) {
            setTimeout(close, duration);
        }
    }

    success(message, title, duration) { this.show(message, 'success', title, duration); }
    error(message, title, duration) { this.show(message, 'error', title, duration); }
    warning(message, title, duration) { this.show(message, 'warning', title, duration); }
    info(message, title, duration) { this.show(message, 'info', title, duration); }
}

export const Toast = new ToastManager();

// --- Legacy Alert Modal ---
export const showAlert = (message, title = 'Aviso') => {
    // If message is short and simple, use Toast instead
    if (message.length < 100 && !message.includes('<')) {
        const type = title.toLowerCase().includes('error') ? 'error' : 
                     title.toLowerCase().includes('éxito') ? 'success' : 'info';
        Toast.show(message, type, title);
        return;
    }

    const titleEl = getEl('alert-modal-title');
    const messageEl = getEl('alert-modal-message');
    const footer = getEl('alert-modal-footer');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.innerHTML = message;
    if (footer) {
        footer.innerHTML = `<button class="cta-button" id="alert-ok-btn">Entendido</button>`;
        getEl('alert-ok-btn').onclick = () => closeModal('alert-modal');
    }
    openModal('alert-modal');
};

export const showConfirm = (message, title = 'Confirmación', onConfirm) => {
    const titleEl = getEl('alert-modal-title');
    const messageEl = getEl('alert-modal-message');
    const footer = getEl('alert-modal-footer');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.innerHTML = message;
    if (footer) {
        footer.innerHTML = `
            <button class="action-btn" id="confirm-cancel-btn">Cancelar</button>
            <button class="cta-button" id="confirm-ok-btn">Confirmar</button>
        `;
        getEl('confirm-ok-btn').onclick = () => {
            closeModal('alert-modal');
            onConfirm(true);
        };
        getEl('confirm-cancel-btn').onclick = () => {
            closeModal('alert-modal');
            onConfirm(false);
        };
    }
    openModal('alert-modal');
};

// --- Modal Helpers ---
export const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Ensure stacked modals work correctly
        if (modalId === 'registration-modal') {
            modal.style.zIndex = '10001';
        }
        
        if (window.initInputValidations) {
            window.initInputValidations(modal);
        }
    } else {
        console.error(`Modal with ID "${modalId}" not found in DOM.`);
    }
};

export const closeModal = (modalId) => {
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

// --- Appearance Settings ---
export const applySettings = (settings) => {
    if (!settings) return;
    const root = document.documentElement;
    if (settings.brand_color) {
        root.style.setProperty('--accent-primary', settings.brand_color);
        // Generar variantes
        const rgb = hexToRgb(settings.brand_color);
        if (rgb) {
            root.style.setProperty('--accent-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
    }
    if (settings.theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }

    // Actualizar logo si existe en settings
    if (settings.logo_url) {
        const logoImg = document.querySelector('.logo-img');
        if (logoImg) {
            logoImg.src = getFullImagePath(settings.logo_url);
        }
    }
};

// --- Custom Select ---
export const createCustomSelect = (select) => {
    if (!select || select.parentElement.classList.contains('custom-select-container')) return;

    const container = document.createElement('div');
    container.className = 'custom-select-container';
    select.parentNode.insertBefore(container, select);
    container.appendChild(select);

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.textContent = select.options[select.selectedIndex]?.textContent || 'Seleccione...';
    container.appendChild(trigger);

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-options';
    
    Array.from(select.options).forEach(option => {
        const optDiv = document.createElement('div');
        optDiv.className = 'custom-option' + (option.selected ? ' selected' : '');
        optDiv.textContent = option.textContent;
        optDiv.onclick = () => {
            select.value = option.value;
            trigger.textContent = option.textContent;
            container.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
            optDiv.classList.add('selected');
            container.classList.remove('active');
            select.dispatchEvent(new Event('change'));
        };
        optionsContainer.appendChild(optDiv);
    });
    
    container.appendChild(optionsContainer);

    trigger.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select-container').forEach(c => {
            if (c !== container) c.classList.remove('active');
        });
        container.classList.toggle('active');
    };

    document.addEventListener('click', () => container.classList.remove('active'));
};

const hexToRgb = (hex) => {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};
