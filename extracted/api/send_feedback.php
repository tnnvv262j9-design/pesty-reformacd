<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['type'], $data['message'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos']);
    exit();
}

$type = $data['type'];
$message = $data['message'];
$contact = isset($data['contact']) ? $data['contact'] : '';
$companyId = isset($data['company_id']) ? intval($data['company_id']) : null;
$userId = isset($data['user_id']) ? intval($data['user_id']) : null;

$subject = "[PESTY] $type de usuario";

$details = "Tipo: $type\n";
$details .= "Mensaje:\n$message\n\n";
if ($contact) {
    $details .= "Contacto: $contact\n";
}
if ($companyId) {
    $details .= "ID Empresa: $companyId\n";
}
if ($userId) {
    $details .= "ID Usuario: $userId\n";
}

$to = 'contacto@pesty.com.mx';
$headers = "From: no-reply@pesty.com.mx\r\n";
$headers .= "Reply-To: " . ($contact ? $contact : 'contacto@pesty.com.mx') . "\r\n";

$sent = @mail($to, $subject, $details, $headers);

if ($sent) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'No se pudo enviar el correo.']);
}

?>
