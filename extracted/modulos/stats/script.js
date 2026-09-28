// Stats Module Script

// Helper local


const statsHtml = `
<div class="view-header">
    <h2 class="view-title">Análisis y <span class="highlight">Estadísticas</span></h2>
</div>

<div class="toolbar">
    <label for="stats-period-type">Período:</label>
    <select id="stats-period-type" data-custom-select>
        <option value="month">Mensual</option>
        <option value="week">Semanal</option>
        <option value="quarter">Trimestral</option>
        <option value="year">Anual</option>
    </select>
    <label for="stats-period-filter" id="stats-period-label">Mes:</label>
    <input type="month" id="stats-period-filter">
    <label for="stats-tech-filter">Técnico:</label>
    <select id="stats-tech-filter" data-custom-select><option value="">Todos</option></select>
</div>

<div class="stats-grid">
    <div class="stat-card highlight-stat">
        <div class="stat-title" id="stat-income-title">💰 Ingresos del Mes</div>
        <div class="stat-value"><span class="currency" id="stat-currency-income">$</span><span id="stat-period-income">0.00</span></div>
        <p class="stat-comparison" id="stat-income-comparison">--% vs período anterior</p>
    </div>
    <div class="stat-card">
        <div class="stat-title" id="stat-services-title">📦 Servicios Realizados</div>
        <div class="stat-value" id="stat-completed-services">0</div>
        <p class="stat-comparison" id="stat-completed-comparison">--% vs período anterior</p>
    </div>
    <div class="stat-card">
        <div class="stat-title" id="stat-expenses-title">💸 Gastos del Mes</div>
        <div class="stat-value"><span class="currency" id="stat-currency-expenses">$</span><span id="stat-period-expenses">0.00</span></div>
        <p class="stat-comparison" id="stat-expenses-comparison">--% vs período anterior</p>
    </div>
    <div class="stat-card">
        <div class="stat-title" id="stat-profit-title">📈 Beneficio Neto</div>
        <div class="stat-value"><span class="currency" id="stat-currency-profit">$</span><span id="stat-net-profit">0.00</span></div>
        <p class="stat-comparison" id="stat-profit-comparison">--% vs período anterior</p>
    </div>
</div>

<div class="stats-charts-grid">
    <div class="chart-container full-width">
        <h3>Comparativa Mensual (Ingresos vs Gastos vs Servicios)</h3>
        <canvas id="monthly-comparison-chart"></canvas>
    </div>
    <div class="chart-container">
        <h3>Servicios por Tipo</h3>
        <canvas id="service-type-chart-stats"></canvas>
    </div>
    <div class="chart-container">
        <h3>Gastos por Categoría</h3>
        <canvas id="expense-category-chart"></canvas>
    </div>
    <!-- Nuevos gráficos -->
    <div class="chart-container full-width">
        <h3>🏆 Top 5 Clientes (Ingresos)</h3>
        <canvas id="top-clients-chart"></canvas>
    </div>
    <div class="chart-container">
        <h3>Rendimiento de Técnicos</h3>
        <canvas id="tech-performance-chart"></canvas>
    </div>
    <div class="chart-container">
        <h3>Servicios por Zona</h3>
        <canvas id="zone-stats-chart"></canvas>
    </div>
    <!-- Químicos Charts -->
    <div class="chart-container full-width">
        <h3>Uso de Químicos (Top 10 Costo)</h3>
        <div style="position: relative; height: 400px; width: 100%;">
            <canvas id="chemical-usage-chart"></canvas>
        </div>
    </div>
    <div class="chart-container">
        <h3>Tendencia Mensual de Costos de Químicos</h3>
        <div style="position: relative; height: 300px; width: 100%;">
            <canvas id="chemical-trend-chart"></canvas>
        </div>
    </div>
</div>
`;

