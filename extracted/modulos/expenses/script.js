// Expenses Module Script

const expensesHtml = `
<div class="view-header">
    <h2 class="view-title">Control de <span class="highlight">Gastos</span></h2>
    <div style="display: flex; gap: 10px; align-items: center;">
        <button class="cta-button" onclick="openRecurringExpensesModal()" style="background-color: #6c757d; font-size: 0.9em;">🔄 Gastos Fijos</button>
        <button class="cta-button" onclick="openExpenseModal()">➕ Registrar Gasto</button>
    </div>
</div>
<div class="toolbar">
    <input type="text" id="expense-search" placeholder="Buscar por descripción...">
    <select id="expense-filter-category" data-custom-select><option value="">Toda Categoría</option></select>
    <select id="expense-filter-tech" data-custom-select><option value="">Todo Técnico</option></select>
    <input type="month" id="expense-filter-month">
</div>
<div class="table-wrapper" style="margin-top: 20px;">
    <table class="data-table" id="expenses-table"></table>
</div>
`;

const expenseModalHtml = `
<div id="expense-modal" class="modal no-print">
    <div class="modal-content">
        <span class="modal-close" onclick="closeModal('expense-modal')">×</span>
        <h2 id="expense-modal-title"></h2>
        
        <!-- Scan Ticket Button Area -->
        <div id="scan-ticket-section" style="margin-bottom: 20px; text-align: center;">
            <input type="file" id="expense-scan-input" accept="image/*" capture="environment" style="display:none" onchange="handleTicketScan(this)">
            <button type="button" class="cta-button" onclick="document.getElementById('expense-scan-input').click()" style="background-color: var(--accent-secondary); width: 100%;">
                📷 Escanear Ticket (IA)
            </button>
            <div id="scan-loading" style="display:none; color: var(--text-medium); margin-top: 10px; font-size: 0.9em;">
                Analizando imagen con IA... <span class="loader-spinner"></span>
            </div>
        </div>

        <form id="expense-form">
            <input type="hidden" id="expense-id">
            <div class="form-grid">
                <div class="form-group">
                    <label for="expense-date">Fecha</label>
                    <input type="date" id="expense-date" required>
                </div>
                <div class="form-group">
                    <label for="expense-amount">Monto (<span class="currency-label">MXN</span>)</label>
                    <input type="number" id="expense-amount" step="0.01" placeholder="Ej: 350.50" required>
                </div>
            </div>
            <div class="form-group full-width">
                <label for="expense-description">Descripción</label>
                <input type="text" id="expense-description" placeholder="Ej: Compra de insecticida, gasolina, etc." required>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label for="expense-category">Categoría</label>
                    <input type="text" id="expense-category" list="expense-categories-datalist" placeholder="Ej: Químicos, Combustible, Vehículo">
                    <datalist id="expense-categories-datalist"></datalist>
                </div>
                <div class="form-group">
                    <label for="expense-tech">Asociar a Técnico (Opcional)</label>
                    <select id="expense-tech" data-custom-select><option value="">Ninguno</option></select>
                </div>
            </div>
            <!-- Nuevo campo para asociar servicio -->
            <div class="form-group full-width">
                <label for="expense-service">Asociar a Servicio (Opcional - Ingreso Relacionado)</label>
                <select id="expense-service" data-custom-select>
                    <option value="">Ninguno</option>
                </select>
                <small style="color: var(--text-medium); margin-top: 5px; display: block;">Si este gasto se cubrió con el ingreso de un servicio específico, selecciónalo aquí.</small>
            </div>
            
            <button type="submit" class="cta-button" style="width:100%; margin-top: 20px;">Guardar Gasto</button>
        </form>
    </div>
</div>
`;

