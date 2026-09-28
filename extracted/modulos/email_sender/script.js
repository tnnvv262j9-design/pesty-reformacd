(() => {
    // Definir la función global para renderizar la vista
    window.renderEmailSenderView = async function() {
        console.log('renderEmailSenderView: Iniciando...');
        const container = document.getElementById('email-sender-view');
        if (!container) {
            console.error('renderEmailSenderView: Contenedor no encontrado');
            return;
        }
        
        console.log('renderEmailSenderView: Contenedor encontrado. Contenido actual:', container.innerHTML.length);

        // Solo cargar si está vacío
        // if (!container.innerHTML.trim()) { // Comentado para forzar recarga si es necesario durante debug
        if (true) {
            try {
                console.log('renderEmailSenderView: Intentando cargar HTML...');
                container.innerHTML = '<div class="loading-spinner">Cargando módulo...</div>';
                const response = await fetch('modulos/email_sender/view.html?v=' + Date.now());
                if (!response.ok) throw new Error('Error al cargar la vista: ' + response.statusText);
                
                const html = await response.text();
                console.log('renderEmailSenderView: HTML cargado, longitud:', html.length);
                container.innerHTML = html;
                
                // Inicializar lógica
                console.log('renderEmailSenderView: Inicializando lógica del módulo...');
                initEmailSenderModule();
            } catch (error) {
                console.error('renderEmailSenderView Error:', error);
                container.innerHTML = `<p class="error" style="color: red; padding: 20px;">Error al cargar el módulo: ${error.message}</p>`;
            }
        }
    };

    function initEmailSenderModule() {
        // Cargar lista de empresas
        loadCompaniesForEmail();

        // Listener del formulario
        const form = document.getElementById('email-sender-form');
        if (form) {
            form.addEventListener('submit', handleSendEmails);
        }
    }

    async function loadCompaniesForEmail() {
        const select = document.getElementById('email-recipients-select');
        if (!select) return;

        try {
            // Usar el endpoint existente que devuelve todas las empresas
            // Asumimos que get_all_companies.php devuelve un array directo o un objeto con data
            const result = await apiCall('admin/get_all_companies.php');
            
            // Ajustar según la estructura real de la respuesta
            let companies = [];
            if (Array.isArray(result)) {
                companies = result;
            } else if (result && result.data && Array.isArray(result.data)) {
                companies = result.data;
            } else if (result && Array.isArray(result.companies)) {
                companies = result.companies;
            }

            // Limpiar opciones excepto la primera (Todas)
            while (select.options.length > 1) {
                select.remove(1);
            }

            companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                // Ajustar campos según la respuesta real de la API
                const name = company.company_name || company.name || 'Sin nombre';
                const email = company.contact_email || company.email || 'Sin email';
                option.textContent = `${name} (${email})`;
                select.appendChild(option);
            });
            
        } catch (e) {
            console.error('Error cargando empresas:', e);
            const select = document.getElementById('email-recipients-select');
            if (select) {
                const option = document.createElement('option');
                option.textContent = "Error al cargar empresas";
                select.appendChild(option);
            }
        }
    }

    window.insertVariable = function(variable) {
        const textarea = document.getElementById('email-message-body');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        textarea.value = before + variable + after;
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
    };

    window.previewEmail = function() {
        const html = document.getElementById('email-message-body').value;
        // Reemplazar variables con datos de ejemplo para la vista previa
        let previewHtml = html
            .replace(/{{company_name}}/g, 'Empresa de Ejemplo S.A.')
            .replace(/{{contact_name}}/g, 'Juan Pérez')
            .replace(/{{email}}/g, 'juan@ejemplo.com');
            
        const win = window.open('', 'Preview', 'width=800,height=600');
        win.document.write(`
            <html>
            <head>
                <title>Vista Previa</title>
                <style>body { font-family: sans-serif; padding: 20px; line-height: 1.6; }</style>
            </head>
            <body>
                <div style="border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px;">
                    <strong>Vista Previa (con datos ficticios)</strong>
                </div>
                ${previewHtml}
            </body>
            </html>
        `);
    };

    async function handleSendEmails(e) {
        e.preventDefault();
        
        if (!confirm('¿Estás seguro de que deseas enviar estos correos? Esta acción no se puede deshacer.')) return;

        const subject = document.getElementById('email-subject').value;
        const htmlContent = document.getElementById('email-message-body').value;
        const select = document.getElementById('email-recipients-select');
        
        const selectedOptions = Array.from(select.selectedOptions).map(opt => opt.value);
        
        if (selectedOptions.length === 0) {
            alert('Por favor selecciona al menos un destinatario.');
            return;
        }

        const statusBox = document.getElementById('email-sender-status');
        const logBox = document.getElementById('email-progress-log');
        statusBox.classList.remove('hidden');
        logBox.innerHTML = 'Iniciando proceso de envío...<br>';
        
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        try {
            const response = await apiCall('admin/send_custom_email.php', {
                method: 'POST',
                body: JSON.stringify({
                    subject: subject,
                    html_content: htmlContent,
                    recipients: selectedOptions
                })
            });

            if (response.success) {
                logBox.innerHTML += `<br><strong>Resumen del envío:</strong><br>`;
                logBox.innerHTML += `<span style="color: green;">✅ Exitosos: ${response.sent_count}</span><br>`;
                logBox.innerHTML += `<span style="color: red;">❌ Fallidos: ${response.failed_count}</span><br>`;
                logBox.innerHTML += `<hr>`;
                
                if (response.details && response.details.length > 0) {
                    response.details.forEach(detail => {
                        const color = detail.status === 'sent' ? 'green' : 'red';
                        const icon = detail.status === 'sent' ? '✅' : '❌';
                        // Escapar HTML en el mensaje de error para evitar inyecciones
                        const safeMessage = detail.message ? detail.message.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
                        logBox.innerHTML += `<div style="margin-bottom: 2px;"><span style="color: ${color};">${icon} <strong>${detail.email}</strong></span>: ${safeMessage}</div>`;
                    });
                }
                
                alert('Proceso finalizado.');
            } else {
                logBox.innerHTML += `<span style="color: red;">❌ Error general: ${response.message}</span>`;
            }

        } catch (error) {
            console.error(error);
            logBox.innerHTML += `<span style="color: red;">❌ Error de conexión: ${error.message}</span>`;
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

})();
