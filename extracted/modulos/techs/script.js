// Technicians Module Script
(function() {
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'modulos/techs/style.css?v=' + Date.now();
    document.head.appendChild(link);

    let isViewLoaded = false;
    let currentTechForUpload = null;
    let eppSignaturePad = null;

    // Initialize Module
    window.renderTechsView = async function() {
        if (!isViewLoaded) {
            await loadViewHtml();
        }
        renderTechsTable();

        // Attach help button listener
        const helpBtn = document.getElementById('techs-help-btn');
        if (helpBtn) {
            helpBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Click en botón de ayuda de técnicos detectado vía JS');
                if (typeof window.openTechsHelpModal === 'function') {
                    window.openTechsHelpModal();
                } else {
                    console.error('Función openTechsHelpModal no encontrada');
                }
            };
        }
    };

    window.openTechsHelpModal = function() {
        console.log('Abriendo modal de ayuda de técnicos (versión reforzada)...');
        let modal = document.getElementById('techs-help-modal');
        
        // Si no se encuentra, buscar en el contenedor
        if (!modal) {
            modal = document.querySelector('#techs-view #techs-help-modal');
        }

        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex'; 
            
            const content = modal.querySelector('.modal-content');
            if (content) content.scrollTop = 0;
            console.log('Modal de técnicos abierto exitosamente');
        } else {
            console.error('CRITICAL: Techs help modal not found anywhere.');
            // Último intento: recargar vista
            if (!isViewLoaded) {
                window.renderTechsView().then(() => {
                    const retryModal = document.getElementById('techs-help-modal');
                    if (retryModal) {
                        retryModal.classList.add('active');
                        retryModal.style.display = 'flex';
                    }
                });
            }
        }
    };

    async function loadViewHtml() {
        const container = getEl('techs-view');
        if (!container) return;

        try {
            const response = await fetch('modulos/techs/view.html');
            if (!response.ok) throw new Error('Failed to load view');
            const html = await response.text();
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const modal = tempDiv.querySelector('#tech-modal');
            if (modal) {
                const existingModal = document.getElementById('tech-modal');
                if (existingModal) existingModal.remove();
                
                document.body.appendChild(modal);
            }

            const profileModal = tempDiv.querySelector('#tech-profile-modal');
            if (profileModal) {
                const existingProfileModal = document.getElementById('tech-profile-modal');
                if (existingProfileModal) existingProfileModal.remove();
                document.body.appendChild(profileModal);
            }

            const docModal = tempDiv.querySelector('#tech-doc-modal');
            if (docModal) {
                const existingDocModal = document.getElementById('tech-doc-modal');
                if (existingDocModal) existingDocModal.remove();
                document.body.appendChild(docModal);
            }

            const eppModal = tempDiv.querySelector('#tech-epp-modal');
            if (eppModal) {
                const existingEppModal = document.getElementById('tech-epp-modal');
                if (existingEppModal) existingEppModal.remove();
                document.body.appendChild(eppModal);
            }

            const helpModal = tempDiv.querySelector('#techs-help-modal');
            if (helpModal) {
                const existingHelpModal = document.getElementById('techs-help-modal');
                if (existingHelpModal) existingHelpModal.remove();
                document.body.appendChild(helpModal);
            }

            container.innerHTML = tempDiv.innerHTML;
            
            const searchInput = getEl('tech-search');
            if (searchInput) {
                searchInput.addEventListener('input', renderTechsTable);
            }

            const form = getEl('tech-form');
            if (form) {
                form.addEventListener('submit', handleSaveTech);
            }

            const docForm = document.getElementById('tech-doc-form');
            if (docForm) {
                docForm.addEventListener('submit', handleTechDocFormSubmit);
            }

            const eppForm = document.getElementById('epp-delivery-form');
            if (eppForm) {
                eppForm.addEventListener('submit', handleEppDeliverySubmit);
            }

            // Init Signature Pad if modal exists
            if (document.getElementById('epp-signature-pad')) {
                const canvas = document.getElementById('epp-signature-pad');
                function resizeCanvas() {
                    const ratio = Math.max(window.devicePixelRatio || 1, 1);
                    canvas.width = canvas.offsetWidth * ratio;
                    canvas.height = canvas.offsetHeight * ratio;
                    canvas.getContext("2d").scale(ratio, ratio);
                }
                window.addEventListener("resize", resizeCanvas);
                // Delay init to ensure modal might be visible or just init
                // We will init/clear it when modal opens
            }

            isViewLoaded = true;

        } catch (error) {
            console.error('Error loading techs view:', error);
            container.innerHTML = '<p class="error">Error al cargar la vista de técnicos.</p>';
        }
    }

    function renderTechsTable() {
        const table = getEl('techs-table');
        if (!table) return;

        if (!table.querySelector('thead')) {
            table.innerHTML = '<thead><tr><th style="width: 60px;">Foto</th><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Código Acceso</th><th class="action-cell">Acciones</th></tr></thead><tbody></tbody>';
        }
        const tableBody = table.querySelector('tbody');
        const searchTerm = getEl('tech-search') ? getEl('tech-search').value.toLowerCase() : '';
        
        const filteredTechs = (AppState.db.technicians || []).filter(t => {
            return !searchTerm || t.name.toLowerCase().includes(searchTerm) || t.phone.toLowerCase().includes(searchTerm) || t.address.toLowerCase().includes(searchTerm);
        }).sort((a, b) => b.id - a.id);

        let html = '';
        const isPrivacy = window.isPrivacyMode && window.isPrivacyMode();

        filteredTechs.forEach(t => {
            let displayName = t.name;
            let displayPhone = t.phone;
            let displayAddress = t.address;
            let displayAccessCode = t.access_code;

            if (isPrivacy) {
                displayName = 'Técnico Oculto';
                displayPhone = '555-****';
                displayAddress = 'Dirección Oculta';
                displayAccessCode = '****';
            }

            let photoHtml = '<div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--bg-light); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 1px solid var(--border-color);">👤</div>';
            if (t.photo) {
                photoHtml = `<div style="width: 40px; height: 40px; border-radius: 50%; background-image: url('${t.photo}'); background-size: cover; background-position: center; border: 1px solid var(--border-color);"></div>`;
            }

            html += `<tr><td>${photoHtml}</td><td>${escapeHtmlLocal(displayName)}</td><td>${escapeHtmlLocal(displayPhone)}</td><td>${escapeHtmlLocal(displayAddress)}</td><td>${escapeHtmlLocal(displayAccessCode)}</td><td class="action-cell"><button class="action-btn info" onclick="openTechProfile(${t.id})">📋 Ficha</button><button class="action-btn" onclick="openTechModal(${t.id})">✏️ Editar</button><button class="action-btn" onclick="openTechEppModal(${t.id})">�️ EPP</button><button class="action-btn delete" onclick="deleteTech(${t.id})">🗑️ Borrar</button></td></tr>`;
        });
        tableBody.innerHTML = html || '<tr><td colspan="5" style="text-align:center; padding: 20px;">No se encontraron técnicos.</td></tr>';
    }

    // --- EPP Module Logic ---
    
    window.openTechEppModal = async (techId) => {
        if (!checkPermissions(true)) return;

        // Check Maintenance
        if (window.checkMaintenanceAndAlert && window.checkMaintenanceAndAlert('techs_epp', 'El módulo de EPP se encuentra en mantenimiento. Por favor intente más tarde.')) return;

        const tech = AppState.db.technicians.find(t => t.id == techId);
        if (!tech) return;

        if (!document.getElementById('tech-epp-modal')) {
             await window.renderTechsView();
        }

        // Reset Form
        const form = document.getElementById('epp-delivery-form');
        form.reset();
        document.getElementById('epp-tech-id').value = tech.id;
        document.getElementById('epp-tech-name').textContent = tech.name;
        
        // Set Date to Today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('epp-date').value = today;

        // Init Signature Pad
        const canvas = document.getElementById('epp-signature-pad');
        if (canvas) {
            // Resize canvas for high DPI
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext("2d").scale(ratio, ratio);

            if (eppSignaturePad) {
                eppSignaturePad.clear();
            } else {
                eppSignaturePad = new SignaturePad(canvas, {
                    backgroundColor: 'rgb(255, 255, 255)'
                });
            }
        }
        
        // Load History
        loadEppHistory(techId);

        openModal('tech-epp-modal');
    };

    async function loadEppHistory(techId) {
        const historyList = document.getElementById('epp-history-list'); // Actually we should probably use a container
        // Note: view.html has <div id="epp-history-list">
        
        if (!historyList) return;
        historyList.innerHTML = `
            <div style="padding: 10px;">
                <div class="skeleton"></div>
                <div class="skeleton"></div>
                <div class="skeleton"></div>
            </div>
        `;

        try {
            const response = await fetch(`api/get_epp_deliveries.php?technician_id=${techId}&company_id=${AppState.currentUser.companyId}`);
            const result = await response.json();

            if (!result.success) {
                historyList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--error-color);">Error al cargar historial</div>';
                return;
            }

            const deliveries = result.deliveries || [];
            
            if (deliveries.length === 0) {
                historyList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-medium);">No hay entregas registradas.</div>';
                return;
            }

            let html = '<div class="epp-list" style="display: flex; flex-direction: column; gap: 15px;">';
            
            deliveries.forEach(d => {
                const date = new Date(d.delivery_date).toLocaleDateString('es-MX');
                const expiration = d.expiration_date ? `<span style="font-size: 0.8rem; color: var(--text-medium);">Caduca: ${new Date(d.expiration_date).toLocaleDateString('es-MX')}</span>` : '';
                
                html += `
                    <div class="epp-item" style="background: var(--bg-light); padding: 15px; border-radius: 8px; border-left: 4px solid var(--accent-primary);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong style="color: var(--text-dark);">${escapeHtmlLocal(d.equipment_type)}</strong>
                            <span style="font-weight: bold; color: var(--accent-primary);">${d.quantity} pza(s)</span>
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-medium); margin-bottom: 5px;">
                            Motivo: ${escapeHtmlLocal(d.reason)} | Estado: ${escapeHtmlLocal(d.equipment_status)}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.85rem; color: var(--text-light);">${date}</span>
                            ${expiration}
                        </div>
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-color);">
                            <div style="font-size: 0.8rem; color: var(--text-medium);">Firma:</div>
                            <img src="${d.signature_path}" alt="Firma" style="height: 40px; border: 1px solid #eee; background: white; padding: 2px;">
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            historyList.innerHTML = html;

        } catch (error) {
            console.error('Error loading EPP history:', error);
            historyList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--error-color);">Error de conexión</div>';
        }
    }

    async function handleEppDeliverySubmit(e) {
        e.preventDefault();
        
        if (!eppSignaturePad || eppSignaturePad.isEmpty()) {
            showAlert('Por favor solicite la firma del técnico.', 'Firma requerida');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const formData = new FormData();
        formData.append('company_id', AppState.currentUser.companyId);
        formData.append('technician_id', document.getElementById('epp-tech-id').value);
        formData.append('delivery_date', document.getElementById('epp-date').value);
        formData.append('equipment_type', document.getElementById('epp-type').value);
        formData.append('quantity', document.getElementById('epp-quantity').value);
        formData.append('reason', document.getElementById('epp-reason').value);
        formData.append('equipment_status', document.getElementById('epp-status').value);
        formData.append('expiration_date', document.getElementById('epp-expiration').value);
        formData.append('signature', eppSignaturePad.toDataURL());

        try {
            const response = await fetch('api/add_epp_delivery.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                showAlert('Entrega de EPP registrada correctamente', 'Éxito');
                e.target.reset();
                eppSignaturePad.clear();
                
                // Restore tech name and id as reset clears them (actually hidden input is cleared, tech name is div)
                // Wait, reset() clears input values. We need to restore tech-id.
                // Or better, just reload history and keep modal open.
                
                // Restore Tech ID (it might have been cleared by reset)
                // Actually reset() clears values of inputs. So tech-id hidden input is cleared.
                // We should grab it before reset or restore it.
                // Let's just re-set it from the variable we can capture.
                const techId = formData.get('technician_id');
                document.getElementById('epp-tech-id').value = techId;
                
                // Re-set date to today
                document.getElementById('epp-date').value = new Date().toISOString().split('T')[0];
                
                loadEppHistory(techId);
                // Notificar a otros módulos para refrescar EPP en tiempo real
                try {
                    const companyId = AppState.currentUser && AppState.currentUser.companyId ? AppState.currentUser.companyId : null;
                    window.dispatchEvent(new CustomEvent('epp:delivery:created', {
                        detail: {
                            companyId,
                            technicianId: techId
                        }
                    }));
                } catch (_) {}
            } else {
                showAlert(result.message || 'Error al registrar entrega', 'Error');
            }
        } catch (error) {
            console.error('Error submitting EPP:', error);
            showAlert('Error de conexión al registrar entrega', 'Error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    // --- Tech Profile Modal Logic ---
    let currentTechProfileId = null;
    let currentTechProfileTab = 'Certificación';

    window.switchTechProfileTab = function(tabName) {
        currentTechProfileTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tech-profile-body .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('onclick').includes(tabName)) {
                btn.classList.add('active');
            }
        });
        
        // Reload documents for the selected tab
        if (currentTechProfileId) {
            loadTechProfileDocuments(currentTechProfileId, tabName);
        }
    };

    window.openTechProfile = async (id) => {
        if (!checkPermissions(true)) return;
        
        const tech = AppState.db.technicians.find(t => t.id == id);
        if (!tech) return;

        if (!document.getElementById('tech-profile-modal')) {
            await window.renderTechsView();
        }

        currentTechProfileId = id;

        // Populate basic info
        getEl('tech-profile-name').textContent = tech.name;
        
        // Photo Display
        const photoDisplay = document.getElementById('profile-tech-photo-display');
        if (photoDisplay) {
            if (tech.photo) {
                photoDisplay.style.backgroundImage = `url('${tech.photo}')`;
                photoDisplay.textContent = '';
            } else {
                photoDisplay.style.backgroundImage = 'none';
                photoDisplay.innerHTML = '<span style="display: flex; height: 100%; align-items: center; justify-content: center; font-size: 3rem; color: var(--text-medium);">👤</span>';
            }
        }

        getEl('profile-tech-phone').textContent = tech.phone || 'N/A';
        getEl('profile-tech-code').textContent = tech.access_code || 'N/A';
        getEl('profile-tech-address').textContent = tech.address || 'N/A';
        getEl('profile-tech-start-date').textContent = tech.start_date ? formatDate(tech.start_date) : 'No registrada';
        getEl('profile-tech-salary').textContent = tech.base_salary ? formatCurrency(tech.base_salary) : 'No registrado';
        
        // Calculate seniority
        if (tech.start_date) {
            const start = new Date(tech.start_date);
            const now = new Date();
            const diffTime = Math.abs(now - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const years = Math.floor(diffDays / 365);
            const months = Math.floor((diffDays % 365) / 30);
            
            let seniorityText = '';
            if (years > 0) seniorityText += `${years} año(s) `;
            if (months > 0) seniorityText += `${months} mes(es)`;
            if (years === 0 && months === 0) seniorityText = 'Menos de 1 mes';
            
            getEl('profile-tech-seniority').textContent = seniorityText;
        } else {
            getEl('profile-tech-seniority').textContent = 'N/A';
        }

        // Configure Add Document button
        const addDocBtn = getEl('btn-add-doc-from-profile');
        if (addDocBtn) {
            addDocBtn.onclick = () => {
                // Pre-select the current tab category when opening the upload modal
                openTechDocumentsModal(tech.id, currentTechProfileTab);
            };
        }

        // Open modal and load default tab
        openModal('tech-profile-modal');
        switchTechProfileTab('Examen Médico');
    };

    async function loadTechProfileDocuments(techId, category) {
        const listEl = getEl('tech-docs-container');
        if (!listEl) return;
        listEl.innerHTML = `
            <div style="padding: 10px;">
                <div class="skeleton"></div>
                <div class="skeleton"></div>
            </div>
        `;

        try {
            const result = await apiCall(`get_documents.php?company_id=${AppState.currentUser.companyId}`);
            if (!result.success) {
                listEl.innerHTML = '<div style="padding: 20px; color: var(--error-color); text-align: center;">Error al cargar documentos.</div>';
                return;
            }

            const allDocs = result.documents || [];
            // Filter by Tech ID AND Category
            const docs = allDocs.filter(doc => 
                doc.description && 
                doc.description.indexOf('#TECHID:' + techId) !== -1 &&
                doc.category === category
            );

            if (!docs.length) {
                listEl.innerHTML = `<div style="padding: 40px; color: var(--text-medium); text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="font-size: 3rem; margin-bottom: 10px; opacity: 0.5;">📂</div>
                    <p>No hay documentos en la categoría <strong>${category}</strong>.</p>
                </div>`;
                return;
            }

            let html = '<div class="docs-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">';
            
            docs.forEach(doc => {
                const isExpired = doc.is_expired;
                
                let expirationHtml = '';
                if (doc.expiration_date) {
                     if (doc.is_expired) {
                         expirationHtml = `<span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background-color: rgba(239, 68, 68, 0.1); color: var(--error-color); border: 1px solid var(--error-color);">⚠️ Vencido</span>`;
                     } else if (doc.days_until_expiration !== null && doc.days_until_expiration <= 30) {
                         expirationHtml = `<span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background-color: rgba(245, 158, 11, 0.1); color: #F59E0B; border: 1px solid #F59E0B;">⏰ Vence en ${doc.days_until_expiration} días</span>`;
                     } else {
                         expirationHtml = `<span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background-color: rgba(16, 185, 129, 0.1); color: var(--accent-primary); border: 1px solid var(--accent-primary);">✓ Vence: ${formatDate(doc.expiration_date)}</span>`;
                     }
                }

                const icon = doc.file_type === 'pdf' ? '📄' : '🖼️';
                
                html += `
                    <div class="doc-card" style="background: var(--bg-light); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div style="font-size: 2rem;">${icon}</div>
                            ${expirationHtml}
                        </div>
                        
                        <h4 style="margin: 0 0 5px 0; font-size: 0.9rem; flex-grow: 1;">${escapeHtmlLocal(doc.name)}</h4>
                        <p style="font-size: 0.8rem; color: var(--text-medium); margin-bottom: 15px;">${formatDate(doc.uploaded_at)}</p>
                        
                        <div style="display: flex; gap: 5px; margin-top: auto;">
                            <button class="action-btn small info" style="flex: 1;" onclick="openTechDocumentPreview(${doc.id}, '${escapeHtmlLocal(doc.file_path)}', '${escapeHtmlLocal(doc.file_type)}', '${escapeHtmlLocal(doc.file_name)}')">Ver</button>
                            <button class="action-btn small" style="flex: 1;" onclick="downloadDocument(${doc.id})">Descargar</button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            listEl.innerHTML = html;

        } catch (error) {
            console.error('Error loading profile docs:', error);
            listEl.innerHTML = '<div style="padding: 20px; color: var(--error-color); text-align: center;">Error de conexión.</div>';
        }
    }

    window.openTechModal = async (id = null) => { 
        if (!checkPermissions(true)) return;
        
        if (!document.getElementById('tech-modal')) {
            console.warn('Tech modal not loaded yet, attempting to reload view...');
            isViewLoaded = false;
            await window.renderTechsView();
            
            if (!document.getElementById('tech-modal')) {
                 console.error('Tech modal still not loaded after retry');
                 alert('Error: No se pudo cargar el formulario. Por favor recargue la página.');
                 return;
            }
        }

        getEl('tech-form').reset(); 
        getEl('tech-id').value = ''; 
        
        const preview = document.getElementById('tech-photo-preview');
        if (preview) {
            preview.style.display = 'none';
            preview.style.backgroundImage = '';
        }

        if (id) { 
            const tech = AppState.db.technicians.find(t => t.id == id); 
            if (!tech) return; 
            
            if (tech.photo && preview) {
                preview.style.display = 'block';
                preview.style.backgroundImage = `url('${tech.photo}')`;
            }

            getEl('tech-modal-title').textContent = 'Editar Técnico'; 
            getEl('tech-id').value = tech.id; 
            getEl('tech-name').value = tech.name; 
            getEl('tech-phone').value = tech.phone; 
            getEl('tech-address').value = tech.address; 
            getEl('tech-start-date').value = tech.start_date || '';
            getEl('tech-base-salary').value = tech.base_salary || '';
            const docsBtn = document.getElementById('tech-documents-button');
            if (docsBtn) {
                docsBtn.style.display = 'inline-flex';
                docsBtn.onclick = function() {
                    openTechDocumentsModal(tech.id);
                };
            }
        } else { 
            getEl('tech-modal-title').textContent = 'Agregar Nuevo Técnico'; 
            const docsBtn = document.getElementById('tech-documents-button');
            if (docsBtn) {
                docsBtn.style.display = 'none';
                docsBtn.onclick = null;
            }
        } 
        openModal('tech-modal'); 
    };

    window.openTechDocumentsModal = async (id, category = null) => {
        if (!checkPermissions(true)) return;
        const tech = AppState.db.technicians.find(t => t.id == id);
        if (!tech) return;
        currentTechForUpload = tech;

        if (!document.getElementById('tech-doc-modal')) {
            console.warn('Tech documents modal not loaded yet, attempting to reload view...');
            isViewLoaded = false;
            await window.renderTechsView();
            if (!document.getElementById('tech-doc-modal')) {
                console.error('Tech documents modal still not loaded after retry');
                alert('Error: No se pudo cargar el gestor de documentos del técnico. Por favor recargue la página.');
                return;
            }
        }

        const nameEl = document.getElementById('tech-doc-tech-name');
        if (nameEl) {
            nameEl.textContent = tech.name;
        }

        const typeSelect = document.getElementById('tech-doc-type');
        const expirationInput = document.getElementById('tech-doc-expiration');
        const fileInput = document.getElementById('tech-doc-file');
        
        if (typeSelect) {
            typeSelect.value = category || 'Examen Médico';
        }
        if (expirationInput) expirationInput.value = '';
        if (fileInput) fileInput.value = '';

        await loadTechDocumentsList(tech.id);

        openModal('tech-doc-modal');
    };

    async function handleTechDocFormSubmit(e) {
        e.preventDefault();
        if (!currentTechForUpload) {
            showAlert('No se encontró el técnico seleccionado.', 'Error');
            return;
        }

        const fileInput = document.getElementById('tech-doc-file');
        if (!fileInput || !fileInput.files[0]) {
            showAlert('Por favor selecciona un archivo.', 'Error');
            return;
        }

        const typeSelect = document.getElementById('tech-doc-type');
        const expirationInput = document.getElementById('tech-doc-expiration');

        const formData = new FormData();
        const selectedType = typeSelect ? typeSelect.value : 'Otros';
        formData.append('file', fileInput.files[0]);
        formData.append('company_id', AppState.currentUser.companyId);
        formData.append('name', selectedType + ' - ' + currentTechForUpload.name);
        formData.append('description', 'Documento asociado al técnico ' + currentTechForUpload.name + ' #TECHID:' + currentTechForUpload.id);
        formData.append('category', selectedType);
        formData.append('expiration_date', expirationInput ? (expirationInput.value || '') : '');
        formData.append('uploaded_by', AppState.currentUser.id || '');

        const submitBtn = e.target.querySelector('button[type="submit"]');
        let originalText = '';
        if (submitBtn) {
            originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Subiendo...';
        }

        try {
            const response = await fetch('api/upload_document.php', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                showAlert('Documento del técnico subido correctamente', 'Éxito');
                await loadTechDocumentsList(currentTechForUpload.id);
                // Also reload profile view if open
                if (currentTechProfileId === currentTechForUpload.id) {
                    loadTechProfileDocuments(currentTechProfileId, currentTechProfileTab);
                }
                
                if (fileInput) fileInput.value = '';
                if (expirationInput) expirationInput.value = '';
                // Keep the type selected to allow uploading multiple docs of same type
            } else {
                showAlert(result.message || 'Error al subir el documento del técnico', 'Error');
            }
        } catch (error) {
            console.error('Error al subir documento del técnico:', error);
            showAlert('Error al subir el documento del técnico. Por favor, intenta de nuevo.', 'Error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText || '📤 Subir Documento';
            }
        }
    }

    async function loadTechDocumentsList(techId) {
        const listEl = document.getElementById('tech-documents-list');
        if (!listEl) return;
        listEl.innerHTML = '<div style="padding: 10px; color: var(--text-medium);">Cargando documentos...</div>';

        try {
            const result = await apiCall(`get_documents.php?company_id=${AppState.currentUser.companyId}`);
            if (!result.success) {
                listEl.innerHTML = '<div style="padding: 10px; color: var(--error-color);">Error al cargar documentos.</div>';
                return;
            }

            const allDocs = result.documents || [];
            const docs = allDocs.filter(doc => doc.description && doc.description.indexOf('#TECHID:' + techId) !== -1);

            if (!docs.length) {
                listEl.innerHTML = '<div style="padding: 10px; color: var(--text-medium);">Este técnico aún no tiene documentos cargados.</div>';
                return;
            }

            const rows = docs.map(doc => {
                const status = !doc.expiration_date
                    ? 'N/A'
                    : doc.is_expired
                        ? '<span style="color: var(--error-color); font-weight: bold;">Vencido</span>'
                        : (doc.days_until_expiration !== null && doc.days_until_expiration <= 30)
                            ? '<span style="color: var(--accent-secondary); font-weight: bold;">Vence en ' + doc.days_until_expiration + ' días</span>'
                            : '<span style="color: var(--accent-primary); font-weight: bold;">Válido hasta ' + formatDate(doc.expiration_date) + '</span>';

                const safeName = escapeHtmlLocal(doc.name);
                const safeCategory = escapeHtmlLocal(doc.category || '');
                const safeFilePath = escapeHtmlLocal(doc.file_path);
                const safeFileType = escapeHtmlLocal(doc.file_type);
                const safeFileName = escapeHtmlLocal(doc.file_name);

                return '<tr>' +
                    '<td>' + safeName + '</td>' +
                    '<td>' + safeCategory + '</td>' +
                    '<td>' + status + '</td>' +
                    '<td class="action-cell">' +
                    '<button class="action-btn info" onclick="openTechDocumentPreview(' + doc.id + ', \'' + safeFilePath + '\', \'' + safeFileType + '\', \'' + safeFileName + '\')">👁️ Ver</button>' +
                    '<button class="action-btn info" onclick="downloadDocument(' + doc.id + ')">📥 Descargar</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');

            listEl.innerHTML =
                '<table class="data-table">' +
                '<thead><tr><th>Nombre</th><th>Tipo</th><th>Vencimiento</th><th class="action-cell">Acciones</th></tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
                '</table>';
        } catch (error) {
            console.error('Error al cargar documentos del técnico:', error);
            listEl.innerHTML = '<div style="padding: 10px; color: var(--error-color);">Error al cargar documentos del técnico.</div>';
        }
    }

    function escapeHtmlLocal(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    window.openTechDocumentPreview = async function(documentId, filePath, fileType, fileName) {
        try {
            if (typeof closeModal === 'function') {
                closeModal('tech-doc-modal');
            }
            if (window.loadLibraryView) {
                await window.loadLibraryView();
            }
            if (window.previewDocument) {
                window.previewDocument(documentId, filePath, fileType, fileName);
            } else {
                downloadDocument(documentId);
            }
        } catch (e) {
            console.error('Error al previsualizar documento del técnico:', e);
            downloadDocument(documentId);
        }
    };

    async function handleSaveTech(e) {
        if (e) e.preventDefault();
        
        const id = getEl('tech-id').value; 
        
        const formData = new FormData();
        formData.append('id', id || '');
        formData.append('company_id', AppState.currentUser.companyId);
        formData.append('name', getEl('tech-name').value);
        formData.append('phone', getEl('tech-phone').value);
        formData.append('address', getEl('tech-address').value);
        formData.append('start_date', getEl('tech-start-date').value);
        formData.append('base_salary', getEl('tech-base-salary').value);
        
        const fileInput = document.getElementById('tech-photo');
        if (fileInput && fileInput.files[0]) {
            formData.append('photo', fileInput.files[0]);
        }
        
        const endpoint = id ? 'edit_technician.php' : 'add_technician.php'; 
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        let originalText = 'Guardar';
        if (submitBtn) {
             originalText = submitBtn.textContent;
             submitBtn.disabled = true;
             submitBtn.textContent = 'Guardando...';
        }

        try {
             const response = await fetch('api/' + endpoint, { method: 'POST', body: formData }); 
             const result = await response.json();
             
             if (result.success) { 
                 if(result.message) showAlert(result.message, 'Éxito'); 
                 await refreshAllDataAndViews(); 
                 closeModal('tech-modal'); 
             } else { 
                 showAlert(result.message || 'Ocurrió un error al guardar el técnico.', 'Error'); 
             }
        } catch (err) {
             console.error(err);
             showAlert('Error de conexión', 'Error');
        } finally {
             if (submitBtn) {
                 submitBtn.disabled = false;
                 submitBtn.textContent = originalText;
             }
        }
    }

    window.deleteTech = async (id) => { 
        if (!checkPermissions(true)) return;
        showConfirm('¿Seguro que quieres eliminar este técnico? Esta acción no se puede deshacer.', 'Confirmar Eliminación', async (confirmed) => { 
            if (confirmed) { 
                const result = await apiCall(`delete_technician.php?id=${id}`, { method: 'GET' }); 
                if (result.success) { await refreshAllDataAndViews(); } 
                else { showAlert(result.message || 'No se pudo eliminar el técnico.', 'Error'); } 
            } 
        }); 
    };

    // Manejo del envío del formulario de documentos
    const docForm = document.getElementById('tech-doc-form');
    if (docForm) {
        docForm.addEventListener('submit', handleTechDocFormSubmit);
    }

    // Initialize module
    renderTechsTable();
})();
