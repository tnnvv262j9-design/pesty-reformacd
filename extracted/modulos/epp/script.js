// EPP Module Script

const eppViewHtml = `
<div class="view-header">
    <h2 class="view-title">Bitácora de <span class="highlight">EPP</span></h2>
</div>
<div class="toolbar">
    <button class="cta-button" onclick="openEppDeliveryFromModule()">➕ Registrar Entrega</button>
</div>
<div class="epp-layout">
    <div class="epp-panel">
        <div class="form-group">
            <label for="epp-tech-filter">Filtrar por Técnico</label>
            <select id="epp-tech-filter" data-custom-select>
                <option value="">Todos</option>
            </select>
        </div>
        <div class="table-wrapper" style="margin-top: 15px;">
            <table class="data-table" id="epp-deliveries-table"></table>
        </div>
    </div>
</div>
<div id="epp-maintenance-modal" class="modal no-print" style="display:none;">
  <div class="modal-content">
    <span class="modal-close" onclick="closeEppMaintenanceModal()">×</span>
    <h2>Registrar Limpieza/Mantenimiento</h2>
    <form id="epp-maintenance-form">
      <input type="hidden" id="epp-maintenance-delivery-id">
      <div class="form-grid">
        <div class="form-group">
          <label for="epp-maintenance-date">Fecha</label>
          <input type="date" id="epp-maintenance-date" required>
        </div>
        <div class="form-group">
          <label for="epp-maintenance-type">Tipo</label>
          <select id="epp-maintenance-type" required>
            <option value="Limpieza">Limpieza</option>
            <option value="Mantenimiento">Mantenimiento</option>
          </select>
        </div>
      </div>
      <div class="form-group full-width">
        <label for="epp-maintenance-notes">Notas</label>
        <textarea id="epp-maintenance-notes" rows="3" placeholder="Detalles del procedimiento"></textarea>
      </div>
      <div class="form-group full-width">
        <label for="epp-maintenance-evidence">Evidencia (foto)</label>
        <input type="file" id="epp-maintenance-evidence" accept="image/*">
        <div id="epp-evidence-preview" style="margin-top:10px; display:none;">
          <img id="epp-evidence-preview-img" src="" alt="Vista previa" style="max-width:100%; max-height:180px; border:1px solid var(--border-color); border-radius:6px; background:#fff;">
        </div>
      </div>
      <button type="submit" class="cta-button" style="width:100%; margin-top: 20px;">Guardar</button>
    </form>
  </div>
</div>
<div id="epp-manage-modal" class="modal no-print" style="display:none;">
  <div class="modal-content">
    <span class="modal-close" onclick="closeEppManageModal()">×</span>
    <div class="epp-manage-header">
      <h3 class="epp-manage-title">Gestionar EPP</h3>
    </div>
    <div class="epp-manage-subtitle">
      <span id="epp-manage-tech" style="font-weight:600;"></span>
      <span style="margin: 0 6px;">•</span>
      <span id="epp-manage-equipment"></span>
    </div>
    <div class="epp-manage-chips">
      <span class="chip" id="epp-manage-current-status-chip"></span>
      <span class="chip" id="epp-manage-quantity-chip"></span>
      <span class="chip" id="epp-manage-expiration-chip"></span>
    </div>
    <input type="hidden" id="epp-manage-delivery-id">
    <div class="epp-section">
      <h4>Cambiar estado</h4>
      <div class="form-grid">
        <div class="form-group">
          <label for="epp-manage-status">Estado</label>
          <select id="epp-manage-status">
            <option value="Nuevo">Nuevo</option>
            <option value="Usado">Usado</option>
            <option value="Limpio">Limpio</option>
            <option value="En mantenimiento">En mantenimiento</option>
            <option value="Dañado">Dañado</option>
            <option value="Extraviado">Extraviado</option>
            <option value="Fuera de servicio">Fuera de servicio</option>
          </select>
        </div>
      </div>
      <div class="epp-modal-footer">
        <button id="epp-manage-status-btn" class="action-btn">Cambiar Estado</button>
      </div>
    </div>
    <div class="epp-section">
      <h4>Hoja de Seguridad</h4>
      <label class="dropzone" for="epp-manage-sds">
        <span>Arrastra un archivo o haz clic para seleccionar</span>
      </label>
      <input type="file" id="epp-manage-sds" accept="application/pdf,image/*" style="display:none;">
      <div id="epp-sds-preview" style="margin-top:10px; display:none;">
        <img id="epp-sds-preview-img" src="" alt="Vista previa" style="max-width:100%; max-height:180px; border:1px solid var(--border-color); border-radius:6px; background:#fff; display:none;">
        <div id="epp-sds-preview-file" style="display:none; color: var(--text-medium); font-size:0.9rem;"></div>
      </div>
      <div class="epp-modal-footer">
        <button id="epp-manage-sds-btn" class="cta-button">Guardar Hoja de Seguridad</button>
        <button class="action-btn" onclick="closeEppManageModal()">Cerrar</button>
      </div>
    </div>
  </div>
</div>
`;

