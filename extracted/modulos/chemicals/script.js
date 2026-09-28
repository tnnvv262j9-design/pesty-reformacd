(function() {
    let isViewLoaded = false;
    window.currentChemicalId = null;

    window.renderChemicalsView = async function() {
        if (!isViewLoaded) {
            await loadViewHtml();
        }
        await loadChemicals(); // Fetch fresh data
        renderChemicalsTable();
    };

    async function loadViewHtml() {
        const container = getEl('chemicals-view');
        if (!container) return;

        try {
            const version = window.APP_VERSION || new Date().getTime();
            const response = await fetch('modulos/chemicals/view.html?v=' + version);
            if (!response.ok) throw new Error('Failed to load view');
            const html = await response.text();
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const modals = tempDiv.querySelectorAll('.modal');
            if (modals.length > 0) {
                modals.forEach(modal => {
                    const existingModal = document.getElementById(modal.id);
                    if (existingModal) existingModal.remove();
                    document.body.appendChild(modal);
                });
            }

            container.innerHTML = tempDiv.innerHTML;
            
            // Check Role for Add Button
            const addBtn = getEl('btn-add-chemical-inv');
            if (addBtn) {
                const isAdmin = AppState.currentUser && AppState.currentUser.type === 'company';
                addBtn.style.display = isAdmin ? 'inline-block' : 'none';
            }

            const searchInput = getEl('chemical-search');
            if (searchInput) searchInput.addEventListener('input', renderChemicalsTable);
            
            const form = getEl('chemical-form');
            if (form) form.addEventListener('submit', handleSaveChemical);

            const stockForm = getEl('stock-form');
            if (stockForm) stockForm.addEventListener('submit', handleAddStock);

            // Auto calculate cost per ml
            const priceInput = getEl('chemical-price');
            const qtyInput = getEl('chemical-quantity');
            
            const updateCost = () => {
                const price = parseFloat(priceInput.value) || 0;
                const qty = parseFloat(qtyInput.value) || 0;
                const cost = qty > 0 ? (price / qty).toFixed(4) : 0;
                getEl('chemical-cost-calculated').value = `$${cost}`;
            };
            
            if (priceInput) priceInput.addEventListener('input', updateCost);
            if (qtyInput) qtyInput.addEventListener('input', updateCost);

            const labelInput = getEl('chemical-label-input');
            if (labelInput) labelInput.addEventListener('change', handleChemicalLabelFile);

            isViewLoaded = true;

        } catch (error) {
            console.error('Error loading chemicals view:', error);
            container.innerHTML = '<p class="error">Error al cargar la vista de químicos.</p>';
        }
    }

    async function loadChemicals() {
        if (!AppState.currentUser) return;
        try {
            const response = await fetch(`api/get_chemicals.php?company_id=${AppState.currentUser.companyId}`);
            const data = await response.json();
            if (data.success) {
                AppState.db.chemicals = data.chemicals;
            } else {
                console.error('Error loading chemicals:', data.message);
            }
        } catch (e) {
            console.error('Network error loading chemicals:', e);
        }
    }

    function renderChemicalsTable() {
        const table = document.querySelector('#chemicals-table');
        if (!table) return;
        
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        const isAdmin = AppState.currentUser && AppState.currentUser.type === 'company';
        const isPrivacy = window.isPrivacyMode && window.isPrivacyMode();
        
        // Show skeletons if no data and loading (or just empty)
        if (!AppState.db.chemicals || AppState.db.chemicals.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="10"><div class="skeleton"></div></td></tr>
                <tr><td colspan="10"><div class="skeleton"></div></td></tr>
                <tr><td colspan="10"><div class="skeleton"></div></td></tr>
            `;
            // If we actually have data but it's empty after fetch, it will be overwritten below
        }
        
        // Render Header
        let headerHtml = `
            <tr>
                <th>Producto</th>
                <th>Concentración</th>
                <th>RSCO</th>
                <th>Ingrediente Activo</th>
                <th>Lote</th>
                <th>Caducidad</th>
                <th>Stock Actual</th>
        `;
        if (isAdmin && !isPrivacy) {
            headerHtml += `<th>Costo Unitario</th>`;
        }
        headerHtml += `
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        `;
        thead.innerHTML = headerHtml;

        const searchTerm = getEl('chemical-search') ? getEl('chemical-search').value.toLowerCase() : '';
        
        let chemicals = AppState.db.chemicals || [];
        
        // Filter
        chemicals = chemicals.filter(c => 
            c.name.toLowerCase().includes(searchTerm) || 
            (c.concentration && c.concentration.toLowerCase().includes(searchTerm)) ||
            (c.rsco && c.rsco.toLowerCase().includes(searchTerm)) ||
            (c.active_ingredient && c.active_ingredient.toLowerCase().includes(searchTerm))
        );

        if (chemicals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">No hay productos registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = chemicals.map(c => {
            const statusClass = c.stock_status === 'Bajo' || c.stock_status === 'Agotado' ? 'status-cancelled' : 'status-completed'; // Reuse existing classes
            const statusLabel = c.stock_status === 'Bajo' ? 'Bajo Stock' : (c.stock_status === 'Agotado' ? 'Agotado' : 'OK');
            const unit = c.measurement_unit || 'ml';
            
            let rowHtml = `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.concentration || '-'}</td>
                <td>${c.rsco || '-'}</td>
                <td>${c.active_ingredient || '-'}</td>
                <td>${c.batch_number || '-'}</td>
                <td>${c.expiration_date || '-'}</td>
                <td>${parseFloat(c.current_stock_ml).toFixed(2)} ${unit}</td>`;
            
            if (isAdmin && !isPrivacy) {
                rowHtml += `<td>$${parseFloat(c.cost_per_ml).toFixed(4)} / ${unit}</td>`;
            }

            rowHtml += `<td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <div class="action-group">
                        <button class="action-btn btn-stock" onclick="openAddStockModal(${c.id})" title="Añadir Stock">📦 Stock</button>
                        <button class="action-btn btn-fichas" onclick="openDocumentsModal(${c.id}, 'datasheet')" title="Fichas Técnicas">📄 Fichas</button>
                        <button class="action-btn btn-methods" onclick="openDocumentsModal(${c.id}, 'method')" title="Métodos">🛠️ Métodos</button>`;
            
            if (isAdmin) {
                rowHtml += `
                        <button class="action-btn btn-edit" onclick="openChemicalModal(${c.id})" title="Editar">✏️ Editar</button>
                        <button class="action-btn btn-delete" onclick="deleteChemical(${c.id})" title="Eliminar">🗑️ Eliminar</button>`;
            }
            
            rowHtml += `</div></td></tr>`;
            return rowHtml;
        }).join('');
    }

    window.triggerChemicalLabelScan = function() {
        const input = getEl('chemical-label-input');
        if (input) input.click();
    };

    async function handleChemicalLabelFile(event) {
        const input = event.target;
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];

        const formData = new FormData();
        formData.append('image', file);

        const button = getEl('btn-scan-label');
        if (button) {
            button.disabled = true;
            button.textContent = 'Escaneando...';
        }

        try {
            const res = await fetch('api/scan_chemical_label.php', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();

            if (result.success && result.data) {
                const data = result.data;
                if (data.name) {
                    getEl('chemical-name').value = data.name;
                }
                if (data.concentration) {
                    getEl('chemical-concentration').value = data.concentration;
                }
                if (data.quantity) {
                    getEl('chemical-quantity').value = data.quantity;
                    const eventInput = new Event('input');
                    getEl('chemical-quantity').dispatchEvent(eventInput);
                }
                showAlert('Datos extraídos de la etiqueta. Revisa antes de guardar.', 'success');
            } else {
                showAlert(result.message || 'No se pudo leer la etiqueta del producto.', 'error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error al conectar con el servicio de escaneo.', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = '📷 Escanear etiqueta';
            }
            input.value = '';
        }
    }

    window.openChemicalModal = function(id = null) {
        window.currentChemicalId = id;
        
        if (!id) {
             // Check limits for new chemical
             const currentCount = AppState.db.chemicals ? AppState.db.chemicals.length : 0;
             const limit = parseInt(AppState.currentUser.limit_chemicals || 0);
             const isSuperAdmin = AppState.currentUser.isSuperAdmin;

             if (!isSuperAdmin && limit > 0 && currentCount >= limit) {
                 showAlert(`Has alcanzado el límite de tu plan (${currentCount}/${limit}). Actualiza tu plan para añadir más químicos.`, 'warning');
                 return;
             }
        }

        const title = getEl('chemical-modal-title');
        const form = getEl('chemical-form');
        const typeSelection = getEl('chemical-type-selection');
        const backBtn = getEl('btn-back-type');
        
        form.reset();
        
        if (id) {
            if (!AppState.db.chemicals) {
                 showAlert('Error: Base de datos de químicos no cargada.', 'error');
                 return;
            }
            const chemical = AppState.db.chemicals.find(c => c.id == id);
            if (chemical) {
                title.textContent = 'Editar Producto';
                
                // Determine type (use 'liquid' if undefined for legacy compatibility)
                const type = chemical.type || 'liquid';
                
                // Configure form without resetting values
                selectChemicalType(type, false);
                
                getEl('chemical-id').value = chemical.id;
                getEl('chemical-name').value = chemical.name;
                getEl('chemical-concentration').value = chemical.concentration;
                getEl('chemical-rsco').value = chemical.rsco || '';
                getEl('chemical-active-ingredient').value = chemical.active_ingredient || '';
                getEl('chemical-batch-number').value = chemical.batch_number || '';
                getEl('chemical-expiration-date').value = chemical.expiration_date || '';
                getEl('chemical-quantity').value = chemical.quantity_bought_ml;
                getEl('chemical-price').value = chemical.price_total;
                getEl('chemical-min-stock').value = chemical.min_stock_ml;
                
                // Trigger cost calculation
                const event = new Event('input');
                getEl('chemical-quantity').dispatchEvent(event);
                
                // Hide selection, show form, hide back button (editing locks type for simplicity)
                typeSelection.style.display = 'none';
                form.style.display = 'block';
                if(backBtn) backBtn.style.display = 'none';
            }
        } else {
            title.textContent = 'Nuevo Producto';
            getEl('chemical-id').value = '';
            getEl('chemical-cost-calculated').value = '';
            
            // Show selection, hide form
            typeSelection.style.display = 'block';
            form.style.display = 'none';
            if(backBtn) backBtn.style.display = 'inline-block';
        }
        
        openModal('chemical-modal');
    };

    window.selectChemicalType = function(type, reset = true) {
        getEl('chemical-type').value = type;
        const form = getEl('chemical-form');
        const typeSelection = getEl('chemical-type-selection');
        
        // UI Logic
        typeSelection.style.display = 'none';
        form.style.display = 'block';
        
        // Configure Form based on type
        const unitMap = {
            'liquid': 'ml',
            'powder': 'g',
            'gel': 'g',
            'trap': 'unidades',
            'other': 'unidades'
        };
        const unit = unitMap[type] || 'ml';
        getEl('chemical-unit').value = unit;
        
        // Labels
        getEl('label-quantity').textContent = `Cantidad Comprada (${unit})`;
        getEl('label-min-stock').textContent = `Stock Mínimo (${unit})`;
        getEl('label-cost-calculated').textContent = `Costo por ${unit}`;
        
        // Visibility
        const groupConc = getEl('group-concentration');
        if (type === 'trap' || type === 'other') {
            groupConc.style.display = 'none';
        } else {
            groupConc.style.display = 'block';
        }
        
        if (reset) {
            getEl('chemical-name').value = '';
            getEl('chemical-concentration').value = '';
            getEl('chemical-rsco').value = '';
            getEl('chemical-active-ingredient').value = '';
            getEl('chemical-batch-number').value = '';
            getEl('chemical-expiration-date').value = '';
            getEl('chemical-quantity').value = '';
            getEl('chemical-price').value = '';
            getEl('chemical-min-stock').value = '0';
            getEl('chemical-cost-calculated').value = '';
        }
    };

    window.resetToTypeSelection = function() {
        getEl('chemical-form').style.display = 'none';
        getEl('chemical-type-selection').style.display = 'block';
        getEl('chemical-modal-title').textContent = 'Nuevo Producto';
    };

    async function handleSaveChemical(e) {
        e.preventDefault();
        
        const id = getEl('chemical-id').value;
        const isEdit = !!id;
        const endpoint = isEdit ? 'api/edit_chemical.php' : 'api/add_chemical.php';
        
        const data = {
            company_id: AppState.currentUser.companyId,
            name: getEl('chemical-name').value,
            concentration: getEl('chemical-concentration').value,
            rsco: getEl('chemical-rsco').value,
            active_ingredient: getEl('chemical-active-ingredient').value,
            batch_number: getEl('chemical-batch-number').value,
            expiration_date: getEl('chemical-expiration-date').value,
            quantity_bought_ml: getEl('chemical-quantity').value,
            price_total: getEl('chemical-price').value,
            min_stock_ml: getEl('chemical-min-stock').value,
            type: getEl('chemical-type').value,
            measurement_unit: getEl('chemical-unit').value
        };

        if (isEdit) data.id = id;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            let result;
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                result = await res.json();
            } else {
                const text = await res.text();
                result = { success: false, message: text || 'Error del servidor (respuesta no JSON).' };
            }
            
            if (result.success) {
                showAlert(result.message, 'success');
                closeModal('chemical-modal');
                await loadChemicals();
                renderChemicalsTable();
            } else {
                showAlert(result.message || 'No se pudo guardar el químico.', 'error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error de conexión', 'error');
        }
    }

    window.openAddStockModal = function(id) {
        if (!AppState.db.chemicals) return;
        const chemical = AppState.db.chemicals.find(c => c.id == id);
        if (!chemical) return;
        
        const unit = chemical.measurement_unit || 'ml';
        
        getEl('stock-chemical-id').value = id;
        getEl('stock-chemical-name').textContent = chemical.name;
        getEl('stock-amount').value = '';
        getEl('stock-cost').value = '';
        getEl('stock-batch-number').value = '';
        getEl('stock-expiration-date').value = '';
        
        const label = document.querySelector('label[for="stock-amount"]');
        if (label) label.textContent = `Cantidad a añadir (${unit})`;
        
        openModal('stock-modal');
    };

    async function handleAddStock(e) {
        e.preventDefault();
        const id = getEl('stock-chemical-id').value;
        const amount = getEl('stock-amount').value;
        const cost = getEl('stock-cost').value;
        const batch = getEl('stock-batch-number').value;
        const expiration = getEl('stock-expiration-date').value;

        if (!batch) {
            showAlert('El Número de Lote es obligatorio', 'warning');
            return;
        }
        if (!expiration) {
            showAlert('La Fecha de Caducidad es obligatoria', 'warning');
            return;
        }

        try {
            const res = await fetch('api/add_chemical_stock.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: id, 
                    ml_to_add: amount,
                    cost: cost,
                    batch_number: batch,
                    expiration_date: expiration
                })
            });
            const result = await res.json();
            
            if (result.success) {
                showAlert(result.message, 'success');
                closeModal('stock-modal');
                await loadChemicals();
                renderChemicalsTable();
            } else {
                showAlert(result.message, 'error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error de conexión', 'error');
        }
    }

    window.deleteChemical = async function(id) {
        if (!confirm('¿Estás seguro de eliminar este químico? No aparecerá en nuevos reportes.')) return;

        try {
            const res = await fetch('api/delete_chemical.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });
            const result = await res.json();
            
            if (result.success) {
                showAlert(result.message, 'success');
                await loadChemicals();
                renderChemicalsTable();
            } else {
                showAlert(result.message, 'error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error de conexión', 'error');
        }
    };

    // --- DOCUMENTS LOGIC ---

    window.openDocumentsModal = function(id, type) {
        window.currentChemicalId = id;
        window.currentDocType = type;
        
        getEl('doc-chemical-id').value = id;
        getEl('doc-type').value = type;
        getEl('doc-file').value = ''; // Reset file input
        
        const title = type === 'datasheet' ? 'Fichas Técnicas' : 'Métodos de Aplicación';
        getEl('documents-modal-title').textContent = title;
        
        loadDocuments(id, type);
        openModal('documents-modal');
    };

    window.loadDocuments = async function(id, type) {
        const listContainer = getEl('documents-list');
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Cargando documentos...</p>';
        
        try {
            const res = await fetch(`api/get_chemical_documents.php?chemical_id=${id}&type=${type}`);
            const result = await res.json();
            
            if (result.success && result.documents && result.documents.length > 0) {
                listContainer.innerHTML = result.documents.map(doc => `
                    <div class="document-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border: 1px solid var(--border-color); border-radius: 6px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.5rem;">${getFileIcon(doc.file_name)}</span>
                            <div>
                                <a href="${doc.file_path}" target="_blank" style="font-weight: 600; color: var(--accent-primary); text-decoration: none;">${doc.file_name}</a>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(doc.uploaded_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <button onclick="deleteDocument(${doc.id})" style="background: none; border: none; cursor: pointer; color: var(--error-color); font-size: 1.2rem;" title="Eliminar">🗑️</button>
                    </div>
                `).join('');
            } else {
                listContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay documentos subidos.</p>';
            }
        } catch (error) {
            console.error(error);
            listContainer.innerHTML = '<p style="text-align: center; color: var(--error-color);">Error al cargar documentos.</p>';
        }
    };

    function getFileIcon(filename) {
        if (!filename) return '📄';
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'pdf') return '📕';
        if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
        if (['doc', 'docx'].includes(ext)) return '📝';
        return '📄';
    }

    window.deleteDocument = async function(id) {
        if (!confirm('¿Estás seguro de eliminar este documento?')) return;
        
        try {
            const res = await fetch('api/delete_chemical_document.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    id: id,
                    company_id: AppState.currentUser.companyId
                })
            });
            const result = await res.json();
            
            if (result.success) {
                showAlert('Documento eliminado.', 'success');
                loadDocuments(window.currentChemicalId, window.currentDocType);
            } else {
                showAlert(result.message || 'Error al eliminar.', 'error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error de conexión.', 'error');
        }
    };
    
    // Init form listener
    window.submitChemicalDocument = async function() {
        const form = getEl('upload-document-form');
        if (!form) return;
        const formData = new FormData(form);
        formData.append('company_id', AppState.currentUser.companyId);
        
        const btn = form.querySelector('button');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Subiendo...';
        
        try {
            const res = await fetch('api/upload_chemical_document.php', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            
            if (result.success) {
                showAlert('Documento subido correctamente.', 'success');
                form.reset();
                // Restore hidden fields
                getEl('doc-chemical-id').value = window.currentChemicalId;
                getEl('doc-type').value = window.currentDocType;
                
                loadDocuments(window.currentChemicalId, window.currentDocType);
            } else {
                showAlert(result.message || 'Error al subir.', 'error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error de conexión.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

})();
