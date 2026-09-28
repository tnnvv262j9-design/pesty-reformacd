// Payment Notes Module Script

const paymentNotesHtml = `
<div class="view-header">
    <h2 class="view-title">Registro de <span class="highlight">Pagos</span></h2>
    <button class="cta-button" onclick="openPaymentNoteModal()">➕ Crear Nota de Pago</button>
</div>
<div class="toolbar">
    <input type="text" id="payment-note-search" placeholder="Buscar por cliente o folio...">
    <select id="payment-note-filter-status" data-custom-select>
        <option value="">Todos los Estados</option>
        <option>Pagada</option>
        <option>Pendiente</option>
        <option>Parcial</option>
    </select>
</div>
<div class="table-wrapper" style="margin-top: 20px;">
    <table class="data-table" id="payment-notes-table"></table>
</div>
`;

const paymentNoteModalHtml = `
<div id="payment-note-modal" class="modal no-print">
    <div class="modal-content">
        <span class="modal-close" onclick="closeModal('payment-note-modal')">×</span>
        <h2 id="payment-note-modal-title"></h2>
        <form id="payment-note-form">
            <input type="hidden" id="payment-note-id">
            <div class="form-grid">
                <div class="form-group">
                    <label for="payment-note-client">Cliente</label>
                    <select id="payment-note-client" data-custom-select required></select>
                </div>
                <div class="form-group">
                    <label for="payment-note-service">Servicio Asociado (Opcional)</label>
                    <select id="payment-note-service" data-custom-select>
                        <option value="">Ninguno</option>
                    </select>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label for="payment-note-date">Fecha del Pago</label>
                    <input type="date" id="payment-note-date" required>
                </div>
                <div class="form-group">
                    <label for="payment-note-subtotal">Subtotal (<span class="currency-label">$</span>)</label>
                    <input type="number" id="payment-note-subtotal" step="0.01" required>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="payment-note-include-tax" onchange="togglePaymentNoteTax()">
                        Incluir IVA
                    </label>
                </div>
                <div class="form-group">
                    <label for="payment-note-tax-rate">Porcentaje de IVA (%)</label>
                    <input type="number" id="payment-note-tax-rate" step="0.01" value="16" min="0" max="100" disabled>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label for="payment-note-tax-amount">IVA (<span class="currency-label">$</span>)</label>
                    <input type="number" id="payment-note-tax-amount" step="0.01" value="0" readonly>
                </div>
                <div class="form-group">
                    <label for="payment-note-amount">Total Pagado (<span class="currency-label">$</span>)</label>
                    <input type="number" id="payment-note-amount" step="0.01" readonly>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label for="payment-note-method">Forma de Pago</label>
                    <select id="payment-note-method" data-custom-select required>
                        <option>Efectivo</option>
                        <option>Transferencia</option>
                        <option>Tarjeta de Crédito/Débito</option>
                        <option>Cheque</option>
                        <option>Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="payment-note-reference">Referencia (Folio, # Transacción)</label>
                    <input type="text" id="payment-note-reference">
                </div>
            </div>
            <div class="form-group full-width">
                <label for="payment-note-status">Estado del Pago</label>
                <select id="payment-note-status" data-custom-select required>
                    <option>Pagada</option>
                    <option>Pendiente</option>
                    <option>Parcial</option>
                </select>
            </div>
            <div class="form-group full-width">
                <label for="payment-note-notes">Notas Adicionales</label>
                <textarea id="payment-note-notes"></textarea>
            </div>
            <button type="submit" class="cta-button" style="width:100%; margin-top: 20px;">Guardar Nota de Pago</button>
        </form>
    </div>
</div>
`;

