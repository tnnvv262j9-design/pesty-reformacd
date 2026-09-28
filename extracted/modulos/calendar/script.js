// Calendar Module Script

const calendarHtml = `
<div id="calendar-view-content">
    <div class="view-header">
        <h2 class="view-title">Calendario <span class="highlight">Global de Servicios</span></h2>
    </div>
    <div class="toolbar" style="margin-bottom: 20px;">
        <select id="calendar-filter-tech" data-custom-select>
            <option value="">Todos los Técnicos</option>
        </select>
        <select id="calendar-filter-status" data-custom-select>
            <option value="">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Realizado">Realizado</option>
            <option value="Cancelado">Cancelado</option>
        </select>
    </div>
    <div id="calendar-container"></div>
</div>
`;

async function loadCalendarView() {
    const container = document.getElementById('calendar-view');
    if (!container) return;
    
    // Check if content is already loaded
    if (container.querySelector('#calendar-view-content')) {
        // If loaded but not initialized (e.g. after refresh), re-init
        if (!AppState.calendarInitialized && AppState.calendar) {
            AppState.calendar.render();
        }
        return;
    }

    container.innerHTML = calendarHtml;
    
    // Initialize custom selects
    if (window.createCustomSelect) {
        container.querySelectorAll('[data-custom-select]').forEach(window.createCustomSelect);
    }
    
    // Populate filters if needed (usually handled by populateFilters in main script, but we might need to trigger it or do it here)
    // The main script's populateFilters targets 'calendar-filter-tech', so if that element exists now, we should re-run it or handle it.
    // For now, let's assume populateFilters runs or we can manually populate.
    populateCalendarFilters();

    // Initialize the calendar
    initializeCalendarModule();
}

function populateCalendarFilters() {
    const techFilter = document.getElementById('calendar-filter-tech');
    if (!techFilter || !AppState.db.technicians) return;
    
    // Keep first option
    const firstOption = techFilter.querySelector('option');
    techFilter.innerHTML = '';
    if (firstOption) techFilter.appendChild(firstOption);
    
    AppState.db.technicians.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.name;
        techFilter.appendChild(option);
    });
}

