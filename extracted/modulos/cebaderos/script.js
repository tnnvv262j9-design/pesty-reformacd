// Cebaderos Module Script
(function() {
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'modulos/cebaderos/style.css?v=' + Date.now();
    document.head.appendChild(link);

    let isViewLoaded = false;

    // Initialize Module
    window.renderCebaderosView = async function() {
        if (!isViewLoaded) {
            await loadViewHtml();
        }
        renderCebaderosTable();
        populateCebaderoFilters();
        updateStats();
    };

    async function loadViewHtml() {
        const container = getEl('cebaderos-view');
        if (!container) return;

        try {
            // Force reload to get latest version with correct classes
            const response = await fetch('modulos/cebaderos/view.html?v=' + Date.now());
            if (!response.ok) throw new Error('Failed to load view');
            const html = await response.text();
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // Extract and move modals
            const modals = tempDiv.querySelectorAll('.modal');
            modals.forEach(modal => {
                const existing = document.getElementById(modal.id);
                if (existing) existing.remove();
                document.body.appendChild(modal);
            });

            container.innerHTML = tempDiv.innerHTML;
            
            // Setup Tabs
            setupTabs();
            
            // Setup Listeners
            setupListeners();
            
            // Initialize custom selects if available
            if (window.createCustomSelect) {
                container.querySelectorAll('[data-custom-select]').forEach(window.createCustomSelect);
            }

            isViewLoaded = true;
            
            // Ensure filters are populated after loading view
            populateCebaderoFilters();
            
        } catch (error) {
            console.error('Error loading Cebaderos view:', error);
            container.innerHTML = '<div class="error-state">Error al cargar el módulo.</div>';
        }
    }

    function setupTabs() {
        const buttons = document.querySelectorAll('.cebaderos-tabs-nav .cebaderos-tab-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all
                document.querySelectorAll('.cebaderos-tabs-nav .cebaderos-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.cebaderos-tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active to current
                btn.classList.add('active');
                const tabId = `tab-${btn.dataset.tab}`;
                document.getElementById(tabId).classList.add('active');
                
                if (btn.dataset.tab === 'inspecciones') renderInspectionsTable();
                if (btn.dataset.tab === 'plano') renderPlano();
            });
        });
    }

    function setupListeners() {
        const helpBtn = getEl('cebaderos-help-btn');
        if (helpBtn) {
            helpBtn.onclick = () => openModal('cebaderos-help-modal');
        }

        const form = getEl('cebadero-form');
        if (form) {
            form.addEventListener('submit', handleSaveCebadero);
        }

        const inspectionForm = getEl('inspection-form');
        if (inspectionForm) {
            inspectionForm.addEventListener('submit', handleSaveInspection);
        }

        const searchInput = getEl('cebadero-search');
        if (searchInput) {
            searchInput.addEventListener('input', renderCebaderosTable);
        }

        const inspectionSearch = getEl('inspection-search');
        if (inspectionSearch) {
            inspectionSearch.addEventListener('input', renderInspectionsTable);
        }
        
        // Filter listeners
        getEl('filter-cliente')?.addEventListener('change', renderCebaderosTable);
        getEl('filter-estado')?.addEventListener('change', renderCebaderosTable);

        // Plano Listeners
        const btnUpload = getEl('btn-upload-plano');
        const fileInput = getEl('file-plano');
        const clientSelect = getEl('plano-cliente-select');
        
        if (clientSelect) {
            clientSelect.addEventListener('change', renderPlano);
        }

        if (btnUpload && fileInput) {
            btnUpload.onclick = () => {
                const clientId = getEl('plano-cliente-select').value;
                if (!clientId) {
                    showAlert('Por favor selecciona un cliente primero.', 'Atención');
                    return;
                }
                fileInput.click();
            };
            
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const clientId = getEl('plano-cliente-select').value;
                const formData = new FormData();
                formData.append('client_id', clientId);
                formData.append('map_file', file);

                try {
                    const response = await fetch('api/upload_client_map.php', {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        showAlert('Plano subido correctamente.', 'Éxito');
                        // Update local client data
                        const client = AppState.db.clients.find(c => c.id == clientId);
                        if (client) {
                            client.map_url = result.url;
                            // Ensure the map_url is persisted in the session storage if we reload the page or navigate away
                            // However, AppState is usually rebuilt on reload.
                            // But switching views doesn't reload the page.
                            // The issue might be that renderPlano reads from AppState, which is correct.
                            // Maybe the view was not re-rendering correctly?
                        }
                        renderPlano();
                    } else {
                        showAlert(result.message || 'Error al subir plano.', 'Error');
                    }
                } catch (error) {
                    console.error(error);
                    showAlert('Error de conexión al subir plano.', 'Error');
                }
            };
        }

        // QR Generator Listener
        const btnQr = getEl('btn-generate-qr');
        if (btnQr) {
            btnQr.onclick = () => {
                const id = getEl('cebadero-id').value;
                const code = getEl('cebadero-code').value;
                if (!code) {
                    showAlert('Primero ingresa un ID único para el cebadero.', 'Error');
                    return;
                }
                // Simulate QR generation (in real app, use a QR library)
                const qrContainer = getEl('cebadero-qr-preview');
                qrContainer.innerHTML = `
                    <div style="text-align: center;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(code)}" alt="QR Code">
                        <p style="font-size: 0.8rem; margin-top: 5px;">${code}</p>
                    </div>
                `;
            };
        }

        // --- Report Logic ---
        const reportForm = getEl('cebadero-report-form');
        if (reportForm) {
            reportForm.addEventListener('submit', async (e) => {
                e.preventDefault(); // Prevent reload
                
                const clientId = getEl('report-client').value;
                const startDate = getEl('report-start-date').value;
                const endDate = getEl('report-end-date').value;
                
                if (!clientId || !startDate || !endDate) {
                    showAlert('Por favor completa todos los campos para generar el reporte.', 'Faltan Datos');
                    return;
                }
                
                const btn = reportForm.querySelector('button[type="submit"]');
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
                
                try {
                    // Construct URL for report generation
                    const url = `api/generate_cebadero_report.php?client_id=${clientId}&start_date=${startDate}&end_date=${endDate}&company_id=${AppState.currentUser.companyId}`;
                    
                    // Open in new tab or download
                    window.open(url, '_blank');
                    
                } catch (error) {
                    console.error(error);
                    showAlert('Error al generar el reporte.', 'Error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        }
    }

    // --- Cebaderos Logic ---

    window.openCebaderoModal = (id = null) => {
        const form = getEl('cebadero-form');
        form.reset();
        getEl('cebadero-id').value = '';
        getEl('cebadero-modal-title').textContent = 'Nuevo Cebadero';

        // Populate Clients
        const clientSelect = getEl('cebadero-client');
        clientSelect.innerHTML = '<option value="">Seleccionar...</option>';
        AppState.db.clients.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.full_name || c.name;
            clientSelect.appendChild(option);
        });
        
        if (window.createCustomSelect) window.createCustomSelect(clientSelect);

        if (id) {
            const item = AppState.db.cebaderos.find(c => c.id == id);
            if (item) {
                getEl('cebadero-modal-title').textContent = 'Editar Cebadero';
                getEl('cebadero-id').value = item.id;
                getEl('cebadero-client').value = item.client_id;
                getEl('cebadero-code').value = item.code;
                getEl('cebadero-area-type').value = item.area_type;
                getEl('cebadero-location').value = item.location;
                getEl('cebadero-device-type').value = item.device_type;
                getEl('cebadero-target').value = item.target;
                getEl('cebadero-product').value = item.bait_product || '';
                getEl('cebadero-active-ingredient').value = item.active_ingredient || '';
                getEl('cebadero-cofepris').value = item.cofepris_registry || '';
                getEl('cebadero-status').value = item.status;
                
                // Trigger select update
                document.querySelectorAll('#cebadero-modal [data-custom-select]').forEach(el => {
                     if (window.createCustomSelect) window.createCustomSelect(el);
                });
            }
        } else {
             // Auto-generate ID suggestion?
        }

        openModal('cebadero-modal');
    };

    async function handleSaveCebadero(e) {
        e.preventDefault();
        const id = getEl('cebadero-id').value;
        const isNew = !id;
        
        const payload = {
            id: id || null,
            company_id: AppState.currentUser.companyId,
            client_id: getEl('cebadero-client').value,
            code: getEl('cebadero-code').value,
            area_type: getEl('cebadero-area-type').value,
            location: getEl('cebadero-location').value,
            device_type: getEl('cebadero-device-type').value,
            target: getEl('cebadero-target').value,
            bait_product: getEl('cebadero-product').value,
            active_ingredient: getEl('cebadero-active-ingredient').value,
            cofepris_registry: getEl('cebadero-cofepris').value,
            bait_expiry_date: getEl('cebadero-bait-expiry').value || null,
            status: getEl('cebadero-status').value
        };

        const endpoint = isNew ? 'add_cebadero.php' : 'edit_cebadero.php';
        const result = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(payload) });

        if (result.success) {
            showAlert('Cebadero guardado exitosamente.', 'Éxito');
            closeModal('cebadero-modal');
            await refreshAllDataAndViews();
        } else {
            showAlert(result.message || 'Error al guardar cebadero.', 'Error');
        }
    }

    function renderCebaderosTable() {
        const tbody = document.querySelector('#cebaderos-table tbody');
        if (!tbody) return;
        
        // Ensure db is ready
        if (!AppState.db.cebaderos) AppState.db.cebaderos = [];

        console.log('Rendering Cebaderos:', AppState.db.cebaderos); // Debugging

        const searchTerm = (getEl('cebadero-search').value || '').toLowerCase();
        const filterClient = getEl('filter-cliente').value;
        const filterStatus = getEl('filter-estado').value;

        const filtered = AppState.db.cebaderos.filter(item => {
            if (!item) return false;
            
            const client = AppState.db.clients.find(c => c.id == item.client_id);
            const clientName = client ? (client.full_name || client.name || '').toLowerCase() : '';
            
            const code = (item.code || '').toLowerCase();
            const location = (item.location || '').toLowerCase();
            
            const matchesSearch = code.includes(searchTerm) || 
                                  clientName.includes(searchTerm) ||
                                  location.includes(searchTerm);
                                  
            const matchesClient = !filterClient || item.client_id == filterClient;
            const matchesStatus = !filterStatus || item.status == filterStatus;

            return matchesSearch && matchesClient && matchesStatus;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-medium);">No se encontraron cebaderos.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(item => {
            const client = AppState.db.clients.find(c => c.id == item.client_id);
            const clientName = client ? (client.full_name || client.name) : 'Desconocido';
            
            let statusBadge = '';
            if (item.status === 'active') statusBadge = '<span class="status-badge success">Activo</span>';
            else if (item.status === 'inactive') statusBadge = '<span class="status-badge warning">Inactivo</span>';
            else statusBadge = '<span class="status-badge danger">Retirado</span>';

            return `
                <tr>
                    <td class="font-bold">${item.code || '-'}</td>
                    <td>${clientName}</td>
                    <td>${item.device_type || '-'} (${item.area_type || '-'})</td>
                    <td>${item.location || '-'}</td>
                    <td>${statusBadge}</td>
                    <td>${item.last_inspection || 'Sin inspección'}</td>
                    <td class="action-cell">
                        <button class="action-btn" onclick="openCebaderoModal('${item.id}')" title="Editar">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="action-btn delete" onclick="deleteCebadero('${item.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.deleteCebadero = (id) => {
        showConfirm('¿Estás seguro de eliminar este cebadero?', 'Confirmar', async (confirmed) => {
            if (confirmed) {
                const result = await apiCall(`delete_cebadero.php?id=${id}`, { method: 'GET' });
                if (result.success) {
                    await refreshAllDataAndViews();
                } else {
                    showAlert(result.message || 'Error al eliminar cebadero.', 'Error');
                }
            }
        });
    };

    function populateCebaderoFilters() {
        const clientSelects = ['filter-cliente', 'plano-cliente-select', 'report-client'];
        
        clientSelects.forEach(id => {
            const select = getEl(id);
            if (!select) return;
            
            // Keep first option (placeholder)
            const placeholder = select.firstElementChild ? select.firstElementChild.outerHTML : '<option value="">Seleccionar...</option>';
            select.innerHTML = placeholder;
            
            AppState.db.clients.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.full_name || c.name;
                select.appendChild(option);
            });
            
            if (window.createCustomSelect) window.createCustomSelect(select);
        });
    }

    // --- Inspections Logic ---

    window.openInspectionModal = () => {
        const form = getEl('inspection-form');
        form.reset();
        
        // Populate Cebaderos Select
        const cebaderoSelect = getEl('inspection-cebadero-id');
        cebaderoSelect.innerHTML = '<option value="">Seleccionar Cebadero...</option>';
        AppState.db.cebaderos.filter(c => c.status === 'active').forEach(c => {
            const client = AppState.db.clients.find(cl => cl.id == c.client_id);
            const clientName = client ? (client.full_name || client.name) : 'N/A';
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.code} - ${clientName} (${c.location})`;
            cebaderoSelect.appendChild(option);
        });
        if (window.createCustomSelect) window.createCustomSelect(cebaderoSelect);

        // Populate Techs
        const techSelect = getEl('inspection-tech');
        techSelect.innerHTML = '<option value="">Seleccionar...</option>';
        AppState.db.technicians.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.name;
            techSelect.appendChild(option);
        });

        getEl('inspection-date').value = new Date().toISOString().slice(0, 16);
        
        openModal('inspection-modal');
    };

    async function handleSaveInspection(e) {
        e.preventDefault();

        const form = e.currentTarget;
        if (form && form.dataset.submitting === '1') return;
        
        const cebaderoId = getEl('inspection-cebadero-id').value;
        const inspectionDate = getEl('inspection-date').value;
        const techId = getEl('inspection-tech').value;
        
        // Multi-select values logic
        const condition = Array.from(document.querySelectorAll('#inspection-condition-group input:checked'))
                               .map(cb => cb.value).join(', ');
                               
        const activity = getEl('inspection-activity').value;
        
        const action = Array.from(document.querySelectorAll('#inspection-action-group input:checked'))
                             .map(cb => cb.value).join(', ');
                             
        const amount = getEl('inspection-amount').value;
        const notes = getEl('inspection-notes').value;
        const photoInput = getEl('inspection-photo');

        if (!cebaderoId || !techId || !inspectionDate) {
            showAlert('Por favor completa los campos obligatorios.', 'Faltan Datos');
            return;
        }

        if (!condition) {
             showAlert('Por favor selecciona al menos un estado del dispositivo.', 'Faltan Datos');
             return;
        }
        
        if (!action) {
             showAlert('Por favor selecciona al menos una acción realizada.', 'Faltan Datos');
             return;
        }

        if (form) form.dataset.submitting = '1';
        const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
        const prevBtnText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';
        }

        const formData = new FormData();
        formData.append('cebadero_id', cebaderoId);
        formData.append('company_id', AppState.currentUser.companyId);
        formData.append('date', inspectionDate);
        formData.append('tech_id', techId);
        formData.append('condition', condition);
        formData.append('activity', activity);
        formData.append('action', action);
        formData.append('amount', amount);
        formData.append('notes', notes);

        if (photoInput && photoInput.files[0]) {
            formData.append('evidence_photo', photoInput.files[0]);
        }

        // Use standard fetch for FormData since apiCall expects JSON usually (unless modified)
        // Or adapt apiCall. Let's try standard fetch wrapper pattern or assume apiCall can handle if we don't stringify?
        // Our apiCall helper stringifies body by default if method is POST. We need to bypass that or use fetch directly.
        // Let's use fetch directly for FormData to be safe, respecting the token/auth headers pattern.
        
        try {
            const url = AppState.apiBaseUrl ? `${AppState.apiBaseUrl}add_cebadero_inspection.php` : 'api/add_cebadero_inspection.php';
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (result.success) {
                showAlert(result.message || 'Inspección registrada.', 'Éxito');
                closeModal('inspection-modal');
                await refreshAllDataAndViews();
            } else {
                showAlert(result.message || 'Error al guardar inspección.', 'Error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error de conexión al guardar inspección.', 'Error');
        } finally {
            if (form) form.dataset.submitting = '0';
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = prevBtnText;
            }
        }
    }

    function normalizeEvidenceUrl(url) {
        if (!url) return '';
        if (/^https?:\/\//i.test(url)) return url;
        if (url.startsWith('api/')) return url;
        if (url.startsWith('uploads/')) return `api/${url}`;
        return url;
    }

    window.openInspectionPdf = (id) => {
        const base = AppState.apiBaseUrl || 'api/';
        const params = new URLSearchParams({
            id: String(id),
            company_id: String(AppState.currentUser.companyId)
        });
        window.open(`${base}generate_cebadero_inspection_pdf.php?${params.toString()}`, '_blank');
    };

    window.deleteInspection = (id) => {
        showConfirm('¿Deseas borrar esta inspección?', 'Confirmar', async (confirmed) => {
            if (!confirmed) return;
            const result = await apiCall(`delete_cebadero_inspection.php?id=${id}`, { method: 'GET' });
            if (result.success) {
                showAlert(result.message || 'Inspección eliminada.', 'Éxito');
                await refreshAllDataAndViews();
            } else {
                showAlert(result.message || 'Error al eliminar inspección.', 'Error');
            }
        });
    };

    function renderInspectionsTable() {
        const tbody = document.querySelector('#inspecciones-table tbody');
        if (!tbody) return;
        
        if (!AppState.db.inspections) AppState.db.inspections = [];
        if (!AppState.db.cebaderos) AppState.db.cebaderos = [];

        const searchTerm = (getEl('inspection-search')?.value || '').toLowerCase();

        const list = [...AppState.db.inspections]
            .sort((a, b) => {
                const dateA = new Date(a.inspection_date || a.date);
                const dateB = new Date(b.inspection_date || b.date);
                return dateB - dateA;
            })
            .filter((item) => {
                if (!searchTerm) return true;
                const cebadero = AppState.db.cebaderos.find(c => c.id == item.cebadero_id);
                const tech = AppState.db.technicians.find(t => t.id == item.tech_id);
                const date = item.inspection_date || item.date;
                const condition = item.condition_status || item.condition || '';
                const activity = item.activity_level || item.activity || '';
                const action = item.action_taken || item.action || '';
                const notes = item.notes || '';
                const haystack = [
                    date,
                    cebadero ? cebadero.code : '',
                    cebadero ? cebadero.location : '',
                    tech ? tech.name : '',
                    condition,
                    activity,
                    action,
                    notes
                ].join(' ').toLowerCase();
                return haystack.includes(searchTerm);
            })
            .slice(0, 50);

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: var(--text-medium);">No hay inspecciones registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(item => {
            const cebadero = AppState.db.cebaderos.find(c => c.id == item.cebadero_id);
            const tech = AppState.db.technicians.find(t => t.id == item.tech_id);
            
            // Handle DB column name variations
            const date = item.inspection_date || item.date;
            const condition = item.condition_status || item.condition;
            const activity = item.activity_level || item.activity;
            const action = item.action_taken || item.action;

            const evidenceRaw = item.evidence_photo_url || item.evidence_url || item.photo_url || '';
            const evidenceUrl = normalizeEvidenceUrl(evidenceRaw);
            const evidenceCell = evidenceUrl
                ? `<a class="evidence-link" href="${evidenceUrl}" target="_blank" rel="noopener noreferrer"><img class="evidence-thumb" src="${evidenceUrl}" alt="Evidencia"></a>`
                : '-';

            return `
                <tr>
                    <td>${new Date(date).toLocaleString()}</td>
                    <td>${cebadero ? cebadero.code : 'N/A'}</td>
                    <td>${tech ? tech.name : 'N/A'}</td>
                    <td>${condition}</td>
                    <td>${activity}</td>
                    <td>${action}</td>
                    <td>${evidenceCell}</td>
                    <td>${item.notes || '-'}</td>
                    <td class="action-cell">
                        <button class="action-btn" onclick="openInspectionPdf('${item.id}')" title="Ver PDF">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <button class="action-btn delete" onclick="deleteInspection('${item.id}')" title="Borrar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function updateStats() {
        if (!AppState.db.cebaderos) AppState.db.cebaderos = [];
        if (!AppState.db.inspections) AppState.db.inspections = [];

        getEl('stat-total-cebaderos').textContent = AppState.db.cebaderos.length;
        
        // Inspections this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const count = AppState.db.inspections.filter(i => new Date(i.inspection_date || i.date) >= startOfMonth).length;
        getEl('stat-inspecciones-mes').textContent = count;

        // Alerts (simulated: active cebaderos with no inspection in > 30 days)
        let alerts = 0;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        AppState.db.cebaderos.forEach(c => {
            if (c.status === 'active') {
                if (!c.last_inspection || new Date(c.last_inspection) < thirtyDaysAgo) {
                    alerts++;
                }
            }
        });
        getEl('stat-alertas-cebaderos').textContent = alerts;
    }

    // --- Plano Logic ---
    function renderPlano() {
        const container = getEl('plano-wrapper');
        const clientId = getEl('plano-cliente-select').value;
        
        if (!clientId) {
            container.innerHTML = `
                <div class="plano-placeholder">
                    <i class="fas fa-map"></i>
                    <p>Selecciona un cliente para ver su plano de cebaderos</p>
                </div>
            `;
            return;
        }
        
        const client = AppState.db.clients.find(c => c.id == clientId);
        if (!client || !client.map_url) {
             container.innerHTML = `
                <div class="plano-placeholder">
                    <i class="fas fa-image"></i>
                    <p>Este cliente no tiene un plano cargado.</p>
                    <p>Usa el botón "Subir Plano" para agregar uno.</p>
                </div>
            `;
            return;
        }
        
        // Render Map
        container.innerHTML = `<img src="${client.map_url}" class="plano-image" id="active-plano-image">`;
        const img = container.querySelector('img');
        
        // Handle image load to setup interaction
        img.onload = () => {
            renderMarkers(clientId);
        };
        
        // Click to place logic
        container.onclick = (e) => {
            // Check if clicking on marker
            if (e.target.closest('.cebadero-marker')) return;
            
            const rect = container.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            showPlaceMarkerModal(clientId, x, y);
        };
    }

    function renderMarkers(clientId) {
        const container = getEl('plano-wrapper');
        // Remove existing markers
        container.querySelectorAll('.cebadero-marker').forEach(m => m.remove());
        
        const cebaderos = AppState.db.cebaderos.filter(c => c.client_id == clientId && c.map_x != null && c.map_y != null);
        
        cebaderos.forEach(c => {
            const marker = document.createElement('div');
            marker.className = `cebadero-marker status-${c.status}`;
            marker.style.left = `${c.map_x}%`;
            marker.style.top = `${c.map_y}%`;
            marker.textContent = c.code.replace(/\D/g, ''); // Just numbers usually, or full code
            marker.title = `${c.code} - ${c.location}`;
            
            // Drag Logic
            let isDragging = false;
            
            marker.onmousedown = (e) => {
                isDragging = true;
                e.stopPropagation(); // Prevent container click
            };
            
            container.onmousemove = (e) => {
                if (!isDragging) return;
                const rect = container.getBoundingClientRect();
                let x = ((e.clientX - rect.left) / rect.width) * 100;
                let y = ((e.clientY - rect.top) / rect.height) * 100;
                
                // Clamp
                x = Math.max(0, Math.min(100, x));
                y = Math.max(0, Math.min(100, y));
                
                marker.style.left = `${x}%`;
                marker.style.top = `${y}%`;
            };
            
            container.onmouseup = async (e) => {
                if (!isDragging) return;
                isDragging = false;
                
                const rect = container.getBoundingClientRect();
                let x = ((e.clientX - rect.left) / rect.width) * 100;
                let y = ((e.clientY - rect.top) / rect.height) * 100;
                
                // Save new coords
                await updateCebaderoCoords(c.id, x, y);
            };
            
            // Simple click info or edit
            marker.onclick = (e) => {
                e.stopPropagation();
                // Could open edit modal or simple info
                openCebaderoModal(c.id);
            };
            
            container.appendChild(marker);
        });
    }

    async function updateCebaderoCoords(id, x, y) {
        const result = await apiCall('update_cebadero_coords.php', {
             method: 'POST',
             body: JSON.stringify({ cebadero_id: id, x, y })
        });
        
        if (result.success) {
            // Update local state
            const c = AppState.db.cebaderos.find(i => i.id == id);
            if (c) { c.map_x = x; c.map_y = y; }
        } else {
            showAlert('Error al guardar ubicación.', 'Error');
        }
    }

    function showPlaceMarkerModal(clientId, x, y) {
        // Find unmapped cebaderos
        const unmapped = AppState.db.cebaderos.filter(c => c.client_id == clientId && (c.map_x == null || c.map_x == 0));
        
        if (unmapped.length === 0) {
            showAlert('Todos los cebaderos de este cliente ya están en el plano. Crea uno nuevo primero.', 'Información');
            return;
        }
        
        // Simple selection via alert/prompt or custom small modal?
        // Let's create a temporary small modal or use the existing modal structure dynamically
        
        let options = unmapped.map(c => `<option value="${c.id}">${c.code} - ${c.location}</option>`).join('');
        
        const modalHtml = `
            <div id="marker-select-modal" class="modal active" style="z-index: 9999;">
                <div class="modal-content" style="max-width: 400px;">
                    <h3>Colocar Cebadero</h3>
                    <p>Selecciona qué cebadero ubicar en este punto:</p>
                    <div class="form-group">
                        <select id="marker-select-id" class="full-width" style="padding: 10px; margin: 10px 0;">
                            ${options}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button onclick="document.getElementById('marker-select-modal').remove()" class="action-btn">Cancelar</button>
                        <button id="btn-confirm-marker" class="cta-button">Colocar</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        document.getElementById('btn-confirm-marker').onclick = async () => {
            const id = document.getElementById('marker-select-id').value;
            await updateCebaderoCoords(id, x, y);
            document.getElementById('marker-select-modal').remove();
            renderMarkers(clientId);
        };
    }

})();
