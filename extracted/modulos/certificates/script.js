(function() {
    let isRendering = false;

    window.renderCertificatesView = async function(force = false) {
        const container = getEl('certificates-view');
        if (!container) return;

        // Si ya está renderizado y no se fuerza, solo actualizar datos
        if (!force && getEl('certificates-list') && getEl('cert-service-id')) {
            loadCertificatesData();
            return;
        }

        if (isRendering) return;
        isRendering = true;

        try {
            // Cargar la vista HTML
            const response = await fetch('modulos/certificates/view.html?v=' + Date.now());
            const html = await response.text();
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // Mover modales al body para que sean independientes del contenedor de la vista
            const modals = tempDiv.querySelectorAll('.modal');
            modals.forEach(modal => {
                const existing = document.getElementById(modal.id);
                if (existing) {
                    // Si el modal ya está activo, no lo toquemos para evitar cerrar diálogos abiertos
                    if (existing.classList.contains('active')) return;
                    existing.remove();
                }
                document.body.appendChild(modal);
            });

            container.innerHTML = tempDiv.innerHTML;

            // Inicializar datos
            loadCertificatesData();

            // Configurar event listeners
            setupCertificatesEventListeners();
        } catch (e) {
            console.error('Error al renderizar vista de certificados:', e);
            container.innerHTML = '<div class="alert error">Error al cargar el módulo de certificados.</div>';
        } finally {
            isRendering = false;
        }
    };

    async function loadCertificatesData() {
        try {
            const response = await fetch(`api/get_generated_certificates.php?company_id=${AppState.currentUser.companyId}`);
            const result = await response.json();
            
            const list = getEl('certificates-list');
            if (!list) return;

            if (result.success && result.certificates.length > 0) {
                list.innerHTML = result.certificates.map(cert => `
                    <tr>
                        <td>${cert.folio}</td>
                        <td>${cert.client_name}</td>
                        <td>${cert.service_date}</td>
                        <td>${cert.template_name || 'Estándar'}</td>
                        <td>
                            <button class="action-btn btn-stock" onclick="downloadCertificate('${cert.file_path}')">📥 Descargar</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                list.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay certificados generados aún.</td></tr>';
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function handleCertificateGeneration(e) {
        e.preventDefault();
        const data = {
            service_id: getEl('cert-service-id').value,
            folio: getEl('cert-folio').value,
            validity: getEl('cert-validity').value,
            sanitary_responsible: getEl('cert-sanitary-responsible').value,
            city: getEl('cert-city').value,
            treated_areas: getEl('cert-treated-areas').value,
            meters: getEl('cert-meters').value,
            observations: getEl('cert-observations').value,
            company_id: AppState.currentUser.companyId
        };

        try {
            const response = await fetch('api/generate_certificate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Certificado_${data.folio}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                
                alert('Certificado generado y descargado con éxito.');
                closeModal('generate-cert-modal');
                loadCertificatesData();
            } else {
                let errorMsg = 'Error en el servidor.';
                try {
                    const result = await response.json();
                    errorMsg = result.message || errorMsg;
                } catch (e) {
                    console.error('La respuesta no es un JSON válido:', e);
                }
                alert('Error: ' + errorMsg);
            }
        } catch (e) {
            console.error(e);
            alert('Error al generar el certificado.');
        }
    }

    function setupCertificatesEventListeners() {
        const certForm = getEl('generate-cert-form');
        if (certForm) {
            certForm.onsubmit = handleCertificateGeneration;
        }
    }

    window.downloadCertificate = function(path) {
        // El path es relativo a api/ o root, ajustamos
        const url = path.startsWith('../') ? path.substring(3) : path;
        const a = document.createElement('a');
        a.href = url;
        a.download = path.split('/').pop();
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    window.openCertificateGenerator = function(serviceId, serviceName) {
        // Asegurarse de que la vista de certificados esté renderizada antes de intentar acceder a sus elementos
        const renderViewAndOpen = async (retryCount = 0) => {
            if (retryCount > 5) {
                console.error('CRITICAL: Certificate modal elements still not found after multiple retries.');
                alert('Error crítico: No se pudieron cargar los elementos del certificado. Por favor, refresque la página.');
                return;
            }

            // Cambiar a la vista de certificados primero
            const navBtn = document.querySelector('.main-nav-btn[data-view="certificates-view"]');
            if (navBtn && !navBtn.classList.contains('active')) {
                navBtn.click();
            }

            // Esperar un momento a que el DOM se actualice si es necesario
            if (!getEl('cert-service-id')) {
                await window.renderCertificatesView();
            }

            // Pequeña espera adicional para asegurar que el DOM está listo tras el await
            if (!getEl('cert-service-id')) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            const serviceIdInput = getEl('cert-service-id');
            const serviceDisplayInput = getEl('cert-service-display');

            if (!serviceIdInput || !serviceDisplayInput) {
                console.warn(`Retry ${retryCount + 1}: Certificate modal elements not found, retrying...`);
                setTimeout(() => renderViewAndOpen(retryCount + 1), 500);
                return;
            }

            // Si no se pasó el nombre, intentar buscarlo en AppState
            if (!serviceName && serviceId && window.AppState && window.AppState.db) {
                const s = window.AppState.db.services.find(item => item.id == serviceId);
                if (s) {
                    const client = window.AppState.db.clients.find(c => c.id == s.client_id);
                    const baseName = client ? client.full_name : 'Cliente';
                    serviceName = `${baseName} - ${s.service_date}`;
                }
            }

            serviceIdInput.value = serviceId;
            serviceDisplayInput.value = serviceName || 'Servicio Seleccionado';

            // Abrir el modal
            openModal('generate-cert-modal');
        };

        renderViewAndOpen();
    };

    window.filterCertificates = function() {
        const q = getEl('certificate-search').value.toLowerCase();
        const rows = document.querySelectorAll('#certificates-list tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    };

})();
