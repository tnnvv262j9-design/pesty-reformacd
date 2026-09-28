<?php
// api/save_remote_signature.php
header('Content-Type: application/json');
include 'db_connect.php';
include 'service_security.php'; // Incluir la clase de seguridad

// Disable error display
ini_set('display_errors', 0);
ini_set('log_errors', 1);

$upload_dir = 'uploads/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0775, true);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

if (!isset($_POST['token']) || !isset($_POST['signature'])) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

$token = $_POST['token'];
$service_id = ServiceSecurity::validateToken($token);

if (!$service_id) {
    echo json_encode(['success' => false, 'message' => 'Token inválido o expirado']);
    exit;
}

$signature_data = $_POST['signature']; // Base64 string

// Convert base64 to image file
$signature_data = str_replace('data:image/png;base64,', '', $signature_data);
$signature_data = str_replace(' ', '+', $signature_data);
$data = base64_decode($signature_data);

$filename = 'sig_client_remote_' . $service_id . '_' . uniqid() . '.png';
$file_path = $upload_dir . $filename;

if (!file_put_contents($file_path, $data)) {
    echo json_encode(['success' => false, 'message' => 'Error al guardar la imagen en el servidor']);
    exit;
}

// Update database
// First get existing report_data
$sql_get = "SELECT report_data FROM services WHERE id = ?";
$stmt_get = $conn->prepare($sql_get);
$stmt_get->bind_param('i', $service_id);
$stmt_get->execute();
$result_get = $stmt_get->get_result();
$row = $result_get->fetch_assoc();
$stmt_get->close();

if (!$row) {
    echo json_encode(['success' => false, 'message' => 'Servicio no encontrado']);
    exit;
}

$report_data = json_decode($row['report_data'] ?? '{}', true);
if (!is_array($report_data)) $report_data = [];

// Update signature
$report_data['clientSignature'] = $file_path;
// Add a timestamp for the signature
$report_data['clientSignatureDate'] = date('Y-m-d H:i:s');
$report_data['clientSignatureSource'] = 'remote_link';

$new_report_data = json_encode($report_data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$sql_update = "UPDATE services SET report_data = ? WHERE id = ?";
$stmt_update = $conn->prepare($sql_update);
$stmt_update->bind_param('si', $new_report_data, $service_id);

if ($stmt_update->execute()) {
    echo json_encode(['success' => true, 'message' => 'Firma guardada correctamente']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al actualizar la base de datos']);
}

$stmt_update->close();
$conn->close();
?>