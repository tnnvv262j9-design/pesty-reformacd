<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Firmar Reporte | Pesty</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Teko:wght@500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js"></script>
    <style>
        :root {
            --bg-dark: #121212;
            --bg-medium: #1e1e1e;
            --text-light: #e0e0e0;
            --accent-primary: #34D399;
            --border-color: #333;
        }
        body {
            font-family: 'Poppins', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-light);
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 500px;
            background-color: var(--bg-medium);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            text-align: center;
        }
        h1 {
            font-family: 'Teko', sans-serif;
            color: var(--accent-primary);
            font-size: 2.5rem;
            margin: 0 0 10px 0;
        }
        .info-group {
            text-align: left;
            margin-bottom: 20px;
            background: rgba(255,255,255,0.05);
            padding: 15px;
            border-radius: 8px;
        }
        .info-label {
            font-size: 0.85rem;
            color: #aaa;
        }
        .info-value {
            font-weight: 600;
            font-size: 1.1rem;
        }
        .signature-container {
            border: 2px dashed var(--border-color);
            background: white;
            border-radius: 8px;
            margin: 20px 0;
            touch-action: none; /* Prevent scrolling while signing */
        }
        canvas {
            width: 100%;
            height: 200px;
            display: block;
        }
        .btn {
            background-color: var(--accent-primary);
            color: #000;
            border: none;
            padding: 12px 25px;
            font-size: 1rem;
            font-weight: bold;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s;
        }
        .btn:active {
            transform: scale(0.98);
        }
        .btn:disabled {
            background-color: #555;
            cursor: not-allowed;
        }
        .btn-clear {
            background-color: transparent;
            color: #aaa;
            border: 1px solid #555;
            margin-top: 10px;
        }
        .success-message {
            display: none;
            color: var(--accent-primary);
            margin-top: 20px;
        }
        .error-message {
            display: none;
            color: #ef4444;
            margin-top: 20px;
        }
        .loader {
            display: none;
            border: 3px solid #f3f3f3;
            border-top: 3px solid var(--accent-primary);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>

    <div class="container" id="loading">
        <div class="loader" style="display:block"></div>
        <p>Cargando información del servicio...</p>
    </div>

    <div class="container" id="main-content" style="display:none">
        <h1>Firma de Conformidad</h1>
        <p style="margin-bottom: 20px;">Por favor firme a continuación para validar el servicio realizado.</p>

        <div class="info-group">
            <div style="margin-bottom: 10px;">
                <div class="info-label">Cliente</div>
                <div class="info-value" id="client-name">-</div>
            </div>
            <div style="margin-bottom: 10px;">
                <div class="info-label">Servicio</div>
                <div class="info-value" id="service-type">-</div>
            </div>
            <div style="display: flex; gap: 20px;">
                <div>
                    <div class="info-label">Fecha</div>
                    <div class="info-value" id="service-date">-</div>
                </div>
                <div>
                    <div class="info-label">Técnico</div>
                    <div class="info-value" id="tech-name">-</div>
                </div>
            </div>
        </div>

        <div id="signature-area">
            <p style="text-align: left; margin-bottom: 5px; font-size: 0.9rem;">Su firma aquí:</p>
            <div class="signature-container">
                <canvas id="signature-pad"></canvas>
            </div>
            
            <button class="btn" id="save-btn" onclick="saveSignature()">Confirmar y Guardar Firma</button>
            <button class="btn btn-clear" onclick="clearSignature()">Borrar y firmar de nuevo</button>
        </div>

        <div id="already-signed" style="display:none; padding: 20px; background: rgba(52, 211, 153, 0.1); border-radius: 8px;">
            <h3 style="color: var(--accent-primary);">✅ Servicio Firmado</h3>
            <p>Este reporte ya cuenta con una firma registrada.</p>
        </div>

        <div class="success-message" id="success-msg">
            <h3>¡Gracias!</h3>
            <p>Su firma ha sido guardada correctamente.</p>
        </div>
        <div class="error-message" id="error-msg"></div>
    </div>

    <script>
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('id'); // Mantenemos el nombre 'id' en la URL para compatibilidad visual, pero ahora es un token
        let signaturePad;

        async function init() {
            if (!token) {
                showError('Enlace no válido.');
                return;
            }

            try {
                // Usamos encodeURIComponent para asegurar que caracteres especiales del base64 viajen bien
                const response = await fetch(`api/get_public_service_data.php?token=${encodeURIComponent(token)}`);
                const result = await response.json();

                if (result.success) {
                    const data = result.data;
                    document.getElementById('client-name').textContent = data.client_name || 'N/A';
                    document.getElementById('service-type').textContent = data.service_type || 'N/A';
                    document.getElementById('service-date').textContent = data.service_date || 'N/A';
                    document.getElementById('tech-name').textContent = data.technician_name || 'N/A';

                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('main-content').style.display = 'block';

                    if (data.is_signed) {
                        document.getElementById('signature-area').style.display = 'none';
                        document.getElementById('already-signed').style.display = 'block';
                    } else {
                        initSignaturePad();
                    }
                } else {
                    showError(result.message || 'Error al cargar datos. El enlace puede haber expirado.');
                }
            } catch (e) {
                showError('Error de conexión.');
            }
        }

        function initSignaturePad() {
            const canvas = document.getElementById('signature-pad');
            function resizeCanvas() {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                canvas.getContext("2d").scale(ratio, ratio);
            }
            window.onresize = resizeCanvas;
            resizeCanvas();

            signaturePad = new SignaturePad(canvas, {
                backgroundColor: 'rgb(255, 255, 255)',
                penColor: 'rgb(0, 0, 0)'
            });
        }

        function clearSignature() {
            if (signaturePad) signaturePad.clear();
        }

        async function saveSignature() {
            if (signaturePad.isEmpty()) {
                alert("Por favor proporcione su firma primero.");
                return;
            }

            const btn = document.getElementById('save-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Guardando...';
            btn.disabled = true;

            try {
                const signatureData = signaturePad.toDataURL(); // Base64
                
                const formData = new FormData();
                formData.append('token', token); // Enviamos el token en lugar del ID
                formData.append('signature', signatureData);

                const response = await fetch('api/save_remote_signature.php', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();

                if (result.success) {
                    document.getElementById('signature-area').style.display = 'none';
                    document.getElementById('success-msg').style.display = 'block';
                } else {
                    alert('Error: ' + result.message);
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            } catch (e) {
                alert('Error al guardar la firma. Intente nuevamente.');
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }

        function showError(msg) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block'; // Show container to show error inside
            document.getElementById('signature-area').style.display = 'none';
            document.querySelector('.info-group').style.display = 'none';
            document.querySelector('h1').style.display = 'none';
            document.querySelector('p').style.display = 'none';
            
            const errorDiv = document.getElementById('error-msg');
            errorDiv.textContent = msg;
            errorDiv.style.display = 'block';
        }

        init();
    </script>
</body>
</html>