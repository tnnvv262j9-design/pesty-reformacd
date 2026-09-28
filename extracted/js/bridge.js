/**
 * Bridge between ES6 modules and legacy global scripts
 */
import { AppState } from './state.js';
import { apiCall } from './api.js';
import { Toast, showAlert, showConfirm, openModal, closeModal, createCustomSelect, getEl, applySettings } from './ui.js';
import { formatDate, formatCurrency, escapeHtml, getFullImagePath } from './utils.js';
import { checkSession, handleLogout, processSuccessfulLogin } from './auth.js';
import { initParticles } from './particles.js';
import { loadMaintenanceConfig, isFeatureInMaintenance, checkMaintenanceAndAlert } from './maintenance.js';
import { checkPermissions, hasModuleAccess } from './permissions.js';

// Attach to window for global access (backward compatibility)
window.AppState = AppState;
window.apiCall = apiCall;
window.Toast = Toast;
window.showAlert = showAlert;
window.showConfirm = showConfirm;
window.openModal = openModal;
window.closeModal = closeModal;
window.createCustomSelect = createCustomSelect;
window.getEl = getEl;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.escapeHtml = escapeHtml;
window.getFullImagePath = getFullImagePath;
window.checkSession = checkSession;
window.handleLogout = handleLogout;
window.processSuccessfulLogin = processSuccessfulLogin;
window.applySettings = applySettings;
window.initParticles = initParticles;
window.loadMaintenanceConfig = loadMaintenanceConfig;
window.isFeatureInMaintenance = isFeatureInMaintenance;
window.checkMaintenanceAndAlert = checkMaintenanceAndAlert;
window.checkPermissions = checkPermissions;
window.hasModuleAccess = hasModuleAccess;

console.log('PESTY Core Modules Loaded');