async function loadPaymentNotesView() {
    const container = document.getElementById('payment-notes-view');
    if (!container) return;
    
    // Inject Main View HTML if empty
    if (!container.querySelector('.view-header')) {
        container.innerHTML = paymentNotesHtml;
        
        // Setup listeners for filters
        const searchInput = document.getElementById('payment-note-search');
        const statusFilter = document.getElementById('payment-note-filter-status');
        
        if (searchInput) searchInput.addEventListener('input', renderPaymentNotesTable);
        if (statusFilter) statusFilter.addEventListener('change', renderPaymentNotesTable);
    }
    
    // Inject Modal HTML if not present in body
    if (!document.getElementById('payment-note-modal')) {
        document.body.insertAdjacentHTML('beforeend', paymentNoteModalHtml);
        
        // Attach submit listener
        const form = document.getElementById('payment-note-form');
        if (form) {
            if (window.addFormSubmitListener) {
                window.addFormSubmitListener('payment-note-form', handleSavePaymentNote);
            } else {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    handleSavePaymentNote();
                });
            }
        }
        
        // Listeners for calculation
        const subtotalInput = document.getElementById('payment-note-subtotal');
        const taxRateInput = document.getElementById('payment-note-tax-rate');
        
        if (subtotalInput) subtotalInput.addEventListener('input', calculatePaymentNoteTotal);
        if (taxRateInput) taxRateInput.addEventListener('input', calculatePaymentNoteTotal);
        
        const clientSelect = document.getElementById('payment-note-client');
        if (clientSelect) {
             clientSelect.addEventListener('change', populateServiceDropdownForPaymentNote);
        }
    }
    
    // Initialize Custom Selects
    if (window.createCustomSelect) {
        container.querySelectorAll('[data-custom-select]').forEach(window.createCustomSelect);
        document.querySelectorAll('#payment-note-modal [data-custom-select]').forEach(window.createCustomSelect);
    }
    
    // Render Table
    renderPaymentNotesTable();
}

