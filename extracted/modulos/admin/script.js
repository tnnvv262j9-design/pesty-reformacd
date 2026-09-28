(() => {
    let companiesData = [];

    // Global interval for real-time updates
    window.adminInterval = null;

    // --- Tab Management ---
    window.switchAdminTab = function(tabName) {
        // Update Buttons
        document.querySelectorAll('.cebaderos-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update Content
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            if (content.id === `admin-tab-${tabName}`) {
                content.style.display = 'block';
                content.classList.add('active');
            } else {
                content.style.display = 'none';
                content.classList.remove('active');
            }
        });

        if (tabName === 'maintenance') {
            loadMaintenanceStatus();
        }
    };

    window.toggleModuleContent = function(header) {
        const content = header.nextElementSibling;
        content.classList.toggle('active');
        const icon = header.querySelector('.icon-arrow');
        if (icon) {
            icon.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    };

    async function loadMaintenanceStatus() {
        const container = document.getElementById('maintenance-modules-list');
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner">Cargando configuración...</div>';

        try {
            const result = await apiCall('get_maintenance_status.php');
            if (result.success) {
                renderMaintenanceList(result.features);
            } else {
                container.innerHTML = `<p class="text-danger">Error: ${result.message}</p>`;
            }
        } catch (e) {
            container.innerHTML = `<p class="text-danger">Error de conexión</p>`;
        }
    }

    function renderMaintenanceList(features) {
        const container = document.getElementById('maintenance-modules-list');
        container.innerHTML = '';

        // Group by Module
        const modules = {};
        features.forEach(f => {
            if (!modules[f.module]) modules[f.module] = [];
            modules[f.module].push(f);
        });

        for (const [modName, feats] of Object.entries(modules)) {
            const card = document.createElement('div');
            card.className = 'maintenance-module-card';
            
            // Map module key to friendly name if possible
            const friendlyName = AppState.availableModules[modName] || modName.toUpperCase();

            let itemsHtml = '';
            feats.forEach(f => {
                const isActive = parseInt(f.is_active) === 1;
                // Checked = Active (Green), Unchecked = Maintenance (Red)
                // Wait, user said: "al clicear en alun checkbox ... se ponga en mantenimiento"
                // Usually checkbox checked means "Active/On". 
                // If I click it to UNCHECK it, it goes to maintenance.
                // Let's stick to standard: Checked = Feature Enabled (Active), Unchecked = Disabled (Maintenance)
                
                itemsHtml += `
                    <div class="maintenance-item">
                        <span>${f.description}</span>
                        <div style="display:flex; align-items:center;">
                            <span class="status-label ${isActive ? 'status-active' : 'status-maintenance'}">
                                ${isActive ? 'ACTIVO' : 'MANTENIMIENTO'}
                            </span>
                            <label class="maintenance-toggle">
                                <input type="checkbox" 
                                    ${isActive ? 'checked' : ''} 
                                    onchange="toggleMaintenance('${f.feature_key}', this.checked, this)">
                                <span class="maintenance-slider"></span>
                            </label>
                        </div>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="maintenance-module-header" onclick="toggleModuleContent(this)">
                    <span>${friendlyName}</span>
                    <span style="font-size: 0.8em; color: var(--text-medium);">(${feats.length} funciones) ▼</span>
                </div>
                <div class="maintenance-module-content">
                    ${itemsHtml}
                </div>
            `;
            container.appendChild(card);
        }
    }

    window.toggleMaintenance = async function(featureKey, isActive, checkbox) {
        // Optimistic UI update
        const statusLabel = checkbox.parentElement.previousElementSibling;
        statusLabel.textContent = isActive ? 'ACTIVO' : 'MANTENIMIENTO';
        statusLabel.className = `status-label ${isActive ? 'status-active' : 'status-maintenance'}`;

        try {
            const result = await apiCall('toggle_maintenance.php', {
                method: 'POST',
                body: JSON.stringify({
                    feature_key: featureKey,
                    is_active: isActive ? 1 : 0,
                    requester_id: AppState.currentUser.companyId
                })
            });

            if (result.success) {
                // Update Global State
                if (!AppState.maintenance) AppState.maintenance = {};
                AppState.maintenance[featureKey] = isActive;
                showAlert(`Función <strong>${isActive ? 'ACTIVADA' : 'PUESTA EN MANTENIMIENTO'}</strong> correctamente.`, 'Actualizado');
            } else {
                showAlert('Error al actualizar estado', 'Error');
                // Revert UI
                checkbox.checked = !isActive;
                statusLabel.textContent = !isActive ? 'ACTIVO' : 'MANTENIMIENTO';
                statusLabel.className = `status-label ${!isActive ? 'status-active' : 'status-maintenance'}`;
            }
        } catch (e) {
            console.error(e);
            showAlert('Error de conexión', 'Error');
            // Revert UI
            checkbox.checked = !isActive;
            statusLabel.textContent = !isActive ? 'ACTIVO' : 'MANTENIMIENTO';
            statusLabel.className = `status-label ${!isActive ? 'status-active' : 'status-maintenance'}`;
        }
    };

    window.renderAdminView = async function() {
        if (!AppState.currentUser || !AppState.currentUser.isSuperAdmin) {
            showAlert('Acceso denegado', 'error');
            return;
        }

        const container = getEl('admin-view');
        console.log('Rendering Admin View inside container:', container);

        // Clear existing interval to avoid duplicates
        if (window.adminInterval) clearInterval(window.adminInterval);

        // Verificar si tiene contenido REAL (no solo comentarios o espacios)
        const hasContent = container.children.length > 0;

        // Cargar HTML si no existe
        if (!hasContent) {
            container.innerHTML = '<div class="loading-spinner">Cargando módulo...</div>'; // Feedback visual inmediato
            try {
                const response = await fetch('modulos/admin/view.html?v=' + Date.now());
                if (!response.ok) throw new Error('Error cargando view.html');
                const html = await response.text();
                console.log('Admin View HTML loaded');
                
                // Procesar modales
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const modals = tempDiv.querySelectorAll('.modal');
                modals.forEach(modal => {
                    const existing = document.getElementById(modal.id);
                    if (existing) existing.remove();
                    document.body.appendChild(modal);
                });
                
                // Limpiar modales del tempDiv
                tempDiv.querySelectorAll('.modal').forEach(m => m.remove());
                
                container.innerHTML = tempDiv.innerHTML;
                console.log('Admin View HTML injected');
                
                // Setup form listener
                if (window.addFormSubmitListener) {
                    addFormSubmitListener('admin-limits-form', handleSaveLimits, true);
                }
            } catch (e) {
                console.error("Error cargando admin view:", e);
                container.innerHTML = '<p class="text-danger">Error cargando el módulo de administración: ' + e.message + '</p>';
                return;
            }
        } else {
            console.log('Admin View HTML already present (children count: ' + container.children.length + ')');
        }
        
        await loadCompanies(false); // First load with spinner

        // Start polling every 5 seconds
        window.adminInterval = setInterval(() => {
            if (document.getElementById('admin-view') && document.getElementById('admin-view').offsetParent !== null) {
                 loadCompanies(true); // Silent update
            } else {
                clearInterval(window.adminInterval);
            }
        }, 5000);
    };

    async function loadCompanies(silent = false) {
        const tbody = document.querySelector('#admin-companies-table tbody');
        if (!tbody) return;
        
        if (!silent) {
            tbody.innerHTML = `
                <tr><td colspan="12"><div class="skeleton"></div></td></tr>
                <tr><td colspan="12"><div class="skeleton"></div></td></tr>
                <tr><td colspan="12"><div class="skeleton"></div></td></tr>
            `;
        }
        
        try {
            const result = await apiCall(`admin/get_all_companies.php?requester_id=${AppState.currentUser.companyId}`);
            
            if (result.success) {
                companiesData = result.companies;
                renderTable(companiesData);
            } else {
                if (!silent) tbody.innerHTML = `<tr><td colspan="12" class="text-center text-danger">Error: ${result.message}</td></tr>`;
            }
        } catch (e) {
            console.error(e);
            if (!silent) tbody.innerHTML = '<tr><td colspan="12" class="text-center text-danger">Error de conexión</td></tr>';
        }
    }

    function renderTable(companies) {
        const tbody = document.querySelector('#admin-companies-table tbody');
        // Don't clear if silent update? No, we need to rebuild rows. 
        // To avoid flicker, we could diff, but rebuilding is fast enough for small lists.
        tbody.innerHTML = '';
        
        companies.forEach(c => {
            const tr = document.createElement('tr');
            // Determine subscription status display
            const planDisplay = (c.plan && c.plan !== 'trial') 
                ? `<span class="status-badge" style="background: var(--accent-primary); color: var(--bg-dark);">${c.plan.toUpperCase()}</span>` 
                : `<span class="status-badge" style="background: #666;">PRUEBA</span>`;

            tr.innerHTML = `
                <td>${c.id}</td>
                <td>
                    <div style="font-weight: bold; color: var(--text-light);">${c.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-medium);">${c.email}</div>
                </td>
                <td>${c.contact_phone || '-'}</td>
                <td><span class="status-badge" style="background: #333;">${c.admin_code}</span></td>
                <td>${planDisplay}</td>
                <td>${formatUsage(c.usage_services, c.limit_services)}</td>
                <td>${formatUsage(c.usage_clients, c.limit_clients)}</td>
                <td>${formatUsage(c.usage_techs, c.limit_techs)}</td>
                <td>${formatUsage(c.usage_quotes, c.limit_quotes)}</td>
                <td>${formatUsage(c.usage_payment_notes, c.limit_payment_notes)}</td>
                <td>${formatUsage(c.usage_library, c.limit_library)}</td>
                <td>${formatUsage(c.usage_chemicals, c.limit_chemicals)}</td>
                <td>
                    <button class="action-btn small" onclick="openEditLimitsModal(${c.id})">✏️ Editar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function formatUsage(used, limit) {
        // Handle undefined/null inputs
        used = (used !== undefined && used !== null) ? parseInt(used) : 0;
        limit = (limit !== undefined && limit !== null) ? parseInt(limit) : 0;

        if (limit >= 999999) {
             return `<div style="display:flex; align-items:baseline; gap:4px;">
                <span style="color:#10b981; font-weight:bold; font-size:1.1em;">${used}</span> 
                <span style="color:var(--text-medium); font-size:0.85em;">/ ∞</span>
             </div>`;
        }

        const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
        
        // Determine status color based on usage percentage
        let statusColor = '#10b981'; // Green (Healthy/Active)
        
        if (used === 0) {
            statusColor = 'var(--text-muted)'; // Grey (Inactive)
        } else if (pct >= 90) {
            statusColor = '#ef4444'; // Red (Critical)
        } else if (pct >= 75) {
            statusColor = '#f59e0b'; // Orange (Warning)
        }
        
        // Background track color
        const trackColor = 'rgba(255,255,255,0.1)';
        
        return `
            <div style="display:flex; flex-direction:column; justify-content:center; min-width: 80px;">
                <div style="display:flex; align-items:baseline; gap:2px; margin-bottom: 2px;">
                    <span style="color:${statusColor}; font-weight:bold; font-size:1.1em;">${used}</span>
                    <span style="color:var(--text-medium); font-size:0.85em;">/ ${limit}</span>
                </div>
                <div style="width: 100%; height: 4px; background: ${trackColor}; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${Math.min(pct, 100)}%; height: 100%; background: ${statusColor}; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
    }

    window.openEditLimitsModal = (companyId) => {
        const company = companiesData.find(c => c.id == companyId);
        if (!company) return;
        
        getEl('admin-company-id').value = company.id;
        getEl('admin-modal-company-name').textContent = company.name;
        
        const planSelect = document.getElementById('admin-plan-select');
        if (planSelect) {
            planSelect.value = company.plan || 'trial';
            
            const planDefaults = {
                trial: {
                    limit_services: 5,
                    limit_clients: 5,
                    limit_techs: 1,
                    limit_quotes: 5,
                    limit_payment_notes: 5,
                    limit_library: 0,
                    limit_chemicals: 0
                },
                pesty: {
                    limit_services: 60,
                    limit_clients: 60,
                    limit_techs: 5,
                    limit_quotes: 60,
                    limit_payment_notes: 60,
                    limit_library: 10,
                    limit_chemicals: 10
                },
                pesty_core: {
                    limit_services: 200,
                    limit_clients: 200,
                    limit_techs: 20,
                    limit_quotes: 999999,
                    limit_payment_notes: 999999,
                    limit_library: 999999,
                    limit_chemicals: 999999
                },
                enterprise: {
                    limit_services: 999999,
                    limit_clients: 999999,
                    limit_techs: 999999,
                    limit_quotes: 999999,
                    limit_payment_notes: 999999,
                    limit_library: 999999,
                    limit_chemicals: 999999
                }
            };
            
            planSelect.onchange = function() {
                const p = this.value;
                const d = planDefaults[p];
                if (!d) return;
                getEl('admin-limit-services').value = d.limit_services;
                getEl('admin-limit-clients').value = d.limit_clients;
                getEl('admin-limit-techs').value = d.limit_techs;
                getEl('admin-limit-quotes').value = d.limit_quotes;
                getEl('admin-limit-payment-notes').value = d.limit_payment_notes;
                getEl('admin-limit-library').value = d.limit_library;
                const chemToggle = getEl('admin-access-chemicals-toggle');
                const chemStatus = getEl('chemical-access-status');
                if (chemToggle && chemStatus) {
                    const allowChems = d.limit_chemicals >= 999999;
                    chemToggle.checked = allowChems;
                    chemStatus.textContent = allowChems ? 'Habilitado (Ilimitado)' : 'Desactivado';
                    chemStatus.style.color = allowChems ? '#10b981' : '#ef4444';
                }
                getEl('admin-limit-chemicals').value = d.limit_chemicals;
            };
        }
        
        getEl('admin-limit-services').value = company.limit_services || 50;
        getEl('admin-limit-clients').value = company.limit_clients || 50;
        getEl('admin-limit-techs').value = company.limit_techs || 1;
        getEl('admin-limit-quotes').value = company.limit_quotes || 10;
        getEl('admin-limit-payment-notes').value = company.limit_payment_notes || 10;
        getEl('admin-limit-library').value = company.limit_library || 5;
        
        // Handle Chemicals Toggle
        const limitChems = parseInt(company.limit_chemicals || 0);
        const chemToggle = getEl('admin-access-chemicals-toggle');
        const chemStatus = getEl('chemical-access-status');
        
        if (chemToggle) {
            chemToggle.checked = limitChems > 0;
            chemStatus.textContent = limitChems > 0 ? 'Habilitado (Ilimitado)' : 'Desactivado';
            chemStatus.style.color = limitChems > 0 ? '#10b981' : '#ef4444';
            
            chemToggle.onchange = function() {
                const isChecked = this.checked;
                chemStatus.textContent = isChecked ? 'Habilitado (Ilimitado)' : 'Desactivado';
                chemStatus.style.color = isChecked ? '#10b981' : '#ef4444';
                getEl('admin-limit-chemicals').value = isChecked ? 999999 : 0;
            };
        }
        getEl('admin-limit-chemicals').value = limitChems > 0 ? 999999 : 0;
        
        openModal('admin-limits-modal');
    };

    async function handleSaveLimits() {
        const companyId = getEl('admin-company-id').value;
        const planSelect = document.getElementById('admin-plan-select');
        const data = {
            requester_id: AppState.currentUser.companyId,
            company_id: companyId,
            plan: planSelect ? planSelect.value : undefined,
            limit_services: getEl('admin-limit-services').value,
            limit_clients: getEl('admin-limit-clients').value,
            limit_techs: getEl('admin-limit-techs').value,
            limit_quotes: getEl('admin-limit-quotes').value,
            limit_payment_notes: getEl('admin-limit-payment-notes').value,
            limit_library: getEl('admin-limit-library').value,
            limit_chemicals: getEl('admin-limit-chemicals').value
        };
        
        try {
            const result = await apiCall('admin/update_company_limits.php', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (result.success) {
                showAlert('Límites actualizados correctamente', 'success');
                closeModal('admin-limits-modal');
                loadCompanies(); // Recargar tabla
            } else {
                showAlert(result.message || 'Error al actualizar', 'error');
            }
        } catch (e) {
            showAlert('Error de conexión', 'error');
        }
    }

})();