async function loadStatsView() {
    const container = document.getElementById('stats-view');
    if (!container) return;
    
    // Check if content is already loaded
    if (container.querySelector('.stats-grid')) return;

    container.innerHTML = statsHtml;
    
    // Initialize custom selects
    if (window.createCustomSelect) {
        container.querySelectorAll('[data-custom-select]').forEach(window.createCustomSelect);
    }
    
    // Populate tech filter
    const techFilter = getEl('stats-tech-filter');
    if (techFilter && window.AppState && window.AppState.db && window.AppState.db.technicians) {
        // Keep first option (Todos)
        const firstOption = techFilter.querySelector('option');
        techFilter.innerHTML = '';
        if(firstOption) techFilter.appendChild(firstOption);
        
        window.AppState.db.technicians.forEach(t => { 
            techFilter.innerHTML += `<option value="${t.id}">${t.name}</option>`; 
        });
        
        // Re-init custom select for this element
        if (window.createCustomSelect) {
            // Remove existing custom select wrapper if any
            const wrapper = techFilter.nextElementSibling;
            if(wrapper && wrapper.classList.contains('custom-select-wrapper')) {
                wrapper.remove();
                techFilter.style.display = 'block'; // Restore original
            }
            window.createCustomSelect(techFilter);
        }
    }
    
    // Initialize handlers
    setupStatsPeriodHandlers();
}

function setupStatsPeriodHandlers() {
    const periodTypeSelect = getEl('stats-period-type');
    const periodFilter = getEl('stats-period-filter');
    const periodLabel = getEl('stats-period-label');
    
    if (!periodTypeSelect || !periodFilter) return;
    
    periodTypeSelect.addEventListener('change', function() {
        const periodType = this.value;
        const today = new Date();
        
        switch(periodType) {
            case 'week':
                periodLabel.textContent = 'Semana:';
                periodFilter.type = 'week';
                const year = today.getFullYear();
                const weekNum = getWeekNumber(today);
                periodFilter.value = `${year}-W${weekNum.toString().padStart(2, '0')}`;
                break;
            case 'month':
                periodLabel.textContent = 'Mes:';
                periodFilter.type = 'month';
                const monthYear = today.getFullYear();
                const month = (today.getMonth() + 1).toString().padStart(2, '0');
                periodFilter.value = `${monthYear}-${month}`;
                break;
            case 'quarter':
                periodLabel.textContent = 'Trimestre:';
                periodFilter.type = 'text';
                const quarterYear = today.getFullYear();
                const quarter = Math.ceil((today.getMonth() + 1) / 3);
                periodFilter.value = `${quarterYear}-Q${quarter}`;
                periodFilter.placeholder = 'YYYY-Q1, YYYY-Q2, etc.';
                break;
            case 'year':
                periodLabel.textContent = 'Año:';
                periodFilter.type = 'number';
                periodFilter.value = today.getFullYear();
                periodFilter.min = '2020';
                periodFilter.max = '2030';
                break;
        }
        renderStatisticsView();
    });
    
    periodFilter.addEventListener('change', renderStatisticsView);
    getEl('stats-tech-filter').addEventListener('change', renderStatisticsView);

    // Initialize with current month
    const today = new Date();
    const monthYear = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    periodFilter.value = `${monthYear}-${month}`;
    renderStatisticsView();
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function getPeriodData(periodType, periodFilter) {
    const today = new Date();
    let current = { start: null, end: null };
    let previous = { start: null, end: null };
    
    switch(periodType) {
        case 'week':
            const [yearStr, weekStr] = periodFilter.split('-W');
            const year = parseInt(yearStr);
            const week = parseInt(weekStr);
            
            // Calculate start of week (Monday)
            const jan1 = new Date(year, 0, 1);
            const daysToAdd = (week - 1) * 7 - jan1.getDay() + 1;
            current.start = new Date(year, 0, 1 + daysToAdd);
            current.end = new Date(current.start);
            current.end.setDate(current.end.getDate() + 6);
            
            // Previous week
            previous.start = new Date(current.start);
            previous.start.setDate(previous.start.getDate() - 7);
            previous.end = new Date(current.start);
            previous.end.setDate(previous.end.getDate() - 1);
            break;
            
        case 'month':
            const [monthYear, month] = periodFilter.split('-').map(Number);
            current.start = new Date(monthYear, month - 1, 1);
            current.end = new Date(monthYear, month, 0);
            
            // Previous month
            const prevMonthDate = new Date(monthYear, month - 2, 1);
            previous.start = prevMonthDate;
            previous.end = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0);
            break;
            
        case 'quarter':
            const [qYear, qStr] = periodFilter.split('-Q');
            const quarterYear = parseInt(qYear);
            const quarter = parseInt(qStr);
            
            const startMonth = (quarter - 1) * 3;
            current.start = new Date(quarterYear, startMonth, 1);
            current.end = new Date(quarterYear, startMonth + 3, 0);
            
            // Previous quarter
            const prevQuarter = quarter === 1 ? 4 : quarter - 1;
            const prevQuarterYear = quarter === 1 ? quarterYear - 1 : quarterYear;
            const prevStartMonth = (prevQuarter - 1) * 3;
            previous.start = new Date(prevQuarterYear, prevStartMonth, 1);
            previous.end = new Date(prevQuarterYear, prevStartMonth + 3, 0);
            break;
            
        case 'year':
            const yearNum = parseInt(periodFilter);
            current.start = new Date(yearNum, 0, 1);
            current.end = new Date(yearNum, 11, 31);
            
            // Previous year
            previous.start = new Date(yearNum - 1, 0, 1);
            previous.end = new Date(yearNum - 1, 11, 31);
            break;
            
        default:
            return null;
    }
    
    return { current, previous };
}

