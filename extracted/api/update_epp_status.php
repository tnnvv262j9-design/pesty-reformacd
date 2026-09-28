<?php
header('Content-Type: application/json');
include 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

if (!isset($input['delivery_id'], $input['status'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos requeridos']);
    exit;
}

$delivery_id = intval($input['delivery_id']);
$status = $conn->real_escape_string($input['status']);

$allowed = ['Nuevo','Usado','Limpio','En mantenimiento','Dañado','Extraviado','Fuera de servicio'];
if (!in_array($status, $allowed)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Estado inválido']);
    exit;
}

$stmt = $conn->prepare("UPDATE epp_deliveries SET equipment_status = ? WHERE id = ?");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando actualización']);
    exit;
}
$stmt->bind_param("si", $status, $delivery_id);
if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
}
$stmt->close();
$conn->close();
?>