window.renderEppView = function() {
    const container = document.getElementById('epp-view');
    if (!container) return;
    if (!container.querySelector('.view-header')) {
        container.innerHTML = eppViewHtml;
        const techSelect = document.getElementById('epp-tech-filter');
        if (techSelect) {
            techSelect.innerHTML = '<option value=\"\">Todos</option>' + (AppState.db.technicians || []).map(t => `<option value=\"${t.id}\">${t.name}</option>`).join('');
            techSelect.addEventListener('change', renderEppDeliveriesTable);
        }
        // Delegación para botón Gestionar (persistente)
        const deliveriesTable = document.getElementById('epp-deliveries-table');
        if (deliveriesTable && !deliveriesTable._eppManageHandler) {
            const handler = (ev) => {
                const btn = ev.target.closest('button[data-action="manage"]');
                if (btn) {
                    const id = btn.getAttribute('data-id');
                    if (id) openEppManageModal(parseInt(id, 10));
                }
            };
            deliveriesTable.addEventListener('click', handler);
            deliveriesTable._eppManageHandler = handler;
        }
        const f = document.getElementById('epp-maintenance-form');
        if (f) f.addEventListener('submit', submitEppMaintenanceForm);
        const evInp = document.getElementById('epp-maintenance-evidence');
        if (evInp) evInp.addEventListener('change', handleEppEvidencePreview);
        const d = document.getElementById('epp-maintenance-date');
        if (d) d.value = new Date().toISOString().slice(0,10);
        const statusBtn = document.getElementById('epp-manage-status-btn');
        if (statusBtn) statusBtn.addEventListener('click', submitEppManageStatus);
        const sdsBtn = document.getElementById('epp-manage-sds-btn');
        if (sdsBtn) sdsBtn.addEventListener('click', submitEppSafetySheet);
        const sdsInput = document.getElementById('epp-manage-sds');
        if (sdsInput) sdsInput.addEventListener('change', handleEppSdsPreview);

        // Asegurar que los modales estén en <body> para overlay correcto
        const manageModal = document.getElementById('epp-manage-modal');
        if (manageModal && manageModal.parentElement !== document.body) {
            document.body.appendChild(manageModal);
        }
        const maintenanceModal = document.getElementById('epp-maintenance-modal');
        if (maintenanceModal && maintenanceModal.parentElement !== document.body) {
            document.body.appendChild(maintenanceModal);
        }
    }
    loadAndRenderEppDeliveries();
};

async function loadAndRenderEppDeliveries() {
    if (!AppState.currentUser) return;
    try {
        const companyId = AppState.currentUser.companyId;
        const res = await apiCall(`get_company_epp_deliveries.php?company_id=${companyId}`, { method: 'GET' });
        if (res.success) {
            AppState.db.epp_deliveries = res.deliveries || [];
            renderEppDeliveriesTable();
        }
    } catch (e) {
        console.error('Error cargando entregas de EPP:', e);
    }
}

