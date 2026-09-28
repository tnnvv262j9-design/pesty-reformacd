<?php
header('Content-Type: application/json');
require_once 'db_connect.php';
require_once 'send_email_helper.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email requerido']);
    exit();
}

$email = strtolower(trim($data->email));

// Verificar si el usuario existe
$stmt = $conn->prepare("SELECT id, name FROM companies WHERE LOWER(email) = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // Para seguridad, devolvemos éxito genérico sin revelar existencia del correo
    echo json_encode(['success' => true, 'message' => 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.']);
    exit();
}

$user = $result->fetch_assoc();
$company_id = $user['id'];
$company_name = $user['name'];

// Generar nueva contraseña temporal
$temp_password = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 10);
$hashed_password = password_hash($temp_password, PASSWORD_DEFAULT);

// Actualizar contraseña en BD
$update_stmt = $conn->prepare("UPDATE companies SET password = ?, password_hash = ? WHERE id = ?");
$update_stmt->bind_param("ssi", $hashed_password, $hashed_password, $company_id);

if ($update_stmt->execute()) {
    // Enviar email
    $subject = 'Restablecimiento de Contraseña - Pesty Software';
    $loginUrl = 'https://software.pesty.com.mx'; // O la URL real si está en config
    
    $html = <<<HTML
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
body{font-family:sans-serif;color:#333;}
.container{max-width:600px;margin:0 auto;padding:20px;}
.btn{display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:5px;}
.code{background:#f4f4f4;padding:10px;font-family:monospace;font-size:18px;letter-spacing:2px;}
</style>
</head>
<body>
<div class="container">
    <h2>Hola {$company_name},</h2>
    <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
    <p>Tu nueva contraseña temporal es:</p>
    <p class="code">{$temp_password}</p>
    <p>Por favor, inicia sesión con esta contraseña y cámbiala inmediatamente en la sección de Configuración.</p>
    <p><a href="{$loginUrl}" class="btn">Iniciar Sesión</a></p>
    <p><small>Si no solicitaste este cambio, por favor contacta a soporte inmediatamente.</small></p>
</div>
</body>
</html>
HTML;

    $plain = "Hola {$company_name},\n\nTu nueva contraseña temporal es: {$temp_password}\n\nInicia sesión y cámbiala.";

    if (send_email($email, $subject, $html, $plain)) {
        echo json_encode(['success' => true, 'message' => 'Se ha enviado una nueva contraseña a tu correo electrónico.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al enviar el correo electrónico.']);
    }

} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar la contraseña en la base de datos.']);
}

$stmt->close();
$update_stmt->close();
$conn->close();
?>
