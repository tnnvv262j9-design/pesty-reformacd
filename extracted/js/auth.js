/**
 * Authentication Module
 */
import { apiCall } from './api.js';
import { AppState } from './state.js';
import { Toast, getEl, closeModal, applySettings } from './ui.js';

export const checkSession = async (callback) => {
    const storedUser = sessionStorage.getItem('pestyUser');
    if (storedUser) {
        AppState.currentUser = JSON.parse(storedUser);
        applySettings(AppState.currentUser);
        if (callback) await callback();
    }
};

export const handleLogout = () => {
    if (window.appPollingInterval) clearInterval(window.appPollingInterval);
    sessionStorage.removeItem('pestyUser');
    AppState.currentUser = null;
    getEl('app-container').classList.add('hidden');
    getEl('main-nav').classList.add('hidden');
    getEl('logout-btn').classList.add('hidden');
    getEl('welcome-message').textContent = '';
    getEl('login-modal').classList.add('active');
    getEl('access-code').value = '';
    applySettings({ theme: 'dark', brand_color: '#34D399' });
    
    if (AppState.calendar) {
        AppState.calendar.destroy();
        AppState.calendarInitialized = false;
    }
    if (AppState.statsInitialized) {
        Object.values(AppState.charts).forEach(chart => chart.destroy());
        AppState.statsInitialized = false;
    }
    
    Toast.info('Has cerrado sesión correctamente.');
};

export const processSuccessfulLogin = (user, callback) => {
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
    if (callback) callback();
};