// Refresco en tiempo real ante nuevas entregas desde el módulo de técnicos
window.addEventListener('epp:delivery:created', (ev) => {
    // Validar empresa opcionalmente
    loadAndRenderEppDeliveries();
});

function renderEppDeliveriesTable() {
    const table = document.getElementById('epp-deliveries-table');
    if (!table) return;
    const thead = table.tHead || table.createTHead();
    const tbody = table.tBodies[0] || table.createTBody();
    const techFilter = document.getElementById('epp-tech-filter');
    const techId = techFilter ? techFilter.value : '';

    thead.innerHTML = `
        <tr>
            <th>Fecha</th>
            <th>Técnico</th>
            <th>Equipo</th>
            <th>Cantidad</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Caducidad</th>
            <th class="action-cell">Acciones</th>
        </tr>
    `;

    const deliveries = (AppState.db.epp_deliveries || []).filter(d => {
        if (techId && String(d.technician_id) !== String(techId)) return false;
        return true;
    });

    if (deliveries.length === 0) {
        tbody.innerHTML = '<tr><td colspan=\"8\" style=\"text-align:center; padding: 20px;\">Sin entregas registradas.</td></tr>';
        return;
    }

    const techMap = (AppState.db.technicians || []).reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});

    tbody.innerHTML = deliveries.map(d => {
        const tech = techMap[d.technician_id];
        return `
            <tr class="epp-row" data-delivery-id="${d.id}">
                <td>${d.delivery_date}</td>
                <td>${tech ? tech.name : '-'}</td>
                <td class="epp-equipment-cell" data-id="${d.id}" style="cursor:pointer;">
                    <span class="expander" aria-hidden="true" style="display:inline-block; width:14px; margin-right:6px;">▸</span>${d.equipment_type}
                </td>
                <td>${d.quantity}</td>
                <td>${d.reason}</td>
                <td>${d.equipment_status}</td>
                <td>${d.expiration_date || '-'}</td>
                <td class="action-cell"><button class="action-btn" data-action="manage" data-id="${d.id}" onclick="openEppManageModal(${d.id})">Gestionar</button></td>
            </tr>
        `;
    }).join('');

    if (!table._eppToggleHandler) {
        const handler = async (ev) => {
            const cell = ev.target.closest && ev.target.closest('.epp-equipment-cell');
            if (!cell) return;
            const row = cell.parentElement;
            const id = parseInt(cell.getAttribute('data-id'), 10);
            if (isNaN(id)) return;
            const next = row.nextElementSibling;
            if (next && next.classList.contains('epp-details-row')) {
                next.remove();
                const icon = cell.querySelector('.expander');
                if (icon) icon.textContent = '▸';
                return;
            }
            // Cerrar otro desplegable abierto contiguo si existe
            if (next && next.classList.contains('epp-details-row')) next.remove();
            // Insertar fila de detalles
            const details = document.createElement('tr');
            details.className = 'epp-details-row';
            const colCount = table.tHead.rows[0].cells.length;
            const td = document.createElement('td');
            td.colSpan = colCount;
            td.innerHTML = `
                <div class="epp-details" style="background:#fafafa; border:1px solid var(--border-color); border-radius:8px; padding:12px; margin:6px 0;">
                    <div style="font-weight:600; margin-bottom:8px;">Detalles del equipo</div>
                    <div class="epp-details-content" style="display:flex; gap:16px; flex-wrap:wrap;">
                        <div class="epp-docs" style="flex:1; min-width:260px;">
                            <div style="font-weight:600; margin-bottom:6px;">Hojas de seguridad</div>
                            <div class="epp-docs-list">
                                <div class="skeleton" style="height: 40px; width: 40px; border-radius: 4px; display: inline-block;"></div>
                                <div class="skeleton" style="height: 40px; width: 40px; border-radius: 4px; display: inline-block; margin-left: 10px;"></div>
                            </div>
                        </div>
                        <div class="epp-maint" style="flex:2; min-width:260px;">
                            <div style="font-weight:600; margin-bottom:6px;">Historial de mantenimiento / limpieza</div>
                            <div style="margin-bottom:8px;">
                                <button class="action-btn" data-action="add-maint" data-id="${id}">Registrar Mantenimiento</button>
                            </div>
                            <div class="epp-maint-list">
                                <div class="skeleton"></div>
                                <div class="skeleton"></div>
                            </div>
                        </div>
                    </div>
                </div>`;
            details.appendChild(td);
            row.parentElement.insertBefore(details, row.nextElementSibling);
            const icon = cell.querySelector('.expander');
            if (icon) icon.textContent = '▾';
            // Cargar datos
            const addBtn = td.querySelector('button[data-action="add-maint"][data-id]');
            if (addBtn) {
                addBtn.addEventListener('click', (e2) => {
                    e2.stopPropagation();
                    const did = parseInt(addBtn.getAttribute('data-id'), 10);
                    if (!isNaN(did)) openEppMaintenanceModal(did);
                });
            }
            try {
                const [docsRes, maintRes] = await Promise.all([
                    apiCall(`get_epp_documents.php?epp_delivery_id=${id}`, { method: 'GET' }),
                    apiCall(`get_epp_maintenance.php?epp_delivery_id=${id}`, { method: 'GET' })
                ]);
                // Render docs
                const docsWrap = td.querySelector('.epp-docs-list');
                if (docsWrap) {
                    const docs = (docsRes && docsRes.success && docsRes.documents) ? docsRes.documents : [];
                    if (docs.length === 0) {
                        docsWrap.textContent = 'Sin hojas de seguridad.';
                    } else {
                        docsWrap.innerHTML = docs.map(doc => {
                            let href = '#';
                            const fp = doc.file_path || '';
                            if (fp.startsWith('/uploads/')) {
                                href = fp;
                            } else if (fp.startsWith('uploads/')) {
                                href = `/${fp}`;
                            } else {
                                href = (window.getFullImagePath ? window.getFullImagePath(fp) : fp);
                            }
                            const isImg = /\.(png|jpe?g|gif|webp)$/i.test(fp);
                            return isImg
                                ? `<a href="${href}" target="_blank" style="display:inline-block; margin:4px 6px 4px 0;">
                                      <img src="${href}" alt="Hoja" style="height:48px; width:auto; border:1px solid #ddd; border-radius:4px;">
                                   </a>`
                                : `<a href="${href}" target="_blank" style="display:block; margin:4px 0;">Ver documento (${doc.doc_type || 'archivo'})</a>`;
                        }).join('');
                    }
                }
                // Render maintenance
                const maintWrap = td.querySelector('.epp-maint-list');
                if (maintWrap) {
                    const maint = (maintRes && maintRes.success && maintRes.maintenance) ? maintRes.maintenance : [];
                    if (maint.length === 0) {
                        maintWrap.textContent = 'Sin registros.';
                    } else {
                        maintWrap.innerHTML = maint.map(m => {
                            const ev = m.evidence_path ? (window.getFullImagePath ? window.getFullImagePath(m.evidence_path) : m.evidence_path) : '';
                            const thumb = ev ? `<a href="${ev}" target="_blank" style="margin-left:8px;"><img src="${ev}" alt="Evidencia" style="height:36px; width:auto; border:1px solid #ddd; border-radius:4px; vertical-align:middle;"></a>` : '';
                            const notes = m.notes ? ` — ${m.notes}` : '';
                            const by = m.performed_by ? ` · ${m.performed_by}` : '';
                            return `<div style="padding:6px 0; border-bottom:1px dashed #e5e5e5;">
                                <span style="font-weight:600;">${m.maintenance_date}</span> · ${m.type}${by}${notes}${thumb}
                            </div>`;
                        }).join('');
                    }
                }
            } catch (err) {
                console.error('EPP: error cargando detalles', err);
            }
        };
        table.tBodies[0].addEventListener('click', handler);
        table._eppToggleHandler = handler;
    }
}

