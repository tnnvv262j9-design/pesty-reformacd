<?php
header('Content-Type: application/json');
include 'db_connect.php';

// Fix path to check_admin_auth.php which is in api/admin/
require_once 'admin/check_admin_auth.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->feature_key) || !isset($data->is_active)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos']);
    exit();
}

$requester_id = isset($data->requester_id) ? intval($data->requester_id) : 0;

if (!validateSuperAdmin($conn, $requester_id)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. Se requieren permisos de Super Administrador.']);
    exit();
}

$feature_key = $conn->real_escape_string($data->feature_key);
$is_active = intval($data->is_active);

$sql = "UPDATE system_maintenance SET is_active = ? WHERE feature_key = ?";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta: ' . $conn->error]);
    exit();
}

$stmt->bind_param("is", $is_active, $feature_key);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Estado actualizado']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $conn->error]);
}

$stmt->close();
$conn->close();
?>