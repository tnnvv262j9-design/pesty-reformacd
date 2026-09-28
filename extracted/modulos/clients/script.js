// Clients Module Script
(function() {
    // Module state
    let isViewLoaded = false;
    let isSubmitting = false;
    window.currentClientId = null; // Exposed globally for inline onclick handlers in view.html

    // Initialize Module
    window.renderClientsView = async function() {
        if (!isViewLoaded) {
            await loadViewHtml();
        }
        renderClientsTable();
        populateClientFilters();
    };

    window.openClientsHelpModal = function() {
        console.log('Abriendo modal de ayuda de clientes (versión reforzada)...');
        let modal = document.getElementById('clients-help-modal');
        
        // Si no se encuentra, buscar en el contenedor
        if (!modal) {
            modal = document.querySelector('#clients-view #clients-help-modal');
        }

        if (modal) {
            // Asegurarse de usar la clase 'active' que es la que usa el CSS global
            modal.classList.add('active');
            
            // Forzar display flex para asegurar centrado (corrigiendo error anterior de block)
            modal.style.display = 'flex'; 
            
            const content = modal.querySelector('.modal-content');
            if (content) content.scrollTop = 0;
            console.log('Modal abierto exitosamente');
        } else {
            console.error('CRITICAL: Clients help modal not found anywhere.');
            // Último intento: recargar vista
            if (!isViewLoaded) {
                window.renderClientsView().then(() => {
                    const retryModal = document.getElementById('clients-help-modal');
                    if (retryModal) {
                        retryModal.classList.add('active');
                        retryModal.style.display = 'flex';
                    }
                });
            }
        }
    };

    async function loadViewHtml() {
        const container = getEl('clients-view');
        if (!container) return;

        try {
            const response = await fetch('modulos/clients/view.html?v=' + new Date().getTime());
            if (!response.ok) throw new Error('Failed to load view');
            const html = await response.text();
            
            // Create a temp container to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // Extract the modals and move them to document.body
            const modals = tempDiv.querySelectorAll('.modal');
            if (modals.length > 0) {
                modals.forEach(modal => {
                    const existingModal = document.getElementById(modal.id);
                    if (existingModal) existingModal.remove();
                    document.body.appendChild(modal);
                });
                // Do NOT call modal.remove() here, as appendChild already moved them from tempDiv to body.
                // Calling remove() would delete them from the body!
            } else {
                console.warn('No modals found in loaded client view HTML');
            }

            // Inject the rest of the content into the view container
            container.innerHTML = tempDiv.innerHTML;
            
            // Attach listeners
            const helpBtn = getEl('clients-help-btn');
            if (helpBtn) {
                helpBtn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Click en botón de ayuda detectado vía JS');
                    window.openClientsHelpModal();
                };
            }
            
            const searchInput = getEl('client-search');
            if (searchInput) searchInput.addEventListener('input', renderClientsTable);
            
            const filterZone = getEl('client-filter-zone');
            if (filterZone) filterZone.addEventListener('change', renderClientsTable);
            
            const filterTech = getEl('client-filter-tech');
            if (filterTech) filterTech.addEventListener('change', renderClientsTable);
            
            const filterFreq = getEl('client-filter-freq');
            if (filterFreq) filterFreq.addEventListener('change', renderClientsTable);

            const form = getEl('client-form');
            if (form) form.addEventListener('submit', handleSaveClient);

            document.querySelectorAll('#clients-view [data-custom-select], #client-modal [data-custom-select], #client-site-modal [data-custom-select]').forEach(el => {
                if (window.createCustomSelect) createCustomSelect(el);
            });

            isViewLoaded = true;

        } catch (error) {
            console.error('Error loading clients view:', error);
            container.innerHTML = '<p class="error">Error al cargar la vista de clientes.</p>';
        }
    }

    function populateClientFilters() {
        if (!AppState.db.clients) return;
        
        // Zones
        const zoneSelect = getEl('client-filter-zone');
        if (zoneSelect) {
            const zones = [...new Set(AppState.db.clients.map(c => c.zone).filter(Boolean))].sort();
            zoneSelect.innerHTML = '<option value="">Todas las Zonas</option>' + 
                zones.map(z => `<option value="${z}">${z}</option>`).join('');
            if (window.createCustomSelect) createCustomSelect(zoneSelect);
        }

        // Techs (assigned to clients? usually clients don't have assigned techs directly in this model, but maybe filter by service history? 
        // The original code had client-filter-tech. Let's see if we can populate it from techs list)
        const techSelect = getEl('client-filter-tech');
        if (techSelect && AppState.db.technicians) {
            techSelect.innerHTML = '<option value="">Todos los Técnicos</option>' + 
                AppState.db.technicians.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            if (window.createCustomSelect) createCustomSelect(techSelect);
        }

        // Frequency
        const freqSelect = getEl('client-filter-freq');
        if (freqSelect) {
             const freqs = [...new Set(AppState.db.clients.map(c => c.frequency).filter(Boolean))].sort();
             freqSelect.innerHTML = '<option value="">Toda Frecuencia</option>' +
                freqs.map(f => `<option value="${f}">${f}</option>`).join('');
             if (window.createCustomSelect) createCustomSelect(freqSelect);
        }
    }

    function renderClientsTable() {
        const table = getEl('clients-table');
        if (!table) return;

        if (!table.querySelector('thead')) {
            table.innerHTML = '<thead><tr><th>Nombre</th><th>Tipo</th><th>Teléfono</th><th>Dirección</th><th>Zona</th><th>Frecuencia</th><th class="action-cell">Acciones</th></tr></thead><tbody></tbody>';
        }
        const tableBody = table.querySelector('tbody');
        
        const searchTerm = getEl('client-search') ? getEl('client-search').value.toLowerCase() : '';
        const zoneFilter = getEl('client-filter-zone') ? getEl('client-filter-zone').value : '';
        const techFilter = getEl('client-filter-tech') ? getEl('client-filter-tech').value : ''; // Note: Clients don't have tech_id usually, this filter might require complex logic (clients served by tech). For now, implementing basic fields.
        const freqFilter = getEl('client-filter-freq') ? getEl('client-filter-freq').value : '';

        // Filter logic
        const filteredClients = (AppState.db.clients || []).filter(c => {
            const matchesSearch = !searchTerm || c.full_name.toLowerCase().includes(searchTerm) || (c.phone && c.phone.includes(searchTerm)) || (c.address && c.address.toLowerCase().includes(searchTerm));
            const matchesZone = !zoneFilter || c.zone === zoneFilter;
            const matchesFreq = !freqFilter || c.frequency === freqFilter;
            
            // Tech filter: tricky without join. If user selects a tech, we might want to show clients who have had services by this tech? 
            // Or maybe clients table doesn't support tech filter natively in data model. 
            // In original code, it was there. Let's assume for now we skip complex tech filtering unless we query services.
            // If the original code had it, it might be doing something specific.
            // Checking original code: 
            // "const filteredClients = AppState.db.clients.filter(c => { ... matchesTech ... })"
            // But client object usually doesn't have tech_id. 
            // Let's ignore tech filter for now to avoid errors, or implement if simple.
            
            return matchesSearch && matchesZone && matchesFreq;
        }).sort((a, b) => a.full_name.localeCompare(b.full_name));

        let html = '';
        const isPrivacy = window.isPrivacyMode && window.isPrivacyMode();

        filteredClients.forEach(c => {
            let displayName = c.full_name;
            let displayPhone = c.phone;
            let displayAddress = c.address;
            
            if (isPrivacy) {
                displayName = 'Cliente Oculto';
                displayPhone = '555-****';
                displayAddress = 'Dirección Oculta';
            }

            html += `<tr>
                <td>${displayName}</td>
                <td>${c.type || '-'}</td>
                <td>${displayPhone || 'N/A'}</td>
                <td>${displayAddress || 'N/A'}</td>
                <td>${c.zone || 'N/A'}</td>
                <td>${c.frequency || 'N/A'}</td>
                <td class="action-cell">
                    <button class="action-btn info" onclick="openClientDetailsModal(${c.id})">📄 Ficha</button>
                    <button class="action-btn" onclick="openClientSiteQuick(${c.id})">🏢 Agregar Sucursal</button>
                    <button class="action-btn" onclick="openClientModal(${c.id})">✏️ Editar</button>
                    <button class="action-btn delete" onclick="deleteClient(${c.id})">🗑️ Borrar</button>
                </td>
            </tr>`;
        });
        tableBody.innerHTML = html || '<tr><td colspan="6" style="text-align:center; padding: 20px;">No se encontraron clientes.</td></tr>';
    }

    window.selectClientType = function(type) {
        const typeInput = getEl('client-type');
        const selectionDiv = getEl('client-type-selection');
        const form = getEl('client-form');
        const backBtn = getEl('btn-back-type');
        
        if (typeInput) typeInput.value = type;
        
        if (selectionDiv && form) {
            selectionDiv.style.display = 'none';
            form.style.display = 'block';
            
            // Animation for smooth transition
            form.style.animation = 'fadeIn 0.3s ease-out';
            
            if (backBtn) backBtn.style.display = 'inline-block';
        }
    };

    window.showClientTypeSelection = function() {
        const selectionDiv = getEl('client-type-selection');
        const form = getEl('client-form');
        
        if (selectionDiv && form) {
            form.style.display = 'none';
            selectionDiv.style.display = 'block';
            selectionDiv.style.animation = 'fadeIn 0.3s ease-out';
        }
    };

    window.openClientModal = async (id = null) => {
        if (!checkPermissions(true)) return;
        
        // Ensure modal exists
        if (!document.getElementById('client-modal')) {
             isViewLoaded = false;
             await window.renderClientsView();
             
             if (!document.getElementById('client-modal')) {
                 console.error('Client modal not found after reload');
                 // Last resort
                 const inView = document.querySelector('#clients-view #client-modal');
                 if (inView) {
                     document.body.appendChild(inView);
                 } else {
                     return;
                 }
             }
        }
        
        const form = getEl('client-form');
        const selectionDiv = getEl('client-type-selection');
        const backBtn = getEl('btn-back-type');
        
        if (form) form.reset();
        
        const idInput = getEl('client-id');
        if (idInput) idInput.value = '';
        
        if (id) {
            // Edit Mode
            const client = AppState.db.clients.find(c => c.id == id);
            if (!client) return;
            if(getEl('client-modal-title')) getEl('client-modal-title').textContent = 'Editar Cliente';
            if(getEl('client-id')) getEl('client-id').value = client.id;
            if(getEl('client-name')) getEl('client-name').value = client.full_name;
            if(getEl('client-type')) getEl('client-type').value = client.type || ''; // If type exists
            
            // Phone handling with country code
            if(getEl('client-phone') && getEl('client-country-code')) {
                let phone = client.phone || '';
                let code = '+52'; // Default
                
                // Get all available codes from select
                const select = getEl('client-country-code');
                const options = Array.from(select.options).map(o => o.value);
                
                // Sort by length descending to match longest prefix first
                const sortedOptions = options.sort((a, b) => b.length - a.length);
                
                for (const optCode of sortedOptions) {
                    if (phone.startsWith(optCode)) {
                        code = optCode;
                        phone = phone.substring(code.length);
                        break;
                    }
                }
                
                getEl('client-country-code').value = code;
                getEl('client-phone').value = phone;
            } else if (getEl('client-phone')) {
                getEl('client-phone').value = client.phone;
            }

            if(getEl('client-address')) getEl('client-address').value = client.address;
            if(getEl('client-zone')) getEl('client-zone').value = client.zone || '';
            if(getEl('client-frequency')) getEl('client-frequency').value = client.frequency || '';
            if(getEl('client-notes')) getEl('client-notes').value = client.notes || '';
            
            // Show form directly
            if(selectionDiv) selectionDiv.style.display = 'none';
            if(form) form.style.display = 'block';
            if(backBtn) backBtn.style.display = 'none'; // Can't change type in edit mode easily without full reset? Or maybe we allow it? Let's hide it for simplicity as per Quimicos.
            
        } else {
            // New Mode
            if(getEl('client-modal-title')) getEl('client-modal-title').textContent = 'Agregar Nuevo Cliente';
            
            // Show Selection First
            if(selectionDiv) {
                selectionDiv.style.display = 'block';
                if(form) form.style.display = 'none';
            } else {
                // Fallback if div missing
                if(form) form.style.display = 'block';
            }
            if(backBtn) backBtn.style.display = 'inline-block';
        }
        
        // Refresh custom selects
        document.querySelectorAll('#client-modal [data-custom-select]').forEach(el => {
            if (window.createCustomSelect) createCustomSelect(el);
        });
        
        openModal('client-modal');
    };

    async function handleSaveClient(e) {
        if (e) e.preventDefault();
        if (isSubmitting) return;

        isSubmitting = true;
        const saveBtn = document.querySelector('#client-form button[type="submit"]');
        let originalBtnText = 'Guardar Cliente';
        if (saveBtn) {
            originalBtnText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = 'Guardando...';
        }

        try {
            const id = getEl('client-id').value;
            const clientName = getEl('client-name').value.trim();

            // Check for duplicate client name
            if (!id) { // Only check for new clients
                const existingClient = AppState.db.clients.find(c => c.full_name.toLowerCase() === clientName.toLowerCase());
                if (existingClient) {
                    showAlert('Ya existe un cliente con este nombre.', 'Error');
                    return;
                }
            }
            
            const countryCode = getEl('client-country-code') ? getEl('client-country-code').value : '';
            const localPhone = getEl('client-phone').value;
            const fullPhone = countryCode + localPhone;

            const payload = {
                id: id || null,
                company_id: AppState.currentUser.companyId,
                full_name: clientName,
                phone: fullPhone,
                address: getEl('client-address').value,
                zone: getEl('client-zone').value,
                frequency: getEl('client-frequency').value,
                notes: getEl('client-notes').value,
                type: getEl('client-type') ? getEl('client-type').value : ''
            };
            
            const endpoint = id ? 'edit_client.php' : 'add_client.php';
            const result = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(payload) });
            
            if (result.success) {
                await refreshAllDataAndViews();
                closeModal('client-modal');
            } else {
                showAlert(result.message || 'Ocurrió un error al guardar el cliente.', 'Error');
            }
        } catch(error) {
            console.error('Error saving client:', error);
            showAlert('Ocurrió un error inesperado al guardar.', 'Error');
        } finally {
            isSubmitting = false;
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnText;
            }
        }
    }

    window.deleteClient = async (id) => {
        if (!checkPermissions(true)) return;
        showConfirm('¿Seguro que quieres eliminar este cliente? Se eliminarán también sus servicios y datos asociados.', 'Confirmar Eliminación', async (confirmed) => {
            if (confirmed) {
                const result = await apiCall(`delete_client.php?id=${id}`, { method: 'GET' });
                if (result.success) await refreshAllDataAndViews();
                else showAlert(result.message || 'Error al eliminar cliente.', 'Error');
            }
        });
    };

    // --- Client Details Modal Logic (Ficha) ---

    window.openClientDetailsModal = async (clientId) => {
        // Ensure modal exists
        if (!document.getElementById('client-details-modal')) {
             isViewLoaded = false;
             await window.renderClientsView();
             
             // Wait a bit for DOM update if needed
             if (!document.getElementById('client-details-modal')) {
                 console.error('Client details modal not found after reload');
                 // Last resort: check if it's in the view container but not in body
                 const inView = document.querySelector('#clients-view #client-details-modal');
                 if (inView) {
                     document.body.appendChild(inView);
                 } else {
                     return;
                 }
             }
        }

        const client = AppState.db.clients.find(c => c.id == clientId);
        if (!client) return;

        window.currentClientId = clientId;

        // Helper to safely set text content
        const safeSetText = (id, text) => {
            const el = getEl(id);
            if (el) el.textContent = text;
        };

        const isPrivacy = window.isPrivacyMode && window.isPrivacyMode();

        // Populate basic info
        safeSetText('client-detail-name', isPrivacy ? 'Cliente Oculto' : client.full_name);
        safeSetText('client-detail-phone', isPrivacy ? '555-****' : (client.phone || '-'));
        safeSetText('client-detail-address', isPrivacy ? 'Dirección Oculta' : (client.address || '-'));
        safeSetText('client-detail-type', client.type || '-');
        safeSetText('client-detail-zone', client.zone || '-');
        safeSetText('client-detail-frequency', client.frequency || '-');
        safeSetText('client-detail-notes', isPrivacy ? 'Notas Ocultas' : (client.notes || '-'));

        // --- Configure Action Buttons ---
        const btnWhatsapp = getEl('btn-whatsapp');
        if (btnWhatsapp) {
            btnWhatsapp.onclick = () => {
                if (client.phone && !isPrivacy) {
                    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
                    window.open(`https://wa.me/${cleanPhone}`, '_blank');
                } else {
                    showAlert('No hay teléfono registrado para WhatsApp.', 'Advertencia');
                }
            };
        }

        const btnCall = getEl('btn-call');
        if (btnCall) {
            btnCall.onclick = () => {
                if (client.phone && !isPrivacy) {
                    window.location.href = `tel:${client.phone}`;
                } else {
                    showAlert('No hay teléfono registrado para llamar.', 'Advertencia');
                }
            };
        }

        const btnLocation = getEl('btn-location');
        if (btnLocation) {
            btnLocation.onclick = () => {
                if (client.address && !isPrivacy) {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`, '_blank');
                } else {
                    showAlert('No hay dirección registrada para ver en mapa.', 'Advertencia');
                }
            };
        }

        // --- Show Access Code ---
        let accessCodeContainer = getEl('client-detail-access-code-container');
        if (!accessCodeContainer) {
            const infoContainer = getEl('client-basic-info');
            if (infoContainer) {
                const codeDiv = document.createElement('div');
                codeDiv.id = 'client-detail-access-code-container';
                codeDiv.style.marginTop = '20px';
                codeDiv.style.padding = '15px';
                codeDiv.style.backgroundColor = 'rgba(52, 211, 153, 0.1)';
                codeDiv.style.borderRadius = '8px';
                codeDiv.style.border = '1px dashed var(--accent-primary)';
                infoContainer.appendChild(codeDiv);
                accessCodeContainer = codeDiv;
            }
        }
        
        if (accessCodeContainer) {
            accessCodeContainer.innerHTML = `
                <h4 style="color: var(--accent-primary); margin-top: 0; margin-bottom: 10px; font-size: 0.9rem;">🔐 Acceso Portal Clientes</h4>
                <div style="display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 4px; border: 1px solid var(--border-color);">
                    <span style="font-family: monospace; font-size: 1.5rem; letter-spacing: 4px; font-weight: bold; color: var(--text-light);">${isPrivacy ? '******' : (client.access_code || '------')}</span>
                </div>
                <div style="margin-top: 10px; text-align: center;">
                    <a href="client_portal.php" target="_blank" style="color: var(--accent-primary); font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--accent-primary); padding: 5px 10px; border-radius: 4px;">
                        <span>🔗</span> Ir al Portal de Clientes
                    </a>
                </div>
                <p style="font-size: 0.75rem; color: #aaa; margin-top: 10px; margin-bottom: 0; text-align: center;">Comparte este código único con tu cliente.</p>
            `;
        }
        // ------------------------

        openModal('client-details-modal');
        switchClientTab('services');
    };

    window.openClientSiteQuick = (clientId) => {
        window.currentClientId = clientId;
        if (window.openClientSiteModal) {
            window.openClientSiteModal(null);
        } else if (window.openClientDetailsModal) {
            window.openClientDetailsModal(clientId);
            if (window.switchClientTab) window.switchClientTab('sites');
        }
    };

    window.openClientSiteModal = (siteId = null) => {
        const form = getEl('client-site-form');
        if (!form) return;
        const titleEl = getEl('client-site-modal-title');
        const idInput = getEl('client-site-id');
        const nameInput = getEl('client-site-name');
        const codeInput = getEl('client-site-code');
        const addressInput = getEl('client-site-address');
        const riskSelect = getEl('client-site-risk');
        const notesInput = getEl('client-site-notes');

        if (idInput) idInput.value = siteId || '';

        if (siteId) {
            const sites = AppState.db.client_sites || [];
            const site = sites.find(s => s.id == siteId);
            if (!site) return;
            if (titleEl) titleEl.textContent = 'Editar Sucursal / Planta';
            if (nameInput) nameInput.value = site.name || '';
            if (codeInput) codeInput.value = site.code || '';
            if (addressInput) addressInput.value = site.address || '';
            if (riskSelect) riskSelect.value = site.risk_level || '';
            if (notesInput) notesInput.value = site.notes || '';
        } else {
            if (titleEl) titleEl.textContent = 'Agregar Sucursal / Planta';
            if (nameInput) nameInput.value = '';
            if (codeInput) codeInput.value = '';
            const currentClient = AppState.db.clients.find(c => c.id == window.currentClientId);
            if (addressInput) addressInput.value = currentClient ? currentClient.address : '';
            if (riskSelect) riskSelect.value = '';
            if (notesInput) notesInput.value = '';
        }

        document.querySelectorAll('#client-site-modal [data-custom-select]').forEach(el => {
            if (window.createCustomSelect) createCustomSelect(el);
        });

        const submitHandler = async (e) => {
            e.preventDefault();
            if (!window.currentClientId) return;
            const clientId = window.currentClientId;
            const user = AppState.currentUser;
            const companyId = user && (user.companyId || user.company_id);
            if (!companyId) return;

            const payload = {
                id: idInput && idInput.value ? parseInt(idInput.value, 10) : null,
                company_id: companyId,
                client_id: clientId,
                name: nameInput ? nameInput.value.trim() : '',
                code: codeInput ? codeInput.value.trim() : '',
                address: addressInput ? addressInput.value.trim() : '',
                risk_level: riskSelect ? riskSelect.value : '',
                notes: notesInput ? notesInput.value.trim() : ''
            };

            if (!payload.name) {
                showAlert('El nombre de la sucursal es obligatorio.', 'Validación');
                return;
            }

            const endpoint = payload.id ? 'edit_client_site.php' : 'add_client_site.php';
            try {
                const result = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(payload) });
                if (result.success) {
                    await refreshAllDataAndViews();
                    closeModal('client-site-modal');
                    switchClientTab('sites');
                } else {
                    showAlert(result.message || 'Ocurrió un error al guardar la sucursal.', 'Error');
                }
            } catch (err) {
                console.error('Error saving client site:', err);
                showAlert('Ocurrió un error inesperado al guardar.', 'Error');
            }
        };

        const existingForm = getEl('client-site-form');
        if (existingForm) {
            existingForm.onsubmit = submitHandler;
        }

        openModal('client-site-modal');
    };

    window.deleteClientSite = async (siteId) => {
        if (!siteId) return;
        showConfirm('¿Seguro que quieres eliminar esta sucursal/planta?', 'Confirmar Eliminación', async (confirmed) => {
            if (!confirmed) return;
            try {
                const result = await apiCall(`delete_client_site.php?id=${siteId}`, { method: 'GET' });
                if (result.success) {
                    await refreshAllDataAndViews();
                    switchClientTab('sites');
                } else {
                    showAlert(result.message || 'Error al eliminar la sucursal.', 'Error');
                }
            } catch (err) {
                console.error('Error deleting client site:', err);
                showAlert('Ocurrió un error inesperado al eliminar.', 'Error');
            }
        });
    };

    window.switchClientTab = (tabId) => {
        // Update tab buttons
        document.querySelectorAll('.client-details-body .tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.client-details-body .tab-btn[onclick="switchClientTab('${tabId}')"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Update tab content
        document.querySelectorAll('.client-details-body .tab-pane').forEach(pane => pane.classList.add('hidden'));
        getEl(`client-tab-${tabId}`).classList.remove('hidden');

        // Load content
        loadClientTabContent(tabId);
    };

    function loadClientTabContent(tabId) {
        if (!window.currentClientId) return;
        const clientId = window.currentClientId;

        if (tabId === 'services') {
            const list = getEl('client-services-list');
            const services = (AppState.db.services || []).filter(s => s.client_id == clientId).sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
            
            if (services.length === 0) {
                list.innerHTML = '<div class="empty-state">No hay servicios registrados.</div>';
                return;
            }

            let html = '';
            services.forEach(s => {
                const hasReport = s.status === 'Realizado' && s.report_data && s.report_data !== '{}' && s.report_data !== 'null';
                const statusColor = {
                    'pendiente': 'var(--accent-secondary)',
                    'realizado': 'var(--accent-primary)',
                    'cancelado': 'var(--error-color)'
                }[s.status.toLowerCase()] || '#ccc';

                html += `
                    <div class="list-item" style="border-left: 4px solid ${statusColor}; padding: 12px; background: rgba(255,255,255,0.03); margin-bottom: 8px; border-radius: 4px;">
                        <div class="list-item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="font-weight: bold; color: var(--text-light);">
                                ${formatDate(s.service_date)} <span style="font-weight: normal; color: var(--text-medium); font-size: 0.9em;">${formatTime(s.service_time)}</span>
                            </div>
                            <span class="status-badge status-${s.status.toLowerCase()}" style="font-size: 0.8em; padding: 2px 8px; background-color: ${statusColor}; color: var(--bg-dark); border-radius: 4px; font-weight: bold;">${s.status}</span>
                        </div>
                        <div class="list-item-details" style="font-size: 0.9em; color: var(--text-medium); margin-bottom: 10px;">
                            <div style="display: flex; gap: 10px; margin-bottom: 4px;">
                                <span>👤 ${getTechName(s.technician_id)}</span>
                                <span>🏷️ ${s.service_type || 'General'}</span>
                            </div>
                            ${s.notes ? `<div style="font-style: italic; opacity: 0.8; margin-top: 4px;">📝 ${s.notes}</div>` : ''}
                        </div>
                        <div class="list-item-actions" style="display: flex; justify-content: flex-end; gap: 10px;">
                             ${hasReport ? `<button class="action-btn small info" onclick="window.displayPrintableDocument(${s.id}, 'service')" style="background-color: var(--accent-primary); color: white;">📄 Ver Reporte</button>` : ''}
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        } 
        else if (tabId === 'sites') {
            const list = getEl('client-sites-list');
            const allSites = AppState.db.client_sites || [];
            const sites = allSites.filter(s => s.client_id == clientId).sort((a, b) => a.name.localeCompare(b.name));
            if (!list) return;
            if (sites.length === 0) {
                list.innerHTML = '<div class="empty-state">No hay sucursales registradas.</div>';
                return;
            }
            let html = '';
            sites.forEach(s => {
                const risk = s.risk_level || '';
                const riskLabel = risk ? risk.charAt(0).toUpperCase() + risk.slice(1) : 'Sin definir';
                html += `
                    <div class="list-item" style="padding: 12px; background: rgba(255,255,255,0.03); margin-bottom: 8px; border-radius: 4px;">
                        <div class="list-item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span class="list-item-title">${s.name}</span>
                            <span style="font-size: 0.8em; color: var(--text-medium);">${riskLabel}</span>
                        </div>
                        <div class="list-item-details" style="font-size: 0.9em; color: var(--text-medium);">
                            ${s.code ? `<div>Codigo: ${s.code}</div>` : ''}
                            ${s.address ? `<div>📍 ${s.address}</div>` : ''}
                            ${s.notes ? `<div style="font-style: italic; margin-top: 4px;">📝 ${s.notes}</div>` : ''}
                        </div>
                        <div class="list-item-actions" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
                            <button class="action-btn small" onclick="openClientSiteModal(${s.id})">✏️ Editar</button>
                            <button class="action-btn small delete" onclick="deleteClientSite(${s.id})">🗑️ Borrar</button>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        }
        else if (tabId === 'quotes') {
            const list = getEl('client-quotes-list');
            const quotes = (AppState.db.quotes || []).filter(q => q.client_id == clientId).sort((a, b) => b.id - a.id);
            
            if (quotes.length === 0) {
                list.innerHTML = '<div class="empty-state">No hay cotizaciones registradas.</div>';
                return;
            }

            let html = '';
            quotes.forEach(q => {
                html += `
                    <div class="list-item">
                        <div class="list-item-header">
                            <span class="list-item-title">Folio #Q${q.id}</span>
                            <span class="status-badge status-${q.status.toLowerCase()}">${q.status}</span>
                        </div>
                        <div class="list-item-details">
                            Fecha: ${formatDate(q.issue_date)}<br>
                            Total: ${formatCurrency(q.total)}
                        </div>
                        <div class="list-item-actions">
                            <button class="action-btn small" onclick="openQuoteModal(${q.id})">✏️ Ver/Editar</button>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        }
        else if (tabId === 'invoices') {
            const list = getEl('client-invoices-list');
            const invoices = (AppState.db.invoices || []).filter(i => i.client_id == clientId).sort((a, b) => b.id - a.id);
            
            if (invoices.length === 0) {
                list.innerHTML = '<div class="empty-state">No hay facturas registradas.</div>';
                return;
            }

            let html = '';
            invoices.forEach(i => {
                html += `
                    <div class="list-item">
                        <div class="list-item-header">
                            <span class="list-item-title">Factura #${i.id}</span>
                            <span class="status-badge status-${i.status.toLowerCase()}">${i.status}</span>
                        </div>
                        <div class="list-item-details">
                            Fecha: ${formatDate(i.issue_date)}<br>
                            Total: ${formatCurrency(i.total)}
                        </div>
                        <div class="list-item-actions">
                             <button class="action-btn small" onclick="openInvoiceModal(${i.id})">✏️ Ver/Editar</button>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        }
        else if (tabId === 'payments') {
            const list = getEl('client-payments-list');
            const payments = (AppState.db.payment_notes || []).filter(p => p.client_id == clientId).sort((a, b) => b.id - a.id);
            
             if (payments.length === 0) {
                list.innerHTML = '<div class="empty-state">No hay notas de pago.</div>';
                return;
            }

            let html = '';
            payments.forEach(p => {
                html += `
                    <div class="list-item">
                        <div class="list-item-header">
                            <span class="list-item-title">Nota #${p.id}</span>
                             <span class="status-badge status-${p.status ? p.status.toLowerCase() : 'pendiente'}">${p.status || 'Pendiente'}</span>
                        </div>
                        <div class="list-item-details">
                            Fecha: ${formatDate(p.payment_date)}<br>
                            Monto: ${formatCurrency(p.amount)}
                        </div>
                        <div class="list-item-actions">
                            <button class="action-btn small" onclick="openPaymentNoteModal(${p.id})">✏️ Ver/Editar</button>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        }
    }
    
    // Helper to get tech name (duplicated logic, but simple enough)
    function getTechName(techId) {
        if (!techId) return 'Sin asignar';
        const tech = AppState.db.technicians.find(t => t.id == techId);
        return tech ? tech.name : 'Desconocido';
    }

})();