window.openEppDeliveryFromModule = function() {
    if (!AppState.db.technicians || AppState.db.technicians.length === 0) {
        showAlert('No hay técnicos registrados para asignar EPP.', 'Sin técnicos');
        return;
    }
    // Reutilizar modal de EPP del módulo de técnicos si existe
    const firstTech = AppState.db.technicians[0];
    if (window.openTechEppModal) {
        window.openTechEppModal(firstTech.id);
    } else {
        showAlert('El formulario de entrega de EPP aún no está disponible.', 'Información');
    }
};

// Delegación global de respaldo por si el listener del tablero falla
if (!window._eppGlobalManageHandler) {
    window._eppGlobalManageHandler = function(ev) {
        const btn = ev.target && ev.target.closest && ev.target.closest('button.action-btn');
        if (!btn) return;
        const label = (btn.textContent || '').trim().toLowerCase();
        if (label !== 'gestionar') return;
        let id = btn.getAttribute('data-id');
        if (!id || isNaN(parseInt(id, 10))) {
            const row = btn.closest('tr');
            if (row && row.getAttribute('data-delivery-id')) {
                id = row.getAttribute('data-delivery-id');
            }
        }
        openEppManageModal(id ? parseInt(id, 10) : undefined);
    };
    document.addEventListener('click', window._eppGlobalManageHandler, true);
}

