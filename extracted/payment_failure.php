<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pago Fallido | Pesty</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            color: #fff;
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .failure-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            max-width: 600px;
            width: 100%;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .failure-icon {
            font-size: 100px;
            color: #ff4444;
            margin-bottom: 20px;
        }
        .failure-title {
            font-size: 2.5em;
            margin-bottom: 15px;
            color: #fff;
        }
        .failure-text {
            font-size: 1.2em;
            color: #ccc;
            margin-bottom: 30px;
        }
        .home-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            padding: 15px 40px;
            border-radius: 50px;
            color: white;
            font-size: 1.1em;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .home-button:hover {
            transform: translateY(-3px);
        }
    </style>
</head>
<body>
    <div class="failure-container">
        <div class="failure-icon">
            <i class="fas fa-times-circle"></i>
        </div>
        <h1 class="failure-title">¡Pago Fallido!</h1>
        <p class="failure-text">Lo sentimos, tu pago no pudo ser procesado. Por favor, intenta nuevamente. Serás redirigido en 5 segundos...</p>
        <button class="home-button" onclick="window.location.href='index.html'">
            <i class="fas fa-home"></i> Volver al Inicio Ahora
        </button>
    </div>
    <script>
        // Redirect to home after 5 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 5000);
    </script>
</body>
</html>
