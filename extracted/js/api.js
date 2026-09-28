/**
 * API Communication Module
 */
import { Toast } from './ui.js';
import { AppState } from './state.js';

export const apiCall = async (endpoint, options = {}) => {
    // Use imported AppState or global window.AppState as fallback
    const currentAppState = AppState || window.AppState;
    
    try {
        if (!currentAppState) {
            console.error('AppState not found in apiCall for:', endpoint);
            throw new Error('AppState no inicializado');
        }
        
        let url = currentAppState.apiBaseUrl ? `${currentAppState.apiBaseUrl}${endpoint}` : endpoint;
        const method = options.method ? options.method.toUpperCase() : 'GET';
        const headers = { 'Content-Type': 'application/json', ...options.headers };

        // Add credentials to the request if they exist in session/state
        if (method === 'GET' || method === 'DELETE') {
            const params = new URLSearchParams(url.split('?')[1] || '');
            if (currentAppState.currentUser) {
                params.set('user_type', currentAppState.currentUser.type);
                params.set('requesting_user_id', currentAppState.currentUser.id);
                params.set('company_id', currentAppState.currentUser.companyId);
            }
            const queryString = params.toString();
            url = `${url.split('?')[0]}${queryString ? '?' + queryString : ''}`;
        } else {
            const body = options.body ? JSON.parse(options.body) : {};
            if (currentAppState.currentUser) {
                body.user_type = currentAppState.currentUser.type;
                body.requesting_user_id = currentAppState.currentUser.id;
                if (!body.company_id) {
                    body.company_id = currentAppState.currentUser.companyId;
                }
            }
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, { ...options, method, headers });
        const responseText = await response.text();
        
        let jsonText = responseText.trim();
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        const firstBracket = jsonText.indexOf('[');
        const lastBracket = jsonText.lastIndexOf(']');

        let start = -1, end = -1;
        if (firstBrace !== -1 && lastBrace > firstBrace) { start = firstBrace; end = lastBrace; } 
        else if (firstBracket !== -1 && lastBracket > firstBracket) { start = firstBracket; end = lastBracket; }
        if (start !== -1) { jsonText = jsonText.substring(start, end + 1); }

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`El archivo '${endpoint}' no fue encontrado en el servidor (Error 404).`);
            }
            let errorData;
            try { errorData = JSON.parse(jsonText); } 
            catch (e) { errorData = { message: responseText || `Error de red: ${response.statusText}` }; }
            throw new Error(errorData.message || `Error HTTP ${response.status}`);
        }

        if (!jsonText) return { success: true, message: 'Operación completada.' };
        return JSON.parse(jsonText);

    } catch (error) {
        console.error(`Error en apiCall a ${endpoint}:`, error);
        Toast.error(`Error de comunicación: ${error.message}`, 'Error de Red');
        return { success: false, message: error.message };
    }
};
