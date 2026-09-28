
// --- CHEMICAL REPORT FUNCTIONS ---

async function initReportChemicals(service, reportData) {
    // Ensure chemicals are loaded
    if (!AppState.db.chemicals) AppState.db.chemicals = [];
    
    if (AppState.db.chemicals.length === 0) {
        try {
            const response = await fetch(`api/get_chemicals.php?company_id=${AppState.currentUser.companyId}`);
            const data = await response.json();
            if (data.success) {
                AppState.db.chemicals = data.chemicals;
            }
        } catch (e) {
            console.error('Error loading chemicals for report:', e);
        }
    }
    
    // Populate select
    const select = getEl('report-chemical-select');
    if (select) {
        select.innerHTML = '<option value="">Seleccione...</option>';
        if (AppState.db.chemicals) {
            AppState.db.chemicals.forEach(c => {
                if (c.status === 'active') {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = `${c.name} (${c.concentration || ''}) - Stock: ${parseFloat(c.current_stock_ml).toFixed(2)} ml`;
                    select.appendChild(option);
                }
            });
        }
        
        // Refresh custom select if the function exists
        if (typeof createCustomSelect === 'function') {
            // Re-create custom select to reflect new options
            createCustomSelect(select);
        }
    }

    // Initialize list
    AppState.selectedReportChemicals = [];
    
    // Load existing chemicals from reportData if available
    if (reportData && reportData.chemicals) {
         if (Array.isArray(reportData.chemicals)) {
            AppState.selectedReportChemicals = reportData.chemicals;
        }
    }

    renderReportChemicalsList();

    // Bind Add Button
    const addBtn = getEl('btn-add-chemical');
    if (addBtn) addBtn.onclick = addChemicalToReport;
}

function addChemicalToReport() {
    const select = getEl('report-chemical-select');
    const chemicalId = select.value;
    if (!chemicalId) { showAlert('Seleccione un químico'); return; }
    
    const doseInput = getEl('report-chemical-dose');
    const dose = parseFloat(doseInput.value);
    if (!dose || dose <= 0) { showAlert('Ingrese una cantidad válida'); return; }
    
    const unitSelect = getEl('report-chemical-unit');
    const unit = unitSelect.value;
    
    if (!AppState.db.chemicals) {
        showAlert('Error: La base de datos de químicos no está cargada. Por favor, recargue la página o intente nuevamente.', 'Error');
        return;
    }
    
    const chemical = AppState.db.chemicals.find(c => c.id == chemicalId);
    if (!chemical) return;

    // Convert to ML for cost/stock calculation
    let mlAmount = dose;
    // Simple conversion factors
    if (unit === 'l') mlAmount = dose * 1000;
    if (unit === 'oz') mlAmount = dose * 29.5735;
    if (unit === 'kg') mlAmount = dose * 1000; 
    
    // Check inventory availability
    const currentStock = parseFloat(chemical.current_stock_ml) || 0;
    
    // Check if we already added this chemical to the current report list
    // Only count items that are NEW (no ID) because items with ID were already deducted from stock
    const alreadyAdded = AppState.selectedReportChemicals
        .filter(item => item.chemical_id == chemical.id && !item.id)
        .reduce((sum, item) => sum + item.ml_used, 0);
        
    const totalRequested = mlAmount + alreadyAdded;
    
    if (totalRequested > currentStock) {
        const remaining = Math.max(0, currentStock - alreadyAdded);
        showAlert(`Stock insuficiente. Disponible: ${remaining.toFixed(2)} ml (Intentando usar: ${totalRequested.toFixed(2)} ml)`, 'Error de Inventario');
        return;
    }
    
    const cost = mlAmount * parseFloat(chemical.cost_per_ml);
    
    AppState.selectedReportChemicals.push({
        chemical_id: chemical.id,
        name: chemical.name,
        rsco: chemical.rsco,
        active_ingredient: chemical.active_ingredient,
        batch_number: chemical.batch_number,
        expiration_date: chemical.expiration_date,
        quantity: dose,
        unit: unit,
        ml_used: mlAmount,
        cost_calculated: cost
    });
    
    renderReportChemicalsList();
    
    // Reset inputs
    doseInput.value = '';
    select.value = '';
    
    // Reset Custom Select Text
    // This depends on createCustomSelect implementation, assuming standard structure
    const customSelect = select.parentElement.querySelector('.select-selected');
    if (customSelect) customSelect.textContent = 'Seleccione...';
}

function renderReportChemicalsList() {
    const list = getEl('report-chemicals-list');
    if (!list) return;
    list.innerHTML = '';
    
    let totalCost = 0;
    
    if (AppState.selectedReportChemicals.length === 0) {
        list.innerHTML = '<div style="color: #888; font-style: italic; padding: 10px; text-align: center;">No se han agregado químicos.</div>';
        getEl('report-chemicals-data').value = '[]';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'w-full text-left border-collapse';
    table.style.width = '100%';
    table.style.marginTop = '10px';
    
    let costHeader = '';
    if (AppState.currentUser.type === 'company') {
        costHeader = '<th style="padding: 8px; border-bottom: 1px solid #444;">Costo</th>';
    }
    
    table.innerHTML = `
        <thead>
            <tr>
                <th style="padding: 8px; border-bottom: 1px solid #444;">Químico</th>
                <th style="padding: 8px; border-bottom: 1px solid #444;">Cant.</th>
                ${costHeader}
                <th style="padding: 8px; border-bottom: 1px solid #444;"></th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    AppState.selectedReportChemicals.forEach((item, index) => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #333';
        
        let costDisplay = '';
        if (AppState.currentUser.type === 'company') {
            costDisplay = `<td style="padding: 8px;">$${item.cost_calculated.toFixed(2)}</td>`;
            totalCost += item.cost_calculated;
        }
        
        let details = `<strong>Producto:</strong> ${item.name}`;
        if (item.active_ingredient) details += ` | <strong>Ingrediente:</strong> ${item.active_ingredient}`;
        if (item.rsco) details += ` | <strong>Registro:</strong> ${item.rsco}`;
        if (item.batch_number) details += ` | <strong>Lote:</strong> ${item.batch_number}`;
        if (item.expiration_date) {
            // Format date to Month Year (e.g., Dic 2025)
            const date = new Date(item.expiration_date + 'T00:00:00'); // Force local time
            const options = { year: 'numeric', month: 'short' };
            const formattedDate = date.toLocaleDateString('es-ES', options);
            // Capitalize first letter of month
            const finalDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
            details += ` (Cad: ${finalDate})`;
        }

        row.innerHTML = `
            <td style="padding: 8px;">${details}</td>
            <td style="padding: 8px;">${item.quantity} ${item.unit}</td>
            ${costDisplay}
            <td style="padding: 8px; text-align: right;">
                <button type="button" class="icon-btn delete-btn" style="color: #ef4444; background: none; border: none; cursor: pointer;" onclick="removeReportChemical(${index})">❌</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    list.appendChild(table);
    
    if (AppState.currentUser.type === 'company') {
        const totalDiv = document.createElement('div');
        totalDiv.style.textAlign = 'right';
        totalDiv.style.marginTop = '10px';
        totalDiv.style.fontWeight = 'bold';
        totalDiv.innerHTML = `Total Costo Químicos: <span style="color: #4ade80;">$${totalCost.toFixed(2)}</span>`;
        list.appendChild(totalDiv);
    }
    
    getEl('report-chemicals-data').value = JSON.stringify(AppState.selectedReportChemicals);
}

window.removeReportChemical = function(index) {
    AppState.selectedReportChemicals.splice(index, 1);
    renderReportChemicalsList();
};
