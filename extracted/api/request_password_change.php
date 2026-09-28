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

$email = $data->email;

// Verificar que el usuario exista
$stmt = $conn->prepare("SELECT id, name FROM companies WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
    exit();
}

$user = $result->fetch_assoc();
$company_name = $user['name'];

// Generar código de verificación
$verification_code = rand(100000, 999999);
$expiry = date('Y-m-d H:i:s', strtotime('+15 minutes')); // Válido por 15 minutos

// Guardar código en la base de datos (usaremos una tabla temporal o un campo en companies)
// Para simplificar, asumiremos que existe una columna 'reset_token' y 'reset_token_expiry' en companies.
// Si no existen, las creamos dinámicamente.

// Verificar si las columnas existen
$check_cols = $conn->query("SHOW COLUMNS FROM companies LIKE 'reset_token'");
if ($check_cols->num_rows == 0) {
    $conn->query("ALTER TABLE companies ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL");
    $conn->query("ALTER TABLE companies ADD COLUMN reset_token_expiry DATETIME DEFAULT NULL");
}

$update_stmt = $conn->prepare("UPDATE companies SET reset_token = ?, reset_token_expiry = ? WHERE email = ?");
$update_stmt->bind_param("sss", $verification_code, $expiry, $email);

if ($update_stmt->execute()) {
    // Enviar email
    $subject = 'Código de Verificación - Cambio de Contraseña';
    
    $html = <<<HTML
<!doctype html>
<html>
<body style="font-family: sans-serif; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2>Hola {$company_name},</h2>
        <p>Has solicitado cambiar tu contraseña. Usa el siguiente código para verificar tu identidad:</p>
        <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
            {$verification_code}
        </div>
        <p>Este código expira en 15 minutos.</p>
        <p><small>Si no solicitaste este cambio, ignora este correo.</small></p>
    </div>
</body>
</html>
HTML;

    $plain = "Tu código de verificación es: {$verification_code}";

    if (send_email($email, $subject, $html, $plain)) {
        echo json_encode(['success' => true, 'message' => 'Código enviado correctamente.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al enviar el email.']);
    }
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de base de datos.']);
}

$stmt->close();
$update_stmt->close();
$conn->close();
?>