function initializeCalendarModule() {
    const calendarEl = document.getElementById('calendar-container');
    if (!calendarEl) return;
    
    const initialView = window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek';
    
    // Elementos de filtro
    const techFilter = document.getElementById('calendar-filter-tech');
    const statusFilter = document.getElementById('calendar-filter-status');

    const renderCalendarEvents = (fetchInfo, successCallback, failureCallback) => {
        const isPrivacy = window.isPrivacyMode && window.isPrivacyMode();
        const clientMap = (AppState.db.clients || []).reduce((map, client) => (map[client.id] = isPrivacy ? { ...client, full_name: 'Cliente Oculto', address: 'Dirección Oculta' } : client, map), {});
        
        // Filtros actuales
        const selectedTech = techFilter ? techFilter.value : '';
        const selectedStatus = statusFilter ? statusFilter.value : '';

        let services = AppState.db.services;

        // Aplicar filtros
        if (selectedTech) {
            services = services.filter(s => s.technician_id == selectedTech);
        }
        if (selectedStatus) {
            services = services.filter(s => s.status === selectedStatus);
        }

        const mappedServices = services.map(s => {
            const client = clientMap[s.client_id];
            let color = 'var(--accent-secondary)';
            if (s.status === 'Realizado') color = 'var(--accent-primary)';
            if (s.status === 'Cancelado') color = 'var(--error-color)';
            
            return { 
                id: s.id, 
                title: `${client ? client.full_name : 'N/A'} - ${s.service_type || 'Servicio'}`, 
                start: `${s.service_date}T${s.service_time || '00:00:00'}`, 
                color: color, 
                extendedProps: { 
                    company_name: AppState.currentUser.name,
                    address: client ? client.address : '',
                    status: s.status,
                    tech_id: s.technician_id
                } 
            };
        });
        
        const reminders = (AppState.db.reminders || []).map(r => ({ 
            id: r.id, 
            title: r.text, 
            start: r.date, 
            allDay: true, 
            classNames: ['fc-event-reminder'], 
            extendedProps: { isReminder: true, date: r.date, reminderId: r.id } 
        }));
        
        successCallback([...mappedServices, ...reminders]);
    };

    AppState.calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'es',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
        initialView: initialView,
        editable: AppState.currentUser.type !== 'tech',
        eventDrop: handleEventDrop,
        events: renderCalendarEvents,
        eventContent: function(arg) {
            let html = `<div class="fc-event-main-custom">`;
            if (arg.event.extendedProps.isReminder) {
                html += `<span>📌 ${arg.event.title}</span>`;
            } else {
                html += `<div style="display:flex; flex-direction:column; overflow:hidden;">`;
                html += `<span style="font-weight:bold;">${arg.event.title}</span>`;
                if (arg.event.extendedProps.address) {
                    html += `<span style="font-size:0.8em; opacity:0.9;">📍 ${arg.event.extendedProps.address}</span>`;
                }
                html += `</div>`;
            }
            html += `</div>`;
            return { html: html };
        },
        eventClick: function(info) {
            info.jsEvent.preventDefault();
            if (info.event.extendedProps.isReminder) {
                if (checkPermissions(true)) openReminderModal(info.event.extendedProps.date, info.event.extendedProps.reminderId);
            } else {
                if (window.showServiceInfoModal) {
                    window.showServiceInfoModal(info.event.id);
                }
            }
        },
        dateClick: function(info) {
            if (checkPermissions(true)) handleDateClick(info);
        },
        windowResize: function(arg) {
            if (window.innerWidth < 768) {
                if (arg.view.type !== 'timeGridDay' && arg.view.type !== 'listWeek') {
                    AppState.calendar.changeView('timeGridDay');
                }
            } else {
                if (arg.view.type === 'timeGridDay') {
                    AppState.calendar.changeView('timeGridWeek');
                }
            }
        }
    });
    
    AppState.calendar.render();
    AppState.calendarInitialized = true;

    // Listeners para filtros
    if (techFilter) techFilter.addEventListener('change', () => AppState.calendar.refetchEvents());
    if (statusFilter) statusFilter.addEventListener('change', () => AppState.calendar.refetchEvents());
}

async function handleEventDrop(info) {
    const serviceId = info.event.id;
    const newDate = info.event.start.toISOString().slice(0, 10);
    const result = await apiCall('update_service_data.php', {
        method: 'POST',
        body: JSON.stringify({ id: serviceId, new_date: newDate })
    });
    if (!result.success) {
        showAlert(result.message || 'Error al actualizar la fecha.', 'Error');
        info.revert();
    } else {
        await refreshAllDataAndViews();
    }
}

function handleDateClick(info) {
    const date = info.dateStr;
    const listEl = document.getElementById('day-details-list');
    const titleEl = document.getElementById('day-details-title');
    const addReminderBtn = document.getElementById('add-reminder-btn');
    
    if (!listEl || !titleEl) return;

    listEl.innerHTML = '';
    const readableDate = new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    titleEl.textContent = `Eventos para ${readableDate}`;
    if (addReminderBtn) addReminderBtn.dataset.date = date;
    
    const clientMap = AppState.db.clients.reduce((map, client) => (map[client.id] = client, map), {});
    const servicesToday = AppState.db.services.filter(s => s.service_date === date);
    const remindersToday = (AppState.db.reminders || []).filter(r => r.date === date);
    
    if (servicesToday.length === 0 && remindersToday.length === 0) {
        listEl.innerHTML = '<p class="no-items">No hay servicios ni recordatorios para este día.</p>';
    } else {
        servicesToday.forEach(s => {
            const client = clientMap[s.client_id];
            const timeStr = window.formatTime ? window.formatTime(s.service_time) : s.service_time;
            listEl.innerHTML += `<li class="service-item"><div class="item-info">Servicio: ${client ? client.full_name : 'N/A'}<span>${timeStr} · ${s.status}</span></div><div class="item-actions"><button class="action-btn" onclick="showServiceInfoModal(${s.id})">Ver</button></div></li>`;
        });
        remindersToday.forEach(r => {
            listEl.innerHTML += `<li class="reminder-item"><div class="item-info">Recordatorio<span>${r.text}</span></div><div class="item-actions"><button class="action-btn" onclick="openReminderModal('${r.date}', '${r.id}')">✏️</button><button class="action-btn delete" onclick="deleteReminder('${r.id}')">🗑️</button></div></li>`;
        });
    }
    openModal('day-details-modal');
}