window.openEppManageModal = function(id) {
    console.log('EPP: intentando abrir modal gestionar, id=', id);
    let m = document.getElementById('epp-manage-modal');
    // Si el modal no existe aún (vista previa antigua), crearlo dinámicamente
    if (!m) {
        const temp = document.createElement('div');
        temp.innerHTML = `
        <div id="epp-manage-modal" class="modal no-print" style="display:none;">
          <div class="modal-content">
            <span class="modal-close" onclick="closeEppManageModal()">×</span>
            <div class="epp-manage-header">
              <h3 class="epp-manage-title">Gestionar EPP</h3>
            </div>
            <div class="epp-manage-subtitle">
              <span id="epp-manage-tech" style="font-weight:600;"></span>
              <span style="margin: 0 6px;">•</span>
              <span id="epp-manage-equipment"></span>
            </div>
            <div class="epp-manage-chips">
              <span class="chip" id="epp-manage-current-status-chip"></span>
              <span class="chip" id="epp-manage-quantity-chip"></span>
              <span class="chip" id="epp-manage-expiration-chip"></span>
            </div>
            <input type="hidden" id="epp-manage-delivery-id">
            <div class="epp-section">
              <h4>Cambiar estado</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label for="epp-manage-status">Estado</label>
                  <select id="epp-manage-status">
                    <option value="Nuevo">Nuevo</option>
                    <option value="Usado">Usado</option>
                    <option value="Limpio">Limpio</option>
                    <option value="En mantenimiento">En mantenimiento</option>
                    <option value="Dañado">Dañado</option>
                    <option value="Extraviado">Extraviado</option>
                    <option value="Fuera de servicio">Fuera de servicio</option>
                  </select>
                </div>
              </div>
              <div class="epp-modal-footer">
                <button id="epp-manage-status-btn" class="action-btn">Cambiar Estado</button>
              </div>
            </div>
            <div class="epp-section">
              <h4>Hoja de Seguridad</h4>
              <label class="dropzone" for="epp-manage-sds">
                <span>Arrastra un archivo o haz clic para seleccionar</span>
              </label>
              <input type="file" id="epp-manage-sds" accept="application/pdf,image/*" style="display:none;">
              <div id="epp-sds-preview" style="margin-top:10px; display:none;">
                <img id="epp-sds-preview-img" src="" alt="Vista previa" style="max-width:100%; max-height:180px; border:1px solid var(--border-color); border-radius:6px; background:#fff; display:none;">
                <div id="epp-sds-preview-file" style="display:none; color: var(--text-medium); font-size:0.9rem;"></div>
              </div>
              <div class="epp-modal-footer">
                <button id="epp-manage-sds-btn" class="cta-button">Guardar Hoja de Seguridad</button>
                <button class="action-btn" onclick="closeEppManageModal()">Cerrar</button>
              </div>
            </div>
          </div>
        </div>`;
        m = temp.firstElementChild;
        document.body.appendChild(m);
        const statusBtnDyn = m.querySelector('#epp-manage-status-btn');
        if (statusBtnDyn) statusBtnDyn.addEventListener('click', submitEppManageStatus);
        const sdsBtnDyn = m.querySelector('#epp-manage-sds-btn');
        if (sdsBtnDyn) sdsBtnDyn.addEventListener('click', submitEppSafetySheet);
        const sdsInputDyn = m.querySelector('#epp-manage-sds');
        if (sdsInputDyn) sdsInputDyn.addEventListener('change', handleEppSdsPreview);
    }
    const inp = document.getElementById('epp-manage-delivery-id');
    const s = document.getElementById('epp-manage-status');
    if (!m || !inp || !s) {
        console.warn('EPP: modal/inputs no encontrados al abrir gestionar');
        return;
    }
    // Garantizar overlay correcto
    if (m.parentElement !== document.body) document.body.appendChild(m);
    inp.value = id;
    const current = (AppState.db.epp_deliveries || []).find(x => String(x.id) === String(id));
    if (current) s.value = current.equipment_status || '';
    if (current) {
        const tech = (AppState.db.technicians || []).find(t => String(t.id) === String(current.technician_id));
        const techEl = document.getElementById('epp-manage-tech');
        const eqEl = document.getElementById('epp-manage-equipment');
        const stChip = document.getElementById('epp-manage-current-status-chip');
        const qtyChip = document.getElementById('epp-manage-quantity-chip');
        const expChip = document.getElementById('epp-manage-expiration-chip');
        if (techEl) techEl.textContent = tech ? tech.name : '';
        if (eqEl) eqEl.textContent = current.equipment_type || '';
        if (stChip) stChip.textContent = current.equipment_status || '';
        if (qtyChip) qtyChip.textContent = current.quantity ? current.quantity + ' pza(s)' : '';
        if (expChip) expChip.textContent = current.expiration_date ? 'Caduca: ' + current.expiration_date : 'Sin caducidad';
    }
    // Botón de mantenimiento se muestra ahora en el desplegable de historial
    console.log('EPP: datos para gestionar', current);
    if (typeof window.openModal === 'function') {
        window.openModal('epp-manage-modal');
        m.style.display = 'flex';
    } else {
        m.classList.add('active');
        m.style.display = 'flex';
    }
};

