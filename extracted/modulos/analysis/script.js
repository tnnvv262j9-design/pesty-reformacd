// Module: Analysis & Diagnosis
// Handles the pre-service analysis modal

(function() {
    // Load the HTML view
    fetch('modulos/analysis/view.html')
        .then(response => response.text())
        .then(html => {
            if (!document.getElementById('analysis-modal')) {
                const div = document.createElement('div');
                div.innerHTML = html;
                document.body.appendChild(div.firstElementChild);
            }
        })
        .catch(err => console.error('Error loading analysis view:', err));

    // Global function to open the modal
    window.openAnalysisModal = function(serviceId) {
        if (!serviceId) return;
        
        if (!document.getElementById('analysis-modal')) {
            alert('El módulo de análisis se está cargando. Por favor intente de nuevo en un momento.');
            return;
        }
        
        // Store ID globally for save function
        window.currentAnalysisServiceId = serviceId;
        
        const service = AppState.db.services.find(s => s.id == serviceId);
        if (!service) return;
        
        const client = AppState.db.clients.find(c => c.id == service.client_id);
        const site = service.client_site_id ? AppState.db.client_sites.find(s => s.id == service.client_site_id) : null;
        
        // Populate dummy history data based on client (In a real app, query historical services)
        // For now, we just simulate random data for the demo
        simulateHistoryData(client, site);
        
        // Reset Calculator
        document.getElementById('calc-area').value = '';
        document.getElementById('calc-result-liters').textContent = '0.0 L';
        document.getElementById('calc-result-cost').textContent = '$0.00';
        
        // Reset HSE Toggles
        const hseCheckboxes = document.querySelectorAll('#analysis-tab-hse input[type="checkbox"]');
        hseCheckboxes.forEach(cb => cb.checked = false);

        // Load existing analysis data if available
        if (service.analysis_data) {
            try {
                const aData = typeof service.analysis_data === 'string' ? JSON.parse(service.analysis_data) : service.analysis_data;
                if (aData.hse) {
                    if (aData.hse.kidsPets) document.getElementById('hse-kids-pets').checked = true;
                    if (aData.hse.ventilation) document.getElementById('hse-ventilation').checked = true;
                    if (aData.hse.ppe) document.getElementById('hse-ppe').checked = true;
                    if (aData.hse.foodCovered) document.getElementById('hse-food-covered').checked = true;
                }
                if (aData.calc) {
                    if (aData.calc.area) {
                        document.getElementById('calc-area').value = aData.calc.area;
                        calculateMixture(); // Recalculate based on saved area
                    }
                    if (aData.calc.method) document.getElementById('calc-method').value = aData.calc.method;
                }
            } catch (e) { console.error('Error parsing analysis data', e); }
        }

        // Show Modal
        openModal('analysis-modal');
        switchAnalysisTab('history'); // Default tab
    };

    window.switchAnalysisTab = function(tabName) {
        // Hide all tabs
        document.querySelectorAll('.analysis-tab-pane').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.borderBottom = 'none';
            btn.style.color = 'var(--text-medium)';
        });

        // Show selected tab
        const selectedTab = document.getElementById(`analysis-tab-${tabName}`);
        if (selectedTab) selectedTab.classList.remove('hidden');
        
        // Update button style
        const activeBtn = event.currentTarget || document.querySelector(`.tab-btn[onclick="switchAnalysisTab('${tabName}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.borderBottom = '2px solid var(--accent-primary)';
            activeBtn.style.color = 'var(--text-light)';
        }
    };

    window.calculateMixture = function() {
        const area = parseFloat(document.getElementById('calc-area').value) || 0;
        const method = document.getElementById('calc-method').value;
        
        let liters = 0;
        let cost = 0;

        // Simple formula: 
        // Aspersion: 1L per 20m2 (approx)
        // Nebulization: 1L per 1000m3 (but we have m2, let's assume 3m height -> 3000m3 -> very efficient)
        // Let's stick to m2 for simplicity.
        
        if (method === 'aspersion') {
            liters = area / 20; 
            cost = liters * 25; // Dummy cost per liter of mix
        } else if (method === 'nebulizacion') {
            liters = area / 100; // Much more efficient coverage
            cost = liters * 40; // More expensive chemical
        }

        document.getElementById('calc-result-liters').textContent = liters.toFixed(1) + ' L';
        document.getElementById('calc-result-cost').textContent = '$' + cost.toFixed(2);
    };

    window.saveAnalysisAndClose = async function() {
        // Better to store currentServiceId globally when opening modal
        const currentServiceId = window.currentAnalysisServiceId;
        
        if (!currentServiceId) {
            alert('Error: No se identificó el servicio.');
            return;
        }

        const analysisData = {
            hse: {
                kidsPets: document.getElementById('hse-kids-pets').checked,
                ventilation: document.getElementById('hse-ventilation').checked,
                ppe: document.getElementById('hse-ppe').checked,
                foodCovered: document.getElementById('hse-food-covered').checked
            },
            calc: {
                area: document.getElementById('calc-area').value,
                method: document.getElementById('calc-method').value,
                liters: document.getElementById('calc-result-liters').textContent,
                cost: document.getElementById('calc-result-cost').textContent
            },
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch('api/save_analysis.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: currentServiceId,
                    analysis_data: analysisData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update local state
                const service = AppState.db.services.find(s => s.id == currentServiceId);
                if (service) {
                    service.analysis_data = analysisData;
                }
                
                closeModal('analysis-modal');
                // Ask if they want to proceed to report
                if (confirm('Análisis guardado. ¿Deseas abrir el reporte de servicio ahora?')) {
                    if (window.openServiceReportForm) {
                        window.openServiceReportForm(currentServiceId);
                    }
                }
            } else {
                alert('Error al guardar: ' + result.message);
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión al guardar el análisis.');
        }
    };

    function simulateHistoryData(client, site) {
        // Clear lists
        const hotspotList = document.getElementById('hotspot-list');
        hotspotList.innerHTML = '';
        
        // Find previous services for this client (and site if applicable)
        let pastServices = AppState.db.services.filter(s => 
            s.client_id == client.id && 
            s.status === 'Realizado' && 
            s.report_data // Only services with reports
        );

        if (site) {
            pastServices = pastServices.filter(s => s.client_site_id == site.id);
        }

        // Sort by date descending (newest first)
        pastServices.sort((a, b) => new Date(b.service_date + ' ' + b.service_time) - new Date(a.service_date + ' ' + a.service_time));

        // Limit to last 5 for analysis
        const recentServices = pastServices.slice(0, 5);

        // --- 1. Analyze Chemicals Used ---
        const usedProducts = {};
        
        recentServices.forEach(s => {
            let rData = s.report_data;
            if (typeof rData === 'string') {
                try { rData = JSON.parse(rData); } catch(e) { return; }
            }
            
            // Check for chemical usage data
            if (rData.chemicals && Array.isArray(rData.chemicals)) {
                rData.chemicals.forEach(chem => {
                    // Try to find chemical name from ID if name not in report
                    let chemName = chem.name;
                    if (!chemName && AppState.db.chemicals) {
                        const chemObj = AppState.db.chemicals.find(c => c.id == chem.chemical_id);
                        if (chemObj) chemName = chemObj.name;
                    }
                    if (!chemName) chemName = 'Químico ID ' + chem.chemical_id;

                    if (!usedProducts[chemName]) usedProducts[chemName] = 0;
                    usedProducts[chemName]++;
                });
            } else if (rData.treatmentMethod) {
                // Fallback: extract from text description if structured data missing
                // This is less reliable but better than nothing
                const words = rData.treatmentMethod.split(' ');
                // Simple heuristic: just show the method
                if (!usedProducts[rData.treatmentMethod]) usedProducts[rData.treatmentMethod] = 0;
                usedProducts[rData.treatmentMethod]++;
            }
        });

        // Render Top Products
        const productsContainer = document.querySelector('#analysis-tab-history .form-group div');
        if (productsContainer) {
            productsContainer.innerHTML = '';
            const sortedProducts = Object.entries(usedProducts).sort((a, b) => b[1] - a[1]);
            
            if (sortedProducts.length > 0) {
                sortedProducts.forEach(([name, count]) => {
                    productsContainer.innerHTML += `<span class="stock-status normal" title="Usado ${count} veces">${name} (${count})</span>`;
                });
            } else {
                productsContainer.innerHTML = '<span class="text-muted">No hay datos de químicos previos.</span>';
            }
        }

        // --- 2. Analyze Hotspots (Areas) ---
        const areaCounts = {};
        
        recentServices.forEach(s => {
            let rData = s.report_data;
            if (typeof rData === 'string') {
                try { rData = JSON.parse(rData); } catch(e) { return; }
            }

            // Extract areas based on client type fields
            let areas = '';
            if (rData.affectedAreas) areas += rData.affectedAreas;
            if (rData.hotelAreas) areas += ', ' + rData.hotelAreas;
            if (rData.casinoAreas) areas += ', ' + rData.casinoAreas;
            if (rData.maquiladoraAreas) areas += ', ' + rData.maquiladoraAreas;
            if (rData.almacenAreas) areas += ', ' + rData.almacenAreas;
            if (rData.localAreas) areas += ', ' + rData.localAreas;

            if (areas) {
                const areaList = areas.split(/,|;/).map(a => a.trim()).filter(a => a);
                areaList.forEach(a => {
                    if (!areaCounts[a]) areaCounts[a] = 0;
                    areaCounts[a]++;
                });
            }
        });

        // Render Hotspots
        const sortedAreas = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (sortedAreas.length > 0) {
            sortedAreas.forEach(([area, count]) => {
                let level = 'Baja';
                let color = 'var(--text-medium)';
                
                if (count >= 3) { level = 'Alta'; color = 'var(--error-color)'; }
                else if (count >= 2) { level = 'Media'; color = 'var(--accent-secondary)'; }

                const li = document.createElement('li');
                li.style.padding = '10px';
                li.style.borderBottom = '1px solid var(--border-color)';
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.innerHTML = `<span>📍 ${area}</span> <span style="color: ${color}; font-weight: bold;">${level} Actividad (${count}x)</span>`;
                hotspotList.appendChild(li);
            });
        } else {
            hotspotList.innerHTML = '<li style="padding:10px; text-align:center;">No hay zonas conflictivas registradas.</li>';
        }

        // --- 3. Trend Chart (Infestation Level) ---
        // Map levels to numbers: Nulo=0, Leve=1, Moderada=2, Alta=3
        const levelMap = { 'Nulo': 0, 'Leve': 1, 'Moderada': 2, 'Alta': 3 };
        const chartContainer = document.getElementById('pest-trend-chart');
        chartContainer.innerHTML = ''; // Clear placeholders

        if (recentServices.length > 0) {
            // We need chronological order for the chart (Oldest -> Newest)
            // recentServices is Newest -> Oldest, so reverse it
            const chartData = [...recentServices].reverse();
            
            chartData.forEach(s => {
                let rData = s.report_data;
                if (typeof rData === 'string') {
                    try { rData = JSON.parse(rData); } catch(e) { return; }
                }

                // Try to find infestation level
                let levelStr = rData.infestationLevel || 
                               rData.hotelInfestationLevel || 
                               rData.casinoInfestationLevel || 
                               rData.maquiladoraInfestationLevel || 
                               rData.almacenInfestationLevel || 
                               rData.localInfestationLevel || 'Nulo';
                
                const levelVal = levelMap[levelStr] || 0;
                
                // Height percentage (0 to 3 => 10% to 100%)
                const height = Math.max(10, (levelVal / 3) * 100);
                
                // Color based on level
                let color = 'var(--accent-primary)'; // Low
                if (levelVal === 2) color = 'var(--accent-secondary)'; // Medium
                if (levelVal === 3) color = 'var(--error-color)'; // High

                const bar = document.createElement('div');
                bar.style.width = (100 / chartData.length - 5) + '%';
                bar.style.height = height + '%';
                bar.style.background = color;
                bar.style.borderRadius = '4px 4px 0 0';
                bar.style.position = 'relative';
                bar.title = `${formatDate(s.service_date)}: ${levelStr}`;
                
                // Add date label below
                /*
                const label = document.createElement('div');
                label.textContent = formatDate(s.service_date).substring(0, 5);
                label.style.position = 'absolute';
                label.style.bottom = '-20px';
                label.style.left = '0';
                label.style.width = '100%';
                label.style.textAlign = 'center';
                label.style.fontSize = '0.6rem';
                bar.appendChild(label);
                */
                
                chartContainer.appendChild(bar);
            });
        } else {
            chartContainer.innerHTML = '<p style="align-self:center; width:100%; text-align:center; color:var(--text-medium);">Sin datos suficientes para gráfica.</p>';
        }
        
        // Update Site Alerts
        const alertText = document.getElementById('site-alerts-text');
        let notesHtml = '';
        
        if (site && site.notes) {
            notesHtml += `<p><strong>🏢 Nota de Sucursal:</strong> ${site.notes}</p>`;
        } 
        if (client && client.notes) {
            notesHtml += `<p><strong>👤 Nota de Cliente:</strong> ${client.notes}</p>`;
        }
        
        // Also check last report recommendations
        if (recentServices.length > 0) {
            let lastReport = recentServices[0].report_data;
            if (typeof lastReport === 'string') {
                try { lastReport = JSON.parse(lastReport); } catch(e) {}
            }
            if (lastReport.recommendations) {
                notesHtml += `<p><strong>📝 Última Recomendación:</strong> ${lastReport.recommendations}</p>`;
            }
        }

        if (notesHtml) {
            alertText.innerHTML = notesHtml;
        } else {
            alertText.textContent = "No hay alertas específicas registradas para este sitio.";
        }
    }

})();
