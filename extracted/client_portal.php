<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Portal de Clientes | Pesty</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #121212;
            --bg-card: #1e1e1e;
            --text-light: #e0e0e0;
            --text-muted: #aaaaaa;
            --accent: #34D399;
            --accent-hover: #10B981;
            --border: #333333;
        }

        * { box-sizing: border-box; }

        body {
            font-family: 'Poppins', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-light);
            margin: 0;
            padding: 0;
            min-height: 100vh;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Login Styles */
        #login-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 90vh;
            text-align: center;
        }

        .login-card {
            background-color: var(--bg-card);
            padding: 40px;
            border-radius: 16px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border: 1px solid var(--border);
        }

        .logo {
            font-size: 2.5rem;
            margin-bottom: 30px;
        }

        input[type="text"] {
            width: 100%;
            padding: 15px;
            background-color: rgba(255,255,255,0.05);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: white;
            font-size: 1.2rem;
            text-align: center;
            letter-spacing: 3px;
            margin-bottom: 20px;
            outline: none;
            text-transform: uppercase;
        }

        input[type="text"]:focus {
            border-color: var(--accent);
        }

        .btn {
            background-color: var(--accent);
            color: #000;
            border: none;
            padding: 15px 30px;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
            transition: background 0.3s;
        }

        .btn:hover {
            background-color: var(--accent-hover);
        }

        /* Dashboard Styles */
        #dashboard-screen {
            display: none;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border);
        }

        .company-info h2 { margin: 0; color: var(--accent); }
        .company-info p { margin: 5px 0 0; color: var(--text-muted); font-size: 0.9rem; }

        .logout-btn {
            background: none;
            border: 1px solid var(--border);
            color: var(--text-muted);
            padding: 8px 15px;
            border-radius: 6px;
            cursor: pointer;
        }

        .section-title {
            font-size: 1.2rem;
            margin-bottom: 15px;
            color: var(--text-light);
            border-left: 4px solid var(--accent);
            padding-left: 10px;
        }

        .card-list {
            display: grid;
            gap: 15px;
        }

        .card {
            background-color: var(--bg-card);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid var(--border);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .date { font-weight: 600; font-size: 1.1rem; }
        .status { 
            font-size: 0.8rem; 
            padding: 4px 8px; 
            border-radius: 4px; 
            background: rgba(255,255,255,0.1);
        }
        .status.Realizado { color: var(--accent); background: rgba(52, 211, 153, 0.1); }

        .card-body p {
            margin: 5px 0;
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        .card-actions {
            margin-top: 15px;
            display: flex;
            gap: 10px;
        }

        .action-btn {
            padding: 8px 15px;
            border-radius: 6px;
            border: none;
            font-size: 0.9rem;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }

        .btn-primary { background-color: var(--accent); color: #000; }
        .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text-light); }

        .reinforcement-alert {
            background-color: rgba(52, 211, 153, 0.1);
            border: 1px dashed var(--accent);
            padding: 15px;
            border-radius: 8px;
            margin-top: 10px;
            color: var(--text-light);
            font-size: 0.9rem;
        }

        .contact-fab {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #25D366;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            font-size: 2rem;
            text-decoration: none;
            z-index: 100;
        }

        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            overflow-x: auto;
            padding-bottom: 5px;
        }

        .tab {
            padding: 10px 20px;
            background: var(--bg-card);
            border-radius: 20px;
            color: var(--text-muted);
            cursor: pointer;
            white-space: nowrap;
            border: 1px solid transparent;
        }

        .tab.active {
            background: var(--accent);
            color: #000;
            font-weight: 600;
        }

        .tab-content { display: none; }
        .tab-content.active { display: block; }

        .loader {
            border: 3px solid rgba(255,255,255,0.1);
            border-top: 3px solid var(--accent);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            display: inline-block;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>

    <!-- Login Screen -->
    <div id="login-screen">
        <div class="login-card">
            <div class="logo">🔐</div>
            <h2 style="margin-bottom: 10px;">Acceso Clientes</h2>
            <p style="color: var(--text-muted); margin-bottom: 30px;">Ingresa tu código de acceso personal</p>
            
            <input type="text" id="access-code" placeholder="CÓDIGO" maxlength="6">
            <button class="btn" onclick="login()">Ingresar</button>
            <p id="login-error" style="color: #ef4444; margin-top: 15px; display: none;"></p>
        </div>
    </div>

    <!-- Dashboard Screen -->
    <div id="dashboard-screen" class="container">
        <div class="header">
            <div class="company-info" id="company-header">
                <h2>Cargando...</h2>
            </div>
            <button class="logout-btn" onclick="logout()">Salir</button>
        </div>

        <div class="tabs">
            <div class="tab active" onclick="switchTab('services')">Mis Servicios</div>
            <div class="tab" onclick="switchTab('quotes')">Cotizaciones</div>
        </div>

        <div id="services-tab" class="tab-content active">
            <!-- Services List -->
            <div class="card-list" id="services-list">
                <!-- Items injected via JS -->
            </div>
        </div>

        <div id="quotes-tab" class="tab-content">
            <!-- Quotes List -->
            <div class="card-list" id="quotes-list">
                <!-- Items injected via JS -->
            </div>
        </div>

        <a href="#" id="whatsapp-btn" class="contact-fab" target="_blank">💬</a>
    </div>

    <!-- Rating Modal -->
    <div id="rating-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; align-items:center; justify-content:center;">
        <div style="background:var(--bg-card); padding:25px; border-radius:12px; width:90%; max-width:400px; text-align:center; border:1px solid var(--border);">
            <h3 style="margin-top:0; color:var(--accent);">Calificar Servicio</h3>
            <p style="color:var(--text-muted); font-size:0.9rem;">¿Qué te pareció nuestro servicio?</p>
            
            <div style="display:flex; justify-content:center; gap:10px; margin:20px 0;">
                <span class="star-rating" data-value="1" style="font-size:2rem; cursor:pointer; color:#555;" onclick="selectStar(1)">★</span>
                <span class="star-rating" data-value="2" style="font-size:2rem; cursor:pointer; color:#555;" onclick="selectStar(2)">★</span>
                <span class="star-rating" data-value="3" style="font-size:2rem; cursor:pointer; color:#555;" onclick="selectStar(3)">★</span>
                <span class="star-rating" data-value="4" style="font-size:2rem; cursor:pointer; color:#555;" onclick="selectStar(4)">★</span>
                <span class="star-rating" data-value="5" style="font-size:2rem; cursor:pointer; color:#555;" onclick="selectStar(5)">★</span>
            </div>
            
            <input type="hidden" id="rating-value" value="0">
            <input type="hidden" id="rating-service-id" value="">
            
            <textarea id="rating-comment" placeholder="Comentario opcional..." style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.05); color:white; resize:none; height:80px; margin-bottom:20px;"></textarea>
            
            <div style="display:flex; gap:10px;">
                <button class="btn btn-outline" onclick="closeRatingModal()" style="flex:1;">Cancelar</button>
                <button class="btn btn-primary" onclick="submitRating()" style="flex:1;">Enviar</button>
            </div>
        </div>
    </div>

    <script>
        const API_URL = 'api/';

        // Check if logged in
        const token = localStorage.getItem('client_token');
        if (token) {
            loadDashboard();
        }

        async function login() {
            const code = document.getElementById('access-code').value.toUpperCase();
            const btn = document.querySelector('.btn');
            const error = document.getElementById('login-error');
            
            if (!code) return;

            btn.innerHTML = '<div class="loader"></div>';
            error.style.display = 'none';

            try {
                const response = await fetch(API_URL + 'client_portal_login.php', {
                    method: 'POST',
                    body: JSON.stringify({ access_code: code })
                });
                const result = await response.json();

                if (result.success) {
                    localStorage.setItem('client_token', result.token);
                    loadDashboard();
                } else {
                    error.textContent = result.message;
                    error.style.display = 'block';
                }
            } catch (e) {
                error.textContent = 'Error de conexión';
                error.style.display = 'block';
            } finally {
                btn.textContent = 'Ingresar';
            }
        }

        async function loadDashboard() {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('dashboard-screen').style.display = 'block';
            
            const token = localStorage.getItem('client_token');
            
            try {
                // Enviamos el token también por URL como respaldo por si el servidor filtra el header Authorization
                const response = await fetch(API_URL + 'get_portal_data.php?token=' + encodeURIComponent(token), {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const data = await response.json();

                if (!data.success) {
                    console.error('Error del servidor:', data.message);
                    alert('Error: ' + (data.message || 'Desconocido'));
                    // logout(); // Comentado para depuración
                    return;
                }

                renderCompanyInfo(data.company);
                renderServices(data.services);
                renderQuotes(data.quotes);

            } catch (e) {
                console.error(e);
                alert('Error al cargar datos');
            }
        }

        function renderCompanyInfo(company) {
            const header = document.getElementById('company-header');
            header.innerHTML = `
                <h2>${company.name || 'Mi Proveedor'}</h2>
                <p>${company.phone || ''} • ${company.email || ''}</p>
            `;

            if (company.phone) {
                const phone = company.phone.replace(/\D/g, '');
                document.getElementById('whatsapp-btn').href = `https://wa.me/${phone}`;
            }
        }

        function renderServices(services) {
            const container = document.getElementById('services-list');
            if (services.length === 0) {
                container.innerHTML = '<p style="text-align:center; color: var(--text-muted);">No tienes servicios registrados.</p>';
                return;
            }

            container.innerHTML = services.map(s => {
                let reinforcementHtml = '';
                if (s.reinforcement_days && s.service_date) {
                    const date = new Date(s.service_date);
                    date.setDate(date.getDate() + parseInt(s.reinforcement_days));
                    reinforcementHtml = `
                        <div class="reinforcement-alert">
                            📅 <strong>Próximo Refuerzo:</strong> ${date.toLocaleDateString()}
                            <br>Se recomienda agendar cita pronto.
                        </div>
                    `;
                }

                // Sección de calificación
                let ratingHtml = '';
                if (s.status === 'Realizado') {
                    if (s.rating) {
                        // Ya calificado: mostrar estrellas estáticas
                        const stars = '⭐'.repeat(s.rating) + '☆'.repeat(5 - s.rating);
                        ratingHtml = `
                            <div style="margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                                <div style="color: #FFD700; font-size: 1.2rem;">${stars}</div>
                                ${s.rating_comment ? `<p style="font-size: 0.85rem; font-style: italic; margin-top: 5px;">"${s.rating_comment}"</p>` : ''}
                            </div>
                        `;
                    } else {
                        // No calificado: botón para calificar
                        ratingHtml = `
                            <div style="margin-top: 10px;">
                                <button class="action-btn btn-primary" onclick="openRatingModal(${s.id})" style="width: 100%; font-size: 0.9rem;">⭐ Calificar Servicio</button>
                            </div>
                        `;
                    }
                }

                return `
                    <div class="card">
                        <div class="card-header">
                            <span class="date">${formatDate(s.service_date)}</span>
                            <span class="status ${s.status}">${s.status}</span>
                        </div>
                        <div class="card-body">
                            <p><strong>Servicio:</strong> ${s.service_type}</p>
                            <p><strong>Precio:</strong> $${s.price}</p>
                            ${s.notes ? `<p>"${s.notes}"</p>` : ''}
                            ${reinforcementHtml}
                            ${ratingHtml}
                        </div>
                        ${s.has_report ? `
                        <div class="card-actions">
                            <a href="api/generate_service_report.php?id=${s.id}" target="_blank" class="action-btn btn-outline" style="width: 100%; display: flex; justify-content: center; align-items: center; text-decoration: none;">
                                📄 Ver / Descargar Reporte
                            </a>
                        </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }

        function renderQuotes(quotes) {
            const container = document.getElementById('quotes-list');
            if (quotes.length === 0) {
                container.innerHTML = '<p style="text-align:center; color: var(--text-muted);">No tienes cotizaciones.</p>';
                return;
            }

            container.innerHTML = quotes.map(q => `
                <div class="card">
                    <div class="card-header">
                        <span class="date">Folio #${q.id}</span>
                        <span class="status">${q.status}</span>
                    </div>
                    <div class="card-body">
                        <p><strong>Fecha:</strong> ${formatDate(q.issue_date)}</p>
                        <p><strong>Total:</strong> $${q.total}</p>
                    </div>
                    <div class="card-actions">
                        <a href="api/view_quote.php?id=${q.id}" target="_blank" class="action-btn btn-primary" style="width: 100%;">👁️ Ver / Descargar</a>
                    </div>
                </div>
            `).join('');
        }

        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        }

        function logout() {
            localStorage.removeItem('client_token');
            location.reload();
        }

        function formatDate(dateStr) {
            if (!dateStr) return '';
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }

        // Funciones de Calificación
        function openRatingModal(serviceId) {
            document.getElementById('rating-service-id').value = serviceId;
            document.getElementById('rating-value').value = 0;
            document.getElementById('rating-comment').value = '';
            
            // Reset stars
            document.querySelectorAll('.star-rating').forEach(star => {
                star.style.color = '#555';
            });
            
            document.getElementById('rating-modal').style.display = 'flex';
        }

        function closeRatingModal() {
            document.getElementById('rating-modal').style.display = 'none';
        }

        function selectStar(value) {
            document.getElementById('rating-value').value = value;
            document.querySelectorAll('.star-rating').forEach(star => {
                const starVal = parseInt(star.dataset.value);
                star.style.color = starVal <= value ? '#FFD700' : '#555';
            });
        }

        async function submitRating() {
            const serviceId = document.getElementById('rating-service-id').value;
            const rating = document.getElementById('rating-value').value;
            const comment = document.getElementById('rating-comment').value;

            if (rating == 0) {
                alert('Por favor selecciona una calificación de estrellas.');
                return;
            }

            const btn = document.querySelector('#rating-modal .btn-primary');
            const originalText = btn.textContent;
            btn.textContent = 'Enviando...';
            btn.disabled = true;

            try {
                const response = await fetch(API_URL + 'save_service_rating.php', {
                    method: 'POST',
                    body: JSON.stringify({ service_id: serviceId, rating: rating, comment: comment })
                });
                const result = await response.json();

                if (result.success) {
                    alert(result.message);
                    closeRatingModal();
                    loadDashboard(); // Recargar para mostrar la calificación
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (e) {
                console.error(e);
                alert('Error de conexión');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    </script>
</body>
</html>