window.closeEppManageModal = function() {
    const m = document.getElementById('epp-manage-modal');
    if (!m) return;
    if (typeof window.closeModal === 'function') {
        window.closeModal('epp-manage-modal');
    } else {
        m.classList.remove('active');
        m.style.display = 'none';
    }
};

async function submitEppManageStatus(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('epp-manage-delivery-id').value, 10);
    const status = document.getElementById('epp-manage-status').value;
    const res = await apiCall('update_epp_status.php', { method: 'POST', body: JSON.stringify({ delivery_id: id, status }) });
    if (res && res.success) {
        showAlert('Estado actualizado', 'OK');
        loadAndRenderEppDeliveries();
        closeEppManageModal();
    } else {
        showAlert('No se pudo actualizar', 'Error');
    }
}

async function submitEppSafetySheet(e) {
    e.preventDefault();
    if (!AppState.currentUser) return;
    const companyId = AppState.currentUser.companyId;
    const id = parseInt(document.getElementById('epp-manage-delivery-id').value, 10);
    const fileInp = document.getElementById('epp-manage-sds');
    if (!fileInp || !fileInp.files || !fileInp.files[0]) {
        showAlert('Selecciona un archivo', 'Atención');
        return;
    }
    const btn = document.getElementById('epp-manage-sds-btn');
    const original = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
    const dataUrl = await readFileAsDataURL(fileInp.files[0]);
    let res = await apiCall('add_epp_document.php', { method: 'POST', body: JSON.stringify({ company_id: companyId, epp_delivery_id: id, doc_type: 'hoja_seguridad', file: dataUrl }) });
    if (!res || !res.success) {
        try {
            const base = AppState.apiBaseUrl || 'api/';
            const url = `${base.replace(/\/?$/, '/') }add_epp_document.php`;
            const fd = new FormData();
            fd.append('company_id', String(companyId));
            fd.append('epp_delivery_id', String(id));
            fd.append('doc_type', 'hoja_seguridad');
            fd.append('file', dataUrl);
            if (AppState.currentUser) {
                fd.append('user_type', AppState.currentUser.type || '');
                fd.append('requesting_user_id', String(AppState.currentUser.id || ''));
            }
            const r = await fetch(url, { method: 'POST', body: fd });
            const t = await r.text();
            try { res = JSON.parse(t); } catch (_) { res = { success: false, message: t || 'Respuesta inválida' }; }
            if (!res.success) {
                const localUrl = 'api/add_epp_document.php';
                const r2 = await fetch(localUrl, { method: 'POST', body: fd });
                const t2 = await r2.text();
                try { res = JSON.parse(t2); } catch (_) { res = { success: false, message: t2 || 'Respuesta inválida' }; }
            }
        } catch (err) {
            console.error('Fallback SDS FormData error:', err);
        }
    }
    if (res && res.success) {
        showAlert('Hoja de seguridad cargada', 'OK');
        closeEppManageModal();
    } else {
        showAlert(res && res.message ? res.message : 'No se pudo cargar el archivo', 'Error');
    }
    if (btn) { btn.disabled = false; btn.textContent = original; }
}

