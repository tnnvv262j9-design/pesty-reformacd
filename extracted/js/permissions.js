/**
 * Permissions and Access Control Module
 */
import { AppState } from './state.js';
import { showAlert } from './ui.js';

export const checkPermissions = (requireAdmin = false) => {
    if (!AppState.currentUser) return false;

    if (AppState.currentUser.companyId === 999) {
        showAlert('Esta es una versión de demostración. Las acciones de crear, editar o eliminar datos están desactivadas.', 'Función Desactivada');
        return false;
    }

    if (requireAdmin && AppState.currentUser.type !== 'company') {
        showAlert('Acceso Denegado. Esta función requiere permisos de administrador.', 'Permiso Requerido');
        return false;
    }

    return true;
};

export const hasModuleAccess = (moduleKey) => {
    if (!AppState.currentUser) return false;
    if (AppState.currentUser.isSuperAdmin) return true;
    const mods = (AppState.currentUser.module_access && AppState.currentUser.module_access.modules) || [];
    return mods.includes(moduleKey);
};