function updateStatsTitles(periodType) {
    const periodNames = {
        week: 'Semanal',
        month: 'Mensual', 
        quarter: 'Trimestral',
        year: 'Anual'
    };
    
    const periodName = periodNames[periodType] || 'Período';
    
    // Update title elements
    const incomeTitle = document.querySelector('.stat-card h3');
    if (incomeTitle && incomeTitle.textContent.includes('Ingresos')) {
        incomeTitle.textContent = `Ingresos ${periodName}`;
    }
    
    const expensesTitle = document.querySelectorAll('.stat-card h3')[1];
    if (expensesTitle && expensesTitle.textContent.includes('Gastos')) {
        expensesTitle.textContent = `Gastos ${periodName}`;
    }
    
    const profitTitle = document.querySelectorAll('.stat-card h3')[2];
    if (profitTitle && profitTitle.textContent.includes('Ganancia')) {
        profitTitle.textContent = `Ganancia ${periodName}`;
    }
    
    const servicesTitle = document.querySelectorAll('.stat-card h3')[3];
    if (servicesTitle && servicesTitle.textContent.includes('Servicios')) {
        servicesTitle.textContent = `Servicios ${periodName}`;
    }
}

function generateComparisonChartData(periodType, periodData, services, expenses) {
    const comparisonData = {};
    
    switch(periodType) {
        case 'week':
            // Generate last 6 weeks
            for (let i = 5; i >= 0; i--) {
                const weekStart = new Date(periodData.current.start);
                weekStart.setDate(weekStart.getDate() - (i * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                const label = `S${getWeekNumber(weekStart)}`;
                comparisonData[label] = { income: 0, count: 0, expense: 0 };
                
                services.forEach(s => {
                    if (!s.service_date || s.status !== 'Realizado') return;
                    const serviceDate = new Date(s.service_date + 'T00:00:00');
                    if (serviceDate >= weekStart && serviceDate <= weekEnd) {
                        comparisonData[label].income += parseFloat(s.price || 0);
                        comparisonData[label].count++;
                    }
                });
                
                expenses.forEach(e => {
                    if (!e.date) return;
                    const expenseDate = new Date(e.date + 'T00:00:00');
                    if (expenseDate >= weekStart && expenseDate <= weekEnd) {
                        comparisonData[label].expense += parseFloat(e.amount || 0);
                    }
                });
            }
            break;
            
        case 'month':
            // Generate last 6 months
            for (let i = 5; i >= 0; i--) {
                const monthStart = new Date(periodData.current.start);
                monthStart.setMonth(monthStart.getMonth() - i);
                const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
                
                const label = monthStart.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
                comparisonData[label] = { income: 0, count: 0, expense: 0 };
                
                services.forEach(s => {
                    if (!s.service_date || s.status !== 'Realizado') return;
                    const serviceDate = new Date(s.service_date + 'T00:00:00');
                    if (serviceDate >= monthStart && serviceDate <= monthEnd) {
                        comparisonData[label].income += parseFloat(s.price || 0);
                        comparisonData[label].count++;
                    }
                });
                
                expenses.forEach(e => {
                    if (!e.date) return;
                    const expenseDate = new Date(e.date + 'T00:00:00');
                    if (expenseDate >= monthStart && expenseDate <= monthEnd) {
                        comparisonData[label].expense += parseFloat(e.amount || 0);
                    }
                });
            }
            break;
            
        case 'quarter':
            // Generate last 4 quarters
            for (let i = 3; i >= 0; i--) {
                const quarterStart = new Date(periodData.current.start);
                quarterStart.setMonth(quarterStart.getMonth() - (i * 3));
                const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
                
                const quarter = Math.ceil((quarterStart.getMonth() + 1) / 3);
                const label = `Q${quarter} ${quarterStart.getFullYear().toString().slice(-2)}`;
                comparisonData[label] = { income: 0, count: 0, expense: 0 };
                
                services.forEach(s => {
                    if (!s.service_date || s.status !== 'Realizado') return;
                    const serviceDate = new Date(s.service_date + 'T00:00:00');
                    if (serviceDate >= quarterStart && serviceDate <= quarterEnd) {
                        comparisonData[label].income += parseFloat(s.price || 0);
                        comparisonData[label].count++;
                    }
                });
                
                expenses.forEach(e => {
                    if (!e.date) return;
                    const expenseDate = new Date(e.date + 'T00:00:00');
                    if (expenseDate >= quarterStart && expenseDate <= quarterEnd) {
                        comparisonData[label].expense += parseFloat(e.amount || 0);
                    }
                });
            }
            break;
            
        case 'year':
            // Generate last 5 years
            for (let i = 4; i >= 0; i--) {
                const yearStart = new Date(periodData.current.start);
                yearStart.setFullYear(yearStart.getFullYear() - i);
                const yearEnd = new Date(yearStart.getFullYear(), 11, 31);
                
                const label = yearStart.getFullYear().toString();
                comparisonData[label] = { income: 0, count: 0, expense: 0 };
                
                services.forEach(s => {
                    if (!s.service_date || s.status !== 'Realizado') return;
                    const serviceDate = new Date(s.service_date + 'T00:00:00');
                    if (serviceDate >= yearStart && serviceDate <= yearEnd) {
                        comparisonData[label].income += parseFloat(s.price || 0);
                        comparisonData[label].count++;
                    }
                });
                
                expenses.forEach(e => {
                    if (!e.date) return;
                    const expenseDate = new Date(e.date + 'T00:00:00');
                    if (expenseDate >= yearStart && expenseDate <= yearEnd) {
                        comparisonData[label].expense += parseFloat(e.amount || 0);
                    }
                });
            }
            break;
    }
    
    return comparisonData;
}

function renderStatisticsView() {
    // Ensure view is loaded
    if (!document.querySelector('#stats-view .stats-grid')) {
        loadStatsView();
        return; 
    }

    if (window.AppState.statsInitialized) { 
        Object.values(window.AppState.charts).forEach(chart => chart.destroy()); 
    } 
    
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-medium').trim(); 
    Chart.defaults.borderColor = 'rgba(51, 51, 51, 0.8)'; 
    Chart.defaults.font.family = "'Poppins', sans-serif"; 
    Chart.defaults.font.size = 14; 
    Chart.defaults.plugins.legend.position = 'bottom'; 
    
    const { services, expenses } = window.AppState.db; 
    const themeColors = { 
        primary: getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim(), 
        secondary: getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim(), 
        error: getComputedStyle(document.documentElement).getPropertyValue('--error-color').trim(), 
        info: getComputedStyle(document.documentElement).getPropertyValue('--info-color').trim(), 
        light: 'rgba(163, 163, 163, 0.8)' 
    }; 
    
    const periodType = getEl('stats-period-type').value;
    const periodFilter = getEl('stats-period-filter').value;
    const techFilter = getEl('stats-tech-filter').value;
    
    if (!periodFilter) return;
    
    const periodData = getPeriodData(periodType, periodFilter);
    if (!periodData) return;
    
    updateStatsTitles(periodType);
    
    const filterItems = (items, dateField, startDate, endDate) => {
        return items.filter(item => {
            if (!item[dateField]) return false;
            const itemDate = new Date(item[dateField] + 'T00:00:00');
            const techMatch = !techFilter || item.technician_id == techFilter;
            return itemDate >= startDate && itemDate <= endDate && techMatch;
        });
    };
    
    const currentPeriodServices = filterItems(services, 'service_date', periodData.current.start, periodData.current.end);
    const prevPeriodServices = filterItems(services, 'service_date', periodData.previous.start, periodData.previous.end);
    const currentPeriodExpenses = filterItems(expenses, 'date', periodData.current.start, periodData.current.end);
    const prevPeriodExpenses = filterItems(expenses, 'date', periodData.previous.start, periodData.previous.end);
    
    const calculateTotal = (items, valueField, statusField = null, statusValue = null) => {
        return items.filter(i => !statusField || i[statusField] === statusValue).reduce((sum, i) => sum + parseFloat(i[valueField] || 0), 0);
    };
    
    const currentIncome = calculateTotal(currentPeriodServices, 'price', 'status', 'Realizado');
    const prevIncome = calculateTotal(prevPeriodServices, 'price', 'status', 'Realizado');
    
    // Format currency helper
    const format = (val) => window.formatCurrency ? window.formatCurrency(val) : '$' + val.toFixed(2);
    const symbol = window.AppState.currentUser.currency_symbol || '$';
    
    getEl('stat-period-income').textContent = format(currentIncome).replace(symbol, '');
    updateComparison('stat-income-comparison', currentIncome, prevIncome);
    
    const currentExpensesTotal = calculateTotal(currentPeriodExpenses, 'amount');
    const prevExpensesTotal = calculateTotal(prevPeriodExpenses, 'amount');
    getEl('stat-period-expenses').textContent = format(currentExpensesTotal).replace(symbol, '');
    updateComparison('stat-expenses-comparison', currentExpensesTotal, prevExpensesTotal, true);
    
    const currentNetProfit = currentIncome - currentExpensesTotal;
    const prevNetProfit = prevIncome - prevExpensesTotal;
    getEl('stat-net-profit').textContent = format(currentNetProfit).replace(symbol, '');
    updateComparison('stat-profit-comparison', currentNetProfit, prevNetProfit);
    
    const currentCompleted = currentPeriodServices.filter(s => s.status === 'Realizado').length;
    const prevCompleted = prevPeriodServices.filter(s => s.status === 'Realizado').length;
    getEl('stat-completed-services').textContent = currentCompleted;
    updateComparison('stat-completed-comparison', currentCompleted, prevCompleted);
    
    // Generate comparison chart data based on period type
    const comparisonData = generateComparisonChartData(periodType, periodData, services, expenses);
    
    const monthlyCompCtx = getEl('monthly-comparison-chart').getContext('2d');
    window.AppState.charts.monthlyCompChart = new Chart(monthlyCompCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(comparisonData),
            datasets: [
                {
                    label: 'Ingresos',
                    data: Object.values(comparisonData).map(d => d.income),
                    backgroundColor: themeColors.primary,
                    yAxisID: 'y-money'
                },
                {
                    label: 'Gastos',
                    data: Object.values(comparisonData).map(d => d.expense),
                    backgroundColor: themeColors.error,
                    yAxisID: 'y-money'
                },
                {
                    label: 'Servicios',
                    data: Object.values(comparisonData).map(d => d.count),
                    backgroundColor: themeColors.secondary,
                    yAxisID: 'y-count',
                    type: 'line',
                    tension: 0.3,
                    borderColor: themeColors.secondary
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                'y-money': {
                    position: 'left',
                    grid: { drawOnChartArea: false },
                    ticks: { callback: value => `${symbol}${value/1000}k` }
                },
                'y-count': {
                    position: 'right',
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });

    // --- NUEVOS GRÁFICOS ---
    
    // 1. Top 5 Clientes (Ingresos)
    const clientRevenue = {};
    const isPrivacy = window.isPrivacyMode && window.isPrivacyMode();
    const clientMap = window.AppState.db.clients.reduce((map, c) => (map[c.id] = c, map), {});
    
    currentPeriodServices.forEach(s => {
        if (s.status === 'Realizado') {
            if (!clientRevenue[s.client_id]) clientRevenue[s.client_id] = 0;
            clientRevenue[s.client_id] += parseFloat(s.price || 0);
        }
    });
    
    const sortedClients = Object.entries(clientRevenue)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, revenue]) => ({
            name: isPrivacy ? 'Cliente Oculto' : (clientMap[id] ? clientMap[id].full_name : 'Cliente desconocido'),
            revenue: revenue
        }));
        
    const topClientsCtx = getEl('top-clients-chart').getContext('2d');
    window.AppState.charts.topClientsChart = new Chart(topClientsCtx, {
        type: 'bar',
        data: {
            labels: sortedClients.map(c => c.name),
            datasets: [{
                label: 'Ingresos Generados',
                data: sortedClients.map(c => c.revenue),
                backgroundColor: [themeColors.primary, themeColors.secondary, themeColors.info, themeColors.error, themeColors.light],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { callback: (value) => format(value) } } }
        }
    });
    
    // 2. Rendimiento de Técnicos
    const techStats = {};
    const techMap = window.AppState.db.technicians.reduce((map, t) => (map[t.id] = isPrivacy ? 'Técnico Oculto' : t.name, map), {});
    
    currentPeriodServices.forEach(s => {
        if (s.status === 'Realizado') {
            const techName = techMap[s.technician_id] || 'Sin Asignar';
            if (!techStats[techName]) techStats[techName] = { count: 0, revenue: 0 };
            techStats[techName].count++;
            techStats[techName].revenue += parseFloat(s.price || 0);
        }
    });
    
    const techLabels = Object.keys(techStats);
    const techPerformanceCtx = getEl('tech-performance-chart').getContext('2d');
    window.AppState.charts.techPerformanceChart = new Chart(techPerformanceCtx, {
        type: 'bar',
        data: {
            labels: techLabels,
            datasets: [
                {
                    label: 'Servicios Completados',
                    data: techLabels.map(t => techStats[t].count),
                    backgroundColor: themeColors.secondary,
                    yAxisID: 'y-count'
                },
                {
                    label: 'Ingresos Generados',
                    data: techLabels.map(t => techStats[t].revenue),
                    backgroundColor: themeColors.primary,
                    yAxisID: 'y-money'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                'y-count': { position: 'left', ticks: { stepSize: 1 } },
                'y-money': { position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: (value) => format(value) } }
            }
        }
    });
    
    // 3. Servicios por Zona
    const zoneStats = {};
    currentPeriodServices.forEach(s => {
        if (s.status === 'Realizado') {
            const client = clientMap[s.client_id];
            const zone = client && client.zone ? client.zone : 'Sin Zona';
            if (!zoneStats[zone]) zoneStats[zone] = 0;
            zoneStats[zone]++;
        }
    });
    
    const zoneLabels = Object.keys(zoneStats);
    const zoneStatsCtx = getEl('zone-stats-chart').getContext('2d');
    window.AppState.charts.zoneStatsChart = new Chart(zoneStatsCtx, {
        type: 'doughnut',
        data: {
            labels: zoneLabels,
            datasets: [{
                data: Object.values(zoneStats),
                backgroundColor: [themeColors.primary, themeColors.secondary, themeColors.error, themeColors.info, '#FFCE56', '#4BC0C0', '#9966FF'],
                borderWidth: 1
            }]
        },
        options: { responsive: true }
    });

    // --- FIN NUEVOS GRÁFICOS ---
    
    const typeCounts = currentPeriodServices.reduce((acc, s) => {
        const type = s.service_type || 'No Especificado';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    
    const serviceTypeCtx = getEl('service-type-chart-stats').getContext('2d');
    window.AppState.charts.serviceTypeChart = new Chart(serviceTypeCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                data: Object.values(typeCounts),
                backgroundColor: Object.values(themeColors),
                borderColor: 'var(--bg-medium)',
                borderWidth: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
    
    const expenseCategoryCounts = currentPeriodExpenses.reduce((acc, e) => {
        const category = e.category || 'Sin Categoría';
        acc[category] = (acc[category] || 0) + parseFloat(e.amount);
        return acc;
    }, {});
    
    const expenseCategoryCtx = getEl('expense-category-chart').getContext('2d');
    window.AppState.charts.expenseCategoryChart = new Chart(expenseCategoryCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(expenseCategoryCounts),
            datasets: [{
                data: Object.values(expenseCategoryCounts),
                backgroundColor: [themeColors.error, themeColors.info, themeColors.secondary, themeColors.light, '#8B5CF6', '#EC4899'],
                borderColor: 'var(--bg-medium)',
                borderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true, position: 'right' } }
        }
    });
    
    // --- Render Chemical Stats (Async) ---
    renderChemicalStats(periodData);
    
    window.AppState.statsInitialized = true;
}

async function renderChemicalStats(periodData) {
    // Fix: Use companyId (camelCase) as used in AppState, or fallback to company_id if present
    const user = window.AppState.currentUser;
    if (!user) return;
    
    const companyId = user.companyId || user.company_id;
    if (!companyId) {
        console.error('Chemical Stats: No company ID found');
        return;
    }
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date) => {
        const d = new Date(date);
        const month = '' + (d.getMonth() + 1);
        const day = '' + d.getDate();
        const year = d.getFullYear();
        return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
    };

    const startDate = formatDate(periodData.current.start);
    const endDate = formatDate(periodData.current.end);

    try {
        const query = new URLSearchParams({
            company_id: companyId,
            start_date: startDate,
            end_date: endDate
        });

        const response = await fetch(`api/get_chemical_stats.php?${query.toString()}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            const themeColors = { 
                primary: getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim(), 
                error: getComputedStyle(document.documentElement).getPropertyValue('--error-color').trim(), 
                warning: '#F59E0B'
            };
            
            // 1. Render Usage Chart
            const usageCanvas = getEl('chemical-usage-chart');
            if (usageCanvas) {
                const usageCtx = usageCanvas.getContext('2d');
                window.AppState.charts.chemicalUsageChart = new Chart(usageCtx, {
                    type: 'bar',
                    data: {
                        labels: data.usage_by_chemical.map(d => d.name),
                        datasets: [{
                            label: 'Costo Total ($)',
                            data: data.usage_by_chemical.map(d => parseFloat(d.total_cost)),
                            backgroundColor: themeColors.primary,
                            borderColor: themeColors.primary,
                            borderWidth: 1
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { ticks: { callback: (val) => '$' + val } }
                        }
                    }
                });
            }

            // 2. Render Trend Chart
            const trendCanvas = getEl('chemical-trend-chart');
            if (trendCanvas) {
                const trendCtx = trendCanvas.getContext('2d');
                
                // Sort by date just in case
                const sortedTrend = data.cost_trend.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                window.AppState.charts.chemicalTrendChart = new Chart(trendCtx, {
                    type: 'line',
                    data: {
                        labels: sortedTrend.map(d => d.date),
                        datasets: [{
                            label: 'Gasto en Químicos',
                            data: sortedTrend.map(d => d.cost),
                            borderColor: themeColors.error,
                            backgroundColor: themeColors.error + '33', // Add transparency
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { ticks: { callback: (val) => '$' + val } }
                        }
                    }
                });
            }

            // 3. Render Alerts
            const alertsList = getEl('chemical-alerts-list');
            if (alertsList) {
                alertsList.innerHTML = '';
                if (data.alerts && data.alerts.length > 0) {
                    data.alerts.forEach(alert => {
                        const isExhausted = alert.status === 'Agotado';
                        const color = isExhausted ? themeColors.error : themeColors.warning;
                        const icon = isExhausted ? '🚫' : '⚠️';
                        
                        const div = document.createElement('div');
                        div.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
                        
                        div.innerHTML = `
                            <div>
                                <span style="font-weight:600; color:var(--text-dark);">${icon} ${alert.name}</span>
                                <div style="font-size:0.85em; color:var(--text-light);">Stock: ${alert.current_stock}ml (Min: ${alert.min_stock}ml)</div>
                            </div>
                            <span style="font-size:0.8em; padding:2px 8px; border-radius:10px; background:${color}20; color:${color}; border:1px solid ${color};">
                                ${alert.status}
                            </span>
                        `;
                        alertsList.appendChild(div);
                    });
                } else {
                    alertsList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-light);"><span style="font-size:2em; display:block; margin-bottom:10px;">✅</span>Inventario saludable<br><small>No hay alertas de stock bajo</small></div>';
                }
            }

        } else {
             const alertsList = getEl('chemical-alerts-list');
             if (alertsList) alertsList.innerHTML = `<p style="text-align:center; color:var(--error-color);">Error: ${result.message || 'No se pudieron cargar los datos'}</p>`;
        }
    } catch (e) {
        console.error('Error fetching chemical stats:', e);
        const alertsList = getEl('chemical-alerts-list');
        if (alertsList) alertsList.innerHTML = '<p style="text-align:center; color:red;">Error al cargar datos.</p>';
    }
}


function updateComparison(elementId, current, previous, invert = false) { 
    const el = getEl(elementId); 
    if (previous === 0) { 
        el.textContent = current > 0 ? '↑ Nuevo' : '--'; 
        el.className = 'stat-comparison ' + (current > 0 ? (invert ? 'negative' : 'positive') : ''); 
        return; 
    } 
    const percentChange = ((current - previous) / previous) * 100; 
    const symbol = percentChange >= 0 ? '↑' : '↓'; 
    el.textContent = `${symbol} ${Math.abs(percentChange).toFixed(1)}% vs período anterior`; 
    let className = 'stat-comparison '; 
    if (percentChange > 0) className += (invert ? 'negative' : 'positive'); 
    if (percentChange < 0) className += (invert ? 'positive' : 'negative'); 
    el.className = className; 
}

// Expose to window
window.loadStatsView = loadStatsView;
window.renderStatisticsView = renderStatisticsView;