// Expose reminder functions globally since they are called from onclick events in HTML
window.openReminderModal = (date, id = null) => {
    if (!checkPermissions(true)) return;
    
    const form = document.getElementById('reminder-form');
    if(form) form.reset();
    
    const idInput = document.getElementById('reminder-id');
    const dateInput = document.getElementById('reminder-date');
    const textInput = document.getElementById('reminder-text');
    const title = document.getElementById('reminder-modal-title');
    
    if (idInput) idInput.value = '';
    if (dateInput) dateInput.value = date;
    
    if (id) {
        const reminder = AppState.db.reminders.find(r => r.id == id);
        if (!reminder) return;
        if (title) title.textContent = 'Editar Recordatorio';
        if (idInput) idInput.value = reminder.id;
        if (textInput) textInput.value = reminder.text;
    } else {
        if (title) title.textContent = 'Nuevo Recordatorio';
    }
    closeModal('day-details-modal');
    openModal('reminder-modal');
};

window.handleSaveReminder = async function() {
    const id = document.getElementById('reminder-id').value;
    const date = document.getElementById('reminder-date').value;
    const text = document.getElementById('reminder-text').value;
    
    const payload = { id: id || null, company_id: AppState.currentUser.companyId, date: date, text: text };
    const endpoint = id ? 'edit_reminder.php' : 'add_reminder.php';
    const result = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    if (result.success) { 
        await refreshAllDataAndViews();
        closeModal('reminder-modal'); 
    } else { 
        showAlert(result.message || 'Error al guardar el recordatorio.', 'Error'); 
    }
};

window.deleteReminder = async (id) => {
    if (!checkPermissions(true)) return;
    showConfirm('¿Seguro que quieres eliminar este recordatorio?', 'Confirmar Eliminación', async (confirmed) => {
        if (confirmed) {
            const result = await apiCall(`delete_reminder.php?id=${id}`, { method: 'GET' });
            if (result.success) {
                await refreshAllDataAndViews();
                closeModal('day-details-modal');
            } else {
                showAlert(result.message || 'Error al eliminar el recordatorio.', 'Error');
            }
        }
    });
};

// Global function to render the view
window.renderCalendarView = loadCalendarView;

// Attach reminder form listener if it exists and hasn't been attached
// Ideally this should be done when the modal HTML is present, which is in index.html, so we can do it on load or init.
document.addEventListener('DOMContentLoaded', () => {
    const reminderForm = document.getElementById('reminder-form');
    if (reminderForm) {
        // Remove existing listeners by cloning? No, better to just ensure we don't add duplicate if possible.
        // But since this script runs once, it's fine.
        reminderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            window.handleSaveReminder();
        });
    }
    
    // Also attach to the add-reminder-btn
    const addReminderBtn = document.getElementById('add-reminder-btn');
    if (addReminderBtn) {
        addReminderBtn.onclick = () => {
             const date = addReminderBtn.dataset.date;
             if (date) window.openReminderModal(date);
        };
    }
});