window.openEppMaintenanceModal = function(id) {
    const m = document.getElementById('epp-maintenance-modal');
    const inp = document.getElementById('epp-maintenance-delivery-id');
    const d = document.getElementById('epp-maintenance-date');
    if (!m || !inp || !d) return;
    if (m.parentElement !== document.body) document.body.appendChild(m);
    inp.value = id;
    d.value = new Date().toISOString().slice(0,10);
    if (typeof window.openModal === 'function') {
        window.openModal('epp-maintenance-modal');
        m.style.display = 'flex';
    } else {
        m.classList.add('active');
        m.style.display = 'flex';
    }
};

window.closeEppMaintenanceModal = function() {
    const m = document.getElementById('epp-maintenance-modal');
    if (!m) return;
    if (typeof window.closeModal === 'function') {
        window.closeModal('epp-maintenance-modal');
    } else {
        m.classList.remove('active');
        m.style.display = 'none';
    }
};

async function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

function handleEppEvidencePreview(e) {
    const file = e.target && e.target.files && e.target.files[0];
    const wrap = document.getElementById('epp-evidence-preview');
    const img = document.getElementById('epp-evidence-preview-img');
    if (!wrap || !img) return;
    if (!file) {
        wrap.style.display = 'none';
        img.src = '';
        return;
    }
    const url = URL.createObjectURL(file);
    img.src = url;
    wrap.style.display = 'block';
}

