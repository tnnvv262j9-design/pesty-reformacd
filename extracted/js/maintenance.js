/**
 * Maintenance System Module
 */
import { apiCall } from './api.js';
import { AppState } from './state.js';
import { showAlert } from './ui.js';

export const loadMaintenanceConfig = async () => {
    try {
        const result = await apiCall('get_maintenance_status.php');
        if (result.success) {
            AppState.maintenance = {};
            result.features.forEach(f => {
                AppState.maintenance[f.feature_key] = parseInt(f.is_active) === 1;
            });
            console.log('Maintenance config loaded:', AppState.maintenance);
        }
    } catch (e) {
        console.error('Error loading maintenance config:', e);
    }
};

export const isFeatureInMaintenance = (featureKey) => {
    if (AppState.maintenance && AppState.maintenance.hasOwnProperty(featureKey)) {
        return !AppState.maintenance[featureKey];
    }
    return false;
};

export const checkMaintenanceAndAlert = (featureKey, message = 'Esta función se encuentra en mantenimiento temporalmente.') => {
    if (isFeatureInMaintenance(featureKey)) {
        showAlert(`🚧 <strong>Mantenimiento</strong><br>${message}`, 'Función en Mantenimiento');
        return true;
    }
    return false;
};