function renderPaymentNotesTable() {
    const table = document.getElementById('payment-notes-table');
    if (!table) return;
    
    if (!table.querySelector('thead')) {
        table.innerHTML = '<thead><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Monto</th><th>Método</th><th>Estado</th><th class="action-cell">Acciones</th></tr></thead><tbody></tbody>';
    }
    
    const tableBody = table.querySelector('tbody');
    const isPrivacy = window.isPrivacyMode && window.isPrivacyMode();
    const clientMap = (AppState.db.clients || []).reduce((map, client) => (map[client.id] = isPrivacy ? 'Cliente Oculto' : client.full_name, map), {});
    const searchTerm = document.getElementById('payment-note-search').value.toLowerCase();
    const statusFilter = document.getElementById('payment-note-filter-status').value;

    const filteredNotes = (AppState.db.payment_notes || []).filter(note => {
        const clientName = clientMap[note.client_id] || '';
        const searchMatch = !searchTerm || clientName.toLowerCase().includes(searchTerm) || note.id.toString().includes(searchTerm);
        const statusMatch = !statusFilter || note.status === statusFilter;
        return searchMatch && statusMatch;
    });

    let html = '';
    filteredNotes.sort((a, b) => b.id - a.id).forEach(note => {
        html += `<tr>
            <td>#NP${note.id}</td>
            <td>${clientMap[note.client_id] || 'N/A'}</td>
            <td>${window.formatDate ? window.formatDate(note.note_date) : note.note_date}</td>
            <td>${window.formatCurrency ? window.formatCurrency(note.amount) : note.amount}</td>
            <td>${note.payment_method}</td>
            <td>${note.status}</td>
            <td class="action-cell">
                <button class="action-btn info" onclick="displayPrintableDocument(${note.id}, 'payment_note')">📄 Ver PDF</button>
                <button class="action-btn" onclick="openPaymentNoteModal(${note.id})">✏️ Editar</button>
                <button class="action-btn delete" onclick="deletePaymentNote(${note.id})">🗑️ Borrar</button>
            </td>
        </tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="7" style="text-align:center; padding: 20px;">No se encontraron notas de pago.</td></tr>';
}

window.openPaymentNoteModal = (id = null, serviceData = null) => {
    if (!checkPermissions(true)) return;
    
    // Ensure modal exists in DOM
    if (!document.getElementById('payment-note-modal')) {
        document.body.insertAdjacentHTML('beforeend', paymentNoteModalHtml);
        
        // Attach listeners
        const form = document.getElementById('payment-note-form');
        if (form) {
            if (window.addFormSubmitListener) {
                window.addFormSubmitListener('payment-note-form', handleSavePaymentNote);
            } else {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    handleSavePaymentNote();
                });
            }
        }
        
        const subtotalInput = document.getElementById('payment-note-subtotal');
        const taxRateInput = document.getElementById('payment-note-tax-rate');
        
        if (subtotalInput) subtotalInput.addEventListener('input', calculatePaymentNoteTotal);
        if (taxRateInput) taxRateInput.addEventListener('input', calculatePaymentNoteTotal);
        
        const clientSelect = document.getElementById('payment-note-client');
        if (clientSelect) {
             clientSelect.addEventListener('change', populateServiceDropdownForPaymentNote);
        }
        
        // Initialize Custom Selects
        if (window.createCustomSelect) {
            document.querySelectorAll('#payment-note-modal [data-custom-select]').forEach(window.createCustomSelect);
        }
    }
    
    const form = document.getElementById('payment-note-form');
    if (form) form.reset();
    
    document.getElementById('payment-note-id').value = '';

    // Populate client dropdown
    const clientSelect = document.getElementById('payment-note-client');
    if (clientSelect) {
        clientSelect.innerHTML = '<option value="" disabled selected>Seleccione un cliente...</option>';
        if (AppState.db.clients) {
            AppState.db.clients.forEach(c => {
                clientSelect.innerHTML += `<option value="${c.id}">${c.full_name}</option>`;
            });
        }
    }

    if (id) {
        const note = AppState.db.payment_notes.find(n => n.id == id);
        if (!note) return;
        document.getElementById('payment-note-modal-title').textContent = `Editar Nota de Pago #NP${id}`;
        document.getElementById('payment-note-id').value = id;
        clientSelect.value = note.client_id;
        
        populateServiceDropdownForPaymentNote().then(() => {
            const serviceSelect = document.getElementById('payment-note-service');
            if(serviceSelect) serviceSelect.value = note.service_id || '';
            // Refresh custom select display if needed
             if (window.createCustomSelect) {
                // Find and update trigger text manually or re-init? 
                // Re-init is safer but might duplicate. createCustomSelect handles removal of existing container.
                window.createCustomSelect(serviceSelect);
            }
        });
        
        document.getElementById('payment-note-date').value = note.note_date;
        
        // Manejar campos de IVA
        const subtotal = note.subtotal || note.amount;
        const taxRate = note.tax_rate || 0;
        const taxAmount = note.tax_amount || 0;
        const includeTax = taxRate > 0;
        
        document.getElementById('payment-note-subtotal').value = subtotal;
        document.getElementById('payment-note-include-tax').checked = includeTax;
        document.getElementById('payment-note-tax-rate').value = taxRate;
        document.getElementById('payment-note-tax-rate').disabled = !includeTax;
        document.getElementById('payment-note-tax-amount').value = taxAmount;
        document.getElementById('payment-note-amount').value = note.amount;
        
        document.getElementById('payment-note-method').value = note.payment_method;
        document.getElementById('payment-note-reference').value = note.reference || '';
        document.getElementById('payment-note-status').value = note.status;
        document.getElementById('payment-note-notes').value = note.notes || '';
        
    } else if (serviceData) {
        document.getElementById('payment-note-modal-title').textContent = 'Registrar Pago de Servicio';
        if (clientSelect) clientSelect.value = serviceData.clientId;
        
        populateServiceDropdownForPaymentNote().then(() => {
            const serviceSelect = document.getElementById('payment-note-service');
             if(serviceSelect) {
                serviceSelect.value = serviceData.serviceId;
                 if (window.createCustomSelect) window.createCustomSelect(serviceSelect);
             }
        });
        
        document.getElementById('payment-note-date').value = new Date().toISOString().split('T')[0];
        
        // Inicializar campos de IVA para nuevo pago desde servicio
        document.getElementById('payment-note-subtotal').value = serviceData.amount;
        document.getElementById('payment-note-include-tax').checked = false;
        document.getElementById('payment-note-tax-rate').value = '16';
        document.getElementById('payment-note-tax-rate').disabled = true;
        document.getElementById('payment-note-tax-amount').value = '0';
        document.getElementById('payment-note-amount').value = serviceData.amount;
        
    } else {
        document.getElementById('payment-note-modal-title').textContent = 'Crear Nueva Nota de Pago';
        document.getElementById('payment-note-date').value = new Date().toISOString().split('T')[0];
        
        // Inicializar campos de IVA para nueva nota de pago
        document.getElementById('payment-note-subtotal').value = '';
        document.getElementById('payment-note-include-tax').checked = false;
        document.getElementById('payment-note-tax-rate').value = '16';
        document.getElementById('payment-note-tax-rate').disabled = true;
        document.getElementById('payment-note-tax-amount').value = '0';
        document.getElementById('payment-note-amount').value = '';
        
        populateServiceDropdownForPaymentNote();
    }
    
    // Refresh all custom selects in modal
    if (window.createCustomSelect) {
        document.querySelectorAll('#payment-note-modal [data-custom-select]').forEach(window.createCustomSelect);
    }
    
    openModal('payment-note-modal');
};

async function populateServiceDropdownForPaymentNote() {
    const clientSelect = document.getElementById('payment-note-client');
    const serviceSelect = document.getElementById('payment-note-service');
    if (!clientSelect || !serviceSelect) return;
    
    const clientId = clientSelect.value;
    
    serviceSelect.innerHTML = '<option value="">Ninguno</option>';
    if (clientId && AppState.db.services) {
        const clientServices = AppState.db.services.filter(s => s.client_id == clientId);
        clientServices.forEach(s => {
            const date = window.formatDate ? window.formatDate(s.service_date) : s.service_date;
            serviceSelect.innerHTML += `<option value="${s.id}">#${s.id} - ${s.service_type} (${date})</option>`;
        });
    }
    
    // Update custom select UI if needed
    if (window.createCustomSelect) {
        const container = serviceSelect.parentElement.querySelector('.custom-select-container');
        if (container) {
            window.createCustomSelect(serviceSelect);
        }
    }
}

window.togglePaymentNoteTax = () => {
    const includeTax = document.getElementById('payment-note-include-tax').checked;
    const taxRateInput = document.getElementById('payment-note-tax-rate');
    
    taxRateInput.disabled = !includeTax;
    
    if (!includeTax) {
        document.getElementById('payment-note-tax-amount').value = '0';
    }
    
    calculatePaymentNoteTotal();
};

window.calculatePaymentNoteTotal = () => {
    const subtotal = parseFloat(document.getElementById('payment-note-subtotal').value) || 0;
    const includeTax = document.getElementById('payment-note-include-tax').checked;
    const taxRate = parseFloat(document.getElementById('payment-note-tax-rate').value) || 0;
    
    let taxAmount = 0;
    if (includeTax && taxRate > 0) {
        taxAmount = subtotal * (taxRate / 100);
    }
    
    const total = subtotal + taxAmount;
    
    document.getElementById('payment-note-tax-amount').value = taxAmount.toFixed(2);
    document.getElementById('payment-note-amount').value = total.toFixed(2);
};

async function handleSavePaymentNote() {
    const id = document.getElementById('payment-note-id').value;
    const subtotal = parseFloat(document.getElementById('payment-note-subtotal').value) || 0;
    const includeTax = document.getElementById('payment-note-include-tax').checked;
    
    const taxRate = includeTax ? parseFloat(document.getElementById('payment-note-tax-rate').value) || 0 : 0;
    const taxAmount = parseFloat(document.getElementById('payment-note-tax-amount').value) || 0;
    const total = parseFloat(document.getElementById('payment-note-amount').value) || 0;
    
    const payload = {
        id: id || null,
        client_id: document.getElementById('payment-note-client').value,
        service_id: document.getElementById('payment-note-service').value || null,
        note_date: document.getElementById('payment-note-date').value,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        amount: total,
        payment_method: document.getElementById('payment-note-method').value,
        reference: document.getElementById('payment-note-reference').value,
        status: document.getElementById('payment-note-status').value,
        notes: document.getElementById('payment-note-notes').value
    };

    const endpoint = id ? 'edit_payment_note.php' : 'add_payment_note.php';
    const result = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    if (result.success) {
        await refreshAllDataAndViews();
        closeModal('payment-note-modal');
    } else {
        showAlert(result.message, 'Error');
    }
}

window.deletePaymentNote = async (id) => {
    if (!checkPermissions(true)) return;
    showConfirm('¿Seguro que quieres eliminar esta nota de pago?', 'Confirmar Eliminación', async (confirmed) => {
        if (confirmed) {
            const result = await apiCall(`delete_payment_note.php?id=${id}`, { method: 'GET' });
            if (result.success) await refreshAllDataAndViews();
            else showAlert(result.message, 'Error');
        }
    });
};

window.generatePaymentNoteHtml = (id) => {
    const note = AppState.db.payment_notes.find(n => n.id == id);
    if (!note) return null;

    const client = AppState.db.clients.find(c => c.id == note.client_id);
    const service = note.service_id ? AppState.db.services.find(s => s.id == note.service_id) : null;
    const settings = AppState.currentUser;
    const logoUrl = getFullImagePath(settings.logo_url);

    const subtotal = parseFloat(note.subtotal || note.amount);
    const taxRate = parseFloat(note.tax_rate || 0);
    const tax = parseFloat(note.tax_amount || 0);

    let serviceDescription = 'Pago de servicios varios.';
    if (service) {
        const date = window.formatDate ? window.formatDate(service.service_date) : service.service_date;
        serviceDescription = `Pago por servicio de ${service.service_type} realizado el ${date}.`;
    }
    
    const formattedAmount = window.formatCurrency ? window.formatCurrency(note.amount) : note.amount;
    const formattedSubtotal = window.formatCurrency ? window.formatCurrency(subtotal) : subtotal;
    const formattedTax = window.formatCurrency ? window.formatCurrency(tax) : tax;
    const formattedDate = window.formatDate ? window.formatDate(note.note_date) : note.note_date;

    return `<div class="report-sheet-container" style="--report-logo-url: url('${logoUrl}')">
        <div class="report-sheet">
            <div class="report-header">
                <div class="report-header-info">
                    <h1>Nota de Pago</h1>
                    <span>Folio: #NP${note.id}</span>
                    <span style="font-size: 0.6em; display: block; margin-top: 2px; color: #999;">Powered By Pesty Software</span>
                </div>
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="report-logo">` : ''}
            </div>
            <div class="report-meta">
                <div><strong>Fecha de Pago:</strong> ${formattedDate}</div>
                <div><strong>Estado:</strong> ${note.status}</div>
            </div>
            <div class="report-section">
                <div class="section-title"><h2>Recibimos de</h2></div>
                <div class="section-content">
                    <div><strong>Cliente:</strong> <span>${client ? client.full_name : 'N/A'}</span></div>
                    <div><strong>Teléfono:</strong> <span>${client ? client.phone : 'N/A'}</span></div>
                    <div class="full-span"><strong>Dirección:</strong> <span>${client ? client.address : 'N/A'}</span></div>
                </div>
            </div>
            <div class="report-section">
                <div class="section-title"><h2>Detalle del Pago</h2></div>
                <table class="report-items-table">
                    <thead><tr><th>Concepto</th><th class="text-right">Importe</th></tr></thead>
                    <tbody>
                        <tr>
                            <td>${serviceDescription}</td>
                            <td class="text-right">${formattedAmount}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="report-totals">
                    <table>
                        <tbody>
                            <tr><td class="label">Subtotal:</td><td class="value text-right">${formattedSubtotal}</td></tr>
                            ${tax > 0 ? `<tr><td class="label">IVA (${taxRate}%):</td><td class="value text-right">${formattedTax}</td></tr>` : ''}
                            <tr class="grand-total"><td class="label">Total Pagado:</td><td class="value text-right">${formattedAmount}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div style="clear:both;"></div>
            <div class="report-section">
                <div class="section-title"><h2>Información del Pago</h2></div>
                <div class="section-content">
                    <div><strong>Forma de Pago:</strong> <span>${note.payment_method}</span></div>
                    <div><strong>Referencia:</strong> <span>${note.reference || 'N/A'}</span></div>
                    ${note.notes ? `<div class="full-span"><strong>Notas:</strong> <span>${note.notes.replace(/\n/g, '<br>')}</span></div>` : ''}
                </div>
            </div>
            <div class="report-footer">${settings.report_footer_text || `Gracias por su pago.`}</div>
        </div>
    </div>`;
};

// Expose render function
window.renderPaymentNotesView = loadPaymentNotesView;
