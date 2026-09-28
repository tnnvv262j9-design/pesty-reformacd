<?php
include 'db_connect.php';
require_once 'encryption_service.php';
require_once 'check_limits.php';
require_once 'audit_log_helper.php';

$data = json_decode(file_get_contents("php://input"));
$encryption = new EncryptionService();

// Validar datos básicos
if (!isset($data->company_id) || !isset($data->full_name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos esenciales (compañía y nombre).']);
    exit();
}

$company_id = $data->company_id;

// --- Verificar Límite de Clientes ---
$limitCheck = checkLimit($conn, $company_id, 'client');
if (!$limitCheck['allowed']) {
    echo json_encode(['success' => false, 'message' => $limitCheck['message']]);
    exit();
}
// ------------------------------------

$full_name = $data->full_name;
$phone = $data->phone ?? '';
$address = !empty($data->address) ? $encryption->encrypt($data->address) : '';
$notes = !empty($data->notes) ? $encryption->encrypt($data->notes) : '';
$zone = $data->zone ?? '';
$frequency = $data->frequency ?? '';
$type = $data->type ?? '';
// Generar código de acceso único por defecto (6 caracteres alfanuméricos)
$access_code = substr(str_shuffle("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0, 6);

$stmt = $conn->prepare("INSERT INTO clients (company_id, full_name, phone, address, notes, zone, frequency, type, access_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("issssssss", $company_id, $full_name, $phone, $address, $notes, $zone, $frequency, $type, $access_code);

if ($stmt->execute()) {
    $client_id = $stmt->insert_id;
    $requesting_user_id = $data->requesting_user_id ?? null;
    log_audit_event($conn, $company_id, $requesting_user_id, 'clientes', 'create', 'client', $client_id, "Se agregó al cliente: $full_name");
    
    echo json_encode(['success' => true, 'message' => 'Cliente agregado exitosamente.', 'client_id' => $client_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $stmt->error]);
}
$stmt->close();
$conn->close();
?>