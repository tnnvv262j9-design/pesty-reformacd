// Quotes Module Script
(function() {
    // HTML Template for the Quotes View
    const quotesViewHTML = `
        <div class="view-header">
            <h2 class="view-title">Gestión de <span class="highlight">Cotizaciones</span></h2>
            <button class="cta-button" onclick="openQuoteModal()">➕ Crear Cotización</button>
        </div>
        <div class="toolbar">
            <input type="text" id="quote-search" placeholder="Buscar por cliente o folio...">
            <select id="quote-filter-status" data-custom-select>
                <option value="">Todos los Estados</option>
                <option>Nueva</option>
                <option>Enviada</option>
                <option>Aceptada</option>
                <option>Rechazada</option>
                <option>Vencida</option>
            </select>
        </div>
        <div class="table-wrapper" style="margin-top: 20px;">
            <table class="data-table" id="quotes-table"></table>
        </div>
    `;

    // HTML Template for the Quote Modal
    const quoteModalHTML = `
        <div id="quote-modal" class="modal no-print">
            <div class="modal-content">
                <span class="modal-close" onclick="closeModal('quote-modal')">×</span>
                <h2 id="quote-modal-title"></h2>
                <form id="quote-form">
                    <input type="hidden" id="quote-id">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="quote-client">Cliente</label>
                            <select id="quote-client" data-custom-select required></select>
                        </div>
                        <div class="form-group">
                            <label for="quote-status">Estado</label>
                            <select id="quote-status" data-custom-select>
                                <option>Nueva</option><option>Enviada</option><option>Aceptada</option><option>Rechazada</option><option>Vencida</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="quote-issue-date">Fecha de Emisión</label>
                            <input type="date" id="quote-issue-date" required>
                        </div>
                        <div class="form-group">
                            <label for="quote-due-date">Fecha de Vencimiento</label>
                            <input type="date" id="quote-due-date" required>
                        </div>
                    </div>
                    <div class="line-items-container">
                        <h3 class="form-section-title" style="margin-top:0;">Conceptos</h3>
                        <div class="line-items-header">
                            <div>Descripción</div><div>Cantidad</div><div>Precio Unit.</div><div>Total</div><div></div>
                        </div>
                        <div id="quote-line-items"></div>
                        <button type="button" class="action-btn" onclick="addDocumentLineItem('quote')">+ Añadir Concepto</button>
                    </div>
                    <div class="document-totals">
                        <table>
                            <tbody>
                                <tr><td class="label">Subtotal:</td><td class="value" id="quote-subtotal"></td></tr>
                                <tr><td class="label">Descuento:</td><td class="value"><input type="number" id="quote-discount" value="0" step="0.01" style="text-align:right; width:120px; padding: 5px;"></td></tr>
                                <tr class="grand-total"><td class="label">Total:</td><td class="value" id="quote-total"></td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="form-group full-width" style="margin-top: 20px;">
                        <label for="quote-notes">Notas (Validez, condiciones, etc.)</label>
                        <textarea id="quote-notes"></textarea>
                    </div>
                    <button type="button" class="cta-button" style="width:100%; margin-top: 20px;" onclick="window.handleSaveQuote(event)">Guardar Cotización</button>
                </form>
            </div>
        </div>
    `;

    // Initialize Quotes Module
    window.renderQuotesView = function() {
        const container = getEl('quotes-view');
        if (!container.innerHTML.trim()) {
            container.innerHTML = quotesViewHTML;
            if (!getEl('quote-modal')) {
                document.body.insertAdjacentHTML('beforeend', quoteModalHTML);
            }
            
            // Attach event listeners
            getEl('quote-search').addEventListener('input', renderQuotesTable);
            getEl('quote-filter-status').addEventListener('change', renderQuotesTable);
            
            // Initialize custom selects in the view (filter)
            const filterSelect = getEl('quote-filter-status');
            if (filterSelect && window.createCustomSelect) createCustomSelect(filterSelect);
        }
        
        // Ensure form listeners are attached
        const form = getEl('quote-form');
        if (form && !form.dataset.listenerAttached) {
             // Ya no necesitamos submit listener porque usamos onclick en el botón
             form.dataset.listenerAttached = 'true';
             
             // Attach discount listener
             const discountInput = getEl('quote-discount');
             if (discountInput) {
                 discountInput.addEventListener('input', () => updateDocumentTotals('quote'));
             }
        }

        renderQuotesTable();
    };

    function renderQuotesTable() {
        console.log('Renderizando tabla de cotizaciones...');
        const table = getEl('quotes-table');
        if (!table) return;
        
        if (!table.querySelector('thead')) {
            table.innerHTML = '<thead><tr><th>Folio</th><th>Cliente</th><th>Fecha Emisión</th><th>Total</th><th>Estado</th><th class="action-cell">Acciones</th></tr></thead><tbody></tbody>';
        }
        const tableBody = table.querySelector('tbody');
        const isPrivacy = window.isPrivacyMode && window.isPrivacyMode();
        
        console.log('Clientes disponibles:', AppState.db.clients ? AppState.db.clients.length : 0);
        console.log('Cotizaciones disponibles:', AppState.db.quotes ? AppState.db.quotes.length : 0);

        const clientMap = (AppState.db.clients || []).reduce((map, client) => (map[client.id] = isPrivacy ? 'Cliente Oculto' : client.full_name, map), {});
        const searchTerm = getEl('quote-search').value.toLowerCase();
        const statusFilter = getEl('quote-filter-status').value;

        const filteredQuotes = (AppState.db.quotes || []).filter(q => {
            const clientName = clientMap[q.client_id] || '';
            const searchMatch = !searchTerm || clientName.toLowerCase().includes(searchTerm) || q.id.toString().includes(searchTerm);
            const statusMatch = !statusFilter || q.status === statusFilter;
            return searchMatch && statusMatch;
        });

        let html = '';
        filteredQuotes.sort((a, b) => b.id - a.id).forEach(q => {
            html += `<tr>
                <td>#Q${q.id}</td>
                <td>${clientMap[q.client_id] || 'N/A'}</td>
                <td>${formatDate(q.issue_date)}</td>
                <td>${formatCurrency(q.total)}</td>
                <td>${q.status}</td>
                <td class="action-cell">
                    ${q.status === 'Aceptada' ? `<button class="action-btn" onclick="convertQuoteToInvoice(${q.id})">🧾 Facturar</button>` : ''}
                    <button class="action-btn info" onclick="displayPrintableDocument(${q.id}, 'quote')">📄 Ver</button>
                    <button class="action-btn" onclick="openQuoteModal(${q.id})">✏️ Editar</button>
                    <button class="action-btn delete" onclick="deleteQuote(${q.id})">🗑️ Borrar</button>
                </td>
            </tr>`;
        });
        tableBody.innerHTML = html || '<tr><td colspan="6" style="text-align:center; padding: 20px;">No se encontraron cotizaciones.</td></tr>';
    }

    window.openQuoteModal = (id = null, clientId = null) => {
        if (!checkPermissions(true)) return;
        const form = getEl('quote-form');
        form.reset();
        getEl('quote-id').value = '';
        getEl('quote-line-items').innerHTML = '';
        
        // Populate Client Select
        const clientSelect = getEl('quote-client');
        populateClientOptions(clientSelect);

        if (id) {
            const quote = AppState.db.quotes.find(q => q.id == id);
            if (!quote) return;
            getEl('quote-modal-title').textContent = `Editar Cotización #Q${id}`;
            getEl('quote-id').value = id;
            
            clientSelect.value = quote.client_id;
            
            getEl('quote-status').value = quote.status;
            getEl('quote-issue-date').value = quote.issue_date;
            getEl('quote-due-date').value = quote.due_date;
            getEl('quote-discount').value = quote.discount || 0;
            getEl('quote-notes').value = quote.notes || '';
            const items = typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items;
            items.forEach(item => addDocumentLineItem('quote', item));
        } else {
            getEl('quote-modal-title').textContent = 'Crear Nueva Cotización';
            getEl('quote-issue-date').value = new Date().toISOString().split('T')[0];
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 15);
            getEl('quote-due-date').value = dueDate.toISOString().split('T')[0];
            
            if (clientId) {
                clientSelect.value = clientId;
            }
            
            addDocumentLineItem('quote');
        }
        updateDocumentTotals('quote');
        document.querySelectorAll('#quote-modal [data-custom-select]').forEach(el => {
            if (window.createCustomSelect) createCustomSelect(el);
        });
        openModal('quote-modal');
    };

    function populateClientOptions(select) {
        select.innerHTML = '<option value="" disabled selected>Seleccione un cliente...</option>';
        (AppState.db.clients || []).forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.full_name}</option>`;
        });
    }

    window.handleSaveQuote = async function(e) {
        if (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
        console.log('Guardando cotización...');

        try {
            const idInput = getEl('quote-id');
            const clientInput = getEl('quote-client');
            const issueDateInput = getEl('quote-issue-date');
            const dueDateInput = getEl('quote-due-date');
            
            if (!idInput || !clientInput || !issueDateInput || !dueDateInput) {
                throw new Error('Error interno: No se encontraron los campos del formulario.');
            }

            const id = idInput.value;
            const itemsContainer = getEl('quote-line-items');
            if (!itemsContainer) throw new Error('Error interno: No se encontró el contenedor de conceptos.');

            const items = Array.from(itemsContainer.querySelectorAll('.line-item-row')).map(row => {
                const desc = row.querySelector('.line-item-description');
                const qty = row.querySelector('.line-item-quantity');
                const price = row.querySelector('.line-item-price');
                
                if (!desc || !qty || !price) return null;

                return {
                    description: desc.value,
                    quantity: parseFloat(qty.value) || 0,
                    price: parseFloat(price.value) || 0
                };
            }).filter(item => item !== null);

            if (items.length === 0) {
                showAlert('Debes agregar al menos un concepto a la cotización.', 'Validación');
                return;
            }

            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const discount = parseFloat(getEl('quote-discount').value) || 0;

            const payload = {
                id: id || null,
                company_id: AppState.currentUser.companyId,
                client_id: clientInput.value,
                issue_date: issueDateInput.value,
                due_date: dueDateInput.value,
                items: items,
                subtotal: subtotal,
                discount: discount,
                total: subtotal - discount,
                status: getEl('quote-status').value,
                notes: getEl('quote-notes').value
            };
            
            const endpoint = id ? 'edit_quote.php' : 'add_quote.php';
            const result = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(payload) });
            
            if (result.success) {
                await refreshAllDataAndViews();
                closeModal('quote-modal');
                showAlert('Cotización guardada exitosamente.', 'Éxito');
            } else {
                showAlert(result.message || 'Error al guardar la cotización.', 'Error');
            }
        } catch (error) {
            console.error('Error en handleSaveQuote:', error);
            showAlert('Ocurrió un error inesperado al guardar: ' + error.message, 'Error de Sistema');
        }
        return false;
    }

    window.deleteQuote = async (id) => {
        if (!checkPermissions(true)) return;
        showConfirm('¿Seguro que quieres eliminar esta cotización?', 'Confirmar Eliminación', async (confirmed) => {
            if (confirmed) {
                const result = await apiCall(`delete_quote.php?id=${id}`, { method: 'GET' });
                if (result.success) await refreshAllDataAndViews();
                else showAlert(result.message, 'Error');
            }
        });
    };

})();