function handleEppSdsPreview(e) {
    const file = e.target && e.target.files && e.target.files[0];
    const wrap = document.getElementById('epp-sds-preview');
    const img = document.getElementById('epp-sds-preview-img');
    const fileLabel = document.getElementById('epp-sds-preview-file');
    if (!wrap || !img || !fileLabel) return;
    if (!file) {
        wrap.style.display = 'none';
        img.style.display = 'none';
        fileLabel.style.display = 'none';
        img.src = '';
        fileLabel.textContent = '';
        return;
    }
    const isImage = file.type && file.type.startsWith('image/');
    if (isImage) {
        const url = URL.createObjectURL(file);
        img.src = url;
        img.style.display = 'block';
        fileLabel.style.display = 'none';
    } else {
        img.style.display = 'none';
        fileLabel.textContent = `Archivo: ${file.name}`;
        fileLabel.style.display = 'block';
    }
    wrap.style.display = 'block';
}

async function submitEppMaintenanceForm(e) {
    e.preventDefault();
    if (!AppState.currentUser) return;
    const companyId = AppState.currentUser.companyId;
    const id = document.getElementById('epp-maintenance-delivery-id').value;
    const date = document.getElementById('epp-maintenance-date').value;
    const type = document.getElementById('epp-maintenance-type').value;
    const notes = document.getElementById('epp-maintenance-notes').value;
    const fileInp = document.getElementById('epp-maintenance-evidence');
    let evidence = '';
    if (fileInp && fileInp.files && fileInp.files[0]) {
        evidence = await readFileAsDataURL(fileInp.files[0]);
    }
    const performed_by = (AppState.currentUser.name || AppState.currentUser.username || 'Usuario');
    const body = { company_id: companyId, epp_delivery_id: parseInt(id,10), maintenance_date: date, type, notes, evidence, performed_by };
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Guardando...'; }
    let res = await apiCall('add_epp_maintenance.php', { method: 'POST', body: JSON.stringify(body) });
    // Fallback: si falla (servidor externo con otra implementación), reintentar con FormData
    if (!res || !res.success) {
        try {
            const base = AppState.apiBaseUrl || 'api/';
            const url = `${base.replace(/\/?$/, '/') }add_epp_maintenance.php`;
            const fd = new FormData();
            fd.append('company_id', String(companyId));
            fd.append('epp_delivery_id', String(parseInt(id,10)));
            fd.append('maintenance_date', date);
            fd.append('type', type);
            fd.append('performed_by', performed_by);
            if (AppState.currentUser) {
                fd.append('user_type', AppState.currentUser.type || '');
                fd.append('requesting_user_id', String(AppState.currentUser.id || ''));
            }
            if (notes) fd.append('notes', notes);
            if (evidence) fd.append('evidence', evidence); // dataURL string
            const r = await fetch(url, { method: 'POST', body: fd });
            const t = await r.text();
            let json;
            try { json = JSON.parse(t); } catch (_) { json = { success: false, message: t || 'Respuesta inválida' }; }
            res = json;
            if (!res.success) {
                const localUrl = 'api/add_epp_maintenance.php';
                const r2 = await fetch(localUrl, { method: 'POST', body: fd });
                const t2 = await r2.text();
                try { res = JSON.parse(t2); } catch (_) { res = { success: false, message: t2 || 'Respuesta inválida' }; }
            }
        } catch (err) {
            console.error('Fallback FormData error:', err);
        }
    }
    if (res && res.success) {
        closeEppMaintenanceModal();
        showAlert('Registro guardado', 'OK');
        loadAndRenderEppDeliveries();
    } else {
        showAlert(res && res.message ? res.message : 'No se pudo guardar', 'Error');
    }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
}

window.changeEppStatus = async function(id, status) {
    const res = await apiCall('update_epp_status.php', { method: 'POST', body: JSON.stringify({ delivery_id: id, status }) });
    if (res && res.success) {
        showAlert('Estado actualizado', 'OK');
        loadAndRenderEppDeliveries();
    } else {
        showAlert('No se pudo actualizar', 'Error');
    }
};

// Botones PDF/CSV removidos a solicitud del usuario