const recurringExpensesModalHtml = `
<div id="recurring-expenses-modal" class="modal no-print">
    <div class="modal-content" style="width: 90%; max-width: 900px;">
        <span class="modal-close" onclick="closeModal('recurring-expenses-modal')">×</span>
        <h2>Configuración de <span class="highlight">Gastos Recurrentes</span></h2>
        <p class="text-muted">Define aquí los gastos fijos (Renta, Nómina, Servicios) para generarlos automáticamente cada mes.</p>
        
        <div class="recurring-form-container" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--border-color);">
            <h4 style="margin-top:0; margin-bottom: 10px;">Agregar Nuevo Gasto Fijo</h4>
            <form id="recurring-expense-form" style="display: grid; grid-template-columns: 2fr 1fr 1fr 0.5fr 0.5fr auto; gap: 10px; align-items: end;">
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.8em;">Descripción</label>
                    <input type="text" id="rec-desc" placeholder="Ej: Renta Oficina" required>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.8em;">Categoría</label>
                    <input type="text" id="rec-cat" list="expense-categories-datalist" placeholder="Categoría" required>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.8em;">Monto</label>
                    <input type="number" id="rec-amount" step="0.01" placeholder="0.00" required>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.8em;">Día</label>
                    <input type="number" id="rec-day" min="1" max="31" value="1" title="Día del mes" required>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.8em;">Meses</label>
                    <input type="number" id="rec-months" min="1" max="60" value="12" title="Duración en meses" required>
                </div>
                <button type="submit" class="cta-button" style="height: 38px;">➕ Agregar</button>
            </form>
        </div>

        <div class="table-wrapper">
            <table class="data-table" id="recurring-expenses-table">
                <thead>
                    <tr>
                        <th>Día Mes</th>
                        <th>Descripción</th>
                        <th>Categoría</th>
                        <th>Monto</th>
                        <th>Duración</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>
`;

async function loadExpensesView() {
    const container = document.getElementById('expenses-view');
    if (!container) return;
    
    // Inject Main View HTML if empty or if new buttons are missing
    const hasNewButtons = container.innerHTML.includes('openRecurringExpensesModal');
    
    if (!container.querySelector('.view-header') || !hasNewButtons) {
        container.innerHTML = expensesHtml;
        
        // Setup listeners for filters
        const searchInput = document.getElementById('expense-search');
        const categoryFilter = document.getElementById('expense-filter-category');
        const techFilter = document.getElementById('expense-filter-tech');
        const monthFilter = document.getElementById('expense-filter-month');
        
        if (searchInput) searchInput.addEventListener('input', renderExpensesTable);
        if (categoryFilter) categoryFilter.addEventListener('change', renderExpensesTable);
        if (techFilter) techFilter.addEventListener('change', renderExpensesTable);
        if (monthFilter) monthFilter.addEventListener('change', renderExpensesTable);
    }
    
    // Inject Expense Modal HTML if not present
    const existingModal = document.getElementById('expense-modal');
    // Force remove if it doesn't have the new section (update for cached DOMs)
    if (existingModal && !existingModal.querySelector('#scan-ticket-section')) {
        existingModal.remove();
    }

    if (!document.getElementById('expense-modal')) {
        document.body.insertAdjacentHTML('beforeend', expenseModalHtml);
        
        const form = document.getElementById('expense-form');
        if (form) {
             if (window.addFormSubmitListener) {
                window.addFormSubmitListener('expense-form', handleSaveExpense);
            } else {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    handleSaveExpense();
                });
            }
        }
    }

    // Inject Recurring Expenses Modal HTML if not present
    if (!document.getElementById('recurring-expenses-modal')) {
        document.body.insertAdjacentHTML('beforeend', recurringExpensesModalHtml);
        
        const form = document.getElementById('recurring-expense-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handleSaveRecurring();
            });
        }
    }
    
    // Initialize Custom Selects
    if (window.createCustomSelect) {
        container.querySelectorAll('[data-custom-select]').forEach(window.createCustomSelect);
        document.querySelectorAll('#expense-modal [data-custom-select]').forEach(window.createCustomSelect);
    }

    // Populate Filters
    populateExpenseFilters();
    
    // Set default month to current month
    const monthFilter = document.getElementById('expense-filter-month');
    if (monthFilter && !monthFilter.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        monthFilter.value = `${yyyy}-${mm}`;
    }

    // Render Table
    renderExpensesTable();
}

function populateExpenseFilters() {
    const techFilter = document.getElementById('expense-filter-tech');
    const categoryFilter = document.getElementById('expense-filter-category');
    const categoriesList = document.getElementById('expense-categories-datalist');
    
    if (techFilter && AppState.db.technicians) {
        const first = techFilter.firstElementChild;
        techFilter.innerHTML = '';
        if (first) techFilter.appendChild(first);
        AppState.db.technicians.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            techFilter.appendChild(opt);
        });
    }
    
    if (categoryFilter && categoriesList && AppState.db.expenses) {
        const categories = [...new Set(AppState.db.expenses.map(e => e.category).filter(Boolean))].sort();
        
        // Update Filter
        const firstCat = categoryFilter.firstElementChild;
        categoryFilter.innerHTML = '';
        if (firstCat) categoryFilter.appendChild(firstCat);
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            categoryFilter.appendChild(opt);
        });
        
        // Update Datalist
        categoriesList.innerHTML = '';
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            categoriesList.appendChild(opt);
        });
    }
}

function renderExpensesTable() { 
    const table = document.getElementById('expenses-table'); 
    if (!table) return;
    
    if (!table.querySelector('thead')) { 
        table.innerHTML = '<thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th><th>Técnico</th><th>Servicio Asoc.</th><th class="action-cell">Acciones</th></tr></thead><tbody></tbody>'; 
    } 
    
    const tableBody = table.querySelector('tbody'); 

    if (!AppState.db.expenses || AppState.db.expenses.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="7"><div class="skeleton"></div></td></tr>
            <tr><td colspan="7"><div class="skeleton"></div></td></tr>
            <tr><td colspan="7"><div class="skeleton"></div></td></tr>
        `;
    }
    const isPrivacy = window.isPrivacyMode && window.isPrivacyMode();
    const techMap = (AppState.db.technicians || []).reduce((map, tech) => (map[tech.id] = isPrivacy ? 'Técnico Oculto' : tech.name, map), {}); 
    
    const searchTerm = document.getElementById('expense-search').value.toLowerCase(); 
    const categoryFilter = document.getElementById('expense-filter-category').value; 
    const techFilter = document.getElementById('expense-filter-tech').value; 
    const monthFilter = document.getElementById('expense-filter-month').value; 
    
    const filteredExpenses = (AppState.db.expenses || []).filter(e => { 
        const searchMatch = !searchTerm || e.description.toLowerCase().includes(searchTerm); 
        const categoryMatch = !categoryFilter || e.category === categoryFilter; 
        const techMatch = !techFilter || e.technician_id == techFilter; 
        const monthMatch = !monthFilter || e.date.startsWith(monthFilter); 
        return searchMatch && categoryMatch && techMatch && monthMatch; 
    }); 
    
    let html = ''; 
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(e => { 
        const amount = window.formatCurrency ? window.formatCurrency(e.amount) : `$${e.amount}`;
        const hasService = e.service_id ? '<span style="font-size:0.8em; background:var(--accent-secondary); color:white; padding:2px 6px; border-radius:4px;">Sí</span>' : '-';
        
        html += `<tr>
            <td>${window.formatDate ? window.formatDate(e.date) : e.date}</td>
            <td>${e.description}</td>
            <td>${e.category || 'N/A'}</td>
            <td>${amount}</td>
            <td>${techMap[e.technician_id] || 'N/A'}</td>
            <td>${hasService}</td>
            <td class="action-cell">
                <button class="action-btn" onclick="openExpenseModal(${e.id})">✏️ Editar</button>
                <button class="action-btn delete" onclick="deleteExpense(${e.id})">🗑️ Borrar</button>
            </td>
        </tr>`; 
    }); 
    tableBody.innerHTML = html || '<tr><td colspan="7" style="text-align:center; padding: 20px;">No se encontraron gastos con los filtros actuales.</td></tr>'; 
}

window.openExpenseModal = (id = null) => { 
    if (!checkPermissions(true)) return;
    
    // Logic to show/hide scan button based on plan
    const scanSection = document.getElementById('scan-ticket-section');
    if (scanSection) {
        // Safe access to AppState.currentUser
        const user = AppState.currentUser || {};
        const plan = (user.plan || '').toLowerCase();
        
        // Use a more permissive check: visible if super admin OR plan is premium
        // Defaults to VISIBLE if something is wrong (better UX for premium users)
        const isBasic = plan === 'pesty' || plan === 'trial';
        const isSuper = !!user.isSuperAdmin || (user.admin_code === 'GEMAR_ADMIN');
        
        // Hide ONLY if basic plan AND NOT super admin
        if (isBasic && !isSuper) {
             scanSection.style.display = 'none';
        } else {
             scanSection.style.display = 'block';
        }
    }
    
    const form = document.getElementById('expense-form');
    if (form) form.reset();
    
    document.getElementById('expense-id').value = ''; 
    
    // Populate Tech Select
    const techSelect = document.getElementById('expense-tech');
    
    // Fallback: check window.AppState if local AppState is missing
    const currentAppState = (typeof AppState !== 'undefined') ? AppState : window.AppState;
    
    if (techSelect && currentAppState && currentAppState.db && currentAppState.db.technicians) {
        if (currentAppState.db.technicians.length > 0) {
            techSelect.innerHTML = '<option value="">Seleccionar Técnico...</option>';
            const sortedTechs = [...currentAppState.db.technicians].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            
            sortedTechs.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                techSelect.appendChild(opt);
            });
        } else {
             techSelect.innerHTML = '<option value="">No hay técnicos registrados (0)</option>';
        }
    } else if (techSelect) {
        techSelect.innerHTML = '<option value="">Error al cargar técnicos</option>';
        console.error('AppState or technicians missing in expenses modal');
    }

    // Populate Service Select
    const serviceSelect = document.getElementById('expense-service');
    
    if (serviceSelect && currentAppState && currentAppState.db) {
        serviceSelect.innerHTML = '<option value="">Seleccionar Servicio...</option>';
        
        if (currentAppState.db.services && currentAppState.db.clients) {
            const clientMap = currentAppState.db.clients.reduce((map, c) => (map[c.id] = c, map), {});
            
            // Filter services that are completed/performed
            const completedServices = currentAppState.db.services
                .filter(s => s.status === 'Realizado' || s.status === 'Terminado' || s.status === 'Completado')
                .sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
                
            console.log('Servicios para Gastos:', completedServices.length);
                
            if (completedServices.length === 0) {
                 const opt = document.createElement('option');
                 opt.disabled = true;
                 opt.textContent = 'No hay servicios realizados disponibles';
                 serviceSelect.appendChild(opt);
            } else {
                completedServices.forEach(s => {
                    const client = clientMap[s.client_id];
                    const clientName = client ? client.full_name : 'Desconocido';
                    const date = window.formatDate ? window.formatDate(s.service_date) : s.service_date;
                    const price = window.formatCurrency ? window.formatCurrency(s.price || 0) : `$${s.price}`;
                    
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = `${date} - ${clientName} (${price})`;
                    serviceSelect.appendChild(opt);
                });
            }
        }
    }

    if (id) { 
        const expense = AppState.db.expenses.find(e => e.id == id); 
        if (!expense) return; 
        document.getElementById('expense-modal-title').textContent = 'Editar Gasto'; 
        document.getElementById('expense-id').value = expense.id; 
        document.getElementById('expense-date').value = expense.date; 
        document.getElementById('expense-amount').value = expense.amount; 
        document.getElementById('expense-description').value = expense.description; 
        document.getElementById('expense-category').value = expense.category; 
        document.getElementById('expense-tech').value = expense.technician_id || ''; 
        if (serviceSelect) serviceSelect.value = expense.service_id || '';
    } else { 
        document.getElementById('expense-modal-title').textContent = 'Registrar Nuevo Gasto'; 
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0]; 
    } 
    
    // Re-init custom selects for the modal
    if (window.createCustomSelect) {
        document.querySelectorAll('#expense-modal [data-custom-select]').forEach(window.createCustomSelect);
    }
    
    openModal('expense-modal'); 
};

async function handleSaveExpense() { 
    const id = document.getElementById('expense-id').value; 
    const payload = { 
        id: id || null, 
        company_id: AppState.currentUser.companyId, 
        date: document.getElementById('expense-date').value, 
        amount: document.getElementById('expense-amount').value, 
        description: document.getElementById('expense-description').value, 
        category: document.getElementById('expense-category').value, 
        technician_id: document.getElementById('expense-tech').value || null, 
        service_id: document.getElementById('expense-service').value || null 
    }; 
    
    const endpoint = id ? 'edit_expense.php' : 'add_expense.php'; 
    const result = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(payload) }); 
    
    if (result.success) { 
        await refreshAllDataAndViews(); 
        closeModal('expense-modal'); 
    } else { 
        showAlert(result.message || 'Ocurrió un error al guardar el gasto.', 'Error'); 
    } 
}

window.deleteExpense = async (id) => { 
    if (!checkPermissions(true)) return;
    showConfirm('¿Seguro que quieres eliminar este gasto? Esta acción no se puede deshacer.', 'Confirmar Eliminación', async (confirmed) => { 
        if (confirmed) { 
            const result = await apiCall(`delete_expense.php?id=${id}`, { method: 'GET' }); 
            if (result.success) { 
                await refreshAllDataAndViews(); 
            } else { 
                showAlert(result.message || 'No se pudo eliminar el gasto.', 'Error'); 
            } 
        } 
    }); 
};

// --- Recurring Expenses Functions ---

window.openRecurringExpensesModal = async () => {
    if (!checkPermissions(true)) return;
    openModal('recurring-expenses-modal');
    loadRecurringExpenses();
};

async function loadRecurringExpenses() {
    const tableBody = document.querySelector('#recurring-expenses-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando...</td></tr>';
    
    try {
        const response = await fetch(`api/get_recurring_expenses.php?company_id=${AppState.currentUser.companyId}`);
        const expenses = await response.json();
        
        if (!expenses || expenses.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay gastos recurrentes configurados. Agrega uno arriba.</td></tr>';
            return;
        }
        
        let html = '';
        expenses.forEach(e => {
            const amount = window.formatCurrency ? window.formatCurrency(e.amount) : `$${e.amount}`;
            const status = e.active == 1 ? '<span style="color:#4ade80">Activo</span>' : '<span style="color:#f87171">Inactivo</span>';
            const duration = e.months_duration ? `${e.months_duration} meses` : 'Indefinido';

            html += `<tr>
                <td>Día ${e.day_of_month}</td>
                <td>${e.description}</td>
                <td>${e.category}</td>
                <td>${amount}</td>
                <td>${duration}</td>
                <td>${status}</td>
                <td>
                    <button class="action-btn delete" onclick="deleteRecurring(${e.id})" style="padding: 2px 8px; font-size: 0.8em;">🗑️</button>
                </td>
            </tr>`;
        });
        tableBody.innerHTML = html;
        
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar datos.</td></tr>';
    }
}

async function handleSaveRecurring() {
    const desc = document.getElementById('rec-desc').value;
    const amount = document.getElementById('rec-amount').value;
    const cat = document.getElementById('rec-cat').value;
    const day = document.getElementById('rec-day').value;
    const months = document.getElementById('rec-months').value;
    
    if (!desc || !amount || !cat) return;
    
    const payload = {
        company_id: AppState.currentUser.companyId,
        description: desc,
        amount: amount,
        category: cat,
        day_of_month: day,
        active: 1,
        months_duration: months
    };
    
    const result = await apiCall('save_recurring_expense.php', { method: 'POST', body: JSON.stringify(payload) });
    
    if (result.success) {
        document.getElementById('recurring-expense-form').reset();
        document.getElementById('rec-day').value = 1;
        loadRecurringExpenses();
        showAlert('Gasto recurrente agregado.', 'Éxito');
    } else {
        showAlert(result.message || 'Error al guardar.', 'Error');
    }
}

window.deleteRecurring = async (id) => {
    if (!confirm('¿Eliminar este gasto recurrente?')) return;
    
    const result = await apiCall(`delete_recurring_expense.php?id=${id}&company_id=${AppState.currentUser.companyId}`, { method: 'GET' });
    
    if (result.success) {
        loadRecurringExpenses();
    } else {
        showAlert(result.message || 'Error al eliminar.', 'Error');
    }
};

window.generateMonthlyExpenses = async () => {
    if (!checkPermissions(true)) return;
    
    // Preguntar fecha
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
    
    // Podríamos usar un prompt o un modal pequeño, pero por simplicidad usaremos confirmación con el mes actual
    // O mejor, preguntar con un prompt simple
    const monthInput = prompt("Introduce el mes y año a generar (YYYY-MM):", currentMonth);
    if (!monthInput) return;
    
    const [year, month] = monthInput.split('-');
    if (!year || !month) {
        showAlert("Formato inválido. Usa YYYY-MM", "Error");
        return;
    }
    
    showLoader("Generando gastos...");
    
    const payload = {
        company_id: AppState.currentUser.companyId,
        year: year,
        month: month
    };
    
    const result = await apiCall('generate_recurring_expenses.php', { method: 'POST', body: JSON.stringify(payload) });
    
    hideLoader();
    
    if (result.success) {
        showAlert(result.message, 'Proceso Finalizado');
        // Si estamos viendo ese mes, recargar
        const filterMonth = document.getElementById('expense-filter-month');
        if (filterMonth) {
            filterMonth.value = monthInput;
            renderExpensesTable(); // Filtrar visualmente
        }
        await refreshAllDataAndViews();
    } else {
        showAlert(result.message || 'Error al generar gastos.', 'Error');
    }
};

// --- AI Ticket Scanning ---
window.handleTicketScan = async (input) => {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const loading = document.getElementById('scan-loading');
        
        // Show loader
        if (loading) loading.style.display = 'block';
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('api/scan_expense_ticket.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Fill form
                const data = result.data;
                if (data.date) document.getElementById('expense-date').value = data.date;
                if (data.amount) document.getElementById('expense-amount').value = data.amount;
                if (data.description) document.getElementById('expense-description').value = data.description;
                if (data.category) document.getElementById('expense-category').value = data.category;
                
                showAlert('Ticket analizado correctamente', 'Éxito');
            } else {
                showAlert(result.message || 'No se pudo analizar el ticket', 'Error');
            }
        } catch (e) {
            console.error(e);
            showAlert('Error de conexión al analizar ticket', 'Error');
        } finally {
            // Hide loader and reset input
            if (loading) loading.style.display = 'none';
            input.value = '';
        }
    }
};

// Expose render function
window.renderExpensesView = loadExpensesView;
